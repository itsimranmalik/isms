/* Bulk import — Students / Teachers / Classes via CSV.
 * Admin downloads a template, fills it in spreadsheet software, uploads it,
 * previews + validates, then we insert into Supabase (with logins via the
 * create-user Edge Function for any rows that include username + password). */
import { audit } from '../supabase-client.js';
import { createLogin } from '../modules/admin-users.js';
import { toast } from '../modules/toast.js';

export const title = 'Bulk import';

// ---------------------------------------------------------------------
// Template definitions. Each entity has its columns + a sample row.
// "*" suffix marks required.
// ---------------------------------------------------------------------
const TEMPLATES = {
    students: {
        label: 'Students',
        columns: [
            'student_code*', 'first_name*', 'last_name*',
            'date_of_birth', 'gender', 'guardian_name', 'guardian_phone',
            'guardian_email', 'address', 'enrolled_on', 'status',
            'username', 'password',
        ],
        sample: [
            'S100', 'Hassan', 'Ali', '2014-05-12', 'Male',
            'Tariq Ali', '+44 7700 100100', 'tariq@example.com',
            '12 High St, AB1 2CD', '2026-09-01', 'active',
            'hassan.ali', 'Demo2026!',
        ],
        notes: [
            'student_code must be unique across the whole school (S100, S101, …).',
            'Dates use the YYYY-MM-DD format (e.g. 2014-05-12).',
            'status defaults to "active" if blank.',
            'Fill in BOTH username and password to create a login for that student. Leave blank to skip — admin can add a login later.',
        ],
    },
    teachers: {
        label: 'Teachers',
        columns: [
            'staff_code*', 'first_name*', 'last_name*',
            'phone', 'email', 'qualifications', 'joined_on', 'status',
            'username', 'password',
        ],
        sample: [
            'T100', 'Aisha', 'Khan', '+44 7700 200200', 'aisha@example.com',
            'BA Islamic Studies', '2022-09-01', 'active',
            'aisha.khan', 'Demo2026!',
        ],
        notes: [
            'staff_code must be unique (T100, T101, …).',
            'Username/password create a login (admin can also add it later).',
        ],
    },
    classes: {
        label: 'Classes',
        columns: ['name*', 'level', 'description'],
        sample: ['Beginner Quran', 'Beginner', 'Foundational recitation for new learners'],
        notes: [
            'Name should be unique (system warns if a class with this name already exists).',
            'Once classes are imported, enrol students and assign teachers from the Classes screen.',
        ],
    },
};

