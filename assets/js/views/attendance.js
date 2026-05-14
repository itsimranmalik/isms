/* Attendance grid: one click per student per day */
import { audit } from '../supabase-client.js';
export const title = 'Attendance';

export async function render(root, { profile, supabase }) {
    const { data: classes } = await supabase.from('classes').select('id, name').order('name');
    root.innerHTML = `
        <div class="card">
            <div class="toolbar">
                <label class="field">Class
                    <select id="att-class">
                        <option value="">Pick a class…</option>
                        ${(classes || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </label>
                <label class="field">Date
                    <input type="date" id="att-date" value="${new Date().toISOString().slice(0, 10)}">
                </label>
                <button class="btn btn-primary" id="save-btn" disabled>Save attendance</button>
            </div>
            <table class="table" id="att-table">
                <thead><tr><th>Student</th><th>Present</th><th>Absent</th><th>Late</th><th>Excused</th></tr></thead>
                <tbody></tbody>
            </table>
        </div>`;

    const params = new URLSearchParams((location.hash.split('?')[1]) || '');
    if (params.get('class')) document.getElementById('att-class').value = params.get('class');

    const classSel = document.getElementById('att-class');
    const dateInp  = document.getElementById('att-date');
    const saveBtn  = document.getElementById('save-btn');
    classSel.addEventListener('change', load);
    dateInp.addEventListener('change', load);
    if (classSel.value) load();

    async function load() {
        const cid = Number(classSel.value);
        if (!cid) { saveBtn.disabled = true; return; }
        const [{ data: roster }, { data: existing }] = await Promise.all([
            supabase.from('class_students').select('student_id, students(id, first_name, last_name)').eq('class_id', cid),
            supabase.from('attendance').select('student_id, status').eq('class_id', cid).eq('attended_on', dateInp.value),
        ]);
        const status = new Map((existing || []).map(r => [r.student_id, r.status]));
        const tbody = root.querySelector('tbody');
        tbody.innerHTML = (roster || []).map(r => {
            const s = r.students;
            const cur = status.get(s.id) || 'present';
            return `<tr data-id="${s.id}">
                <td>${s.first_name} ${s.last_name}</td>
                ${['present','absent','late','excused'].map(st => `
                    <td><input type="radio" name="s-${s.id}" value="${st}" ${st === cur ? 'checked' : ''}></td>
                `).join('')}
            </tr>`;
        }).join('') || '<tr><td colspan="5"><em>No students enrolled in this class.</em></td></tr>';
        saveBtn.disabled = !(roster && roster.length);
    }

    saveBtn.addEventListener('click', async () => {
        const cid = Number(classSel.value);
        const date = dateInp.value;
        const rows = [...root.querySelectorAll('tbody tr')];
        const entries = rows.map(tr => ({
            student_id: Number(tr.dataset.id),
            class_id: cid,
            attended_on: date,
            status: tr.querySelector('input[type=radio]:checked')?.value || 'absent',
            recorded_by: profile.teacher_id || null,
        }));
        const { error } = await supabase.from('attendance').upsert(entries, { onConflict: 'student_id,class_id,attended_on' });
        if (error) return alert(error.message);
        await audit('attendance.bulk', 'attendance', cid, { date, count: entries.length });
        alert(`Saved ${entries.length} attendance entries.`);
    });
}
