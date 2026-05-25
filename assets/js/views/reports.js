/* Reports — class drill-down with Quran / Memorisation / Duas tabs + per-student trends. */
import { exportStudentReportPdf, exportClassExcel, exportClassCsv } from '../modules/exporters.js';

export const title = 'Reports';

export async function render(root, { profile, supabase }) {
    if (profile.role === 'student') return renderStudentSelf(root, supabase, profile);

    const params = new URLSearchParams((location.hash.split('?')[1]) || '');
    const classId = params.get('class') ? Number(params.get('class')) : null;
    const tab     = params.get('tab') || 'quran';   // quran | memorisation | duas
    if (!classId) return renderClassList(root, supabase, profile);
    return renderClassReport(root, supabase, profile, classId, tab);
}

/* ----- list of classes ---------------------------------------------- */
async function renderClassList(root, sb, profile) {
    const isAdmin = profile.role === 'admin';
    let classes;
    if (isAdmin) {
        const { data } = await sb.from('classes')
            .select('id, name, level, class_students(count)').order('name');
        classes = data || [];
    } else {
        const { data } = await sb.from('class_teachers')
            .select('classes(id, name, level, class_students(count))')
            .eq('teacher_id', profile.teacher_id);
        classes = (data || []).map(r => r.classes).filter(Boolean);
    }
    root.innerHTML = `
        <p class="text-muted" style="margin-top:0">Pick a class to see Quran, Memorisation and Duas reports.</p>
        <div class="grid-app">
            ${classes.map(c => `
                <a class="card span-6" href="#/reports?class=${c.id}" style="text-decoration:none; color:inherit; display:block">
                    <h3 style="margin:0">${c.name}</h3>
                    <p class="text-muted" style="margin:4px 0 12px">${c.level || ''}</p>
                    <span class="chip">${c.class_students?.[0]?.count || 0} students</span>
                </a>
            `).join('') || '<div class="alert alert-info">No classes available.</div>'}
        </div>`;
}

/* ----- the class report -------------------------------------------- */
async function renderClassReport(root, sb, profile, classId, tab) {
    const [{ data: cls }, { data: roster }, { data: settings }, { data: allDuas }] = await Promise.all([
        sb.from('classes').select('name, level').eq('id', classId).single(),
        sb.from('class_students')
            .select('students(id, first_name, last_name, student_code, date_of_birth, guardian_name)')
            .eq('class_id', classId),
        sb.from('settings').select('school_name, logo_url').eq('id', 1).maybeSingle(),
        sb.from('duas').select('id, category'),
    ]);
    const ids = (roster || []).map(r => r.students?.id).filter(Boolean);
    const schoolName = settings?.school_name || 'Madrasa';
    const logoUrl    = settings?.logo_url || '';

    // Fetch all three module data in parallel
    const [
        { data: qrAsses },
        { data: memProg },
        { data: duaProg },
    ] = ids.length ? await Promise.all([
        sb.from('assessments').select('student_id, overall_score, overall_grade, assessed_on')
            .in('student_id', ids).eq('module_type', 'quran_recitation')
            .order('assessed_on', { ascending: false }),
        sb.from('memorisation_progress').select('student_id, ayahs_memorised, status'),
        sb.from('dua_progress').select('student_id, dua_id, status'),
    ]) : [{ data: [] }, { data: [] }, { data: [] }];

    // Build per-student summaries
    const summary = new Map();
    for (const r of (roster || [])) {
        if (!r.students) continue;
        summary.set(r.students.id, {
            student: r.students,
            qr: [],
            memAyahs: 0, memCompleted: 0,
            duasDaily: { total: 0, completed: 0 },
            duasNamaz: { total: 0, completed: 0 },
        });
    }
    const totalDailyDuas = (allDuas || []).filter(d => d.category === 'daily').length || 1;
    const totalNamazDuas = (allDuas || []).filter(d => d.category === 'namaz').length || 1;
    const duaCatById = new Map((allDuas || []).map(d => [d.id, d.category]));

    for (const a of (qrAsses || [])) {
        const s = summary.get(a.student_id);
        if (s) s.qr.push(a);
    }
    for (const m of (memProg || [])) {
        const s = summary.get(m.student_id);
        if (!s) continue;
        s.memAyahs += m.ayahs_memorised || 0;
        if (m.status === 'completed') s.memCompleted++;
    }
    for (const d of (duaProg || [])) {
        const s = summary.get(d.student_id);
        if (!s) continue;
        const cat = duaCatById.get(d.dua_id);
        const slot = cat === 'namaz' ? s.duasNamaz : s.duasDaily;
        slot.total++;
        if (d.status === 'completed') slot.completed++;
    }

    // Sort roster by last name
    const sorted = Array.from(summary.values())
        .sort((a, b) => (a.student.last_name || '').localeCompare(b.student.last_name || ''));

    // KPIs across all three modules
    const scored = sorted.filter(r => r.qr.length);
    const qrAvg = scored.length
        ? (scored.reduce((s, r) => s + Number(r.qr[0].overall_score || 0), 0) / scored.length).toFixed(2)
        : '—';

    const tabHref = (t) => `#/reports?class=${classId}&tab=${t}`;
    const tabBtn  = (t, label) => `<a href="${tabHref(t)}" class="btn ${t === tab ? 'btn-primary' : ''}">${label}</a>`;

    root.innerHTML = `
        <p style="margin-top:0"><a href="#/reports">&larr; All classes</a> &middot;
            <strong>${cls?.name || 'Class'}</strong>
            ${cls?.level ? '<span class="chip">' + cls.level + '</span>' : ''}</p>

        <div class="kpis">
            <div class="kpi"><div class="label">Students</div><div class="value">${sorted.length}</div></div>
            <div class="kpi"><div class="label">Quran assessed</div><div class="value">${scored.length}</div></div>
            <div class="kpi"><div class="label">Class avg (0-5)</div><div class="value">${qrAvg}</div></div>
        </div>

        <div class="toolbar" style="margin-bottom:12px">
            ${tabBtn('quran',       'Quran Recitation')}
            ${tabBtn('memorisation','Memorisation')}
            ${tabBtn('duas',        'Daily + Namaz Duas')}
        </div>

        <div id="report-pane"></div>`;

    const pane = document.getElementById('report-pane');
    if (tab === 'quran')        renderQuranTab(pane, sorted, classId, cls?.name, schoolName, logoUrl, sb);
    else if (tab === 'memorisation') renderMemTab(pane, sorted, cls?.name);
    else if (tab === 'duas')         renderDuasTab(pane, sorted, totalDailyDuas, totalNamazDuas, cls?.name);
}