export async function render(root, { profile, supabase }) {
    if (profile.role !== 'admin') {
        root.innerHTML = '<div class="alert alert-danger">Admin only.</div>';
        return;
    }

    const params = new URLSearchParams((location.hash.split('?')[1]) || '');
    const tab = params.get('tab') || 'students';
    const tpl = TEMPLATES[tab] || TEMPLATES.students;

    const tabBtn = (key, label) =>
        `<a href="#/import?tab=${key}" class="btn ${tab === key ? 'btn-primary' : ''}">${label}</a>`;

    root.innerHTML = `
        <p class="text-muted" style="margin-top:0">
            Bulk-import data with CSV. Download the template, fill it in Excel/Google Sheets,
            save as CSV, then upload it here. Each row creates one record.
        </p>

        <div class="toolbar" style="margin-bottom:12px; flex-wrap:wrap">
            ${tabBtn('students', 'Students')}
            ${tabBtn('teachers', 'Teachers')}
            ${tabBtn('classes',  'Classes')}
        </div>

        <div class="grid-app">
            <div class="card span-12">
                <h3 style="margin-top:0">${tpl.label} template</h3>
                <div class="toolbar">
                    <button class="btn btn-primary" id="dl-template">Download template (CSV)</button>
                    <label class="btn">
                        Upload filled CSV
                        <input type="file" id="csv-file" accept=".csv,text/csv" style="display:none">
                    </label>
                    <span id="file-name" class="text-muted"></span>
                </div>
                <h4 style="margin:14px 0 6px; color:var(--green-700)">Columns</h4>
                <p class="text-muted" style="font-size:13px; margin:0 0 8px">
                    Required columns are marked with <strong>*</strong>. Column order must match the template.
                </p>
                <ul style="margin:0 0 12px 18px">
                    ${tpl.columns.map(c => `<li><code>${c}</code></li>`).join('')}
                </ul>
                <h4 style="margin:14px 0 6px; color:var(--green-700)">Notes</h4>
                <ul style="margin:0 0 12px 18px">
                    ${tpl.notes.map(n => `<li>${n}</li>`).join('')}
                </ul>
            </div>

            <div class="card span-12" id="preview-card" style="display:none">
                <div class="toolbar">
                    <h3 style="margin:0">Preview</h3>
                    <span id="preview-summary" class="text-muted" style="margin-left:auto"></span>
                </div>
                <div id="preview-issues"></div>
                <div style="overflow-x:auto">
                    <table class="table" id="preview-table">
                        <thead></thead><tbody></tbody>
                    </table>
                </div>
                <div class="toolbar" style="justify-content:flex-end; margin-top:14px">
                    <button class="btn" id="preview-cancel">Cancel</button>
                    <button class="btn btn-primary" id="preview-import" disabled>Import</button>
                </div>
            </div>

            <div class="card span-12" id="result-card" style="display:none">
                <h3 style="margin-top:0">Import results</h3>
                <div id="result-summary"></div>
                <div id="result-detail"></div>
            </div>
        </div>`;

    document.getElementById('dl-template').addEventListener('click', () => downloadTemplate(tab));
    document.getElementById('csv-file').addEventListener('change', onFile);

    let parsedRows = null;
    let validRows  = null;

    async function onFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        document.getElementById('file-name').textContent = file.name;
        try {
            const text = await file.text();
            parsedRows = parseCsv(text);
            renderPreview(parsedRows);
        } catch (err) {
            toast.error('Could not read CSV: ' + err.message);
        }
    }

    function renderPreview(rows) {
        const previewCard = document.getElementById('preview-card');
        const resultCard  = document.getElementById('result-card');
        resultCard.style.display = 'none';
        previewCard.style.display = '';

        // Header validation
        const headerExpected = tpl.columns.map(stripStar);
        const headerGiven    = rows[0] || [];
        const headerOk = headerExpected.every((c, i) => (headerGiven[i] || '').trim().toLowerCase() === c.toLowerCase());

        const issuesEl  = document.getElementById('preview-issues');
        const tableHead = document.querySelector('#preview-table thead');
        const tableBody = document.querySelector('#preview-table tbody');
        const summary   = document.getElementById('preview-summary');
        const importBtn = document.getElementById('preview-import');

        if (!headerOk) {
            issuesEl.innerHTML = `<div class="alert alert-danger">
                Header row doesn't match the template. Expected columns (in this order):
                <code style="display:block; margin-top:6px">${headerExpected.join(', ')}</code>
            </div>`;
            tableHead.innerHTML = ''; tableBody.innerHTML = '';
            importBtn.disabled = true;
            return;
        }

        // Validate each data row
        const dataRows = rows.slice(1).filter(r => r.some(c => (c || '').trim() !== ''));
        validRows = [];
        const previewLimit = 50;

        tableHead.innerHTML = '<tr><th>#</th>' +
            headerExpected.map(c => `<th>${c}</th>`).join('') + '<th>Status</th></tr>';

        const issues = [];
        tableBody.innerHTML = dataRows.slice(0, previewLimit).map((row, i) => {
            const obj = {};
            headerExpected.forEach((c, idx) => obj[c] = (row[idx] || '').trim());
            const rowErrors = validateRow(tab, obj, i + 2);
            if (rowErrors.length === 0) validRows.push(obj);
            else issues.push(...rowErrors);

            const ok = rowErrors.length === 0;
            return `<tr style="background:${ok ? '' : 'rgba(220,38,38,.06)'}">
                <td>${i + 2}</td>
                ${headerExpected.map(c => `<td>${escapeHtml(obj[c] || '')}</td>`).join('')}
                <td>${ok
                    ? '<span class="chip">OK</span>'
                    : `<span class="chip danger">${rowErrors.length} issue${rowErrors.length === 1 ? '' : 's'}</span>`}</td>
            </tr>`;
        }).join('');

        // We've only previewed up to previewLimit but validate the rest silently
        if (dataRows.length > previewLimit) {
            dataRows.slice(previewLimit).forEach((row, i) => {
                const obj = {};
                headerExpected.forEach((c, idx) => obj[c] = (row[idx] || '').trim());
                const rowErrors = validateRow(tab, obj, i + previewLimit + 2);
                if (rowErrors.length === 0) validRows.push(obj);
                else issues.push(...rowErrors);
            });
        }

        summary.textContent = `${validRows.length} valid, ${issues.length} issue${issues.length === 1 ? '' : 's'}` +
            (dataRows.length > previewLimit ? ` (showing first ${previewLimit} rows)` : '');

        issuesEl.innerHTML = issues.length
            ? `<details><summary class="text-muted" style="cursor:pointer">${issues.length} validation issue${issues.length === 1 ? '' : 's'} — click to view</summary>
                <ul style="margin:8px 0 0 18px">${issues.slice(0, 50).map(e => `<li>${escapeHtml(e)}</li>`).join('')}${issues.length > 50 ? '<li><em>… and ' + (issues.length - 50) + ' more</em></li>' : ''}</ul></details>`
            : '';

        importBtn.disabled = validRows.length === 0;
    }

    document.getElementById('preview-cancel').addEventListener('click', () => {
        document.getElementById('preview-card').style.display = 'none';
        document.getElementById('file-name').textContent = '';
        document.getElementById('csv-file').value = '';
        parsedRows = null; validRows = null;
    });

    document.getElementById('preview-import').addEventListener('click', async () => {
        if (!validRows || !validRows.length) return;
        document.getElementById('preview-import').disabled = true;
        await runImport(tab, validRows, supabase);
    });
}

