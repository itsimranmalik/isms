/* Parent Feedback — admin-only view of anonymous submissions from feedback.html. */
import { audit } from '../supabase-client.js';
import { toast } from '../modules/toast.js';

export const title = 'Parent Feedback';

const SAT_LABEL = { 5:'Very Satisfied', 4:'Satisfied', 3:'Neutral', 2:'Dissatisfied', 1:'Very Dissatisfied' };
const SAT_CHIP  = { 5:'',              4:'',          3:'gold',    2:'warn',         1:'danger' };
const PACE_LABEL = { too_slow:'Too Slow', just_right:'Just Right', too_fast:'Too Fast' };
const YNM_LABEL = {
    yes:'Yes', no:'No', not_sure:'Not sure', maybe:'Maybe', depends:'Depends on the fee',
    weekday_evening:'Weekday evening', weekend:'Weekend', either:'Either',
};

// Human labels and DB column names for every question, in display order.
const QUESTIONS = [
    // section, question label, db column, kind (sat|pace|ynm|text)
    ['Overall Experience',       'Q1 · Overall satisfaction',                  'q1_overall_satisfaction',   'sat'],
    ['Overall Experience',       'Q2 · Quality of teaching',                   'q2_teaching_quality',       'sat'],
    ['Overall Experience',       'Q3 · Communication',                         'q3_communication',          'sat'],
    ['Overall Experience',       'Q4 · Learning environment & facilities',     'q4_learning_environment',   'sat'],
    ['Overall Experience',       'Q5 · Safety and wellbeing',                  'q5_safety_wellbeing',       'sat'],
    ['Overall Experience',       'Q6 · Approachability of teachers & staff',   'q6_approachability',        'sat'],
    ['End of Year Assessment',   'Q8 · Assessment result explanation',         'q8_assessment_explanation', 'sat'],
    ['End of Year Assessment',   'Q9 · Understanding of overall progress',     'q9_progress_understanding', 'sat'],
    ['End of Year Assessment',   'Q10 · Pace of teaching',                     'q10_teaching_pace',         'pace'],
    ['End of Year Assessment',   'Q11 · Areas where child needs more support', 'q11_support_needed',        'text'],
    ['Urdu Language',            'Q12 · Child\'s interest in Urdu',            'q12_urdu_interest',         'ynm'],
    ['Urdu Language',            'Q13 · Would consider Urdu classes',          'q13_urdu_classes_interest', 'ynm'],
    ['Urdu Language',            'Q14 · Willing to pay a fee',                 'q14_urdu_fee_willingness',  'ynm'],
    ['Urdu Language',            'Q16 · Preferred day/time',                   'q16_urdu_preferred_time',   'ynm'],
    ['General Feedback',         'Q17 · What the madrasa does well',           'q17_does_well',             'text'],
    ['General Feedback',         'Q18 · What could improve',                   'q18_could_improve',         'text'],
    ['General Feedback',         'Q19 · Other comments',                       'q19_other_comments',        'text'],
];

