/* Memorisation grading — admin/teacher.
 * Columns: # | Surah | Status | Memorisation Score (0-5) | Tajweed Score (0-5) | Last revised | Save
 * Status options: Not Started / Not Applicable / Completed
 * Rows with status 'not_applicable' are excluded from the overall average. */
import { audit } from '../supabase-client.js';
import { toast } from '../modules/toast.js';
export const title = 'Memorisation';

const STATUSES = [
    ['not_started',    'Not Started'],
    ['not_applicable', 'Not Applicable'],
    ['completed',      'Completed'],
];
const NA = 'not_applicable';

export async function render(root, { profile, supabase }) {
    const isStaff = profile.role === 'admin' || profile.role === 'teacher';
    if (!isStaff) {
        root.innerHTML = '<div class="alert alert-danger">Only staff can update memorisation.</div>';
        return;
    }
    const isAdmin = profile.role === 'admin';

    // Classes scoped to the user
    let classes;
    if (isAdmin) {
        const { data } = await supabase.from('classes').select('id, name, level').order('name');
        classes = data || [];
    } else {
        const { data } = await supabase.from('class_teachers')
            .select('classes(id, name, level)')
            .eq('teacher_id', profile.teacher_id);
        classes = (data || []).map(r => r.classes).filter(Boolean);
    }

    const { data: surahsRaw } = await supabase.from('surahs')
        .select('id, number, name_transliteration, total_ayahs').order('number');
    // Display order: Al-Fatihah first, then 114 → 113 → 112 → … → 2 (memorisation typically starts from the short surahs at the end).
    const surahs = [
        ...(surahsRaw || []).filter(s => Number(s.number) === 1),
        ...(surahsRaw || []).filter(s => Number(s.number) !== 1).sort((a, b) => Number(b.number) - Number(a.number)),
    ];

    root.innerHTML = `
        <div class="card">
            <div class="toolbar">
                <label class="field">Class
                    <select id="memo-class">
                        <option value="">${isAdmin ? 'All classes' : '—'}</option>
                        ${classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </label>
                <label class="field">Student
                    <select id="memo-student"><option value="">Pick a class first…</option></select>
                </label>
            </div>
            <table class="table" id="memo-table">
                <thead><tr>
                    <th>#</th><th>Surah</th><th>Status</th>
                    <th>Memorisation Score (0-5)</th><th>Tajweed Score (0-5)</th>
                    <th>Last revised</th><th></th>
                </tr></thead>
                <tbody></tbody>
            </table>
            <div id="memo-overall" class="alert alert-info" style="margin-top:14px; display:none"></div>
        </div>`;

    const classSel   = document.getElementById('memo-class');
    const studentSel = document.getElementById('memo-student');
    classSel.addEventListener('change', loadStudents);
    studentSel.addEventListener('change', () => {
        if (studentSel.value) load(Number(studentSel.value));
        else clearTable();
    });
    if (!isAdmin && classes.length === 1) classSel.value = String(classes[0].id);
    loadStudents();

    async function loadStudents() {
        const classId = classSel.value ? Number(classSel.value) : null;
        let query = supabase.from('class_students')
            .select('student_id, primary_teacher_id, students(id, first_name, last_name, student_code)');
        if (classId) query = query.eq('class_id', classId);
        if (!isAdmin && profile.teacher_id) query = query.eq('primary_teacher_id', profile.teacher_id);
        const { data: roster } = await query;
        const seen = new Set();
        const studs = [];
        for (const r of (roster || [])) {
            const s = r.students; if (s && !seen.has(s.id)) { seen.add(s.id); studs.push(s); }
        }
        studs.sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''));
        studentSel.innerHTML = '<option value="">— pick a student —</option>' +
            studs.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name} (${s.student_code})</option>`).join('');
        clearTable();
    }

    function clearTable() {
        document.getElementById('memo-overall').style.display = 'none';
        root.querySelector('#memo-table tbody').innerHTML =
            '<tr><td colspan="7"><em>Pick a student.</em></td></tr>';
    }

    async function load(studentId) {
        const { data: prog } = await supabase
            .from('memorisation_progress')
            .select('surah_id, status, memorisation_score, quality_score, last_revised_on')
            .eq('student_id', studentId);
        const map = new Map((prog || []).map(p => [p.surah_id, p]));

        const tbody = root.querySelector('#memo-table tbody');
        tbody.innerHTML = (surahs || []).map(s => {
            const p = map.get(s.id) || { status: 'not_applicable', memorisation_score: '', quality_score: '', last_revised_on: '' };
            return `<tr data-surah="${s.id}">
                <td>${s.number}</td>
                <td>${s.name_transliteration}</td>
                <td><select data-f="status">
                    ${STATUSES.map(([v,lbl]) => `<option value="${v}" ${v === (p.status||'not_applicable') ? 'selected':''}>${lbl}</option>`).join('')}
                </select></td>
                <td><input type="number" min="0" max="5" value="${p.memorisation_score ?? ''}" data-f="memorisation_score" style="width:70px"></td>
                <td><input type="number" min="0" max="5" value="${p.quality_score ?? ''}" data-f="quality_score" style="width:70px"></td>
                <td>${p.last_revised_on || '—'}</td>
                <td><button class="btn btn-primary save-btn">Save</button></td>
            </tr>`;
        }).join('');

        refreshOverall();

        tbody.querySelectorAll('.save-btn').forEach(btn => btn.addEventListener('click', async ev => {
            const tr = ev.target.closest('tr');
            const surahId = Number(tr.dataset.surah);
            const memScore = parseScore(tr.querySelector('[data-f=memorisation_score]').value);
            const tajScore = parseScore(tr.querySelector('[data-f=quality_score]').value);
            const status   = tr.querySelector('[data-f=status]').value;
            const row = {
                student_id:         studentId,
                surah_id:           surahId,
                status,
                memorisation_score: memScore,
                quality_score:      tajScore,    // displayed as "Tajweed Score" but reuses existing column
                teacher_id:         profile.teacher_id,
                last_revised_on:    new Date().toISOString().slice(0, 10),
            };
            const { error } = await supabase.from('memorisation_progress')
                .upsert(row, { onConflict: 'student_id,surah_id' });
            if (error) { toast.error(error.message); return; }
            await audit('memorisation.update', 'memorisation_progress', null, row);
            toast.success('Memorisation saved');
            load(studentId);
        }));

        // Recalc overall when any input changes (without saving)
        tbody.querySelectorAll('select, input').forEach(el =>
            el.addEventListener('change', refreshOverall));
    }

    function refreshOverall() {
        const tbody = root.querySelector('#memo-table tbody');
        const rows = [...tbody.querySelectorAll('tr[data-surah]')];
        let applicable = 0, completed = 0;
        let memSum = 0, memCount = 0, tajSum = 0, tajCount = 0;
        for (const tr of rows) {
            const status = tr.querySelector('[data-f=status]').value;
            if (status === NA) continue;
            applicable++;
            if (status === 'completed') completed++;
            const m = parseScore(tr.querySelector('[data-f=memorisation_score]').value);
            const t = parseScore(tr.querySelector('[data-f=quality_score]').value);
            if (m != null) { memSum += m; memCount++; }
            if (t != null) { tajSum += t; tajCount++; }
        }
        const memAvg = memCount ? (memSum / memCount) : 0;
        const tajAvg = tajCount ? (tajSum / tajCount) : 0;
        const memMax = memCount * 5;
        const tajMax = tajCount * 5;
        const memPct = memCount ? Math.round(memAvg / 5 * 100) : 0;
        const tajPct = tajCount ? Math.round(tajAvg / 5 * 100) : 0;
        const overall = memCount && tajCount ? Math.round((memPct + tajPct) / 2)
                      : memCount ? memPct : tajCount ? tajPct : 0;
        const div = document.getElementById('memo-overall');
        div.style.display = '';
        div.innerHTML = `
            <strong>Overall: ${overall}%</strong> &nbsp;·&nbsp;
            Memorisation: <strong>${memSum} / ${memMax}</strong> (avg ${memAvg.toFixed(2)}, ${memPct}%) &nbsp;·&nbsp;
            Tajweed: <strong>${tajSum} / ${tajMax}</strong> (avg ${tajAvg.toFixed(2)}, ${tajPct}%) &nbsp;·&nbsp;
            Applicable surahs: ${applicable} &nbsp;·&nbsp;
            Completed: ${completed}
            <div class="progress" style="margin-top:8px; max-width:480px"><span style="width:${overall}%"></span></div>`;
    }
}

function parseScore(v) {
    if (v === '' || v == null) return null;
    const n = Number(v);
    if (Number.isNaN(n)) return null;
    return Math.max(0, Math.min(5, Math.round(n)));
}