/* ----- Quran tab with trend arrows --------------------------------- */
function renderQuranTab(pane, sorted, classId, className, schoolName, logoUrl, sb) {
    const rows = sorted.map(r => {
        const latest   = r.qr[0]; // already sorted desc
        const previous = r.qr[1];
        let trend = '';
        if (latest && previous) {
            const diff = Number(latest.overall_score) - Number(previous.overall_score);
            if (diff > 0.05) trend = '<span class="chip" style="background:#10B98122;color:#059669">↑ +' + diff.toFixed(2) + '</span>';
            else if (diff < -0.05) trend = '<span class="chip" style="background:#DC262622;color:#DC2626">↓ ' + diff.toFixed(2) + '</span>';
            else trend = '<span class="chip" style="background:#94A3B822;color:#64748B">→ flat</span>';
        } else if (latest) {
            trend = '<span class="chip">first</span>';
        }
        return {
            student_id: r.student.id,
            student_code: r.student.student_code,
            first_name: r.student.first_name,
            last_name: r.student.last_name,
            assessed_on: latest?.assessed_on || '',
            latest_average: latest?.overall_score ?? '',
            latest_grade: latest?.overall_grade ?? '',
            assessments_count: r.qr.length,
            trend,
        };
    });

    pane.innerHTML = `
        <div class="card">
            <div class="toolbar">
                <h3 style="margin:0">Quran Recitation — latest score per student</h3>
                <span style="margin-left:auto"></span>
                <button class="btn btn-primary" id="export-xlsx">Excel</button>
                <button class="btn" id="export-csv">CSV</button>
            </div>
            <table class="table">
                <thead><tr><th>Code</th><th>Student</th><th>Last assessed</th><th>Average</th><th>Grade</th><th>Trend</th><th>#</th><th>Report</th></tr></thead>
                <tbody>
                    ${rows.map(r => `<tr>
                        <td>${r.student_code}</td>
                        <td>${r.first_name} ${r.last_name}</td>
                        <td>${r.assessed_on || '—'}</td>
                        <td>${r.latest_average === '' ? '—' : r.latest_average}</td>
                        <td>${r.latest_grade ? '<span class="chip">' + r.latest_grade + '</span>' : '<span class="chip warn">not yet</span>'}</td>
                        <td>${r.trend}</td>
                        <td>${r.assessments_count}</td>
                        <td><button class="btn pdf-btn" data-id="${r.student_id}">PDF</button></td>
                    </tr>`).join('') || '<tr><td colspan="8"><em>No students enrolled.</em></td></tr>'}
                </tbody>
            </table>
        </div>
        <div id="export-status"></div>`;

    pane.querySelector('#export-xlsx').addEventListener('click', async () => {
        const status = pane.querySelector('#export-status');
        status.innerHTML = '<div class="alert alert-info">Building Excel...</div>';
        try {
            await exportClassExcel({ className: className || 'class', rows: rows.map(({ trend, ...keep }) => keep) });
            status.innerHTML = '<div class="alert alert-success">Excel downloaded.</div>';
        } catch (err) { status.innerHTML = '<div class="alert alert-danger">' + err.message + '</div>'; }
    });
    pane.querySelector('#export-csv').addEventListener('click', () => {
        try {
            exportClassCsv({ className: className || 'class', rows: rows.map(({ trend, ...keep }) => keep) });
            pane.querySelector('#export-status').innerHTML = '<div class="alert alert-success">CSV downloaded.</div>';
        } catch (err) { pane.querySelector('#export-status').innerHTML = '<div class="alert alert-danger">' + err.message + '</div>'; }
    });
    pane.querySelectorAll('.pdf-btn').forEach(b => b.addEventListener('click', async () => {
        const status = pane.querySelector('#export-status');
        status.innerHTML = '<div class="alert alert-info">Building PDF...</div>';
        try {
            await downloadStudentPdf(sb, Number(b.dataset.id), schoolName, logoUrl);
            status.innerHTML = '<div class="alert alert-success">PDF downloaded.</div>';
        } catch (err) { status.innerHTML = '<div class="alert alert-danger">' + err.message + '</div>'; }
    }));
}

