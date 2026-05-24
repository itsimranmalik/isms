/* Reports — class drill-down. Click a class to see its report. */
import { exportStudentReportPdf, exportClassExcel, exportClassCsv } from '../modules/exporters.js';

export const title = 'Reports';

export async function render(root, { profile, supabase }) {
    // Students get only their own report
    if (profile.role === 'student') return renderStudentSelf(root, supabase, profile);

    const params = new URLSearchParams((location.hash.split('?')[1]) || '');
    const classId = params.get('class') ? Number(params.get('class')) : null;
    if (!classId) return renderClassList(root, supabase, profile);
    return renderClassReport(root, supabase, profile, classId);
}

/* ----- list of classes ---------------------------------------------- */
async function renderClassList(root, sb, profile) {
    const isAdmin = profile.role === 'admin';
    let classes;
    if (isAdmin) {
        const { data } = await sb.from('classes')
            .select('id, name, level, class_students(count)')
            .order('name');
        classes = data || [];
    } else {
        const { data } = await sb.from('class_teachers')
            .select('classes(id, name, level, class_students(count))')
            .eq('teacher_id', profile.teacher_id);
        classes = (data || []).map(r => r.classes).filter(Boolean);
    }

    root.innerHTML = `
        <p class="text-muted" style="margin-top:0">Pick a class to see its performance report — student averages, downloads, and per-student PDFs.</p>
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
async function renderClassReport(root, sb, profile, classId) {
    const [{ data: cls }, { data: roster }, { data: settings }] = await Promise.all([
        sb.from('classes').select('name, level').eq('id', classId).single(),
        sb.from('class_students')
            .select('students(id, first_name, last_name, student_code, date_of_birth, guardian_name)')
            .eq('class_id', classId),
        sb.from('settings').select('school_name, logo_url').eq('id', 1).maybeSingle(),
    ]);

    const ids = (roster || []).map(r => r.students?.id).filter(Boolean);
    let latest = new Map();
    let trendCount = 0;
    if (ids.length) {
        const { data: asses } = await sb.from('assessments')
            .select('student_id, overall_score, overall_grade, assessed_on')
            .in('student_id', ids)
            .eq('module_type', 'quran_recitation')
            .order('assessed_on', { ascending: false });
        for (const a of (asses || [])) {
            if (!latest.has(a.student_id)) latest.set(a.student_id, a);
            trendCount++;
        }
    }

    const schoolName = settings?.school_name || 'Madrasa';
    const logoUrl    = settings?.logo_url || '';

    const rows = (roster || []).map(r => {
        const s = r.students || {};
        const a = latest.get(s.id) || {};
        return {
            student_id: s.id,
            student_code: s.student_code,
            first_name: s.first_name,
            last_name: s.last_name,
            assessed_on: a.assessed_on || '',
            latest_average: a.overall_score ?? '',
            latest_grade: a.overall_grade ?? '',
        };
    }).sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''));

    const scored = rows.filter(r => r.latest_average !== '' && r.latest_average !== null);
    const classAvg = scored.length
        ? (scored.reduce((s, r) => s + Number(r.latest_average), 0) / scored.length).toFixed(2)
        : '—';

    root.innerHTML = `
        <p style="margin-top:0"><a href="#/reports">&larr; All classes</a> &middot;
            <strong>${cls?.name || 'Class'}</strong>
            ${cls?.level ? '<span class="chip">' + cls.level + '</span>' : ''}</p>

        <div class="kpis">
            <div class="kpi"><div class="label">Students</div><div class="value">${rows.length}</div></div>
            <div class="kpi"><div class="label">Assessed</div><div class="value">${scored.length}</div></div>
            <div class="kpi"><div class="label">Total assessments</div><div class="value">${trendCount}</div></div>
            <div class="kpi"><div class="label">Class avg (0-5)</div><div class="value">${classAvg}</div></div>
        </div>

        <div class="card">
            <div class="toolbar">
                <h3 style="margin:0">Latest Quran Recitation scores</h3>
                <span style="margin-left:auto"></span>
                <button class="btn btn-primary" id="export-xlsx">Excel</button>
                <button class="btn" id="export-csv">CSV</button>
            </div>
            <table class="table">
                <thead><tr><th>Code</th><th>Student</th><th>Last assessed</th><th>Average</th><th>Grade</th><th>Report</th></tr></thead>
                <tbody>
                    ${rows.map(r => `<tr>
                        <td>${r.student_code}</td>
                        <td>${r.first_name} ${r.last_name}</td>
                        <td>${r.assessed_on || '—'}</td>
                        <td>${r.latest_average === '' ? '—' : r.latest_average}</td>
                        <td>${r.latest_grade ? '<span class="chip">' + r.latest_grade + '</span>' : '<span class="chip warn">not yet</span>'}</td>
                        <td><button class="btn pdf-btn" data-id="${r.student_id}">PDF</button></td>
                    </tr>`).join('') || '<tr><td colspan="6"><em>No students enrolled.</em></td></tr>'}
                </tbody>
            </table>
        </div>
        <div id="export-status"></div>`;

    document.getElementById('export-xlsx').addEventListener('click', async () => {
        const status = document.getElementById('export-status');
        status.innerHTML = '<div class="alert alert-info">Building Excel...</div>';
        try {
            await exportClassExcel({ className: cls?.name || 'class', rows });
            status.innerHTML = '<div class="alert alert-success">Excel downloaded.</div>';
        } catch (err) {
            status.innerHTML = '<div class="alert alert-danger">' + err.message + '</div>';
        }
    });
    document.getElementById('export-csv').addEventListener('click', () => {
        const status = document.getElementById('export-status');
        try {
            exportClassCsv({ className: cls?.name || 'class', rows });
            status.innerHTML = '<div class="alert alert-success">CSV downloaded.</div>';
        } catch (err) {
            status.innerHTML = '<div class="alert alert-danger">' + err.message + '</div>';
        }
    });
    root.querySelectorAll('.pdf-btn').forEach(b => b.addEventListener('click', async () => {
        const status = document.getElementById('export-status');
        status.innerHTML = '<div class="alert alert-info">Building PDF...</div>';
        try {
            await downloadStudentPdf(sb, Number(b.dataset.id), schoolName, logoUrl);
            status.innerHTML = '<div class="alert alert-success">PDF downloaded.</div>';
        } catch (err) {
            status.innerHTML = '<div class="alert alert-danger">' + err.message + '</div>';
        }
    }));
}

/* ----- student self-report ----------------------------------------- */
async function renderStudentSelf(root, sb, profile) {
    if (!profile.student_id) {
        root.innerHTML = '<div class="alert alert-info">Your student profile isn\'t linked yet.</div>';
        return;
    }
    const sid = profile.student_id;
    const { data: student } = await sb.from('students')
        .select('id, first_name, last_name, student_code, date_of_birth, guardian_name')
        .eq('id', sid).single();
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
        .select('id, first_name, last_name, student_code, date_of_birth, guardian_name')
        .eq('id', sid).single();
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
    const memoSummary = {
        total: memoTotal,
        percent: (memoTotal / 6236 * 100).toFixed(2),
        completed: memoCompleted,
    };

    const duaSummary = {};
    for (const d of (duas || [])) {
        const cat = d.duas?.category || 'misc';
        if (!duaSummary[cat]) duaSummary[cat] = { total: 0, completed: 0, percent: 0 };
        duaSummary[cat].total++;
        if (d.status === 'completed') duaSummary[cat].completed++;
    }
    for (const k of Object.keys(duaSummary)) {
        duaSummary[k].percent = duaSummary[k].total
            ? Math.round(duaSummary[k].completed / duaSummary[k].total * 100)
            : 0;
    }

    await exportStudentReportPdf({
        student,
        recits: (recits || []).slice().reverse(),
        memoSummary, duaSummary, schoolName, logoUrl,
    });
}