/* ------------------------------------------------------------------ */
function stripStar(c) { return c.replace(/\*$/, ''); }

function validateRow(kind, row, lineNum) {
    const errs = [];
    const tpl  = TEMPLATES[kind];
    const requiredCols = tpl.columns.filter(c => c.endsWith('*')).map(stripStar);

    for (const c of requiredCols) {
        if (!row[c] || !row[c].trim()) errs.push(`Line ${lineNum}: missing ${c}`);
    }
    // Date columns: validate when present
    for (const c of ['date_of_birth', 'enrolled_on', 'joined_on']) {
        if (row[c] && !/^\d{4}-\d{2}-\d{2}$/.test(row[c])) {
            errs.push(`Line ${lineNum}: ${c} must be YYYY-MM-DD (got "${row[c]}")`);
        }
    }
    // status
    if (row.status && !['active', 'inactive', ''].includes(row.status.toLowerCase())) {
        errs.push(`Line ${lineNum}: status must be active or inactive`);
    }
    // gender
    if (row.gender && !['Male', 'Female', ''].includes(row.gender)) {
        errs.push(`Line ${lineNum}: gender must be Male or Female`);
    }
    // login pair
    if ((row.username && !row.password) || (!row.username && row.password)) {
        errs.push(`Line ${lineNum}: username AND password must be filled together (or both blank)`);
    }
    if (row.password && row.password.length < 8) {
        errs.push(`Line ${lineNum}: password must be at least 8 characters`);
    }
    if (row.username && !/^[a-zA-Z0-9._@-]{3,80}$/.test(row.username)) {
        errs.push(`Line ${lineNum}: username has invalid characters (allowed: letters/digits . _ - @)`);
    }
    return errs;
}

