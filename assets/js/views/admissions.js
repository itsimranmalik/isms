/* Admissions — admin-only inbox for applications submitted from the public site. */
import { audit } from '../supabase-client.js';
import { toast } from '../modules/toast.js';
export const title = 'Admissions';

const STATUS_LABEL = {
    new:       { label: 'New',       chip: '' },
    contacted: { label: 'Contacted', chip: 'gold' },
    enrolled:  { label: 'Enrolled',  chip: '' },
    rejected:  { label: 'Rejected',  chip: 'danger' },
};

export async function render(root, { profile, supabase }) {
    if (profile.role !== 'admin') {
        root.innerHTML = '<div class="alert alert-danger">Admin only.</div>';
        return;
    }

    const params = new URLSearchParams((location.hash.split('?')[1]) || '');
    const filter = params.get('status') || 'all';

    root.innerHTML = `
        <p class="text-muted" style="margin-top:0">
            Applications submitted via the public <a href="admissions.html" target="_blank">Admissions form</a>.
            New submissions appear here for you to follow up.
        </p>
        <div class="toolbar" style="flex-wrap:wrap; margin-bottom:12px">
            ${filterBtn('all',       'All',       filter)}
            ${filterBtn('new',       'New',       filter)}
            ${filterBtn('contacted', 'Contacted', filter)}
            ${filterBtn('enrolled',  'Enrolled',  filter)}
            ${filterBtn('rejected',  'Rejected',  filter)}
            <span style="margin-left:auto"></span>
            <button class="btn" id="export-csv">CSV</button>
        </div>
        <div class="card">
            <table class="table" id="admissions-table">
                <thead><tr>
                    <th>Submitted</th>
                    <th>Child</th>
                    <th>DOB</th>
                    <th>Guardian</th>
                    <th>Contact</th>
                    <th>Start</th>
                    <th>Status</th>
                    <th></th>
                </tr></thead>
                <tbody><tr><td colspan="8"><em>Loading…</em></td></tr></tbody>
            </table>
        </div>

        <dialog id="adm-dialog" style="border:0; border-radius:var(--radius); padding:0; max-width:680px; width:92%">
            <div style="padding:24px" id="adm-dialog-body"></div>
        </dialog>`;

    let cache = [];
    await load();

    document.getElementById('export-csv').addEventListener('click', () => {
        const rows = visible(cache, filter);
        const headers = ['Submitted','Child first','Child last','DOB','Gender','Guardian','Phone','Email','Address','Prior study','Preferred start','Status','Admin notes'];
        const lines = [headers, ...rows.map(r => [
            r.submitted_at, r.child_first_name, r.child_last_name, r.dob || '', r.gender || '',
            r.guardian_name, r.guardian_phone, r.guardian_email,
            (r.address || '').replace(/\n/g, ' '),
            (r.prior_study || '').replace(/\n/g, ' '),
            r.preferred_start || '', r.status, (r.admin_notes || '').replace(/\n/g, ' '),
        ])];
        downloadCsv('admissions.csv', lines);
    });

    async function load() {
        const { data, error } = await supabase
            .from('admissions')
            .select('*')
            .order('submitted_at', { ascending: false });
        if (error) {
            root.querySelector('tbody').innerHTML =
                `<tr><td colspan="8"><div class="alert alert-danger">${error.message}</div></td></tr>`;
            return;
        }
        cache = data || [];
        renderTable();
    }

    function renderTable() {
        const rows = visible(cache, filter);
        const tbody = root.querySelector('tbody');
        tbody.innerHTML = rows.map(r => {
            const s = STATUS_LABEL[r.status] || { label: r.status, chip: '' };
            return `<tr>
                <td>${new Date(r.submitted_at).toLocaleDateString()}</td>
                <td><strong>${escape(r.child_first_name)} ${escape(r.child_last_name)}</strong></td>
                <td>${r.dob || '—'}</td>
                <td>${escape(r.guardian_name)}</td>
                <td>${escape(r.guardian_phone || '')}<br><span class="text-muted" style="font-size:12px">${escape(r.guardian_email || '')}</span></td>
                <td>${r.preferred_start || '—'}</td>
                <td><span class="chip ${s.chip}">${s.label}</span></td>
                <td><button class="btn open-btn" data-id="${r.id}">Open</button></td>
            </tr>`;
        }).join('') || `<tr><td colspan="8"><em>No applications${filter==='all' ? '' : ` with status "${filter}"`} yet.</em></td></tr>`;

        tbody.querySelectorAll('.open-btn').forEach(b => b.addEventListener('click', () => openDetail(Number(b.dataset.id))));
    }

    function openDetail(id) {
        const r = cache.find(x => x.id === id);
        if (!r) return;
        const body = document.getElementById('adm-dialog-body');
        body.innerHTML = `
            <h2 style="margin-top:0; color:var(--green-700)">Application — ${escape(r.child_first_name)} ${escape(r.child_last_name)}</h2>
            <p class="text-muted" style="margin:0 0 12px">Submitted ${new Date(r.submitted_at).toLocaleString()}</p>

            <table class="table">
                <tbody>
                    <tr><th>Date of birth</th><td>${r.dob || '—'}</td></tr>
                    <tr><th>Gender</th><td>${escape(r.gender || '')}</td></tr>
                    <tr><th>Guardian name</th><td>${escape(r.guardian_name)}</td></tr>
                    <tr><th>Phone</th><td>${escape(r.guardian_phone)}</td></tr>
                    <tr><th>Email</th><td><a href="mailto:${encodeURIComponent(r.guardian_email)}">${escape(r.guardian_email)}</a></td></tr>
                    <tr><th>Address</th><td>${escape(r.address || '—').replace(/\n/g, '<br>')}</td></tr>
                    <tr><th>Prior Quran study</th><td>${escape(r.prior_study || '—').replace(/\n/g, '<br>')}</td></tr>
                    <tr><th>Preferred start</th><td>${r.preferred_start || '—'}</td></tr>
                </tbody>
            </table>

            <div class="form" style="margin-top:14px">
                <div class="row">
                    <label>Status
                        <select id="adm-status">
                            ${Object.entries(STATUS_LABEL).map(([k, v]) => `<option value="${k}" ${k === r.status ? 'selected' : ''}>${v.label}</option>`).join('')}
                        </select>
                    </label>
                </div>
                <label>Admin notes<textarea id="adm-notes" rows="3" placeholder="Followed up by phone, parents prefer Saturday mornings...">${escape(r.admin_notes || '')}</textarea></label>
            </div>
            <div id="adm-alert"></div>
            <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px">
                <button class="btn" id="adm-delete">Delete</button>
                <button class="btn" id="adm-cancel">Cancel</button>
                <button class="btn btn-primary" id="adm-save">Save</button>
            </div>`;

        const dlg = document.getElementById('adm-dialog');
        dlg.showModal();

        document.getElementById('adm-cancel').addEventListener('click', () => dlg.close());
        document.getElementById('adm-save').addEventListener('click', async () => {
            const status = document.getElementById('adm-status').value;
            const notes  = document.getElementById('adm-notes').value;
            const upd = {
                status,
                admin_notes: notes || null,
                handled_by: profile.id,
                handled_at: new Date().toISOString(),
            };
            const { error } = await supabase.from('admissions').update(upd).eq('id', id);
            if (error) {
                document.getElementById('adm-alert').innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
                toast.error(error.message);
                return;
            }
            await audit('admissions.update', 'admission', id, upd);
            toast.success('Application updated');
            dlg.close();
            load();
        });
        document.getElementById('adm-delete').addEventListener('click', async () => {
            if (!confirm('Delete this application permanently?')) return;
            const { error } = await supabase.from('admissions').delete().eq('id', id);
            if (error) {
                document.getElementById('adm-alert').innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
                toast.error(error.message);
                return;
            }
            await audit('admissions.delete', 'admission', id);
            toast.success('Application deleted');
            dlg.close();
            load();
        });
    }
}

function visible(rows, filter) {
    return filter === 'all' ? rows : rows.filter(r => r.status === filter);
}

function filterBtn(value, label, current) {
    return `<a href="#/admissions?status=${value}" class="btn ${value === current ? 'btn-primary' : ''}">${label}</a>`;
}

function escape(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
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
