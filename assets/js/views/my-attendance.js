export const title = 'My Attendance';

export async function render(root, { profile, supabase }) {
    if (!profile.student_id) {
        root.innerHTML = '<div class="alert alert-info">Your student profile isn\'t linked yet.</div>';
        return;
    }
    const { data: rows } = await supabase
        .from('attendance')
        .select('attended_on, status, classes(name), note')
        .eq('student_id', profile.student_id)
        .order('attended_on', { ascending: false })
        .limit(180);

    const stats = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of (rows || [])) stats[r.status] = (stats[r.status] || 0) + 1;
    const total = (rows || []).length;
    const rate = total ? Math.round(stats.present / total * 100) : 0;

    root.innerHTML = `
        <div class="kpis">
            <div class="kpi"><div class="label">Attendance rate</div><div class="value">${rate}%</div></div>
            <div class="kpi"><div class="label">Present</div><div class="value">${stats.present}</div></div>
            <div class="kpi"><div class="label">Absent</div><div class="value">${stats.absent}</div></div>
            <div class="kpi"><div class="label">Late / excused</div><div class="value">${stats.late + stats.excused}</div></div>
        </div>
        <div class="card">
            <h3>Last 180 days</h3>
            <table class="table">
                <thead><tr><th>Date</th><th>Class</th><th>Status</th><th>Note</th></tr></thead>
                <tbody>
                    ${(rows || []).map(r => `<tr><td>${r.attended_on}</td><td>${r.classes?.name || ''}</td><td><span class="chip ${chipFor(r.status)}">${r.status}</span></td><td>${r.note || ''}</td></tr>`).join('')
                        || '<tr><td colspan="4"><em>No attendance records yet.</em></td></tr>'}
                </tbody>
            </table>
        </div>`;
}
function chipFor(s) {
    return s === 'present' ? '' : s === 'absent' ? 'danger' : 'warn';
}
