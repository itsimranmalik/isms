/* Student view of their own duas progress. Read-only.
 * Same schema as staff grading screen — Arabic column removed.
 *   Status: Not Applicable / Not Completed / Completed
 *   Memorisation Score (0-5)  +  Tajweed Score (0-5)
 *   "Not Applicable" rows are excluded from the overall %. */
export const title = 'My Duas';

export async function render(root, { profile, supabase }) {
    if (!profile.student_id) {
        root.innerHTML = '<div class="alert alert-info">Your student profile isn\'t linked yet.</div>';
        return;
    }
    const [{ data: duas }, { data: prog }] = await Promise.all([
        supabase.from('duas').select('*').order('category').order('sort_order'),
        supabase.from('dua_progress')
            .select('dua_id, status, memorisation_score, tajweed_score, score')
            .eq('student_id', profile.student_id),
    ]);
    const map = new Map((prog || []).map(p => [p.dua_id, p]));

    // Group by category
    const groups = {};
    for (const d of (duas || [])) (groups[d.category] ||= []).push(d);

    // Overall stats (across all categories, excluding 'not_applicable')
    let applicable = 0, completed = 0;
    let memSum = 0, memCount = 0, tajSum = 0, tajCount = 0;
    for (const d of (duas || [])) {
        const p = map.get(d.id);
        if (!p || p.status === 'not_applicable') continue;
        applicable++;
        if (p.status === 'completed') completed++;
        const mem = p.memorisation_score ?? p.score;
        if (mem != null) { memSum += mem; memCount++; }
        if (p.tajweed_score != null) { tajSum += p.tajweed_score; tajCount++; }
    }
    const memPct = memCount ? Math.round(memSum / memCount / 5 * 100) : 0;
    const tajPct = tajCount ? Math.round(tajSum / tajCount / 5 * 100) : 0;
    const overall = memCount && tajCount ? Math.round((memPct + tajPct) / 2)
                  : memCount ? memPct : tajCount ? tajPct : 0;

    root.innerHTML = `
        <div class="kpis">
            <div class="kpi"><div class="label">Overall</div><div class="value">${overall}%</div></div>
            <div class="kpi"><div class="label">Memorisation</div><div class="value">${memPct}%</div></div>
            <div class="kpi"><div class="label">Tajweed</div><div class="value">${tajPct}%</div></div>
            <div class="kpi"><div class="label">Completed</div><div class="value">${completed} / ${applicable}</div></div>
        </div>
        ${Object.entries(groups).map(([cat, items]) => `
            <div class="card" style="margin-bottom: 16px">
                <h3 style="text-transform:capitalize">${cat}</h3>
                <table class="table">
                    <thead><tr>
                        <th>Title</th><th>Translation</th>
                        <th>Status</th><th>Memorisation</th><th>Tajweed</th>
                    </tr></thead>
                    <tbody>
                        ${items.map(d => {
                            const p = map.get(d.id) || {};
                            const mem = p.memorisation_score ?? p.score;
                            return `<tr>
                                <td><strong>${escapeHtml(d.title)}</strong></td>
                                <td class="text-muted">${escapeHtml(d.translation || '')}</td>
                                <td><span class="chip">${prettyStatus(p.status || 'not_completed')}</span></td>
                                <td>${scoreCell(mem)}</td>
                                <td>${scoreCell(p.tajweed_score)}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>`).join('')}`;
}

function prettyStatus(s) {
    return ({ not_applicable: 'Not Applicable', not_completed: 'Not Completed', completed: 'Completed' })[s] || s || '';
}
function scoreCell(v) {
    if (v == null || v === '') return '—';
    return `<strong>${v}</strong> / 5`;
}
function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
