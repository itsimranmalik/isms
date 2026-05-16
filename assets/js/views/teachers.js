/* Teachers CRUD — with admin-only "create login" via Edge Function */
import { audit } from '../supabase-client.js';
import { createLogin } from '../modules/admin-users.js';
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
                <thead><tr><th>Code</th><th>Name</th><th>Email</th><th>Phone</th><th>Login?</th><th>Status</th><th></th></tr></thead>
                <tbody></tbody>
            </table>
        </div>

        <dialog id="teacher-dialog" style="border:0; border-radius: var(--radius); padding:0; max-width:560px; width:92%">
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
                    <div class="row">
                        <label>Phone<input name="phone"></label>
                        <label>Profile email<input type="email" name="email" placeholder="contact email for records"></label>
                    </div>
                    <label>Qualifications<textarea name="qualifications" rows="2"></textarea></label>

                    <fieldset style="border:1px solid var(--border); border-radius:8px; padding:14px; margin-top:6px">
                        <legend style="color:var(--green-700); font-weight:600; padding:0 8px">Login credentials</legend>
                        <p class="text-muted" style="font-size:13px; margin:0 0 12px">
                            Set a username (email) and password the teacher will use to sign in. Leave blank to create the record without a login (you can add it later).
                        </p>
                        <div class="row">
                            <label>Login email (username)<input type="email" name="login_email" placeholder="teacher@school.com"></label>
                            <label>Login password<input type="password" name="login_password" placeholder="min 8 chars"></label>
                        </div>
                        <p class="text-muted" style="font-size:12px; margin:8px 0 0">
                            On save, the auth user is created in Supabase and linked to this teacher record automatically.
                        </p>
                    </fieldset>
                </div>
                <div id="form-alert"></div>
                <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px">
                    <button class="btn" type="button" id="dlg-cancel">Cancel</button>
                    <button class="btn btn-primary" type="submit" id="dlg-save">Save</button>
                </div>
            </form>
        </dialog>`;

    const dlg  = document.getElementById('teacher-dialog');
    const form = document.getElementById('teacher-form');

    async function load() {
        const { data, error } = await supabase
            .from('teachers')
            .select('id, staff_code, first_name, last_name, email, phone, status, user_id')
            .order('last_name');
        if (error) { alert(error.message); return; }
        document.getElementById('count').textContent = `${data?.length || 0} teachers`;
        const tbody = root.querySelector('tbody');
        tbody.innerHTML = (data || []).map(t => `
            <tr>
                <td>${t.staff_code}</td>
                <td>${t.first_name} ${t.last_name}</td>
                <td>${t.email || ''}</td>
                <td>${t.phone || ''}</td>
                <td>${t.user_id
                        ? '<span class="chip">linked</span>'
                        : (canWrite ? '<button class="btn add-login-btn" data-id="' + t.id + '">+ Create login</button>' : '<span class="chip warn">no login</span>')}</td>
                <td><span class="chip ${t.status === 'active' ? '' : 'warn'}">${t.status}</span></td>
                <td>${canWrite ? `<button class="btn edit-btn" data-id='${JSON.stringify(t).replace(/'/g, "&apos;")}'>Edit</button>
                                   <button class="btn del-btn"  data-id="${t.id}">Delete</button>` : ''}</td>
            </tr>`).join('') || '<tr><td colspan="7"><em>No teachers.</em></td></tr>';

        tbody.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', () => {
            const raw = b.dataset.id.replace(/&apos;/g, "'");
            openEdit(JSON.parse(raw));
        }));
        tbody.querySelectorAll('.del-btn').forEach(b => b.addEventListener('click', () => del(b.dataset.id)));
        tbody.querySelectorAll('.add-login-btn').forEach(b => b.addEventListener('click', () => openLoginForExisting(Number(b.dataset.id))));
    }

    function openEdit(t) {
        document.getElementById('dlg-title').textContent = t ? 'Edit teacher' : 'Add teacher';
        for (const el of form.elements) {
            if (el.name && el.name !== 'id' && el.name !== 'login_email' && el.name !== 'login_password') {
                el.value = t && t[el.name] != null ? t[el.name] : '';
            }
        }
        form.elements['id'].value = t?.id || '';
        form.elements['login_email'].value = '';
        form.elements['login_password'].value = '';
        // If editing and already linked, hide the credentials fieldset
        const fs = form.querySelector('fieldset');
        if (t?.user_id) {
            fs.style.display = 'none';
        } else {
            fs.style.display = '';
        }
        document.getElementById('form-alert').innerHTML = '';
        dlg.showModal();
    }

    function openLoginForExisting(teacherId) {
        // Open the dialog pre-populated for adding a login to an existing teacher
        supabase.from('teachers').select('*').eq('id', teacherId).single().then(({ data }) => {
            if (!data) return;
            openEdit(data);
            // Hint: prefill login_email from profile email if present
            if (data.email) form.elements['login_email'].value = data.email;
        });
    }

    async function del(id) {
        if (!confirm('Delete this teacher? Their linked login (if any) will remain in Supabase Auth — remove it manually if needed.')) return;
        const { error } = await supabase.from('teachers').delete().eq('id', id);
        if (error) return alert(error.message);
        await audit('teacher.delete', 'teacher', id);
        load();
    }

    document.getElementById('add-btn')?.addEventListener('click', () => openEdit(null));
    document.getElementById('dlg-cancel').addEventListener('click', () => dlg.close());

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const alertBox = document.getElementById('form-alert');
        const saveBtn  = document.getElementById('dlg-save');
        alertBox.innerHTML = '';
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';

        try {
            const payload = Object.fromEntries(new FormData(form).entries());
            const id            = payload.id;            delete payload.id;
            const loginEmail    = payload.login_email;    delete payload.login_email;
            const loginPassword = payload.login_password; delete payload.login_password;
            for (const k of Object.keys(payload)) if (payload[k] === '') payload[k] = null;

            // 1) Insert/update the teacher row first
            let teacherId = id;
            if (id) {
                const { error } = await supabase.from('teachers').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('teachers').insert(payload).select('id').single();
                if (error) throw error;
                teacherId = data.id;
            }
            await audit(id ? 'teacher.update' : 'teacher.create', 'teacher', teacherId, payload);

            // 2) If admin entered login credentials, create the auth user + link
            if (loginEmail && loginPassword) {
                const fullName = `${payload.first_name || ''} ${payload.last_name || ''}`.trim();
                await createLogin({
                    email:      loginEmail,
                    password:   loginPassword,
                    full_name:  fullName,
                    role:       'teacher',
                    teacher_id: Number(teacherId),
                });
                alertBox.innerHTML = `<div class="alert alert-success">Teacher saved and login created. They can now sign in with <strong>${loginEmail}</strong>.</div>`;
                setTimeout(() => { dlg.close(); load(); }, 1200);
            } else {
                dlg.close();
                load();
            }
        } catch (err) {
            alertBox.innerHTML = `<div class="alert alert-danger">${err.message || 'Save failed.'}</div>`;
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    });

    load();
}
