/* Admins management — list + create + edit (name & password) + demote. */
import { audit } from '../supabase-client.js';
import { createLogin, adminUpdateUser } from '../modules/admin-users.js';
import { toast } from '../modules/toast.js';

export const title = 'Admins';

export async function render(root, { profile, supabase }) {
    if (profile.role !== 'admin') {
        root.innerHTML = '<div class="alert alert-danger">Admin only.</div>';
        return;
    }

    root.innerHTML = `
        <p class="text-muted" style="margin-top:0">
            Manage admin accounts. There must always be at least one admin —
            the system blocks demoting the last one.
        </p>

        <div class="grid-app">
            <div class="card span-7">
                <h3 style="margin-top:0">Current admins</h3>
                <table class="table" id="admins-table">
                    <thead><tr><th>Name</th><th>Type</th><th>Account ID</th><th></th></tr></thead>
                    <tbody><tr><td colspan="4"><em>Loading…</em></td></tr></tbody>
                </table>
                <p class="text-muted" style="font-size:12px; margin-top:6px">
                    "Teacher + Admin" wears both hats — they keep their teaching duties and gain admin access.
                    "Admin only" has no linked teacher record (cannot be demoted without breaking their account).
                </p>
            </div>

            <div class="card span-5">
                <h3 style="margin-top:0">Promote a teacher to admin</h3>
                <p class="text-muted" style="font-size:13px; margin:0 0 10px">
                    Give an existing teacher full admin access. You can revoke it any time via the Demote button.
                </p>
                <form class="form" id="promote-form">
                    <label>Teacher to promote
                        <select required name="profile_id" id="promote-select">
                            <option value="">Loading teachers…</option>
                        </select>
                    </label>
                    <div id="promote-alert"></div>
                    <button class="btn btn-primary" type="submit" id="promote-btn">Promote to admin</button>
                </form>

                <hr style="margin:18px 0; border:0; border-top:1px solid var(--border)">

                <h3 style="margin-top:0">+ Create a brand-new admin account</h3>
                <form class="form" id="add-admin-form">
                    <label>Full name<input required name="full_name" placeholder="e.g. Aisha Khan"></label>
                    <label>Username or email<input required name="username" placeholder="aisha.k or aisha@example.com"></label>
                    <label>Password (min 8 chars)<input required minlength="8" type="password" name="password"></label>
                    <div id="add-alert"></div>
                    <button class="btn btn-primary" type="submit" id="add-btn">Create admin</button>
                </form>
                <p class="text-muted" style="font-size:12px; margin-top:10px">
                    Use this only when the new admin is NOT one of your existing teachers.
                </p>
            </div>
        </div>

        <dialog id="adm-dialog" style="border:0; border-radius:var(--radius); padding:0; max-width:520px; width:92%">
            <form id="adm-form" style="padding:24px">
                <h2 style="margin-top:0; color:var(--green-700)">Edit admin</h2>
                <input type="hidden" name="user_id">
                <div class="form">
                    <label>Full name<input required name="full_name"></label>
                    <fieldset style="border:1px solid var(--border); border-radius:8px; padding:14px; margin-top:6px">
                        <legend style="color:var(--green-700); font-weight:600; padding:0 8px">Reset password</legend>
                        <p class="text-muted" style="font-size:13px; margin:0 0 10px">
                            Leave blank to keep the existing password.
                        </p>
                        <label>New password (min 8 chars)<input type="password" minlength="8" name="new_password" autocomplete="new-password" placeholder="leave blank to skip"></label>
                    </fieldset>
                </div>
                <div id="adm-alert" style="margin-top:8px"></div>
                <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:14px">
                    <button class="btn" type="button" id="adm-cancel">Cancel</button>
                    <button class="btn btn-primary" type="submit" id="adm-save">Save</button>
                </div>
            </form>
        </dialog>`;

    const dlg = document.getElementById('adm-dialog');

    await load();

    async function load() {
        const [{ data: admins, error }, { data: teacherProfiles }] = await Promise.all([
            supabase.from('profiles').select('id, full_name, teacher_id').eq('role', 'admin').order('full_name'),
            supabase.from('profiles')
                .select('id, full_name, teacher_id, teachers(staff_code)')
                .eq('role', 'teacher')
                .not('teacher_id', 'is', null)
                .order('full_name'),
        ]);
        if (error) {
            root.querySelector('tbody').innerHTML =
                `<tr><td colspan="4"><div class="alert alert-danger">${error.message}</div></td></tr>`;
            return;
        }
        const meId = profile.id;
        const isLastAdmin = (admins || []).length <= 1;

        root.querySelector('#admins-table tbody').innerHTML = (admins || []).map(a => {
            const isYou       = a.id === meId;
            const hasTeacher  = a.teacher_id != null;
            const typeChip    = hasTeacher
                ? '<span class="chip">Teacher + Admin</span>'
                : '<span class="chip gold">Admin only</span>';
            // Block the Demote button for the last admin, for self, and for "Admin only" admins (would lose access).
            const canDemote   = !isYou && !isLastAdmin && hasTeacher;
            return `<tr>
                <td>${escape(a.full_name || '(no name)')} ${isYou ? '<span class="chip">you</span>' : ''}</td>
                <td>${typeChip}</td>
                <td><code style="font-size:11px">${a.id}</code></td>
                <td style="white-space:nowrap">
                    <button class="btn edit-btn" data-id="${a.id}" data-name='${(a.full_name || '').replace(/'/g, "&apos;").replace(/"/g, "&quot;")}'>Edit</button>
                    ${canDemote
                        ? `<button class="btn demote-btn" data-id="${a.id}" data-name="${escape(a.full_name || '')}">Demote</button>`
                        : (isLastAdmin && admins.length === 1
                            ? '<span class="chip warn" style="margin-left:6px">last admin</span>'
                            : (!hasTeacher && !isYou
                                ? '<span class="chip warn" style="margin-left:6px" title="No teacher record to fall back to">cannot demote</span>'
                                : ''))}
                </td>
            </tr>`;
        }).join('') || '<tr><td colspan="4"><em>No admins.</em></td></tr>';

        // Populate the "Promote a teacher" dropdown with teachers who are not already admins.
        const promoteSel = document.getElementById('promote-select');
        if (promoteSel) {
            const eligible = (teacherProfiles || []);
            if (eligible.length === 0) {
                promoteSel.innerHTML = '<option value="">No teachers available to promote.</option>';
            } else {
                promoteSel.innerHTML = '<option value="">— pick a teacher —</option>'
                    + eligible.map(t => `<option value="${t.id}">${escape(t.full_name || 'Unnamed')}${t.teachers?.staff_code ? ' ('+t.teachers.staff_code+')' : ''}</option>`).join('');
            }
        }

        root.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', () => {
            openEdit(b.dataset.id, b.dataset.name.replace(/&apos;/g, "'").replace(/&quot;/g, '"'));
        }));
        root.querySelectorAll('.demote-btn').forEach(b => b.addEventListener('click', async () => {
            const id = b.dataset.id, name = b.dataset.name;
            // Double-check: never demote an admin with no teacher_id (they'd be locked out)
            const target = (admins || []).find(a => a.id === id);
            if (!target?.teacher_id) {
                toast.error('Cannot demote — this admin has no linked teacher record.');
                return;
            }
            if (!confirm(`Demote ${name} from admin back to teacher? They'll lose access to admin-only screens but keep their teaching duties. You can promote them back any time.`)) return;
            const { error } = await supabase.from('profiles').update({ role: 'teacher' }).eq('id', id);
            if (error) { toast.error(error.message); return; }
            await audit('admin.demote', 'profile', null, { user_id: id });
            toast.success(`${name} demoted to teacher`);
            load();
        }));
    }

    // Promote handler — flip a teacher's role to 'admin'.
    document.getElementById('promote-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertBox = document.getElementById('promote-alert');
        const btn      = document.getElementById('promote-btn');
        alertBox.innerHTML = '';
        btn.disabled = true; btn.textContent = 'Promoting…';
        try {
            const fd = new FormData(e.target);
            const profileId = fd.get('profile_id');
            if (!profileId) throw new Error('Pick a teacher first.');
            const sel  = document.getElementById('promote-select');
            const name = sel.options[sel.selectedIndex]?.text || 'teacher';
            const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', profileId);
            if (error) throw error;
            await audit('admin.promote', 'profile', null, { user_id: profileId });
            alertBox.innerHTML = `<div class="alert alert-success">${escape(name)} is now an admin. They'll see admin-only screens on their next page load.</div>`;
            toast.success(`${name} promoted to admin`);
            e.target.reset();
            load();
        } catch (err) {
            alertBox.innerHTML = '<div class="alert alert-danger">' + (err.message || 'Promote failed.') + '</div>';
            toast.error(err.message || 'Promote failed');
        } finally {
            btn.disabled = false; btn.textContent = 'Promote to admin';
        }
    });

    function openEdit(userId, currentName) {
        const f = document.getElementById('adm-form');
        f.elements['user_id'].value = userId;
        f.elements['full_name'].value = currentName || '';
        f.elements['new_password'].value = '';
        document.getElementById('adm-alert').innerHTML = '';
        dlg.showModal();
    }
    document.getElementById('adm-cancel').addEventListener('click', () => dlg.close());

    document.getElementById('adm-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertBox = document.getElementById('adm-alert');
        const btn = document.getElementById('adm-save');
        alertBox.innerHTML = '';
        btn.disabled = true; btn.textContent = 'Saving...';
        try {
            const fd = new FormData(e.target);
            const userId   = fd.get('user_id');
            const fullName = fd.get('full_name');
            const newPwd   = fd.get('new_password');

            // 1) Save name via profiles (RLS allows admin)
            const { error: pe } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId);
            if (pe) throw pe;

            // 2) If password changed, call the Edge Function
            if (newPwd) {
                await adminUpdateUser({ user_id: userId, password: newPwd, full_name: fullName });
                toast.success('Name and password updated');
            } else {
                toast.success('Name updated');
            }
            await audit('admin.update', 'profile', null, { user_id: userId, full_name: fullName, password_changed: !!newPwd });
            dlg.close();
            load();
        } catch (err) {
            alertBox.innerHTML = '<div class="alert alert-danger">' + (err.message || 'Save failed.') + '</div>';
            toast.error(err.message || 'Save failed');
        } finally {
            btn.disabled = false; btn.textContent = 'Save';
        }
    });

    document.getElementById('add-admin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertBox = document.getElementById('add-alert');
        const btn = document.getElementById('add-btn');
        alertBox.innerHTML = '';
        btn.disabled = true; btn.textContent = 'Creating...';
        try {
            const fd = new FormData(e.target);
            await createLogin({
                username:  fd.get('username'),
                password:  fd.get('password'),
                full_name: fd.get('full_name'),
                role:      'admin',
            });
            await audit('admin.create', 'profile', null, { username: fd.get('username') });
            alertBox.innerHTML = `<div class="alert alert-success">Admin created. They can now sign in with <strong>${fd.get('username')}</strong>.</div>`;
            toast.success('New admin created');
            e.target.reset();
            load();
        } catch (err) {
            alertBox.innerHTML = '<div class="alert alert-danger">' + (err.message || 'Create failed.') + '</div>';
            toast.error(err.message || 'Create failed');
        } finally {
            btn.disabled = false; btn.textContent = 'Create admin';
        }
    });
}

function escape(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