export async function render(root, { profile, supabase }) {
    if (profile.role !== 'admin') {
        root.innerHTML = '<div class="alert alert-danger">Admin only.</div>';
        return;
    }

    const params = new URLSearchParams((location.hash.split('?')[1]) || '');
    const classFilter = params.get('class') || '';

    root.innerHTML = `
        <p class="text-muted" style="margin-top:0">
            Anonymous feedback submitted via the public
            <a href="feedback.html" target="_blank">Parents' Evening Feedback Form</a>.
            All entries are anonymous — no parent or child names are stored.
        </p>

        <div class="grid-app" id="fb-summary" style="margin-bottom:16px"></div>

        <div class="toolbar" style="flex-wrap:wrap; margin-bottom:12px">
            <label class="field">Class contains
                <input id="fb-class-filter" type="search" value="${escape(classFilter)}" placeholder="e.g. B4">
            </label>
            <span style="margin-left:auto"></span>
            <button class="btn" id="fb-csv">Download CSV</button>
            <button class="btn btn-primary" id="fb-xlsx">Download Excel</button>
        </div>

        <div class="card">
            <table class="table">
                <thead><tr>
                    <th>Submitted</th>
                    <th>Class</th>
                    <th>Overall</th>
                    <th>Teaching</th>
                    <th>Comm.</th>
                    <th>Pace</th>
                    <th>Urdu?</th>
                    <th></th>
                </tr></thead>
                <tbody><tr><td colspan="8"><em>Loading…</em></td></tr></tbody>
            </table>
        </div>

        <dialog id="fb-dialog" style="border:0; border-radius:var(--radius); padding:0; max-width:760px; width:92%">
            <div style="padding:24px" id="fb-dialog-body"></div>
        </dialog>`;

    let cache = [];
    await load();

    document.getElementById('fb-class-filter').addEventListener('input', (e) => {
        const v = e.target.value.trim();
        const url = new URL(location.href);
        url.hash = '#/feedback' + (v ? `?class=${encodeURIComponent(v)}` : '');
        history.replaceState({}, '', url);
        renderTable();
        renderSummary();
    });

    document.getElementById('fb-csv').addEventListener('click',  () => downloadCsv(visible()));
    document.getElementById('fb-xlsx').addEventListener('click', () => downloadXlsx(visible()));

    async function load() {
        const { data, error } = await supabase
            .from('parent_feedback')
            .select('*')
            .order('submitted_at', { ascending: false });
        if (error) {
            root.querySelector('tbody').innerHTML =
                `<tr><td colspan="8"><div class="alert alert-danger">${error.message}</div></td></tr>`;
            return;
        }
        cache = data || [];
        renderSummary();
        renderTable();
    }

    function currentFilter() {
        return (document.getElementById('fb-class-filter').value || '').trim().toLowerCase();
    }
    function visible() {
        const f = currentFilter();
        if (!f) return cache;
        return cache.filter(r => (r.class_names || '').toLowerCase().includes(f));
    }

    function renderSummary() {
        const rows = visible();
        const sumCol = document.getElementById('fb-summary');
        if (rows.length === 0) {
            sumCol.innerHTML = `<div class="card span-12"><em>No feedback yet.</em></div>`;
            return;
        }
        const satKeys = ['q1_overall_satisfaction','q2_teaching_quality','q3_communication',
                         'q4_learning_environment','q5_safety_wellbeing','q6_approachability',
                         'q8_assessment_explanation','q9_progress_understanding'];
        const avg = k => {
            const vals = rows.map(r => r[k]).filter(v => v != null).map(Number);
            if (!vals.length) return null;
            return (vals.reduce((a,b) => a+b, 0) / vals.length);
        };
        const satVals = satKeys.map(avg).filter(x => x != null);
        const overallSat = satVals.length ? (satVals.reduce((a,b) => a+b, 0) / satVals.length) : null;

        const paceMix = tally(rows, 'q10_teaching_pace');
        const urduInterest = tally(rows, 'q12_urdu_interest');

        sumCol.innerHTML = `
            <div class="card span-3">
                <div class="text-muted" style="font-size:12px; text-transform:uppercase; letter-spacing:.06em; font-weight:600">Submissions</div>
                <div style="font-size:28px; font-weight:700; color:var(--green-800); margin-top:4px">${rows.length}</div>
            </div>
            <div class="card span-3">
                <div class="text-muted" style="font-size:12px; text-transform:uppercase; letter-spacing:.06em; font-weight:600">Overall avg (1-5)</div>
                <div style="font-size:28px; font-weight:700; color:var(--green-800); margin-top:4px">${overallSat != null ? overallSat.toFixed(2) : '—'}</div>
            </div>
            <div class="card span-3">
                <div class="text-muted" style="font-size:12px; text-transform:uppercase; letter-spacing:.06em; font-weight:600">Pace: just right</div>
                <div style="font-size:20px; font-weight:700; color:var(--green-800); margin-top:4px">${paceMix.just_right || 0} / ${rows.length}</div>
                <div class="text-muted" style="font-size:12px; margin-top:2px">Slow: ${paceMix.too_slow || 0} · Fast: ${paceMix.too_fast || 0}</div>
            </div>
            <div class="card span-3">
                <div class="text-muted" style="font-size:12px; text-transform:uppercase; letter-spacing:.06em; font-weight:600">Urdu interest</div>
                <div style="font-size:20px; font-weight:700; color:var(--green-800); margin-top:4px">${urduInterest.yes || 0} yes</div>
                <div class="text-muted" style="font-size:12px; margin-top:2px">Not sure: ${urduInterest.not_sure || 0} · No: ${urduInterest.no || 0}</div>
            </div>`;
    }

    function renderTable() {
        const rows = visible();
        const tbody = root.querySelector('tbody');
        tbody.innerHTML = rows.map(r => `
            <tr>
                <td>${new Date(r.submitted_at).toLocaleDateString()}
                    <div class="text-muted" style="font-size:11px">${new Date(r.submitted_at).toLocaleTimeString()}</div>
                </td>
                <td>${escape(r.class_names || '—')}</td>
                <td>${satChip(r.q1_overall_satisfaction)}</td>
                <td>${satChip(r.q2_teaching_quality)}</td>
                <td>${satChip(r.q3_communication)}</td>
                <td>${r.q10_teaching_pace ? `<span class="chip">${PACE_LABEL[r.q10_teaching_pace]}</span>` : '—'}</td>
                <td>${r.q12_urdu_interest ? `<span class="chip">${YNM_LABEL[r.q12_urdu_interest]}</span>` : '—'}</td>
                <td><button class="btn open-btn" data-id="${r.id}">Open</button></td>
            </tr>`).join('') || `<tr><td colspan="8"><em>No feedback matches the filter.</em></td></tr>`;

        tbody.querySelectorAll('.open-btn').forEach(b => b.addEventListener('click', () => openDetail(Number(b.dataset.id))));
    }

    function openDetail(id) {
        const r = cache.find(x => x.id === id);
        if (!r) return;
        const body = document.getElementById('fb-dialog-body');

        const sections = {};
        for (const [section, label, col, kind] of QUESTIONS) {
            const val = r[col];
            let display = '';
            if (kind === 'sat')  display = val != null ? `<span class="chip ${SAT_CHIP[val]}">${SAT_LABEL[val] || val}</span>` : '<span class="text-muted">—</span>';
            else if (kind === 'pace') display = val ? `<span class="chip">${PACE_LABEL[val] || val}</span>` : '<span class="text-muted">—</span>';
            else if (kind === 'ynm')  display = val ? `<span class="chip">${YNM_LABEL[val] || val}</span>` : '<span class="text-muted">—</span>';
            else /* text */ display = val ? `<div style="white-space:pre-wrap">${escape(val)}</div>` : '<span class="text-muted">—</span>';

            (sections[section] ||= []).push({ label, display });
        }

        body.innerHTML = `
            <h2 style="margin-top:0; color:var(--green-700)">Feedback submission</h2>
            <p class="text-muted" style="margin:0 0 12px">
                Submitted ${new Date(r.submitted_at).toLocaleString()} · Class: <strong>${escape(r.class_names || '—')}</strong>
            </p>
            ${Object.entries(sections).map(([section, items]) => `
                <h3 style="color:var(--green-800); margin:18px 0 8px; font-size:15px">${section}</h3>
                <table class="table" style="margin:0">
                    <tbody>
                        ${items.map(it => `<tr><th style="width:44%">${it.label}</th><td>${it.display}</td></tr>`).join('')}
                    </tbody>
                </table>
            `).join('')}
            <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px">
                <button class="btn" id="fb-delete">Delete</button>
                <button class="btn btn-primary" id="fb-close">Close</button>
            </div>`;

        const dlg = document.getElementById('fb-dialog');
        dlg.showModal();

        document.getElementById('fb-close').addEventListener('click', () => dlg.close());
        document.getElementById('fb-delete').addEventListener('click', async () => {
            if (!confirm('Delete this feedback entry permanently?')) return;
            const { error } = await supabase.from('parent_feedback').delete().eq('id', id);
            if (error) { toast.error(error.message); return; }
            await audit('parent_feedback.delete', 'parent_feedback', id);
            toast.success('Feedback deleted');
            dlg.close();
            load();
        });
    }

    /* --------- Exports --------- */

    function csvHeaders() {
        return ['Submitted', 'Class', ...QUESTIONS.map(q => q[1])];
    }
    function toCsvRow(r) {
        return [
            new Date(r.submitted_at).toISOString(),
            r.class_names || '',
            ...QUESTIONS.map(([, , col, kind]) => {
                const v = r[col];
                if (v == null || v === '') return '';
                if (kind === 'sat')  return `${v} (${SAT_LABEL[v] || ''})`;
                if (kind === 'pace') return PACE_LABEL[v] || v;
                if (kind === 'ynm')  return YNM_LABEL[v] || v;
                return String(v).replace(/\r?\n/g, ' ');
            })
        ];
    }

    function downloadCsv(rows) {
        if (rows.length === 0) { toast.warn('Nothing to export'); return; }
        const lines = [csvHeaders(), ...rows.map(toCsvRow)];
        const csv = lines.map(row => row.map(v => {
            if (v == null) return '';
            const s = String(v).replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
        }).join(',')).join('\r\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `parent-feedback-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        toast.success(`Exported ${rows.length} rows`);
    }

    async function downloadXlsx(rows) {
        if (rows.length === 0) { toast.warn('Nothing to export'); return; }
        if (!window.XLSX) {
            await new Promise((res, rej) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
                s.onload = res; s.onerror = rej;
                document.head.appendChild(s);
            });
        }
        const XLSX = window.XLSX;
        const aoa = [csvHeaders(), ...rows.map(toCsvRow)];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        // reasonable column widths
        ws['!cols'] = [{wch:18},{wch:12}, ...QUESTIONS.map(q => ({ wch: Math.min(60, Math.max(18, q[1].length + 4)) }))];
        XLSX.utils.book_append_sheet(wb, ws, 'Feedback');
        XLSX.writeFile(wb, `parent-feedback-${new Date().toISOString().slice(0,10)}.xlsx`);
        toast.success(`Exported ${rows.length} rows`);
    }
}

/* helpers */
function satChip(v) {
    if (v == null) return '—';
    return `<span class="chip ${SAT_CHIP[v]}">${v}</span>`;
}
function tally(rows, key) {
    const out = {};
    for (const r of rows) {
        const v = r[key];
        if (!v) continue;
        out[v] = (out[v] || 0) + 1;
    }
    return out;
}
function escape(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
