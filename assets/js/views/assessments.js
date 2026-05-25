/* Quran Recitation — hierarchical: Classes -> Students -> Grading form.
 * Available to admin and teacher only. */
import { CATEGORIES, GUIDELINES, GRADE_BANDS, calculateAverage, resolveBand,
         identifyWeaknesses, generateRecommendations, recordAssessment } from '../modules/quran-recitation.js';
import { audit } from '../supabase-client.js';

export const title = 'Quran Recitation';

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
    let classes;
    if (isAdmin) {
        const { data } = await sb.from('classes')
            .select('id, name, level, class_students(count), class_teachers(count)')
            .order('name');
        classes = data || [];
    } else {
        const { data } = await sb.from('class_teachers')
            .select('classes(id, name, level, class_students(count), class_teachers(count))')
            .eq('teacher_id', profile.teacher_id);
        classes = (data || []).map(r => r.classes).filter(Boolean);
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
                </a>
            `).join('') || '<div class="alert alert-info">No classes available to you yet. Ask an admin to assign you to a class.</div>'}
        </div>`;
}

/* --------------------------------------------------------------------- */
async function renderStudentList(root, sb, profile, classId) {
    const isAdmin = profile.role === 'admin';
    const { data: cls } = await sb.from('classes').select('name, level').eq('id', classId).single();

    // Teachers only see students whose primary_teacher_id is them.
    // Admins see all enrolled.
    let query = sb.from('class_students')
        .select('students(id, first_name, last_name, student_code), primary_teacher_id')
        .eq('class_id', classId);
    if (!isAdmin && profile.teacher_id) {
        query = query.eq('primary_teacher_id', profile.teacher_id);
    }
    const { data: roster } = await query;
    const ids = (roster || []).map(r => r.students?.id).filter(Boolean);

    const { data: asses } = ids.length
        ? await sb.from('assessments')
            .select('student_id, overall_score, overall_grade, assessed_on')
            .in('student_id', ids)
            .eq('module_type', 'quran_recitation')
            .order('assessed_on', { ascending: false })
        : { data: [] };
    const latest = new Map();
    for (const a of (asses || [])) if (!latest.has(a.student_id)) latest.set(a.student_id, a);

    const sortedRoster = (roster || []).slice().sort((a, b) =>
        (a.students?.last_name || '').localeCompare(b.students?.last_name || ''));

    root.innerHTML = `
        <p style="margin-top:0"><a href="#/assessments">&larr; All classes</a> &middot;
            <strong>${cls?.name || 'Class'}</strong>
            ${cls?.level ? '<span class="chip">' + cls.level + '</span>' : ''}</p>
        <p class="text-muted">${isAdmin
            ? 'Click a student to record a new assessment. (You see all enrolled students.)'
            : 'Showing only students assigned to you as their primary teacher. Ask the admin (or use the Classes screen) to assign more.'}</p>
        <div class="card">
            <table class="table">
                <thead><tr><th>Code</th><th>Name</th><th>Last assessed</th><th>Latest grade</th><th></th></tr></thead>
                <tbody>
                    ${sortedRoster.map(r => {
                        const s = r.students; if (!s) return '';
                        const a = latest.get(s.id);
                        return `<tr>
                            <td>${s.student_code}</td>
                            <td>${s.first_name} ${s.last_name}</td>
                            <td>${a?.assessed_on || '—'}</td>
                            <td>${a ? '<span class="chip">' + a.overall_grade + ' (' + a.overall_score + ')</span>' : '<span class="chip warn">not yet</span>'}</td>
                            <td><a class="btn btn-primary" href="#/assessments?class=${classId}&student=${s.id}">Grade</a></td>
                        </tr>`;
                    }).join('') || '<tr><td colspan="5"><em>No students enrolled in this class.</em></td></tr>'}
                </tbody>
            </table>
        </div>`;
}

