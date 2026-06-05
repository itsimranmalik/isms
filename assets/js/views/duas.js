/* Duas grading — admin/teacher.
 * Columns per dua: Title | Status | Memorisation Score (0-5) | Tajweed Score (0-5) | Save
 * Status options: Not Applicable / Not Completed / Completed
 * Rows with status 'not_applicable' are excluded from the overall average. */
import { audit } from '../supabase-client.js';
import { toast } from '../modules/toast.js';
export const title = 'Duas';

const STATUSES = [
    ['not_applicable', 'Not Applicable'],
    ['not_completed',  'Not Completed'],
    ['completed',      'Completed'],
];
const NA = 'not_applicable';

export async function render(root, { profile, supabase }) {
    const isStaff = profile.role === 'admin' || profile.role === 'teacher';
    if (!isStaff) {
        root.innerHTML = '<div class="alert alert-danger">Only staff can grade duas.</div>';
        return;
    }
    const isAdmin = profile.role === 'admin';

    let classes;
    if (isAdmin) {
        const { data } = await supabase.from('classes').select('id, name').order('name');
        classes = data || [];
    } else {
        const { data } = await supabase.from('class_teachers')
            .select('classes(id, name)')
            .eq('teacher_id', profile.teacher_id);
        classes = (data || []).map(r => r.classes).filter(Boolean);
    }

    const { data: duas } = await supabase.from('duas').select('*').order('category').order('sort_order');

    root.innerHTML = `
        <div class="card">
            <div class="toolbar">
                <label class="field">Class
                    <select id="dua-class">
                        <option value="">${isAdmin ? 'All classes' : '—'}</option>
                        ${classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </label>
                <label class="field">Student
                    <select id="dua-student"><option value="">Pick a class first…</option></select>
                </label>
                <label class="field">Category
                    <select id="dua-cat">
                        <option value="">All</option>
                        <option value="kalimas">Kalimas</option>
                        <option value="daily">Daily Duas</option>
                        <option value="namaz">Namaz</option>
                    </select>
                </label>
            </div>
            <div id="dua-list"><em>Pick a student.</em></div>
            <div id="dua-overall" class="alert alert-info" style="margin-top:14px; display:none"></div>
        </div>`;

    const classSel   = document.getElementById('dua-class');
    const studentSel = document.getElementById('dua-student');
    const catSel     = document.getElementById('dua-cat');
    classSel.addEventListener('change', loadStudents);
    studentSel.addEventListener('change', () => { if (studentSel.value) load(); else clearList(); });
    catSel.addEventListener('change',     () => { if (studentSel.value) load(); });

    if (!isAdmin && classes.length === 1) classSel.value = String(classes[0].id);
    loadStudents();

    async function loadStudents() {
        const classId = classSel.value ? Number(classSel.value) : null;
        let query = supabase.from('class_students')
            .select('student_id, primary_teacher_id, students(id, first_name, last_name, student_code)');
        if (classId) query = query.eq('class_id', classId);
        if (!isAdmin && profile.teacher_id) query = query.eq('primary_teacher_id', profile.teacher_id);
        const { data: roster } = await query;
        const seen = new Set(), studs = [];
        for (const r of (roster || [])) {
            const s = r.students; if (s && !seen.has(s.id)) { seen.add(s.id); studs.push(s); }
        }
        studs.sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''));
        studentSel.innerHTML = '<option value="">— pick a student —</option>' +
            studs.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name} (${s.student_code})</option>`).join('');
        clearList();
    }

    function clearList() {
        document.getElementById('dua-list').innerHTML = '<em>Pick a student.</em>';
        document.getElementById('dua-overall').style.display = 'none';
    }

    async function load() {
        const studentId = Number(studentSel.value);
        const cat       = catSel.value;
        if (!studentId) return clearList();

        const { data: prog } = await supabase
            .from('dua_progress')
            .select('dua_id, status, memorisation_score, tajweed_score, score')
            .eq('student_id', studentId);
        const map = new Map((prog || []).map(p => [p.dua_id, p]));

        const filtered = cat ? duas.filter(d => d.category === cat) : duas;
        const groups = {};
        for (const d of filtered) (groups[d.category] ||= []).push(d);

        document.getElementById('dua-list').innerHTML = Object.entries(groups).map(([category, items]) => {
            return `
                <div class="card" style="margin-top: 16px">
                    <h3 style="text-transform:capitalize">${category}</h3>
                    <table class="table">
                        <thead><tr>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Memorisation Score (0-5)</th>
                            <th>Tajweed Score (0-5)</th>
                            <th></th>
                        </tr></thead>
                        <tbody>
                            ${items.map(d => {
                                const p = map.get(d.id) || {};
                                // Backfill: if memorisation_score is missing but old `score` exists, use it
                                const mem = p.memorisation_score ?? p.score ?? '';
                                const taj = p.tajweed_score ?? '';
                                return `<tr data-dua="${d.id}">
                                    <td>
                                        <strong>${escapeHtml(d.title)}</strong>
                                        <div class="text-muted" style="font-size:12px">${escapeHtml(d.translation || '')}</div>
                                    </td>
                                    <td><select data-f="status">
                                        ${STATUSES.map(([v,lbl]) => `<option value="${v}" ${v === (p.status||'not_completed') ? 'selected':''}>${lbl}</option>`).join('')}
                                    </select></td>
                                    <td><input type="number" min="0" max="5" value="${mem}" data-f="memorisation_score" style="width:70px"></td>
                                    <td><input type="number" min="0" max="5" value="${taj}" data-f="tajweed_score" style="width:70px"></td>
                                    <td><button class="btn btn-primary save-btn">Save</button></td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>`;
        }).join('');

        refreshOverall();

        root.querySelectorAll('.save-btn').forEach(btn => btn.addEventListener('click', async ev => {
            const tr = ev.target.closest('tr');
            const memScore = parseScore(tr.querySelector('[data-f=memorisation_score]').value);
            const tajScore = parseScore(tr.querySelector('[data-f=tajweed_score]').value);
            const status   = tr.querySelector('[data-f=status]').value;
            const row = {
                student_id:         studentId,
                dua_id:             Number(tr.dataset.dua),
                status,
                memorisation_score: memScore,
                tajweed_score:      tajScore,
                teacher_id:         profile.teacher_id,
                assessed_on:        new Date().toISOString().slice(0, 10),
            };
            const { error } = await supabase.from('dua_progress')
                .upsert(row, { onConflict: 'student_id,dua_id' });
            if (error) { toast.error(error.message); return; }
            await audit('duas.update', 'dua_progress', null, row);
            toast.success('Dua saved');
            load();
        }));

        // Recalc overall when any input changes (without saving)
        root.querySelectorAll('#dua-list select, #dua-list input').forEach(el =>
            el.addEventListener('change', refreshOverall));
    }

    function refreshOverall() {
        const rows = [...root.querySelectorAll('#dua-list tr[data-dua]')];
        let applicable = 0, completed = 0;
        let memSum = 0, memCount = 0, tajSum = 0, tajCount = 0;
        for (const tr of rows) {
            const status = tr.querySelector('[data-f=status]').value;
            if (status === NA) continue;
            applicable++;
            if (status === 'completed') completed++;
            const m = parseScore(tr.querySelector('[data-f=memorisation_score]').value);
            const t = parseScore(tr.querySelector('[data-f=tajweed_score]').value);
            if (m != null) { memSum += m; memCount++; }
            if (t != null) { tajSum += t; tajCount++; }
        }
        const memPct = memCount ? Math.round(memSum / memCount / 5 * 100) : 0;
        const tajPct = tajCount ? Math.round(tajSum / tajCount / 5 * 100) : 0;
        const overall = memCount && tajCount ? Math.round((memPct + tajPct) / 2)
                      : memCount ? memPct : tajCount ? tajPct : 0;
        const div = document.getElementById('dua-overall');
        div.style.display = '';
        div.innerHTML = `
            <strong>Overall: ${overall}%</strong> &nbsp;·&nbsp;
            Memorisation avg: <strong>${memPct}%</strong> &nbsp;·&nbsp;
            Tajweed avg: <strong>${tajPct}%</strong> &nbsp;·&nbsp;
            Applicable duas: ${applicable} &nbsp;·&nbsp;
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

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
