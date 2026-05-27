/* Admins management view — create new admins, demote existing ones.
 * Available only to admins. Uses the create-user Edge Function for sign-ups. */
import { audit } from '../supabase-client.js';
import { createLogin, emailToDisplayName } from '../modules/admin-users.js';
import { toast } from '../modules/toast.js';

export const title = 'Admins';

export async function render(root, { profile, supabase }) {
    if (profile.role !== 'admin') {
        root.innerHTML = '<div class="alert alert-danger">Admin only.</div>';
        return;
    }

    root.innerHTML = `
        <p class="text-muted" style="margin-top:0">
            Manage admin accounts. There must always be at least one admin — the system blocks demoting the last one.
        </p>

        <div class="grid-app">
            <div class="card span-7">
                <h3 style="margin-top:0">Current admins</h3>
                <table class="table" id="admins-table">
                    <thead><tr><th>Name</th><th>Sign-in</th><th>Account ID</th><th></th></tr></thead>
                    <tbody><tr><td colspan="4"><em>Loading…</em></td></tr></tbody>
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
                    Pick a username (letters/digits/.-_) or a real email. Real emails enable self-service password resets;
                    usernames need an admin to reset them.
                </p>
            </div>
        </div>`;

    await load();

    async function load() {
        const { data: admins, error } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'admin')
            .order('full_name');
        if (error) {
            root.querySelector('tbody').innerHTML =
                `<tr><td colspan="4"><div class="alert alert-danger">${error.message}</div></td></tr>`;
            return;
        }
        // We need emails too — those live on auth.users which isn't directly readable from the browser.
        // Fall back: show what we can plus an account-ID hint; admins can cross-reference in Supabase.
        const meId = profile.id;
        const isLastAdmin = (admins || []).length <= 1;

        root.querySelector('#admins-table tbody').innerHTML = (admins || []).map(a => {
            const isYou = a.id === meId;
            return `<tr>
                <td>${a.full_name || '(no name)'} ${isYou ? '<span class="chip">you</span>' : ''}</td>
                <td><em>see Supabase Auth → Users</em></td>
                <td><code style="font-size:11px">${a.id}</code></td>
                <td>
                    ${(!isYou && !isLastAdmin)
                        ? `<button class="btn demote-btn" data-id="${a.id}" data-name="${(a.full_name||'').replace(/"/g,'&quot;')}">Demote to teacher</button>`
                        : (isLastAdmin ? '<span class="chip warn">last admin — protected</span>' : '<span class="text-muted">—</span>')}
                </td>
            </tr>`;
        }).join('') || '<tr><td colspan="4"><em>No admins.</em></td></tr>';

        root.querySelectorAll('.demote-btn').forEach(b => b.addEventListener('click', async () => {
            const id = b.dataset.id, name = b.dataset.name;
            if (!confirm(`Demote ${name} from admin to teacher? They'll lose access to all admin-only screens.`)) return;
            const { error } = await supabase.from('profiles')
                .update({ role: 'teacher' }).eq('id', id);
            if (error) { toast.error(error.message); return; }
            await audit('admin.demote', 'profile', null, { user_id: id });
            toast.success(`${name} demoted to teacher`);
            load();
        }));
    }

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
