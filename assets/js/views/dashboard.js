/* Role-aware dashboard view */
export const title = 'Dashboard';

export async function render(root, { profile, supabase }) {
    if (profile.role === 'admin')   return renderAdmin(root, supabase);
    if (profile.role === 'teacher') return renderTeacher(root, supabase, profile);
    if (profile.role === 'student') return renderStudent(root, supabase, profile);
    return renderParent(root, supabase, profile);
}

async function renderAdmin(root, sb) {
    const today = new Date().toISOString().slice(0, 10);
    const [stu, tch, cls, att, recent, top] = await Promise.all([
        sb.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        sb.from('teachers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        sb.from('classes').select('id', { count: 'exact', head: true }),
        sb.from('attendance').select('status', { count: 'exact' }).eq('attended_on', today).eq('status', 'present'),
        sb.from('assessments').select('id, assessed_on, module_type, overall_score, overall_grade, students(first_name,last_name)').order('created_at', { ascending: false }).limit(10),
        sb.from('assessments').select('student_id, overall_score, students(first_name,last_name)').eq('module_type', 'quran_recitation').order('overall_score', { ascending: false }).limit(5),
    ]);

    root.innerHTML = `
        <div class="kpis">
            <div class="kpi"><div class="label">Students</div><div class="value">${stu.count ?? 0}</div></div>
            <div class="kpi"><div class="label">Teachers</div><div class="value">${tch.count ?? 0}</div></div>
            <div class="kpi"><div class="label">Classes</div><div class="value">${cls.count ?? 0}</div></div>
            <div class="kpi"><div class="label">Present today</div><div class="value">${att.count ?? 0}</div></div>
        </div>
        <div class="grid-app">
            <div class="card span-6">
                <h3>Top performers (Quran Recitation)</h3>
                <canvas id="topPerf" height="160"></canvas>
            </div>
            <div class="card span-6">
                <h3>Top performers</h3>
                <ol style="margin: 0; padding-left: 18px">${(top.data || []).map(t =>
                    `<li>${t.students?.first_name || ''} ${t.students?.last_name || ''} — <strong>${Number(t.overall_score).toFixed(2)}</strong></li>`).join('') || '<em>No data yet.</em>'}</ol>
            </div>
            <div class="card span-12">
                <h3>Recent assessments</h3>
                <table class="table" id="recent-assessments">
                    <thead><tr>
                        <th class="sort-h" data-key="assessed_on">Date <span class="sort-ind" data-key="assessed_on">▼</span></th>
                        <th class="sort-h" data-key="name">Student <span class="sort-ind" data-key="name"></span></th>
                        <th class="sort-h" data-key="module_type">Module <span class="sort-ind" data-key="module_type"></span></th>
                        <th class="sort-h" data-key="overall_score">Score <span class="sort-ind" data-key="overall_score"></span></th>
                        <th class="sort-h" data-key="overall_grade">Grade <span class="sort-ind" data-key="overall_grade"></span></th>
                    </tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>`;

    // Hydrate sortable recent-assessments table
    const recentRows = (recent.data || []).map(a => ({
        assessed_on:   a.assessed_on || '',
        name:          ((a.students?.first_name || '') + ' ' + (a.students?.last_name || '')).trim(),
        module_type:   a.module_type || '',
        overall_score: a.overall_score == null ? null : Number(a.overall_score),
        overall_grade: a.overall_grade || '',
    }));
    const sortState = { key: 'assessed_on', dir: -1 };  // newest first
    const renderRecent = () => {
        const sorted = recentRows.slice().sort((x, y) => {
            const a = x[sortState.key], b = y[sortState.key];
            if (a == null && b == null) return 0;
            if (a == null) return 1;
            if (b == null) return -1;
            if (typeof a === 'number' && typeof b === 'number') return (a - b) * sortState.dir;
            return String(a).localeCompare(String(b)) * sortState.dir;
        });
        const tbody = document.querySelector('#recent-assessments tbody');
        tbody.innerHTML = sorted.map(r => `<tr>
            <td>${r.assessed_on}</td>
            <td>${r.name}</td>
            <td>${r.module_type}</td>
            <td>${r.overall_score ?? ''}</td>
            <td>${r.overall_grade ?? ''}</td>
        </tr>`).join('') || '<tr><td colspan="5"><em>No assessments yet.</em></td></tr>';
        document.querySelectorAll('#recent-assessments .sort-ind').forEach(el => {
            el.textContent = (el.dataset.key === sortState.key)
                ? (sortState.dir === 1 ? '▲' : '▼') : '';
        });
    };
    renderRecent();
    document.querySelectorAll('#recent-assessments .sort-h').forEach(th => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            const k = th.dataset.key;
            if (sortState.key === k) sortState.dir *= -1;
            else { sortState.key = k; sortState.dir = 1; }
            renderRecent();
        });
    });

    if (top.data?.length && window.Chart) {
        new window.Chart(document.getElementById('topPerf'), {
            type: 'bar',
            data: {
                labels: top.data.map(t => `${t.students?.first_name || ''} ${t.students?.last_name || ''}`),
                datasets: [{
                    label: 'Avg (0-5)',
                    data: top.data.map(t => Number(t.overall_score) || 0),
                    backgroundColor: '#056656',
                }],
            },
            options: { scales: { y: { min: 0, max: 5 } }, plugins: { legend: { display: false } } },
        });
    }
}

