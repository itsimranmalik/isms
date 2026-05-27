/* Audit log (admin only) — with date filter + CSV export + page size control. */
import { toast } from '../modules/toast.js';
export const title = 'Audit log';

export async function render(root, { profile, supabase }) {
    if (profile.role !== 'admin') {
        root.innerHTML = '<div class="alert alert-danger">Admin only.</div>';
        return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const aWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    root.innerHTML = `
        <div class="card">
            <div class="toolbar" style="flex-wrap:wrap">
                <label class="field">From<input type="date" id="audit-from" value="${aWeekAgo}"></label>
                <label class="field">To<input type="date" id="audit-to" value="${today}"></label>
                <label class="field">Limit
                    <select id="audit-limit">
                        <option>100</option><option selected>200</option><option>500</option><option>1000</option>
                    </select>
                </label>
                <button class="btn btn-primary" id="audit-refresh">Refresh</button>
                <span style="margin-left:auto"></span>
                <button class="btn" id="audit-csv">Export CSV</button>
            </div>
            <div id="audit-summary" class="text-muted" style="font-size:12px; margin-bottom:8px"></div>
            <table class="table">
                <thead><tr><th>When</th><th>Action</th><th>Object</th><th>Actor</th><th>IP</th><th>Meta</th></tr></thead>
                <tbody><tr><td colspan="6"><em>Loading…</em></td></tr></tbody>
            </table>
        </div>`;

    let rows = [];

    async function load() {
        const from  = document.getElementById('audit-from').value;
        const to    = document.getElementById('audit-to').value;
        const limit = Number(document.getElementById('audit-limit').value) || 200;
        let q = supabase.from('audit_logs')
            .select('id, created_at, actor_id, action, object_type, object_id, ip_address, user_agent, meta')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (from) q = q.gte('created_at', from + 'T00:00:00Z');
        if (to)   q = q.lte('created_at', to   + 'T23:59:59Z');

        const { data, error } = await q;
        if (error) {
            root.querySelector('tbody').innerHTML = `<tr><td colspan="6"><div class="alert alert-danger">${error.message}</div></td></tr>`;
            return;
        }
        rows = data || [];
        document.getElementById('audit-summary').textContent = `${rows.length} events between ${from || '…'} and ${to || '…'}`;
        root.querySelector('tbody').innerHTML = rows.map(r => `<tr>
            <td>${new Date(r.created_at).toLocaleString()}</td>
            <td>${r.action}</td>
            <td>${r.object_type}#${r.object_id ?? ''}</td>
            <td><code style="font-size:11px">${(r.actor_id || '').slice(0,8) || 'system'}</code></td>
            <td>${r.ip_address || ''}</td>
            <td><code style="font-size:11px">${r.meta ? escapeJson(r.meta) : ''}</code></td>
        </tr>`).join('') || '<tr><td colspan="6"><em>No audit events in that range.</em></td></tr>';
    }

    document.getElementById('audit-refresh').addEventListener('click', load);
    document.getElementById('audit-csv').addEventListener('click', () => {
        if (!rows.length) { toast.warn('Nothing to export — adjust the filter and try again.'); return; }
        const headers = ['When', 'Action', 'Object type', 'Object id', 'Actor', 'IP', 'User agent', 'Meta'];
        const lines = [headers, ...rows.map(r => [
            new Date(r.created_at).toISOString(),
            r.action,
            r.object_type,
            r.object_id ?? '',
            r.actor_id ?? '',
            r.ip_address ?? '',
            (r.user_agent || '').replace(/\s+/g, ' '),
            r.meta ? JSON.stringify(r.meta) : '',
        ])];
        downloadCsv(`audit-log-${new Date().toISOString().slice(0,10)}.csv`, lines);
        toast.success(`Exported ${rows.length} events`);
    });

    load();
}

function escapeJson(obj) {
    return JSON.stringify(obj)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function downloadCsv(filename, lines) {
    const csv = lines.map(row => row.map(v => {
        if (v == null) return '';
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
