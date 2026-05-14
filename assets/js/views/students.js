/* Students CRUD */
import { audit } from '../supabase-client.js';
export const title = 'Students';

export async function render(root, { profile, supabase }) {
    const canWrite = profile.role === 'admin';
    root.innerHTML = `
        <div class="card">
            <div class="toolbar">
                <input id="search" type="search" class="form-input" placeholder="Search by name or code…" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)">
                ${canWrite ? '<button class="btn btn-primary" id="add-btn">+ Add student</button>' : ''}
                <span class="text-muted" id="count" style="margin-left:auto"></span>
            </div>
            <table class="table" id="students-table">
                <thead><tr><th>Code</th><th>Name</th><th>Guardian</th><th>Phone</th><th>Status</th><th></th></tr></thead>
                <tbody></tbody>
            </table>
        </div>
        <dialog id="student-dialog" style="border:0; border-radius: var(--radius); padding:0; max-width:520px; width:90%">
            <form id="student-form" style="padding:24px">
                <h2 id="dlg-title" style="margin-top:0; color: var(--green-700)">Add student</h2>
                <input type="hidden" name="id">
                <div class="form">
                    <div class="row">
                        <label>Code *<input required name="student_code"></label>
                        <label>Status<select name="status"><option>active</option><option>inactive</option></select></label>
                    </div>
                    <div class="row">
                        <label>First name *<input required name="first_name"></label>
                        <label>Last name  *<input required name="last_name"></label>
                    </div>
                    <div class="row">
                        <label>Date of birth<input type="date" name="date_of_birth"></label>
                        <label>Gender<select name="gender"><option value="">—</option><option>Male</option><option>Female</option></select></label>
                    </div>
                    <label>Guardian name<input name="guardian_name"></label>
                    <div class="row">
                        <label>Guardian phone<input name="guardian_phone"></label>
                        <label>Guardian email<input type="email" name="guardian_email"></label>
                    </div>
                    <label>Address<textarea name="address" rows="2"></textarea></label>
                </div>
                <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px">
                    <button class="btn" type="button" id="dlg-cancel">Cancel</button>
                    <button class="btn btn-primary" type="submit">Save</button>
                </div>
            </form>
        </dialog>`;

    const dlg = document.getElementById('student-dialog');
    const form = document.getElementById('student-form');
    const search = document.getElementById('search');
    let cache = [];

    async function load() {
        const { data, error } = await supabase.from('students')
            .select('*').order('last_name').order('first_name');
        if (error) { alert(error.message); return; }
        cache = data;
        renderRows();
    }

    function renderRows() {
        const q = search.value.toLowerCase().trim();
        const filtered = cache.filter(s =>
            !q || (s.first_name + ' ' + s.last_name + ' ' + s.student_code).toLowerCase().includes(q));
        document.getElementById('count').textContent = `${filtered.length} students`;
        const tbody = root.querySelector('tbody');
        tbody.innerHTML = filtered.map(s => `
            <tr>
                <td>${s.student_code}</td>
                <td>${s.first_name} ${s.last_name}</td>
                <td>${s.guardian_name || ''}</td>
                <td>${s.guardian_phone || ''}</td>
                <td><span class="chip ${s.status === 'active' ? '' : 'warn'}">${s.status}</span></td>
                <td>
                    ${canWrite ? `<button class="btn edit-btn" data-id="${s.id}">Edit</button>
                                  <button class="btn del-btn"  data-id="${s.id}">Delete</button>` : ''}
                </td>
            </tr>`).join('') || '<tr><td colspan="6"><em>No students.</em></td></tr>';

        tbody.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', () => openEdit(b.dataset.id)));
        tbody.querySelectorAll('.del-btn').forEach(b => b.addEventListener('click', () => del(b.dataset.id)));
    }

    function openEdit(id) {
        const s = cache.find(x => x.id == id) || {};
        document.getElementById('dlg-title').textContent = id ? 'Edit student' : 'Add student';
        for (const el of form.elements) {
            if (el.name && s[el.name] !== undefined) el.value = s[el.name] ?? '';
            else if (el.name && !id) el.value = '';
        }
        form.elements['id'].value = s.id || '';
        dlg.showModal();
    }

    async function del(id) {
        if (!confirm('Delete this student?')) return;
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) return alert(error.message);
        await audit('student.delete', 'student', id);
        load();
    }

    document.getElementById('add-btn')?.addEventListener('click', () => openEdit(null));
    document.getElementById('dlg-cancel').addEventListener('click', () => dlg.close());
    search.addEventListener('input', renderRows);

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(form);
        const payload = Object.fromEntries(fd.entries());
        const id = payload.id; delete payload.id;
        for (const k of Object.keys(payload)) if (payload[k] === '') payload[k] = null;
        let res;
        if (id) res = await supabase.from('students').update(payload).eq('id', id);
        else    res = await supabase.from('students').insert(payload);
        if (res.error) { alert(res.error.message); return; }
        await audit(id ? 'student.update' : 'student.create', 'student', id || null, payload);
        dlg.close();
        load();
    });

    load();
}
