/* Memorisation tracker — teacher/admin view */
import { audit } from '../supabase-client.js';
export const title = 'Memorisation';

export async function render(root, { profile, supabase }) {
    const isStaff = profile.role === 'admin' || profile.role === 'teacher';
    if (!isStaff) {
        root.innerHTML = '<div class="alert alert-danger">Only staff can update memorisation.</div>';
        return;
    }
    const [{ data: students }, { data: surahs }] = await Promise.all([
        supabase.from('students').select('id, first_name, last_name').order('last_name'),
        supabase.from('surahs').select('id, number, name_transliteration, total_ayahs').order('number'),
    ]);

    root.innerHTML = `
        <div class="card">
            <div class="toolbar">
                <label class="field">Student
                    <select id="memo-student">
                        ${(students || []).map(s => `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`).join('')}
                    </select>
                </label>
                <div id="memo-summary" style="margin-left:auto"></div>
            </div>
            <table class="table" id="memo-table">
                <thead><tr><th>#</th><th>Surah</th><th>Memorised</th><th>Status</th><th>Quality (0-5)</th><th>Last revised</th><th></th></tr></thead>
                <tbody></tbody>
            </table>
        </div>`;

    const sel = document.getElementById('memo-student');
    sel.addEventListener('change', () => load(Number(sel.value)));
    if (students?.length) load(Number(sel.value));

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
            const ayahs = Number(tr.querySelector('[data-f=ayahs_memorised]').value);
            const status = tr.querySelector('[data-f=status]').value;
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
            if (error) return alert(error.message);
            await audit('memorisation.update', 'memorisation_progress', null, row);
            load(studentId);
        }));
    }
}
