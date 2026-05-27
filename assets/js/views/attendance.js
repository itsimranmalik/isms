/* Attendance grid: one click per student per day */
import { audit } from '../supabase-client.js';
import { toast } from '../modules/toast.js';
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
                <span id="dirty-pill" class="unsaved-pill" style="display:none">● Unsaved changes</span>
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

    let initialState = {};   // student_id -> original status, for dirty detection
    const pill = () => document.getElementById('dirty-pill');

    async function load() {
        const cid = Number(classSel.value);
        if (!cid) { saveBtn.disabled = true; return; }
        const [{ data: roster }, { data: existing }] = await Promise.all([
            supabase.from('class_students').select('student_id, students(id, first_name, last_name)').eq('class_id', cid),
            supabase.from('attendance').select('student_id, status').eq('class_id', cid).eq('attended_on', dateInp.value),
        ]);
        const status = new Map((existing || []).map(r => [r.student_id, r.status]));
        initialState = {};
        const tbody = root.querySelector('tbody');
        tbody.innerHTML = (roster || []).map(r => {
            const s = r.students;
            const cur = status.get(s.id) || 'present';
            initialState[s.id] = cur;
            return `<tr data-id="${s.id}">
                <td>${s.first_name} ${s.last_name}</td>
                ${['present','absent','late','excused'].map(st => `
                    <td><input type="radio" name="s-${s.id}" value="${st}" ${st === cur ? 'checked' : ''}></td>
                `).join('')}
            </tr>`;
        }).join('') || '<tr><td colspan="5"><em>No students enrolled in this class.</em></td></tr>';
        saveBtn.disabled = !(roster && roster.length);
        markDirty(false);
        // Mark row dirty when radio changes; flip the unsaved-changes pill
        tbody.querySelectorAll('input[type=radio]').forEach(r => r.addEventListener('change', () => {
            const tr = r.closest('tr');
            const sid = tr.dataset.id;
            const cur = tr.querySelector('input[type=radio]:checked')?.value;
            const dirty = cur !== initialState[sid];
            tr.classList.toggle('row-dirty', dirty);
            refreshPill();
        }));
    }

    function refreshPill() {
        const dirtyCount = root.querySelectorAll('tr.row-dirty').length;
        const p = pill();
        if (!p) return;
        if (dirtyCount > 0) {
            p.style.display = '';
            p.textContent = `● ${dirtyCount} unsaved change${dirtyCount === 1 ? '' : 's'}`;
            saveBtn.classList.add('btn-primary');
        } else {
            p.style.display = 'none';
        }
    }
    function markDirty(_) { refreshPill(); }

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
        if (error) { toast.error(error.message); return; }
        await audit('attendance.bulk', 'attendance', cid, { date, count: entries.length });
        toast.success(`Attendance saved for ${entries.length} students`);
        // Reload so the dirty markers clear and the "initial state" picks up the new saved values
        await load();
    });
}