/* ----- Memorisation tab -------------------------------------------- */
function renderMemTab(pane, sorted, className) {
    const rows = sorted.map(r => ({
        student_code: r.student.student_code,
        first_name:   r.student.first_name,
        last_name:    r.student.last_name,
        ayahs:        r.memAyahs,
        percent:      (r.memAyahs / 6236 * 100).toFixed(2),
        surahs_complete: r.memCompleted,
    }));
    pane.innerHTML = `
        <div class="card">
            <div class="toolbar">
                <h3 style="margin:0">Memorisation (Hifz) progress</h3>
                <span style="margin-left:auto"></span>
                <button class="btn" id="mem-csv">CSV</button>
            </div>
            <table class="table">
                <thead><tr><th>Code</th><th>Student</th><th>Ayahs memorised</th><th>% of Quran</th><th>Surahs complete</th><th>Progress</th></tr></thead>
                <tbody>
                    ${rows.map(r => `<tr>
                        <td>${r.student_code}</td>
                        <td>${r.first_name} ${r.last_name}</td>
                        <td>${r.ayahs}</td>
                        <td>${r.percent}%</td>
                        <td>${r.surahs_complete}</td>
                        <td><div class="progress" style="min-width:120px"><span style="width:${Math.min(100, Number(r.percent))}%"></span></div></td>
                    </tr>`).join('') || '<tr><td colspan="6"><em>No students.</em></td></tr>'}
                </tbody>
            </table>
        </div>`;
    pane.querySelector('#mem-csv').addEventListener('click', () => {
        downloadCsv(`${(className || 'class').replace(/\s+/g,'-').toLowerCase()}-memorisation.csv`,
            ['Code','First Name','Last Name','Ayahs memorised','% of Quran','Surahs complete'],
            rows.map(r => [r.student_code, r.first_name, r.last_name, r.ayahs, r.percent, r.surahs_complete]));
    });
}

/* ----- Duas tab ---------------------------------------------------- */
function renderDuasTab(pane, sorted, totalDaily, totalNamaz, className) {
    const rows = sorted.map(r => ({
        student_code: r.student.student_code,
        first_name:   r.student.first_name,
        last_name:    r.student.last_name,
        daily_completed: r.duasDaily.completed,
        daily_total:     totalDaily,
        daily_pct:       Math.round(r.duasDaily.completed / totalDaily * 100),
        namaz_completed: r.duasNamaz.completed,
        namaz_total:     totalNamaz,
        namaz_pct:       Math.round(r.duasNamaz.completed / totalNamaz * 100),
    }));
    pane.innerHTML = `
        <div class="card">
            <div class="toolbar">
                <h3 style="margin:0">Daily + Namaz Duas progress</h3>
                <span style="margin-left:auto"></span>
                <button class="btn" id="dua-csv">CSV</button>
            </div>
            <table class="table">
                <thead><tr><th>Code</th><th>Student</th><th>Daily</th><th>Daily %</th><th>Namaz</th><th>Namaz %</th></tr></thead>
                <tbody>
                    ${rows.map(r => `<tr>
                        <td>${r.student_code}</td>
                        <td>${r.first_name} ${r.last_name}</td>
                        <td>${r.daily_completed} / ${r.daily_total}</td>
                        <td><div class="progress" style="min-width:100px"><span style="width:${r.daily_pct}%"></span></div> ${r.daily_pct}%</td>
                        <td>${r.namaz_completed} / ${r.namaz_total}</td>
                        <td><div class="progress" style="min-width:100px"><span style="width:${r.namaz_pct}%"></span></div> ${r.namaz_pct}%</td>
                    </tr>`).join('') || '<tr><td colspan="6"><em>No students.</em></td></tr>'}
                </tbody>
            </table>
        </div>`;
    pane.querySelector('#dua-csv').addEventListener('click', () => {
        downloadCsv(`${(className || 'class').replace(/\s+/g,'-').toLowerCase()}-duas.csv`,
            ['Code','First Name','Last Name','Daily completed','Daily total','Daily %','Namaz completed','Namaz total','Namaz %'],
            rows.map(r => [r.student_code, r.first_name, r.last_name, r.daily_completed, r.daily_total, r.daily_pct, r.namaz_completed, r.namaz_total, r.namaz_pct]));
    });
}

