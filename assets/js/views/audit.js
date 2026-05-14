/* Audit log (admin only) */
export const title = 'Audit log';

export async function render(root, { profile, supabase }) {
    if (profile.role !== 'admin') {
        root.innerHTML = '<div class="alert alert-danger">Admin only.</div>';
        return;
    }
    const { data } = await supabase
        .from('audit_logs')
        .select('id, created_at, actor_id, action, object_type, object_id, ip_address, meta')
        .order('created_at', { ascending: false })
        .limit(200);

    root.innerHTML = `
        <div class="card">
            <h3>Last 200 events</h3>
            <table class="table">
                <thead><tr><th>When</th><th>Action</th><th>Object</th><th>Actor</th><th>IP</th><th>Meta</th></tr></thead>
                <tbody>
                    ${(data || []).map(r => `<tr>
                        <td>${new Date(r.created_at).toLocaleString()}</td>
                        <td>${r.action}</td>
                        <td>${r.object_type}#${r.object_id ?? ''}</td>
                        <td><code style="font-size:11px">${(r.actor_id || '').slice(0,8) || 'system'}</code></td>
                        <td>${r.ip_address || ''}</td>
                        <td><code style="font-size:11px">${r.meta ? JSON.stringify(r.meta) : ''}</code></td>
                    </tr>`).join('') || '<tr><td colspan="6"><em>No audit events yet.</em></td></tr>'}
                </tbody>
            </table>
        </div>`;
}
