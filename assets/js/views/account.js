/* Account view: profile info + change password (all roles). */
import { emailToDisplayName } from '../modules/admin-users.js';
import { audit } from '../supabase-client.js';
import { toast } from '../modules/toast.js';

export const title = 'My Account';

export async function render(root, { profile, supabase }) {
    const { data: { user } } = await supabase.auth.getUser();
    const displayLogin = emailToDisplayName(user?.email || '');
    const isUsernameOnly = user?.email?.endsWith('@' + (window.ISMS_CONFIG?.USERNAME_DOMAIN || 'madrasa.local'));

    root.innerHTML = `
        <div class="grid-app">
            <div class="card span-6">
                <h3>Profile</h3>
                <table class="table">
                    <tbody>
                        <tr><th>Name</th><td>${escapeHtml(profile.full_name || '')}</td></tr>
                        <tr><th>Role</th><td><span class="chip">${profile.role}</span></td></tr>
                        <tr><th>Sign-in</th><td>${escapeHtml(displayLogin)}${isUsernameOnly ? ' <span class="chip gold">username</span>' : ' <span class="chip">email</span>'}</td></tr>
                        <tr><th>Account ID</th><td><code style="font-size:11px">${user?.id || ''}</code></td></tr>
                    </tbody>
                </table>
            </div>

            <div class="card span-6">
                <h3>Change password</h3>
                <form class="form" id="pwd-form">
                    <label>New password (min 8 characters)
                        <input required minlength="8" type="password" name="new_password" autocomplete="new-password">
                    </label>
                    <label>Confirm new password
                        <input required minlength="8" type="password" name="confirm_password" autocomplete="new-password">
                    </label>
                    <div id="pwd-alert"></div>
                    <button class="btn btn-primary" type="submit" id="pwd-btn">Update password</button>
                </form>
            </div>

            <div class="card span-12">
                <h3>Tips</h3>
                <ul class="text-muted" style="margin:0; padding-left:18px; line-height:1.8">
                    <li>Use 12+ characters with a mix of letters, digits and symbols.</li>
                    <li>Never share your password — admins can reset it for you if forgotten.</li>
                    <li>If your sign-in is a username (no real email), forgotten-password recovery only works via an admin reset; ask one to reset it in the Teachers/Students screen.</li>
                </ul>
            </div>
        </div>`;

    const form  = document.getElementById('pwd-form');
    const alert = document.getElementById('pwd-alert');
    const btn   = document.getElementById('pwd-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        alert.innerHTML = '';
        const fd = new FormData(form);
        const p1 = fd.get('new_password');
        const p2 = fd.get('confirm_password');
        if (p1 !== p2) {
            alert.innerHTML = '<div class="alert alert-danger">Passwords do not match.</div>';
            return;
        }
        if (String(p1).length < 8) {
            alert.innerHTML = '<div class="alert alert-danger">Password must be at least 8 characters.</div>';
            return;
        }
        btn.disabled = true; btn.textContent = 'Updating...';
        try {
            const { error } = await supabase.auth.updateUser({ password: p1 });
            if (error) throw error;
            await audit('account.password_change', 'user', null, {});
            alert.innerHTML = '<div class="alert alert-success">Password updated. Use it the next time you sign in.</div>';
            toast.success('Password updated');
            form.reset();
        } catch (err) {
            alert.innerHTML = '<div class="alert alert-danger">' + (err.message || 'Update failed.') + '</div>';
            toast.error(err.message || 'Update failed');
        } finally {
            btn.disabled = false; btn.textContent = 'Update password';
        }
    });
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
