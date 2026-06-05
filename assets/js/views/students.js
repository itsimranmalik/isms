/* Students CRUD — with admin-only "create login" + "reset password" via Edge Functions */
import { audit } from '../supabase-client.js';
import { createLogin, adminUpdateUser } from '../modules/admin-users.js';
import { toast } from '../modules/toast.js';
export const title = 'Students';

export async function render(root, { profile, supabase }) {
    const canWrite = profile.role === 'admin';
    root.innerHTML = `
        <div class="card">
            <div class="toolbar">
                <input id="search" type="search" placeholder="Search by name or code…" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)">
                ${canWrite ? '<button class="btn btn-primary" id="add-btn">+ Add student</button>' : ''}
                <span class="text-muted" id="count" style="margin-left:auto"></span>
            </div>
            <table class="table" id="students-table">
                <thead><tr><th>Code</th><th>Name</th><th>Guardian</th><th>Phone</th><th>Login?</th><th>Status</th><th></th></tr></thead>
                <tbody></tbody>
            </table>
        </div>

        <dialog id="student-dialog" style="border:0; border-radius: var(--radius); padding:0; max-width:600px; width:92%">
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

                    <fieldset id="creds-new" style="border:1px solid var(--border); border-radius:8px; padding:14px; margin-top:6px">
                        <legend style="color:var(--green-700); font-weight:600; padding:0 8px">Login credentials</legend>
                        <p class="text-muted" style="font-size:13px; margin:0 0 12px">
                            Optional. Pick a username the student (or guardian) will type when signing in. Letters, digits, dot/underscore/dash; 3–40 characters. (A real email is also accepted.)
                        </p>
                        <div class="row">
                            <label>Username<input type="text" name="login_username" placeholder="aisha.s" autocomplete="off"></label>
                            <label>Password<input type="password" name="login_password" placeholder="min 8 chars" autocomplete="new-password"></label>
                        </div>
                    </fieldset>

                    <fieldset id="creds-reset" style="border:1px solid var(--border); border-radius:8px; padding:14px; margin-top:6px; display:none">
                        <legend style="color:var(--green-700); font-weight:600; padding:0 8px">Reset password</legend>
                        <p class="text-muted" style="font-size:13px; margin:0 0 10px">
                            This student already has a login. Enter a new password to reset it, or leave blank to keep the existing password.
                        </p>
                        <label>New password (min 8 chars)<input type="password" minlength="8" name="new_password" placeholder="leave blank to skip" autocomplete="new-password"></label>
                    </fieldset>
                </div>
                <div id="form-alert"></div>
                <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px">
                    <button class="btn" type="button" id="dlg-cancel">Cancel</button>
                    <button class="btn btn-primary" type="submit" id="dlg-save">Save</button>
                </div>
            </form>
        </dialog>`;

    const dlg = document.getElementById('student-dialog');
    const form = document.getElementById('student-form');
    const search = document.getElementById('search');
    let cache = [];

    async function load() {
        const { data, error } = await supabase
            .from('students').select('*').order('last_name').order('first_name');
        if (error) { alert(error.message); return; }
        cache = data;
        renderRows();
    }

    function renderRows() {
        const q = (search?.value || '').toLowerCase().trim();
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
                <td>${s.user_id
                        ? '<span class="chip">linked</span>'
                        : (canWrite ? '<button class="btn add-login-btn" data-id="' + s.id + '">+ Create login</button>' : '<span class="chip warn">no login</span>')}</td>
                <td><span class="chip ${s.status === 'active' ? '' : 'warn'}">${s.status}</span></td>
                <td>${canWrite ? `<button class="btn edit-btn" data-id="${s.id}">Edit</button>
                                   <button class="btn del-btn"  data-id="${s.id}">Delete</button>` : ''}</td>
            </tr>`).join('') || '<tr><td colspan="7"><em>No students.</em></td></tr>';

        tbody.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', () => openEdit(b.dataset.id)));
        tbody.querySelectorAll('.del-btn').forEach(b => b.addEventListener('click', () => del(b.dataset.id)));
        tbody.querySelectorAll('.add-login-btn').forEach(b => b.addEventListener('click', () => openEdit(b.dataset.id)));
    }

    function openEdit(id) {
        const s = cache.find(x => String(x.id) === String(id)) || {};
        document.getElementById('dlg-title').textContent = id ? 'Edit student' : 'Add student';
        for (const el of form.elements) {
            if (!el.name) continue;
            if (el.name === 'login_username' || el.name === 'login_password' || el.name === 'new_password') {
                el.value = ''; continue;
            }
            if (el.name === 'id') { el.value = s.id || ''; continue; }
            el.value = s[el.name] != null ? s[el.name] : '';
        }
        // If creating a login for an existing unlinked student, suggest a username
        if (s.id && !s.user_id) {
            const guess = (s.student_code || s.last_name || 'user')
                .toLowerCase().replace(/[^a-z0-9._-]/g, '');
            form.elements['login_username'].value = guess;
        }
        // Swap between "Login credentials" (new) and "Reset password" (existing)
        const fsNew   = form.querySelector('#creds-new');
        const fsReset = form.querySelector('#creds-reset');
        if (s.user_id) {
            fsNew.style.display   = 'none';
            fsReset.style.display = '';
        } else {
            fsNew.style.display   = '';
            fsReset.style.display = 'none';
        }
        form.dataset.userId = s.user_id || '';
        document.getElementById('form-alert').innerHTML = '';
        dlg.showModal();
    }

    async function del(id) {
        if (!confirm('Delete this student?')) return;
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) { toast.error(error.message); return; }
        await audit('student.delete', 'student', id);
        toast.success('Student deleted.');
        load();
    }

    document.getElementById('add-btn')?.addEventListener('click', () => openEdit(null));
    document.getElementById('dlg-cancel').addEventListener('click', () => dlg.close());
    search?.addEventListener('input', renderRows);

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const alertBox = document.getElementById('form-alert');
        const saveBtn  = document.getElementById('dlg-save');
        alertBox.innerHTML = '';
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';

        try {
            const payload = Object.fromEntries(new FormData(form).entries());
            const id            = payload.id;             delete payload.id;
            const loginUsername = payload.login_username; delete payload.login_username;
            const loginPassword = payload.login_password; delete payload.login_password;
            const newPassword   = payload.new_password;   delete payload.new_password;
            for (const k of Object.keys(payload)) if (payload[k] === '') payload[k] = null;

            const existingUserId = form.dataset.userId || '';

            let studentId = id;
            if (id) {
                const { error } = await supabase.from('students').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('students').insert(payload).select('id').single();
                if (error) throw error;
                studentId = data.id;
            }
            await audit(id ? 'student.update' : 'student.create', 'student', studentId, payload);

            // Linked student + new password entered → reset via Edge Function
            if (existingUserId && newPassword) {
                if (newPassword.length < 8) throw new Error('Password must be at least 8 characters.');
                const fullName = `${payload.first_name || ''} ${payload.last_name || ''}`.trim();
                await adminUpdateUser({
                    user_id:   existingUserId,
                    password:  newPassword,
                    full_name: fullName,
                });
                await audit('student.password_reset', 'student', studentId, { user_id: existingUserId });
                alertBox.innerHTML = `<div class="alert alert-success">Student saved and password reset.</div>`;
                toast.success('Student saved and password reset');
                setTimeout(() => { dlg.close(); load(); }, 1500);
            }
            // No existing login + credentials entered → create new login
            else if (!existingUserId && loginUsername && loginPassword) {
                const fullName = `${payload.first_name || ''} ${payload.last_name || ''}`.trim();
                await createLogin({
                    username:   loginUsername,
                    password:   loginPassword,
                    full_name:  fullName,
                    role:       'student',
                    student_id: Number(studentId),
                });
                alertBox.innerHTML = `<div class="alert alert-success">Student saved and login created. They can sign in with username <strong>${loginUsername}</strong>.</div>`;
                toast.success('Student saved and login created');
                setTimeout(() => { dlg.close(); load(); }, 1500);
            }
            // Just a record update, no credential changes
            else {
                toast.success(id ? 'Student updated' : 'Student created');
                dlg.close();
                load();
            }
        } catch (err) {
            alertBox.innerHTML = `<div class="alert alert-danger">${err.message || 'Save failed.'}</div>`;
            toast.error(err.message || 'Save failed');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    });

    load();
}
