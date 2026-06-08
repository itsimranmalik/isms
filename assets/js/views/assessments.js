/* Quran / Qaidah Recitation — hierarchical: Classes -> Students -> Grading form.
 * The grading form branches on the student's reading_stage:
 *   'quran' -> 5-category Quran rubric (Fluency/Makharij/Tajweed/Waqf/Accuracy)
 *   'qaidah' or 'juz' -> 4-category Qaidah rubric, with current page tracking
 *   null -> prompt to set the stage in the Students screen first
 * Available to admin and teacher only. */
import * as Quran  from '../modules/quran-recitation.js';
import * as Qaidah from '../modules/qaidah-reading.js';
import { audit } from '../supabase-client.js';
import { toast } from '../modules/toast.js';

export const title = 'Reading Assessment';

export async function render(root, { profile, supabase }) {
    if (profile.role !== 'admin' && profile.role !== 'teacher') {
        root.innerHTML = '<div class="alert alert-danger">Only admin and teachers can grade.</div>';
        return;
    }
    const params = new URLSearchParams((location.hash.split('?')[1]) || '');
    const classId   = params.get('class')   ? Number(params.get('class'))   : null;
    const studentId = params.get('student') ? Number(params.get('student')) : null;

    if (!classId)   return renderClassList(root, supabase, profile);
    if (!studentId) return renderStudentList(root, supabase, profile, classId);
    return renderForm(root, supabase, profile, classId, studentId);
}