async function runImport(kind, rows, supabase) {
    const resultCard = document.getElementById('result-card');
    const resultSummary = document.getElementById('result-summary');
    const resultDetail  = document.getElementById('result-detail');
    document.getElementById('preview-card').style.display = 'none';
    resultCard.style.display = '';
    resultSummary.innerHTML = '<div class="alert alert-info">Importing… please wait.</div>';
    resultDetail.innerHTML = '';

    let inserted = 0, loginsCreated = 0, failed = [];

    for (const [i, row] of rows.entries()) {
        try {
            if (kind === 'students') {
                const payload = {
                    student_code:   row.student_code,
                    first_name:     row.first_name,
                    last_name:      row.last_name,
                    date_of_birth:  row.date_of_birth || null,
                    gender:         row.gender || null,
                    guardian_name:  row.guardian_name || null,
                    guardian_phone: row.guardian_phone || null,
                    guardian_email: row.guardian_email || null,
                    address:        row.address || null,
                    enrolled_on:    row.enrolled_on || null,
                    status:         (row.status || 'active').toLowerCase(),
                };
                const { data, error } = await supabase.from('students').insert(payload).select('id').single();
                if (error) throw error;
                inserted++;
                if (row.username && row.password) {
                    await createLogin({
                        username: row.username, password: row.password,
                        full_name: `${row.first_name} ${row.last_name}`.trim(),
                        role: 'student', student_id: data.id,
                    });
                    loginsCreated++;
                }
            } else if (kind === 'teachers') {
                const payload = {
                    staff_code:     row.staff_code,
                    first_name:     row.first_name,
                    last_name:      row.last_name,
                    phone:          row.phone || null,
                    email:          row.email || null,
                    qualifications: row.qualifications || null,
                    joined_on:      row.joined_on || null,
                    status:         (row.status || 'active').toLowerCase(),
                };
                const { data, error } = await supabase.from('teachers').insert(payload).select('id').single();
                if (error) throw error;
                inserted++;
                if (row.username && row.password) {
                    await createLogin({
                        username: row.username, password: row.password,
                        full_name: `${row.first_name} ${row.last_name}`.trim(),
                        role: 'teacher', teacher_id: data.id,
                    });
                    loginsCreated++;
                }
            } else if (kind === 'classes') {
                const payload = {
                    name:        row.name,
                    level:       row.level || null,
                    description: row.description || null,
                };
                const { error } = await supabase.from('classes').insert(payload);
                if (error) throw error;
                inserted++;
            }
        } catch (err) {
            failed.push({ line: i + 2, row, message: err.message || String(err) });
        }
    }

    await audit('import.' + kind, kind, null, { inserted, logins: loginsCreated, failed: failed.length });

    resultSummary.innerHTML = `
        <div class="alert ${failed.length ? 'alert-info' : 'alert-success'}">
            <strong>Inserted: ${inserted}</strong>${(kind !== 'classes') ? ` &nbsp;·&nbsp; Logins created: ${loginsCreated}` : ''}
            ${failed.length ? `&nbsp;·&nbsp; <span style="color:#DC2626">Failed: ${failed.length}</span>` : ''}
        </div>`;
    if (failed.length) {
        resultDetail.innerHTML = `
            <h4 style="color:var(--green-700)">Failed rows</h4>
            <table class="table">
                <thead><tr><th>Line</th><th>Code/Name</th><th>Error</th></tr></thead>
                <tbody>${failed.map(f => `<tr>
                    <td>${f.line}</td>
                    <td>${escapeHtml(f.row.student_code || f.row.staff_code || f.row.name || '')}</td>
                    <td>${escapeHtml(f.message)}</td>
                </tr>`).join('')}</tbody>
            </table>`;
    }
    if (inserted) toast.success(`Imported ${inserted} ${kind}`);
    if (failed.length) toast.error(`${failed.length} row${failed.length === 1 ? '' : 's'} failed — see details below`);
}

/* ----- Template download ----------------------------------------- */
function downloadTemplate(kind) {
    const tpl = TEMPLATES[kind];
    const lines = [
        tpl.columns.map(stripStar),
        tpl.sample,
    ];
    const csv = lines.map(row => row.map(v => {
        const s = String(v ?? '').replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${kind}-template.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ----- CSV parser (supports quoted fields, embedded commas/newlines) */
function parseCsv(text) {
    const rows = [];
    let row = [], field = '', i = 0, inQuotes = false;
    text = text.replace(/^﻿/, ''); // strip BOM if present
    while (i < text.length) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
                inQuotes = false; i++; continue;
            }
            field += c; i++; continue;
        }
        if (c === '"') { inQuotes = true; i++; continue; }
        if (c === ',') { row.push(field); field = ''; i++; continue; }
        if (c === '\r') { i++; continue; }
        if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
        field += c; i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
