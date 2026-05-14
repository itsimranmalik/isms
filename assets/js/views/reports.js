/* Reports view: PDF student report + class XLSX/CSV exports */
import { exportStudentReportPdf, exportClassExcel, exportClassCsv } from '../modules/exporters.js';

export const title = 'Reports';

export async function render(root, { profile, supabase }) {
    const [{ data: students }, { data: classes }, { data: settings }] = await Promise.all([
        supabase.from('students').select('id, first_name, last_name, student_code, date_of_birth, guardian_name').order('last_name'),
        supabase.from('classes').select('id, name').order('name'),
        supabase.from('settings').select('school_name, logo_url').eq('id', 1).maybeSingle(),
    ]);

    const schoolName = settings?.school_name || 'Madrasa';
    const logoUrl    = settings?.logo_url || '';

    // Students can only see themselves
    let studentChoices = students || [];
    if (profile.role === 'student' && profile.student_id) {
        studentChoices = (students || []).filter(s => s.id === profile.student_id);
    }

    root.innerHTML = `
        <div class="grid-app">
            <div class="card span-6">
                <h3>Student progress report (PDF)</h3>
                <label class="field">Student
                    <select id="rep-student">
                        ${studentChoices.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`).join('')}
                    </select>
                </label>
                <button class="btn btn-primary" id="rep-pdf" style="margin-top:12px">Download PDF</button>
            </div>
            ${profile.role === 'student' ? '' : `
            <div class="card span-6">
                <h3>Class performance export</h3>
                <label class="field">Class
                    <select id="rep-class">
                        ${(classes || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </label>
                <div class="toolbar" style="margin-top:12px">
                    <button class="btn btn-primary" id="rep-xlsx">Excel (.xlsx)</button>
                    <button class="btn" id="rep-csv">CSV</button>
                </div>
            </div>`}
        </div>
        <div id="rep-status"></div>`;

    document.getElementById('rep-pdf').addEventListener('click', async () => {
        const sid = Number(document.getElementById('rep-student').value);
        const status = document.getElementById('rep-status');
        status.innerHTML = '<div class="alert alert-info">Building PDF…</div>';
        try {
            const student = studentChoices.find(s => s.id === sid);
            const [{ data: recits }, { data: memo }, { data: duas }] = await Promise.all([
                supabase.from('assessments')
                    .select('assessed_on, overall_score, overall_grade, quran_recitation_grades(fluency,makharij,tajweed,waqf,accuracy)')
                    .eq('student_id', sid).eq('module_type', 'quran_recitation')
                    .order('assessed_on', { ascending: false }).limit(10),
                supabase.from('memorisation_progress').select('ayahs_memorised, status').eq('student_id', sid),
                supabase.from('dua_progress').select('status, dua_id, duas(category)').eq('student_id', sid),
            ]);
            const memoTotal     = (memo || []).reduce((s, r) => s + (r.ayahs_memorised || 0), 0);
            const memoCompleted = (memo || []).filter(r => r.status === 'completed').length;
            const memoSummary   = { total: memoTotal, percent: (memoTotal / 6236 * 100).toFixed(2), completed: memoCompleted };

            const duaSummary = {};
            for (const d of (duas || [])) {
                const cat = d.duas?.category || 'misc';
                if (!duaSummary[cat]) duaSummary[cat] = { total: 0, completed: 0, percent: 0 };
                duaSummary[cat].total++;
                if (d.status === 'completed') duaSummary[cat].completed++;
            }
            for (const k of Object.keys(duaSummary)) {
                duaSummary[k].percent = duaSummary[k].total ? Math.round(duaSummary[k].completed / duaSummary[k].total * 100) : 0;
            }

            await exportStudentReportPdf({
                student, recits: (recits || []).slice().reverse(), memoSummary, duaSummary, schoolName, logoUrl,
            });
            status.innerHTML = '<div class="alert alert-success">PDF downloaded.</div>';
        } catch (err) {
            status.innerHTML = `<div class="alert alert-danger">${err.message || 'PDF failed.'}</div>`;
        }
    });

    document.getElementById('rep-xlsx')?.addEventListener('click', () => classExport('xlsx'));
    document.getElementById('rep-csv')?.addEventListener('click',  () => classExport('csv'));

    async function classExport(kind) {
        const cid   = Number(document.getElementById('rep-class').value);
        const cName = document.querySelector('#rep-class option:checked')?.textContent || 'class';
        const status = document.getElementById('rep-status');
        status.innerHTML = '<div class="alert alert-info">Building export…</div>';
        try {
            const { data: roster } = await supabase
                .from('class_students')
                .select('students(id, first_name, last_name)')
                .eq('class_id', cid);
            const ids = (roster || []).map(r => r.students?.id).filter(Boolean);
            const { data: latest } = await supabase
                .from('assessments')
                .select('student_id, overall_score, overall_grade, assessed_on')
                .in('student_id', ids)
                .eq('module_type', 'quran_recitation')
                .order('assessed_on', { ascending: false });
            // pick latest per student
            const lastBy = new Map();
            for (const a of (latest || [])) if (!lastBy.has(a.student_id)) lastBy.set(a.student_id, a);

            const rows = (roster || []).map(r => {
                const a = lastBy.get(r.students.id) || {};
                return {
                    student_id: r.students.id,
                    first_name: r.students.first_name,
                    last_name:  r.students.last_name,
                    latest_average: a.overall_score ?? '',
                    latest_grade:   a.overall_grade ?? '',
                };
            });
            if (kind === 'xlsx') await exportClassExcel({ className: cName, rows });
            else exportClassCsv({ className: cName, rows });
            status.innerHTML = '<div class="alert alert-success">Export downloaded.</div>';
        } catch (err) {
            status.innerHTML = `<div class="alert alert-danger">${err.message || 'Export failed.'}</div>`;
        }
    }
}
