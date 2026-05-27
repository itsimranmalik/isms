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
                    <thead><tr><th>Name</th><th>Account ID</th><th></th></tr></thead>
                    <tbody><tr><td colspan="3"><em>Loading…</em></td></tr></tbody>
                </table>
            </div>

            <div class="card span-5">
                <h3 style="margin-top:0">+ Add a new admin</h3>
                <form class="form" id="add-admin-form">
                    <label>Full name<input required name="full_name" placeholder="e.g. Aisha Khan"></label>
                    <label>Username or email<input required name="username" placeholder="aisha.k or aisha@example.com"></label>
                    <label>Password (min 8 chars)<input required minlength="8" type="password" name="password"></label>
                    <div id="add-alert"></div>
                    <button class="btn btn-primary" type="submit" id="add-btn">Create admin</button>
                </form>
                <p class="text-muted" style="font-size:12px; margin-top:10px">
                    Pick a username (letters/digits/.-_) or a real email. Real emails
                    enable self-service password resets; usernames need an admin to reset them.
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
        const { data: admins, error } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'admin')
            .order('full_name');
        if (error) {
            root.querySelector('tbody').innerHTML =
                `<tr><td colspan="3"><div class="alert alert-danger">${error.message}</div></td></tr>`;
            return;
        }
        const meId = profile.id;
        const isLastAdmin = (admins || []).length <= 1;

        root.querySelector('#admins-table tbody').innerHTML = (admins || []).map(a => {
            const isYou = a.id === meId;
            return `<tr>
                <td>${escape(a.full_name || '(no name)')} ${isYou ? '<span class="chip">you</span>' : ''}</td>
                <td><code style="font-size:11px">${a.id}</code></td>
                <td style="white-space:nowrap">
                    <button class="btn edit-btn" data-id="${a.id}" data-name='${(a.full_name || '').replace(/'/g, "&apos;").replace(/"/g, "&quot;")}'>Edit</button>
                    ${(!isYou && !isLastAdmin)
                        ? `<button class="btn demote-btn" data-id="${a.id}" data-name="${escape(a.full_name || '')}">Demote</button>`
                        : (isLastAdmin && (admins.length === 1) ? '<span class="chip warn" style="margin-left:6px">last admin</span>' : '')}
                </td>
            </tr>`;
        }).join('') || '<tr><td colspan="3"><em>No admins.</em></td></tr>';

        root.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', () => {
            openEdit(b.dataset.id, b.dataset.name.replace(/&apos;/g, "'").replace(/&quot;/g, '"'));
        }));
        root.querySelectorAll('.demote-btn').forEach(b => b.addEventListener('click', async () => {
            const id = b.dataset.id, name = b.dataset.name;
            if (!confirm(`Demote ${name} from admin to teacher? They'll lose access to admin-only screens.`)) return;
            const { error } = await supabase.from('profiles').update({ role: 'teacher' }).eq('id', id);
            if (error) { toast.error(error.message); return; }
            await audit('admin.demote', 'profile', null, { user_id: id });
            toast.success(`${name} demoted to teacher`);
            load();
        }));
    }

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
