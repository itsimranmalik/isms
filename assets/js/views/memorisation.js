/* Memorisation tracker — teacher/admin view.
 * Adds class filter; for teachers, students restricted to their primary roster. */
import { audit } from '../supabase-client.js';
import { toast } from '../modules/toast.js';
export const title = 'Memorisation';

export async function render(root, { profile, supabase }) {
    const isStaff = profile.role === 'admin' || profile.role === 'teacher';
    if (!isStaff) {
        root.innerHTML = '<div class="alert alert-danger">Only staff can update memorisation.</div>';
        return;
    }
    const isAdmin = profile.role === 'admin';

    // Classes the user can see
    let classes;
    if (isAdmin) {
        const { data } = await supabase.from('classes')
            .select('id, name, level').order('name');
        classes = data || [];
    } else {
        const { data } = await supabase.from('class_teachers')
            .select('classes(id, name, level)')
            .eq('teacher_id', profile.teacher_id);
        classes = (data || []).map(r => r.classes).filter(Boolean);
    }

    const { data: surahs } = await supabase.from('surahs')
        .select('id, number, name_transliteration, total_ayahs').order('number');

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
                <div id="memo-summary" style="margin-left:auto"></div>
            </div>
            <table class="table" id="memo-table">
                <thead><tr><th>#</th><th>Surah</th><th>Memorised</th><th>Status</th><th>Quality (0-5)</th><th>Last revised</th><th></th></tr></thead>
                <tbody></tbody>
            </table>
        </div>`;

    const classSel   = document.getElementById('memo-class');
    const studentSel = document.getElementById('memo-student');
    classSel.addEventListener('change', loadStudents);
    studentSel.addEventListener('change', () => {
        if (studentSel.value) load(Number(studentSel.value));
        else clearTable();
    });

    // For teachers with one class, pre-select it
    if (!isAdmin && classes.length === 1) {
        classSel.value = String(classes[0].id);
    }
    loadStudents();

    async function loadStudents() {
        const classId = classSel.value ? Number(classSel.value) : null;
        let query = supabase.from('class_students')
            .select('student_id, primary_teacher_id, students(id, first_name, last_name, student_code)');
        if (classId) query = query.eq('class_id', classId);
        if (!isAdmin && profile.teacher_id) query = query.eq('primary_teacher_id', profile.teacher_id);
        const { data: roster } = await query;
        // unique students (a student might be in multiple classes)
        const seen = new Set();
        const studs = [];
        for (const r of (roster || [])) {
            const s = r.students;
            if (s && !seen.has(s.id)) { seen.add(s.id); studs.push(s); }
        }
        studs.sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''));
        studentSel.innerHTML = '<option value="">— pick a student —</option>' +
            studs.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name} (${s.student_code})</option>`).join('');
        clearTable();
    }

    function clearTable() {
        document.getElementById('memo-summary').innerHTML = '';
        root.querySelector('#memo-table tbody').innerHTML =
            '<tr><td colspan="7"><em>Pick a student.</em></td></tr>';
    }

    async function load(studentId) {
        const { data: prog } = await supabase
            .from('memorisation_progress')
            .select('surah_id, ayahs_memorised, status, quality_score, last_revised_on')
            .eq('student_id', studentId);
        const map = new Map((prog || []).map(p => [p.surah_id, p]));

        let totalMem = 0, completed = 0;
        const tbody = root.querySelector('#memo-table tbody');
        tbody.innerHTML = (surahs || []).map(s => {
            const p = map.get(s.id) || { ayahs_memorised: 0, status: 'not_started', quality_score: '', last_revised_on: '' };
            totalMem += p.ayahs_memorised || 0;
            if (p.status === 'completed') completed++;
            return `<tr data-surah="${s.id}">
                <td>${s.number}</td>
                <td>${s.name_transliteration}</td>
                <td><input type="number" min="0" max="${s.total_ayahs}" value="${p.ayahs_memorised || 0}" data-f="ayahs_memorised" style="width:80px"> / ${s.total_ayahs}</td>
                <td><select data-f="status">
                    ${['not_started','in_progress','completed'].map(st => `<option ${st === (p.status||'not_started') ? 'selected':''}>${st}</option>`).join('')}
                </select></td>
                <td><input type="number" min="0" max="5" value="${p.quality_score ?? 0}" data-f="quality_score" style="width:60px"></td>
                <td>${p.last_revised_on || '—'}</td>
                <td><button class="btn btn-primary save-btn">Save</button></td>
            </tr>`;
        }).join('');

        const pct = (totalMem / 6236 * 100).toFixed(2);
        document.getElementById('memo-summary').innerHTML =
            `<span class="chip">${totalMem} ayahs (${pct}% of Quran)</span> <span class="chip gold">${completed} surahs complete</span>`;

        tbody.querySelectorAll('.save-btn').forEach(btn => btn.addEventListener('click', async ev => {
            const tr = ev.target.closest('tr');
            const surahId = Number(tr.dataset.surah);
            const ayahs   = Number(tr.querySelector('[data-f=ayahs_memorised]').value);
            const status  = tr.querySelector('[data-f=status]').value;
            const quality = Number(tr.querySelector('[data-f=quality_score]').value);
            const row = {
                student_id:      studentId,
                surah_id:        surahId,
                ayahs_memorised: ayahs,
                status,
                quality_score:   quality,
                teacher_id:      profile.teacher_id,
                last_revised_on: new Date().toISOString().slice(0, 10),
            };
            const { error } = await supabase.from('memorisation_progress')
                .upsert(row, { onConflict: 'student_id,surah_id' });
            if (error) { toast.error(error.message); return; }
            await audit('memorisation.update', 'memorisation_progress', null, row);
            toast.success('Memorisation saved');
            load(studentId);
        }));
    }
}
