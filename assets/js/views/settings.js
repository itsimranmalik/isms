/* Settings (admin) */
import { toast } from '../modules/toast.js';
export const title = 'Settings';

export async function render(root, { profile, supabase }) {
    if (profile.role !== 'admin') {
        root.innerHTML = '<div class="alert alert-danger">Admin only.</div>';
        return;
    }
    const { data: cur } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    const s = cur || { id: 1, school_name: '', logo_url: '', address: '', phone: '', email: '', theme: 'light' };

    root.innerHTML = `
        <div class="card" style="max-width: 720px">
            <h3>School information</h3>
            <form id="settings-form" class="form">
                <label>School name<input name="school_name" value="${s.school_name || ''}"></label>
                <label>Logo URL<input name="logo_url" value="${s.logo_url || ''}"></label>
                <label>Address<textarea name="address" rows="2">${s.address || ''}</textarea></label>
                <div class="row">
                    <label>Phone<input name="phone" value="${s.phone || ''}"></label>
                    <label>Email<input type="email" name="email" value="${s.email || ''}"></label>
                </div>
                <label>Theme
                    <select name="theme">
                        <option ${s.theme === 'light' ? 'selected' : ''}>light</option>
                        <option ${s.theme === 'dark'  ? 'selected' : ''}>dark</option>
                    </select>
                </label>
                <button class="btn btn-primary" type="submit" style="margin-top:8px">Save settings</button>
                <div id="settings-alert"></div>
            </form>
        </div>`;

    document.getElementById('settings-form').addEventListener('submit', async e => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.target).entries());
        payload.id = 1;
        const { error } = await supabase.from('settings').upsert(payload);
        document.getElementById('settings-alert').innerHTML = error
            ? `<div class="alert alert-danger">${error.message}</div>`
            : '<div class="alert alert-success">Saved.</div>';
        if (error) toast.error(error.message);
        else       toast.success('Settings saved');
    });
}