/* ----- student self-report ---------------------------------------- */
async function renderStudentSelf(root, sb, profile) {
    if (!profile.student_id) {
        root.innerHTML = '<div class="alert alert-info">Your student profile isn\'t linked yet.</div>';
        return;
    }
    const sid = profile.student_id;
    const { data: student } = await sb.from('students')
        .select('id, first_name, last_name, student_code, date_of_birth, guardian_name').eq('id', sid).single();
    const { data: settings } = await sb.from('settings').select('school_name, logo_url').eq('id', 1).maybeSingle();

    root.innerHTML = `
        <div class="card" style="max-width: 520px">
            <h3 style="margin-top:0">Your progress report</h3>
            <p class="text-muted">${student?.first_name} ${student?.last_name} <span class="chip">${student?.student_code}</span></p>
            <button class="btn btn-primary btn-lg" id="my-pdf">Download PDF</button>
            <div id="my-status" style="margin-top:10px"></div>
        </div>`;

    document.getElementById('my-pdf').addEventListener('click', async () => {
        const status = document.getElementById('my-status');
        status.innerHTML = '<div class="alert alert-info">Building PDF...</div>';
        try {
            await downloadStudentPdf(sb, sid, settings?.school_name || 'Madrasa', settings?.logo_url || '');
            status.innerHTML = '<div class="alert alert-success">PDF downloaded.</div>';
        } catch (err) {
            status.innerHTML = '<div class="alert alert-danger">' + err.message + '</div>';
        }
    });
}

/* ----- shared PDF helper ------------------------------------------ */
async function downloadStudentPdf(sb, sid, schoolName, logoUrl) {
    const { data: student } = await sb.from('students')
        .select('id, first_name, last_name, student_code, date_of_birth, guardian_name').eq('id', sid).single();
    const [{ data: recits }, { data: memo }, { data: duas }] = await Promise.all([
        sb.from('assessments')
            .select('assessed_on, overall_score, overall_grade, quran_recitation_grades(fluency,makharij,tajweed,waqf,accuracy)')
            .eq('student_id', sid).eq('module_type', 'quran_recitation')
            .order('assessed_on', { ascending: false }).limit(10),
        sb.from('memorisation_progress').select('ayahs_memorised, status').eq('student_id', sid),
        sb.from('dua_progress').select('status, dua_id, duas(category)').eq('student_id', sid),
    ]);

    const memoTotal     = (memo || []).reduce((s, r) => s + (r.ayahs_memorised || 0), 0);
    const memoCompleted = (memo || []).filter(r => r.status === 'completed').length;
    const memoSummary = { total: memoTotal, percent: (memoTotal / 6236 * 100).toFixed(2), completed: memoCompleted };

    const duaSummary = {};
    for (const d of (duas || [])) {
        const cat = d.duas?.category || 'misc';
        if (!duaSummary[cat]) duaSummary[cat] = { total: 0, completed: 0, percent: 0 };
        duaSummary[cat].total++;
        if (d.status === 'completed') duaSummary[cat].completed++;
    }
    for (const k of Object.keys(duaSummary)) {
        duaSummary[k].percent = duaSummary[k].total
            ? Math.round(duaSummary[k].completed / duaSummary[k].total * 100) : 0;
    }

    await exportStudentReportPdf({
        student,
        recits: (recits || []).slice().reverse(),
        memoSummary, duaSummary, schoolName, logoUrl,
    });
}

function downloadCsv(filename, headers, rows) {
    const lines = [headers, ...rows].map(row =>
        row.map(v => {
            if (v == null) return '';
            const s = String(v).replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
        }).join(',')
    ).join('\r\n');
    const blob = new Blob(['﻿' + lines], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