/* --------------------------------------------------------------------- */
async function renderClassList(root, sb, profile) {
    const isAdmin = profile.role === 'admin';
    let classes = [];
    const assessorClassIds = new Set();

    if (isAdmin) {
        const { data } = await sb.from('classes')
            .select('id, name, level, quran_assessor_id, class_students(count), class_teachers(count)')
            .order('name');
        classes = data || [];
        classes.forEach(c => { if (c.quran_assessor_id) assessorClassIds.add(c.id); });
    } else {
        // Teacher: union of classes they teach AND classes they are Quran Assessor of.
        const [{ data: viaTeach }, { data: viaAssess }] = await Promise.all([
            sb.from('class_teachers')
                .select('classes(id, name, level, quran_assessor_id, class_students(count), class_teachers(count))')
                .eq('teacher_id', profile.teacher_id),
            sb.from('classes')
                .select('id, name, level, quran_assessor_id, class_students(count), class_teachers(count)')
                .eq('quran_assessor_id', profile.teacher_id),
        ]);
        const seen = new Set();
        for (const r of (viaTeach || [])) {
            const c = r.classes;
            if (c && !seen.has(c.id)) { seen.add(c.id); classes.push(c); }
        }
        for (const c of (viaAssess || [])) {
            assessorClassIds.add(c.id);
            if (!seen.has(c.id)) { seen.add(c.id); classes.push(c); }
        }
        classes.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    root.innerHTML = `
        <p class="text-muted" style="margin-top:0">Pick a class, then a student, to record a new Quran Recitation assessment.</p>
        <div class="grid-app">
            ${classes.map(c => `
                <a class="card span-6" href="#/assessments?class=${c.id}" style="text-decoration:none; color:inherit; display:block">
                    <h3 style="margin:0">${c.name}</h3>
                    <p class="text-muted" style="margin:4px 0 12px">${c.level || ''}</p>
                    <span class="chip">${c.class_students?.[0]?.count || 0} students</span>
                    <span class="chip gold">${c.class_teachers?.[0]?.count || 0} teachers</span>
                    ${assessorClassIds.has(c.id) && !isAdmin ? '<span class="chip" style="background:#FEF3C7;color:#92400E">Quran Assessor</span>' : ''}
                </a>
            `).join('') || '<div class="alert alert-info">No classes available to you yet. Ask an admin to assign you to a class.</div>'}
        </div>`;
}

/* --------------------------------------------------------------------- */
async function renderStudentList(root, sb, profile, classId) {
    const isAdmin = profile.role === 'admin';
    const { data: cls } = await sb.from('classes')
        .select('name, level, quran_assessor_id').eq('id', classId).single();

    // If this teacher is the Quran Assessor for the class, they see EVERY
    // enrolled student (regardless of primary_teacher_id). Otherwise teachers
    // only see students whose primary_teacher_id is them. Admins see all.
    const isAssessor = !!profile.teacher_id && cls?.quran_assessor_id === profile.teacher_id;

    let query = sb.from('class_students')
        .select('students(id, first_name, last_name, student_code, reading_stage, qaidah_page), primary_teacher_id')
        .eq('class_id', classId);
    if (!isAdmin && !isAssessor && profile.teacher_id) {
        query = query.eq('primary_teacher_id', profile.teacher_id);
    }
    const { data: roster } = await query;
    const ids = (roster || []).map(r => r.students?.id).filter(Boolean);

    const { data: asses } = ids.length
        ? await sb.from('assessments')
            .select('student_id, overall_score, overall_grade, assessed_on, module_type')
            .in('student_id', ids)
            .in('module_type', ['quran_recitation', 'qaidah_reading'])
            .order('assessed_on', { ascending: false })
        : { data: [] };
    const latest = new Map();
    for (const a of (asses || [])) if (!latest.has(a.student_id)) latest.set(a.student_id, a);

    const sortedRoster = (roster || []).slice().sort((a, b) =>
        (a.students?.last_name || '').localeCompare(b.students?.last_name || ''));

    root.innerHTML = `
        <p style="margin-top:0; display:flex; gap:10px; align-items:center; flex-wrap:wrap">
            <a class="back-link" href="#/assessments"><span class="arrow">&larr;</span> All classes</a>
            <strong>${cls?.name || 'Class'}</strong>
            ${cls?.level ? '<span class="chip">' + cls.level + '</span>' : ''}
        </p>
        <p class="text-muted">${isAdmin
            ? 'Click a student to record a new assessment. (You see all enrolled students.)'
            : isAssessor
            ? 'You are the Quran Assessor for this class — every enrolled student is shown.'
            : 'Showing only students assigned to you as their primary teacher. Ask the admin (or use the Classes screen) to assign more.'}</p>
        <div class="card">
            <table class="table">
                <thead><tr><th>Code</th><th>Name</th><th>Stage</th><th>Last assessed</th><th>Latest grade</th><th></th></tr></thead>
                <tbody>
                    ${sortedRoster.map(r => {
                        const s = r.students; if (!s) return '';
                        const a = latest.get(s.id);
                        const stageChip = stageChipFor(s);
                        return `<tr>
                            <td>${s.student_code}</td>
                            <td>${s.first_name} ${s.last_name}</td>
                            <td>${stageChip}</td>
                            <td>${a?.assessed_on || '—'}</td>
                            <td>${a ? '<span class="chip">' + a.overall_grade + ' (' + a.overall_score + ')</span>' : '<span class="chip warn">not yet</span>'}</td>
                            <td><a class="btn btn-primary" href="#/assessments?class=${classId}&student=${s.id}">Grade</a></td>
                        </tr>`;
                    }).join('') || '<tr><td colspan="6"><em>No students enrolled in this class.</em></td></tr>'}
                </tbody>
            </table>
        </div>`;
}

/* --------------------------------------------------------------------- */
/* Dispatcher: branch on the student's reading_stage. */
async function renderForm(root, sb, profile, classId, studentId) {
    const { data: student } = await sb.from('students')
        .select('id, first_name, last_name, student_code, reading_stage, qaidah_page')
        .eq('id', studentId).single();
    const { data: cls } = await sb.from('classes').select('id, name, level').eq('id', classId).single();

    if (!student) { root.innerHTML = '<div class="alert alert-danger">Student not found.</div>'; return; }

    const stage      = student.reading_stage;
    const moduleType = stage === 'quran'                 ? 'quran_recitation'
                     : (stage === 'qaidah' || stage === 'juz') ? 'qaidah_reading'
                     : null;

    // Lock check: a single Quran/Qaidah assessment per (student, module, day).
    if (moduleType) {
        const today = new Date().toISOString().slice(0, 10);
        const gradesSelect = moduleType === 'quran_recitation'
            ? 'quran_recitation_grades(fluency, makharij, tajweed, waqf, accuracy)'
            : 'qaidah_grades(letter_recognition, joining_reading, makharij_tajweed, fluency_confidence, total_score, page_at_assessment)';
        const { data: existing } = await sb.from('assessments')
            .select(`id, assessed_on, overall_score, overall_grade, created_at, teacher_id, teachers(staff_code, first_name, last_name), ${gradesSelect}`)
            .eq('student_id', student.id)
            .eq('module_type', moduleType)
            .eq('assessed_on', today)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existing) {
            const { data: req } = await sb.from('assessment_regrade_requests')
                .select('id, status, reason, admin_note, created_at, decided_at')
                .eq('assessment_id', existing.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            return renderLockPanel(root, sb, profile, classId, student, cls, existing, moduleType, req);
        }
    }

    if (stage === 'qaidah' || stage === 'juz') {
        return renderQaidahForm(root, sb, profile, classId, student, cls);
    }
    if (stage === 'quran') {
        return renderQuranForm(root, sb, profile, classId, student, cls);
    }
    // Stage not yet set — guide the user to set it.
    root.innerHTML = `
        <p style="margin-top:0; display:flex; gap:10px; align-items:center; flex-wrap:wrap">
            <a class="back-link" href="#/assessments?class=${classId}"><span class="arrow">&larr;</span> ${cls?.name || 'Class'}</a>
            <strong>${student.first_name} ${student.last_name}</strong>
            <span class="chip">${student.student_code}</span>
        </p>
        <div class="alert alert-info">
            This student's reading stage hasn't been set yet. Open <strong>Students</strong> in the sidebar,
            edit this student, and choose their stage (Qaidah / Juz Amm, 1, 2 / Quran). Then come back to grade them.
        </div>`;
}

/* --------------------------------------------------------------------- */
/* Lock panel — shown when a Quran/Qaidah assessment already exists today */
async function renderLockPanel(root, sb, profile, classId, student, cls, existing, moduleType, req) {
    const isAdmin = profile.role === 'admin';
    const g = moduleType === 'quran_recitation'
        ? (Array.isArray(existing.quran_recitation_grades) ? existing.quran_recitation_grades[0] : existing.quran_recitation_grades)
        : (Array.isArray(existing.qaidah_grades) ? existing.qaidah_grades[0] : existing.qaidah_grades);
    const total = moduleType === 'quran_recitation'
        ? (g ? [g.fluency, g.makharij, g.tajweed, g.waqf, g.accuracy].reduce((s, v) => s + Number(v || 0), 0) : '')
        : (g?.total_score ?? '');
    const max = moduleType === 'quran_recitation' ? 25 : 20;
    const teacherName = existing.teachers
        ? `${existing.teachers.first_name || ''} ${existing.teachers.last_name || ''}`.trim() + ` (${existing.teachers.staff_code || ''})`
        : '—';
    const ts = existing.created_at ? new Date(existing.created_at).toLocaleString() : '';
    const scoreDetails = moduleType === 'quran_recitation'
        ? `Fluency ${g?.fluency ?? '—'} · Makharij ${g?.makharij ?? '—'} · Tajweed ${g?.tajweed ?? '—'} · Waqf ${g?.waqf ?? '—'} · Accuracy ${g?.accuracy ?? '—'}`
        : `Letter Rec. ${g?.letter_recognition ?? '—'} · Joining&amp;Reading ${g?.joining_reading ?? '—'} · Makharij&amp;Tajweed ${g?.makharij_tajweed ?? '—'} · Fluency&amp;Conf. ${g?.fluency_confidence ?? '—'}`;

    let requestSection;
    if (isAdmin) {
        requestSection = `
            <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap; align-items:center">
                <button class="btn btn-primary" id="admin-override">Override and re-grade</button>
                <span class="text-muted" style="font-size:13px">Deletes today's row and reopens the grading form.</span>
            </div>`;
    } else if (req?.status === 'pending') {
        requestSection = `
            <div class="alert alert-info" style="margin-top:14px">
                <strong>Regrade requested — pending admin review.</strong><br>
                Submitted at ${new Date(req.created_at).toLocaleString()}.
                ${req.reason ? `<br>Reason: <em>${escapeHtml(req.reason)}</em>` : ''}
            </div>`;
    } else if (req?.status === 'rejected') {
        requestSection = `
            <div class="alert alert-danger" style="margin-top:14px">
                <strong>Regrade rejected by admin.</strong>
                ${req.admin_note ? `<br>Reason: <em>${escapeHtml(req.admin_note)}</em>` : ''}
            </div>
            <div style="margin-top:10px"><button class="btn btn-primary" id="request-regrade">Request again</button></div>`;
    } else {
        requestSection = `
            <p class="text-muted" style="margin-top:10px">Need a change? Ask an admin for permission.</p>
            <button class="btn btn-primary" id="request-regrade">Request regrade</button>`;
    }

    root.innerHTML = `
        <p style="margin-top:0; display:flex; gap:10px; align-items:center; flex-wrap:wrap">
            <a class="back-link" href="#/assessments?class=${classId}"><span class="arrow">&larr;</span> ${cls?.name || 'Class'}</a>
            <strong>${student.first_name} ${student.last_name}</strong>
            <span class="chip">${student.student_code}</span>
        </p>
        <div class="card" style="border-left:4px solid var(--gold-500)">
            <h3 style="margin-top:0; color: var(--green-700)">Already graded today</h3>
            <div style="font-size:14px; line-height:1.7">
                <strong>Saved by:</strong> ${escapeHtml(teacherName)}${ts ? ' at ' + ts : ''}<br>
                <strong>Total:</strong> ${total === '' ? '—' : total} / ${max} &nbsp;·&nbsp;
                <strong>Avg:</strong> ${existing.overall_score ?? '—'} &nbsp;·&nbsp;
                <strong>Grade:</strong> ${existing.overall_grade ?? '—'}<br>
                ${scoreDetails}
            </div>
            ${requestSection}
        </div>

        <dialog id="regrade-dialog" style="border:0; border-radius:14px; padding:0; max-width:480px; width:92%">
            <form id="regrade-form" style="padding:22px 24px">
                <h2 style="margin:0 0 8px; color: var(--green-700)">Request a regrade</h2>
                <p class="text-muted" style="margin:0 0 12px; font-size:13px">
                    Please give a brief reason — admin will see this when reviewing.
                </p>
                <label>Reason (10 - 500 characters)
                    <textarea required minlength="10" maxlength="500" name="reason" rows="4" placeholder="e.g. Ali read again at home and improved; I'd like to re-score Tajweed."></textarea>
                </label>
                <div id="regrade-alert" style="margin-top:8px"></div>
                <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:14px">
                    <button class="btn" type="button" id="regrade-cancel">Cancel</button>
                    <button class="btn btn-primary" type="submit" id="regrade-submit">Submit request</button>
                </div>
            </form>
        </dialog>`;

    if (isAdmin) {
        document.getElementById('admin-override').addEventListener('click', async () => {
            if (!confirm("Delete today's assessment and reopen the grading form?")) return;
            const { error } = await sb.from('assessments').delete().eq('id', existing.id);
            if (error) { toast.error(error.message); return; }
            await audit('assessment.override_delete', 'assessment', existing.id,
                        { student_id: student.id, module_type: moduleType });
            toast.success('Override applied — opening fresh form.');
            // Reload the page (same hash) to trigger the form
            const h = location.hash;
            location.hash = '';
            location.hash = h;
        });
    } else {
        const btn = document.getElementById('request-regrade');
        if (btn) {
            const dlg = document.getElementById('regrade-dialog');
            btn.addEventListener('click', () => dlg.showModal());
            document.getElementById('regrade-cancel').addEventListener('click', () => dlg.close());
            document.getElementById('regrade-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const alertBox = document.getElementById('regrade-alert');
                const submitBtn = document.getElementById('regrade-submit');
                alertBox.innerHTML = '';
                submitBtn.disabled = true; submitBtn.textContent = 'Sending…';
                try {
                    const reason = new FormData(e.target).get('reason') || '';
                    const { error } = await sb.from('assessment_regrade_requests').insert({
                        assessment_id:        existing.id,
                        student_id:           student.id,
                        module_type:          moduleType,
                        assessed_on:          existing.assessed_on,
                        requester_id:         profile.id,
                        requester_teacher_id: profile.teacher_id,
                        reason:               reason.toString().trim(),
                    });
                    if (error) throw error;
                    await audit('regrade.request', 'assessment', existing.id, { reason });
                    toast.success('Regrade request submitted. Admin will review.');
                    dlg.close();
                    const h = location.hash; location.hash = ''; location.hash = h;
                } catch (err) {
                    const msg = (err.message || '').includes('unique')
                        ? 'A regrade request is already open for this assessment.'
                        : (err.message || 'Failed to submit.');
                    alertBox.innerHTML = '<div class="alert alert-danger">' + msg + '</div>';
                } finally {
                    submitBtn.disabled = false; submitBtn.textContent = 'Submit request';
                }
            });
        }
    }
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

/* --------------------------------------------------------------------- */
/* Helper: render a 0-5 scoring form for any module (Quran or Qaidah).  */
function buildScoringForm({ MODULE, extraTopRow, totalMax, beforeSave, recentRows, recentColsHead, helpRows }) {
    return `
        <form id="assess-form">
            <div class="toolbar">
                <label class="field">Date
                    <input type="date" name="assessed_on" value="${new Date().toISOString().slice(0, 10)}" required>
                </label>
                ${extraTopRow}
            </div>

            <fieldset style="border:1px solid var(--border); border-radius: var(--radius); padding: 16px">
                <legend style="color: var(--green-700); font-weight: 600">0–5 Category Scoring</legend>
                ${MODULE.CATEGORIES.map(c => `
                    <div class="grade-row">
                        <div>
                            <strong>${MODULE.CATEGORY_LABELS?.[c] || (c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, ' '))}</strong>
                            <div class="text-muted" style="font-size:12px">${MODULE.CATEGORY_HELP?.[c] || ''}</div>
                        </div>
                        <div class="grade-buttons" data-field="${c}">
                            ${[0,1,2,3,4,5].map(i => `<button type="button" class="grade-btn" data-val="${i}">${i}</button>`).join('')}
                        </div>
                        <input type="hidden" name="${c}" required>
                    </div>
                `).join('')}
            </fieldset>

            <label class="field" style="margin-top: 14px">Teacher comments
                <textarea name="comments" rows="3" placeholder="Strengths, what to work on next…"></textarea>
            </label>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; gap:10px; flex-wrap: wrap">
                <div id="live-summary" class="chip">Total: 0 / ${totalMax} &middot; Average: 0.00 &middot; Not Attempted</div>
                <button class="btn btn-primary btn-lg" type="submit">Save assessment</button>
            </div>
            <div id="alert"></div>
        </form>`;
}

