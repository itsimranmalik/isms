/* Duas tracker — daily + namaz with class filter. */
import { audit } from '../supabase-client.js';
import { toast } from '../modules/toast.js';
export const title = 'Duas';

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
                        <option value="daily">Daily</option>
                        <option value="namaz">Namaz</option>
                    </select>
                </label>
                <div id="dua-summary" style="margin-left:auto"></div>
            </div>
            <div id="dua-list"><em>Pick a student.</em></div>
        </div>`;

    const classSel = document.getElementById('dua-class');
    const studentSel = document.getElementById('dua-student');
    const catSel = document.getElementById('dua-cat');

    classSel.addEventListener('change', loadStudents);
    studentSel.addEventListener('change', () => { if (studentSel.value) load(); else clearList(); });
    catSel.addEventListener('change', () => { if (studentSel.value) load(); });

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
            const s = r.students;
            if (s && !seen.has(s.id)) { seen.add(s.id); studs.push(s); }
        }
        studs.sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''));
        studentSel.innerHTML = '<option value="">— pick a student —</option>' +
            studs.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name} (${s.student_code})</option>`).join('');
        clearList();
    }

    function clearList() {
        document.getElementById('dua-list').innerHTML = '<em>Pick a student.</em>';
        document.getElementById('dua-summary').innerHTML = '';
    }

    async function load() {
        const studentId = Number(studentSel.value);
        const cat       = catSel.value;
        if (!studentId) return clearList();

        const { data: prog } = await supabase
            .from('dua_progress')
            .select('dua_id, status, score, tajweed_verified, assessed_on, comments')
            .eq('student_id', studentId);
        const map = new Map((prog || []).map(p => [p.dua_id, p]));

        const filtered = cat ? duas.filter(d => d.category === cat) : duas;
        const groups = {};
        for (const d of filtered) (groups[d.category] ||= []).push(d);

        let totals = { total: 0, completed: 0 };
        document.getElementById('dua-list').innerHTML = Object.entries(groups).map(([category, items]) => {
            const completed = items.filter(d => map.get(d.id)?.status === 'completed').length;
            totals.total += items.length;
            totals.completed += completed;
            const pct = items.length ? Math.round(completed / items.length * 100) : 0;
            return `
                <div class="card" style="margin-top: 16px">
                    <h3 style="text-transform:capitalize">${category} — ${completed}/${items.length} (${pct}%)</h3>
                    <table class="table">
                        <thead><tr><th>Title</th><th>Arabic</th><th>Status</th><th>Score</th><th>Tajweed?</th><th></th></tr></thead>
                        <tbody>
                            ${items.map(d => {
                                const p = map.get(d.id) || {};
                                return `<tr data-dua="${d.id}">
                                    <td><strong>${d.title}</strong><br><span class="text-muted" style="font-size:12px">${d.translation || ''}</span></td>
                                    <td class="arabic">${d.arabic_text || ''}</td>
                                    <td><select data-f="status">
                                        ${['pending','in_progress','completed'].map(s => `<option ${s === (p.status||'pending') ? 'selected':''}>${s}</option>`).join('')}
                                    </select></td>
                                    <td><input type="number" min="0" max="5" value="${p.score ?? 0}" data-f="score" style="width:60px"></td>
                                    <td><input type="checkbox" data-f="tajweed_verified" ${p.tajweed_verified ? 'checked' : ''}></td>
                                    <td><button class="btn btn-primary save-btn">Save</button></td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>`;
        }).join('');

        const overall = totals.total ? Math.round(totals.completed / totals.total * 100) : 0;
        document.getElementById('dua-summary').innerHTML = `<span class="chip">Overall: ${totals.completed}/${totals.total} (${overall}%)</span>`;

        root.querySelectorAll('.save-btn').forEach(btn => btn.addEventListener('click', async ev => {
            const tr = ev.target.closest('tr');
            const row = {
                student_id: studentId,
                dua_id:     Number(tr.dataset.dua),
                status:     tr.querySelector('[data-f=status]').value,
                score:      Number(tr.querySelector('[data-f=score]').value),
                tajweed_verified: tr.querySelector('[data-f=tajweed_verified]').checked,
                teacher_id: profile.teacher_id,
                assessed_on: new Date().toISOString().slice(0, 10),
            };
            const { error } = await supabase.from('dua_progress')
                .upsert(row, { onConflict: 'student_id,dua_id' });
            if (error) { toast.error(error.message); return; }
            await audit('duas.update', 'dua_progress', null, row);
            toast.success('Dua saved');
            load();
        }));
    }
}