async function renderTeacher(root, sb, profile) {
    if (!profile.teacher_id) {
        root.innerHTML = `<div class="alert alert-info">Your teacher profile isn't linked yet. Ask an admin to link your account.</div>`;
        return;
    }
    const { data: classes } = await sb
        .from('class_teachers')
        .select('class_id, is_lead, classes(id, name, level)')
        .eq('teacher_id', profile.teacher_id);

    root.innerHTML = `
        <div class="kpis">
            <div class="kpi"><div class="label">My classes</div><div class="value">${classes?.length || 0}</div></div>
        </div>
        <div class="card">
            <h3>My classes</h3>
            <table class="table"><thead><tr><th>Class</th><th>Level</th><th>Lead?</th><th></th></tr></thead>
                <tbody>
                    ${(classes || []).map(c => `
                        <tr>
                            <td>${c.classes?.name}</td>
                            <td>${c.classes?.level || ''}</td>
                            <td>${c.is_lead ? 'Yes' : ''}</td>
                            <td><a href="#/assessments?class=${c.class_id}">Grade</a> · <a href="#/attendance?class=${c.class_id}">Take attendance</a></td>
                        </tr>`).join('') || '<tr><td colspan="4"><em>No classes assigned yet.</em></td></tr>'}
                </tbody>
            </table>
        </div>`;
}

async function renderStudent(root, sb, profile) {
    if (!profile.student_id) {
        root.innerHTML = `<div class="alert alert-info">Your student profile isn't linked yet. Ask an admin to link your account.</div>`;
        return;
    }
    const sid = profile.student_id;
    const [recits, memo] = await Promise.all([
        sb.from('assessments')
          .select('assessed_on, overall_score, overall_grade, quran_recitation_grades(fluency, makharij, tajweed, waqf, accuracy)')
          .eq('student_id', sid).eq('module_type', 'quran_recitation')
          .order('assessed_on', { ascending: false }).limit(10),
        sb.from('memorisation_progress').select('ayahs_memorised, status, surahs(name_transliteration, total_ayahs)').eq('student_id', sid),
    ]);

    const totalAyahs = (memo.data || []).reduce((s, r) => s + (r.ayahs_memorised || 0), 0);
    const pct = (totalAyahs / 6236 * 100).toFixed(2);
    const completed = (memo.data || []).filter(r => r.status === 'completed').length;

    root.innerHTML = `
        <div class="kpis">
            <div class="kpi"><div class="label">Ayahs memorised</div><div class="value">${totalAyahs}</div></div>
            <div class="kpi"><div class="label">% of Quran</div><div class="value">${pct}%</div></div>
            <div class="kpi"><div class="label">Surahs completed</div><div class="value">${completed}</div></div>
        </div>
        <div class="grid-app">
            <div class="card span-12">
                <h3>Quran Recitation — last 10</h3>
                <canvas id="recitTrend" height="120"></canvas>
            </div>
            <div class="card span-12">
                <h3>Latest scores</h3>
                <table class="table">
                    <thead><tr><th>Date</th><th>Fluency</th><th>Makharij</th><th>Tajweed</th><th>Waqf</th><th>Accuracy</th><th>Average</th><th>Grade</th></tr></thead>
                    <tbody>
                        ${(recits.data || []).map(r => {
                            const g = r.quran_recitation_grades?.[0] || r.quran_recitation_grades || {};
                            return `<tr>
                                <td>${r.assessed_on}</td>
                                <td>${g.fluency  ?? ''}</td>
                                <td>${g.makharij ?? ''}</td>
                                <td>${g.tajweed  ?? ''}</td>
                                <td>${g.waqf     ?? ''}</td>
                                <td>${g.accuracy ?? ''}</td>
                                <td><strong>${r.overall_score ?? ''}</strong></td>
                                <td>${r.overall_grade ?? ''}</td>
                            </tr>`;
                        }).join('') || '<tr><td colspan="8"><em>No assessments yet.</em></td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>`;

    const data = (recits.data || []).slice().reverse();
    if (data.length && window.Chart) {
        new window.Chart(document.getElementById('recitTrend'), {
            type: 'line',
            data: {
                labels: data.map(r => r.assessed_on),
                datasets: [{
                    label: 'Average',
                    data: data.map(r => Number(r.overall_score) || 0),
                    borderColor: '#056656', backgroundColor: 'rgba(5,102,86,.15)',
                    tension: 0.3, fill: true,
                }],
            },
            options: { scales: { y: { min: 0, max: 5 } } },
        });
    }
}

async function renderParent(root) {
    root.innerHTML = `
        <div class="alert alert-info">Parent portal coming soon. Ask your school admin to link you to your child's account.</div>`;
}