/* --------------------------------------------------------------------- */
async function renderQuranForm(root, sb, profile, classId, student, cls) {
    const MODULE = Quran;
    const totalMax = MODULE.CATEGORIES.length * 5;
    const [{ data: surahs }, { data: recent }] = await Promise.all([
        sb.from('surahs').select('id, number, name_transliteration').order('number'),
        sb.from('assessments')
            .select('id, assessed_on, overall_score, overall_grade, quran_recitation_grades(fluency,makharij,tajweed,waqf,accuracy)')
            .eq('student_id', student.id).eq('module_type', 'quran_recitation')
            .order('assessed_on', { ascending: false }).limit(5),
    ]);

    const extraTopRow = `
        <label class="field">Surah
            <select name="surah_id">
                <option value="">—</option>
                ${(surahs || []).map(s => `<option value="${s.id}">${s.number}. ${s.name_transliteration}</option>`).join('')}
            </select>
        </label>
        <label class="field">Ayah from<input type="number" min="1" name="ayah_from"></label>
        <label class="field">Ayah to<input   type="number" min="1" name="ayah_to"></label>`;

    root.innerHTML = `
        <p style="margin-top:0; display:flex; gap:10px; align-items:center; flex-wrap:wrap">
            <a class="back-link" href="#/assessments"><span class="arrow">&larr;</span> Classes</a>
            <a class="back-link" href="#/assessments?class=${classId}"><span class="arrow">&larr;</span> ${cls?.name || 'Class'}</a>
            <strong>${student.first_name} ${student.last_name}</strong>
            <span class="chip">${student.student_code}</span>
            <span class="chip gold">Quran</span>
        </p>
        <div class="grid-app">
            <div class="card span-12">
                <h3 style="margin-top:0">New Quran Recitation assessment</h3>
                ${buildScoringForm({ MODULE, extraTopRow, totalMax })}
            </div>
            <div class="card span-6">
                <h3 style="margin-top:0">Recent assessments</h3>
                <table class="table">
                    <thead><tr><th>Date</th><th>F</th><th>M</th><th>T</th><th>W</th><th>A</th><th>Avg</th><th>Grade</th></tr></thead>
                    <tbody>
                        ${(recent || []).map(r => {
                            const g = Array.isArray(r.quran_recitation_grades) ? r.quran_recitation_grades[0] : r.quran_recitation_grades;
                            return `<tr>
                                <td>${r.assessed_on}</td>
                                <td>${g?.fluency  ?? ''}</td>
                                <td>${g?.makharij ?? ''}</td>
                                <td>${g?.tajweed  ?? ''}</td>
                                <td>${g?.waqf     ?? ''}</td>
                                <td>${g?.accuracy ?? ''}</td>
                                <td><strong>${r.overall_score ?? ''}</strong></td>
                                <td>${r.overall_grade ?? ''}</td>
                            </tr>`;
                        }).join('') || '<tr><td colspan="8"><em>No previous assessments.</em></td></tr>'}
                    </tbody>
                </table>
            </div>
            <div class="card span-6">
                <h3 style="margin-top:0">Marking guidelines</h3>
                <table class="table">
                    <tbody>
                        ${Object.entries(MODULE.GUIDELINES).map(([s, m]) => `<tr><td><strong>${s}</strong></td><td>${m}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;

    wireScoringForm(root, sb, profile, classId, student, MODULE, totalMax, 'quran_recitation.assessed');
}

