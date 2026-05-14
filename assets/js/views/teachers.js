/* Teachers CRUD (admin) */
import { audit } from '../supabase-client.js';
export const title = 'Teachers';

export async function render(root, { profile, supabase }) {
    const canWrite = profile.role === 'admin';
    root.innerHTML = `
        <div class="card">
            <div class="toolbar">
                ${canWrite ? '<button class="btn btn-primary" id="add-btn">+ Add teacher</button>' : ''}
                <span class="text-muted" id="count" style="margin-left:auto"></span>
            </div>
            <table class="table">
                <thead><tr><th>Code</th><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th></th></tr></thead>
                <tbody></tbody>
            </table>
        </div>
        <dialog id="teacher-dialog" style="border:0; border-radius: var(--radius); padding:0; max-width:520px; width:90%">
            <form id="teacher-form" style="padding:24px">
                <h2 id="dlg-title" style="margin-top:0; color: var(--green-700)">Add teacher</h2>
                <input type="hidden" name="id">
                <div class="form">
                    <div class="row">
                        <label>Staff code *<input required name="staff_code"></label>
                        <label>Status<select name="status"><option>active</option><option>inactive</option></select></label>
                    </div>
                    <div class="row">
                        <label>First name *<input required name="first_name"></label>
                        <label>Last name  *<input required name="last_name"></label>
                    </div>
                    <label>Email<input type="email" name="email"></label>
                    <label>Phone<input name="phone"></label>
                    <label>Qualifications<textarea name="qualifications" rows="2"></textarea></label>
                    <label>Linked WP user (auth UUID)<input name="user_id" placeholder="Leave blank to link later"></label>
                </div>
                <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px">
                    <button class="btn" type="button" id="dlg-cancel">Cancel</button>
                    <button class="btn btn-primary" type="submit">Save</button>
                </div>
            </form>
        </dialog>`;

    const dlg = document.getElementById('teacher-dialog');
    const form = document.getElementById('teacher-form');

    async function load() {
        const { data } = await supabase.from('teachers').select('*').order('last_name');
        document.getElementById('count').textContent = `${data?.length || 0} teachers`;
        const tbody = root.querySelector('tbody');
        tbody.innerHTML = (data || []).map(t => `
            <tr>
                <td>${t.staff_code}</td>
                <td>${t.first_name} ${t.last_name}</td>
                <td>${t.email || ''}</td>
                <td>${t.phone || ''}</td>
                <td><span class="chip ${t.status === 'active' ? '' : 'warn'}">${t.status}</span></td>
                <td>${canWrite ? `<button class="btn edit-btn" data-id='${JSON.stringify(t)}'>Edit</button>
                                   <button class="btn del-btn" data-id="${t.id}">Delete</button>` : ''}</td>
            </tr>`).join('') || '<tr><td colspan="6"><em>No teachers.</em></td></tr>';

        tbody.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', () => openEdit(JSON.parse(b.dataset.id))));
        tbody.querySelectorAll('.del-btn').forEach(b => b.addEventListener('click', () => del(b.dataset.id)));
    }

    function openEdit(t) {
        document.getElementById('dlg-title').textContent = t ? 'Edit teacher' : 'Add teacher';
        for (const el of form.elements) {
            if (el.name) el.value = t && t[el.name] != null ? t[el.name] : '';
        }
        form.elements['id'].value = t?.id || '';
        dlg.showModal();
    }
    async function del(id) {
        if (!confirm('Delete this teacher?')) return;
        const { error } = await supabase.from('teachers').delete().eq('id', id);
        if (error) return alert(error.message);
        await audit('teacher.delete', 'teacher', id);
        load();
    }

    document.getElementById('add-btn')?.addEventListener('click', () => openEdit(null));
    document.getElementById('dlg-cancel').addEventListener('click', () => dlg.close());

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(form).entries());
        const id = payload.id; delete payload.id;
        if (!payload.user_id) delete payload.user_id;  // optional
        for (const k of Object.keys(payload)) if (payload[k] === '') payload[k] = null;
        let res;
        if (id) res = await supabase.from('teachers').update(payload).eq('id', id);
        else    res = await supabase.from('teachers').insert(payload);
        if (res.error) { alert(res.error.message); return; }
        await audit(id ? 'teacher.update' : 'teacher.create', 'teacher', id || null, payload);
        dlg.close();
        load();
    });

    load();
}
