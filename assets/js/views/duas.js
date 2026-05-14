/* Duas tracker — daily + namaz, oral assessment */
import { audit } from '../supabase-client.js';
export const title = 'Duas';

export async function render(root, { profile, supabase }) {
    const isStaff = profile.role === 'admin' || profile.role === 'teacher';
    if (!isStaff) {
        root.innerHTML = '<div class="alert alert-danger">Only staff can grade duas.</div>';
        return;
    }
    const [{ data: students }, { data: duas }] = await Promise.all([
        supabase.from('students').select('id, first_name, last_name').order('last_name'),
        supabase.from('duas').select('*').order('category').order('sort_order'),
    ]);

    root.innerHTML = `
        <div class="card">
            <div class="toolbar">
                <label class="field">Student
                    <select id="dua-student">
                        ${(students || []).map(s => `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`).join('')}
                    </select>
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
            <div id="dua-list"></div>
        </div>`;

    const studentSel = document.getElementById('dua-student');
    const catSel     = document.getElementById('dua-cat');
    studentSel.addEventListener('change', load);
    catSel.addEventListener('change', load);
    if (students?.length) load();

    async function load() {
        const studentId = Number(studentSel.value);
        const cat       = catSel.value;
        const { data: prog } = await supabase
            .from('dua_progress')
            .select('dua_id, status, score, tajweed_verified, assessed_on, comments')
            .eq('student_id', studentId);
        const map = new Map((prog || []).map(p => [p.dua_id, p]));

        const filtered = cat ? duas.filter(d => d.category === cat) : duas;
        // Group by category
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
                    <div class="progress" style="margin-bottom:12px"><span style="width:${pct}%"></span></div>
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
            if (error) return alert(error.message);
            await audit('duas.update', 'dua_progress', null, row);
            load();
        }));
    }
}