/* --------------------------------------------------------------------- */
async function renderQaidahForm(root, sb, profile, classId, student, cls) {
    const MODULE = Qaidah;
    const totalMax = MODULE.CATEGORIES.length * 5;
    const stageLabel = student.reading_stage === 'juz' ? 'Juz Amm, 1, 2' : 'Qaidah';

    const { data: recent } = await sb.from('assessments')
        .select('id, assessed_on, overall_score, overall_grade, qaidah_grades(letter_recognition,joining_reading,makharij_tajweed,fluency_confidence,total_score,page_at_assessment)')
        .eq('student_id', student.id).eq('module_type', 'qaidah_reading')
        .order('assessed_on', { ascending: false }).limit(5);

    const extraTopRow = `
        <label class="field">Current page
            <input type="number" min="0" max="200" name="qaidah_page" value="${student.qaidah_page ?? ''}" placeholder="e.g. 12">
        </label>`;

    root.innerHTML = `
        <p style="margin-top:0; display:flex; gap:10px; align-items:center; flex-wrap:wrap">
            <a class="back-link" href="#/assessments"><span class="arrow">&larr;</span> Classes</a>
            <a class="back-link" href="#/assessments?class=${classId}"><span class="arrow">&larr;</span> ${cls?.name || 'Class'}</a>
            <strong>${student.first_name} ${student.last_name}</strong>
            <span class="chip">${student.student_code}</span>
            <span class="chip gold">${stageLabel}</span>
            ${student.qaidah_page != null ? '<span class="chip">page ' + student.qaidah_page + '</span>' : ''}
        </p>
        <div class="grid-app">
            <div class="card span-12">
                <h3 style="margin-top:0">New ${stageLabel} assessment</h3>
                <p class="text-muted" style="margin-top:0">
                    Update the page number if the student has moved on. Saving here also updates the student's current page in their record.
                </p>
                ${buildScoringForm({ MODULE, extraTopRow, totalMax })}
            </div>
            <div class="card span-6">
                <h3 style="margin-top:0">Recent assessments</h3>
                <table class="table">
                    <thead><tr><th>Date</th><th>Pg</th><th>LR</th><th>JR</th><th>M&amp;T</th><th>F&amp;C</th><th>Tot</th><th>Avg</th><th>Grade</th></tr></thead>
                    <tbody>
                        ${(recent || []).map(r => {
                            const g = Array.isArray(r.qaidah_grades) ? r.qaidah_grades[0] : r.qaidah_grades;
                            return `<tr>
                                <td>${r.assessed_on}</td>
                                <td>${g?.page_at_assessment ?? ''}</td>
                                <td>${g?.letter_recognition  ?? ''}</td>
                                <td>${g?.joining_reading     ?? ''}</td>
                                <td>${g?.makharij_tajweed    ?? ''}</td>
                                <td>${g?.fluency_confidence  ?? ''}</td>
                                <td><strong>${g?.total_score ?? ''}</strong></td>
                                <td>${r.overall_score ?? ''}</td>
                                <td>${r.overall_grade ?? ''}</td>
                            </tr>`;
                        }).join('') || '<tr><td colspan="9"><em>No previous assessments.</em></td></tr>'}
                    </tbody>
                </table>
            </div>
            <div class="card span-6">
                <h3 style="margin-top:0">Marking guidelines</h3>
                <table class="table">
                    <tbody>
                        ${Object.entries(MODULE.GUIDELINES).map(([s, m]) => `<tr><td><strong>${s}</strong></td><td>${m}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;

    wireScoringForm(root, sb, profile, classId, student, MODULE, totalMax, 'qaidah_reading.assessed');
}