/* --------------------------------------------------------------------- */
async function renderForm(root, sb, profile, classId, studentId) {
    const [{ data: student }, { data: cls }, { data: surahs }, { data: recent }] = await Promise.all([
        sb.from('students').select('id, first_name, last_name, student_code').eq('id', studentId).single(),
        sb.from('classes').select('id, name, level').eq('id', classId).single(),
        sb.from('surahs').select('id, number, name_transliteration').order('number'),
        sb.from('assessments')
            .select('id, assessed_on, overall_score, overall_grade, quran_recitation_grades(fluency,makharij,tajweed,waqf,accuracy)')
            .eq('student_id', studentId).eq('module_type', 'quran_recitation')
            .order('assessed_on', { ascending: false }).limit(5),
    ]);

    root.innerHTML = `
        <p style="margin-top:0"><a href="#/assessments">&larr; Classes</a> &middot;
            <a href="#/assessments?class=${classId}">${cls?.name || 'Class'}</a> &middot;
            <strong>${student?.first_name} ${student?.last_name}</strong>
            <span class="chip">${student?.student_code}</span></p>

        <div class="grid-app">
            <div class="card span-12">
                <h3 style="margin-top:0">New Quran Recitation assessment</h3>
                <form id="assess-form">
                    <div class="toolbar">
                        <label class="field">Date
                            <input type="date" name="assessed_on" value="${new Date().toISOString().slice(0, 10)}" required>
                        </label>
                        <label class="field">Surah
                            <select name="surah_id">
                                <option value="">—</option>
                                ${(surahs || []).map(s => `<option value="${s.id}">${s.number}. ${s.name_transliteration}</option>`).join('')}
                            </select>
                        </label>
                        <label class="field">Ayah from<input type="number" min="1" name="ayah_from"></label>
                        <label class="field">Ayah to<input   type="number" min="1" name="ayah_to"></label>
                    </div>

                    <fieldset style="border:1px solid var(--border); border-radius: var(--radius); padding: 16px">
                        <legend style="color: var(--green-700); font-weight: 600">0–5 Category Scoring</legend>
                        ${CATEGORIES.map(c => `
                            <div class="grade-row">
                                <div>
                                    <strong style="text-transform:capitalize">${c}</strong>
                                    <div class="text-muted" style="font-size:12px">${categoryHelp(c)}</div>
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
                        <div id="live-summary" class="chip">Average: 0.00 · Not Attempted</div>
                        <button class="btn btn-primary btn-lg" type="submit">Save assessment</button>
                    </div>
                    <div id="alert"></div>
                </form>
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
                        ${Object.entries(GUIDELINES).map(([s, m]) => `<tr><td><strong>${s}</strong></td><td>${m}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;

    const form = document.getElementById('assess-form');
    const summary = document.getElementById('live-summary');

    function currentScores() {
        const s = {};
        for (const c of CATEGORIES) s[c] = Number(form.elements[c].value || 0);
        return s;
    }
    function refreshSummary() {
        const s = currentScores();
        const avg = calculateAverage(s);
        const b = resolveBand(avg);
        summary.textContent = `Average: ${avg.toFixed(2)} · ${b.label}`;
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
        for (const c of CATEGORIES) {
            if (form.elements[c].value === '') {
                alertBox.innerHTML = `<div class="alert alert-danger">Please score every category before saving.</div>`;
                return;
            }
        }
        try {
            const payload = Object.fromEntries(new FormData(form).entries());
            payload.student_id = studentId;
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

            const id = await recordAssessment(sb, payload);
            await audit('quran_recitation.assessed', 'assessment', id);

            const scores = currentScores();
            const avg = calculateAverage(scores);
            const weak = identifyWeaknesses(scores);
            const recs = generateRecommendations(scores, avg);
            alertBox.innerHTML = `
                <div class="alert alert-success">
                    Saved. Average <strong>${avg.toFixed(2)}</strong>.
                    ${weak.length ? '<br><strong>Weaknesses:</strong> ' + weak.join(', ') : ''}
                    ${recs.length ? '<br><strong>Recommendations:</strong><ul style="margin:6px 0 0 18px">' + recs.map(r => `<li>${r}</li>`).join('') + '</ul>' : ''}
                </div>`;
            form.reset();
            form.querySelectorAll('.grade-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
            form.elements['assessed_on'].value = new Date().toISOString().slice(0, 10);
            refreshSummary();
        } catch (err) {
            alertBox.innerHTML = `<div class="alert alert-danger">${err.message || 'Save failed.'}</div>`;
        }
    });
}

function categoryHelp(c) {
    return {
        fluency:  'Smooth, confident flow without stops.',
        makharij: 'Correct articulation points of letters.',
        tajweed:  'Idgham, Ikhfa, Madd, Ghunnah, Qalqalah etc.',
        waqf:     'Stopping rules and signs.',
        accuracy: 'No letters missed, added, or substituted.',
    }[c] || '';
}