/* --------------------------------------------------------------------- */
/* Shared form behaviour: 0-5 button group clicks, live total/avg, submit. */
function wireScoringForm(root, sb, profile, classId, student, MODULE, totalMax, auditAction) {
    const form    = document.getElementById('assess-form');
    const summary = document.getElementById('live-summary');

    function currentScores() {
        const s = {};
        for (const c of MODULE.CATEGORIES) s[c] = Number(form.elements[c].value || 0);
        return s;
    }
    function refreshSummary() {
        const s = currentScores();
        let total = 0;
        for (const c of MODULE.CATEGORIES) total += Number(s[c] || 0);
        const avg = MODULE.calculateAverage(s);
        const b   = MODULE.resolveBand(avg);
        summary.textContent = `Total: ${total} / ${totalMax} · Average: ${avg.toFixed(2)} · ${b.label}`;
        summary.style.background = b.color + '22';
        summary.style.color = b.color;
    }

    root.querySelectorAll('.grade-buttons').forEach(group => {
        const field = group.dataset.field;
        group.addEventListener('click', e => {
            const b = e.target.closest('.grade-btn');
            if (!b) return;
            group.querySelectorAll('.grade-btn').forEach(x => x.setAttribute('aria-pressed', 'false'));
            b.setAttribute('aria-pressed', 'true');
            form.elements[field].value = b.dataset.val;
            refreshSummary();
        });
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const alertBox = document.getElementById('alert');
        alertBox.innerHTML = '';
        for (const c of MODULE.CATEGORIES) {
            if (form.elements[c].value === '') {
                alertBox.innerHTML = `<div class="alert alert-danger">Please score every category before saving.</div>`;
                return;
            }
        }
        try {
            const payload = Object.fromEntries(new FormData(form).entries());
            payload.student_id = student.id;
            payload.class_id   = classId;
            payload.teacher_id = profile.teacher_id;

            // Admin without teacher profile? Borrow the lead teacher of the class.
            if (!payload.teacher_id) {
                const { data: leadOrAny } = await sb
                    .from('class_teachers')
                    .select('teacher_id, is_lead')
                    .eq('class_id', classId)
                    .order('is_lead', { ascending: false })
                    .limit(1);
                payload.teacher_id = leadOrAny?.[0]?.teacher_id;
                if (!payload.teacher_id) {
                    alertBox.innerHTML = `<div class="alert alert-danger">This class has no teacher assigned. Assign one in the Classes screen first.</div>`;
                    return;
                }
            }

            const id = await MODULE.recordAssessment(sb, payload);
            await audit(auditAction, 'assessment', id);

            const scores = currentScores();
            const avg  = MODULE.calculateAverage(scores);
            const weak = MODULE.identifyWeaknesses(scores);
            const recs = MODULE.generateRecommendations(scores, avg);
            toast.success(`Assessment saved · avg ${avg.toFixed(2)}`);
            alertBox.innerHTML = `
                <div class="alert alert-success">
                    Saved. Average <strong>${avg.toFixed(2)}</strong>.
                    ${weak.length ? '<br><strong>Weaknesses:</strong> ' + weak.map(w => MODULE.CATEGORY_LABELS?.[w] || w).join(', ') : ''}
                    ${recs.length ? '<br><strong>Recommendations:</strong><ul style="margin:6px 0 0 18px">' + recs.map(r => `<li>${r}</li>`).join('') + '</ul>' : ''}
                </div>`;
            form.reset();
            form.querySelectorAll('.grade-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
            form.elements['assessed_on'].value = new Date().toISOString().slice(0, 10);
            refreshSummary();
        } catch (err) {
            alertBox.innerHTML = `<div class="alert alert-danger">${err.message || 'Save failed.'}</div>`;
            toast.error(err.message || 'Save failed');
        }
    });
}

/* --------------------------------------------------------------------- */
function stageChipFor(s) {
    if (s.reading_stage === 'quran')  return '<span class="chip gold">Quran</span>';
    if (s.reading_stage === 'qaidah') return '<span class="chip">Qaidah' + (s.qaidah_page != null ? ' · p' + s.qaidah_page : '') + '</span>';
    if (s.reading_stage === 'juz')    return '<span class="chip">Juz Amm, 1, 2</span>';
    return '<span class="chip warn">stage not set</span>';
}
