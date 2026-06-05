/* Student view of their own memorisation progress. Read-only.
 * Reflects the same schema as the staff grading screen:
 *   Status: Not Started / Not Applicable / Completed
 *   Memorisation Score (0-5)  +  Tajweed Score (0-5)
 *   "Not Applicable" rows are excluded from the overall %. */
export const title = 'My Memorisation';

export async function render(root, { profile, supabase }) {
    if (!profile.student_id) {
        root.innerHTML = '<div class="alert alert-info">Your student profile isn\'t linked yet.</div>';
        return;
    }
    const [{ data: surahs }, { data: prog }] = await Promise.all([
        supabase.from('surahs').select('id, number, name_arabic, name_transliteration, total_ayahs').order('number'),
        supabase.from('memorisation_progress')
            .select('surah_id, status, memorisation_score, quality_score, last_revised_on')
            .eq('student_id', profile.student_id),
    ]);
    const map = new Map((prog || []).map(p => [p.surah_id, p]));

    let applicable = 0, completed = 0;
    let memSum = 0, memCount = 0, tajSum = 0, tajCount = 0;
    for (const s of (surahs || [])) {
        const p = map.get(s.id);
        if (!p || p.status === 'not_applicable') continue;
        applicable++;
        if (p.status === 'completed') completed++;
        if (p.memorisation_score != null) { memSum += p.memorisation_score; memCount++; }
        if (p.quality_score != null)      { tajSum += p.quality_score;      tajCount++; }
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
            <div class="kpi"><div class="label">Surahs complete</div><div class="value">${completed}</div></div>
        </div>
        <div class="card">
            <h3>Surah-by-surah progress</h3>
            <table class="table">
                <thead><tr>
                    <th>#</th><th>Surah</th><th>Arabic</th>
                    <th>Status</th><th>Memorisation</th><th>Tajweed</th><th>Last revised</th>
                </tr></thead>
                <tbody>
                    ${(surahs || []).map(s => {
                        const p = map.get(s.id) || { status: 'not_applicable' };
                        return `<tr>
                            <td>${s.number}</td>
                            <td>${s.name_transliteration}</td>
                            <td class="arabic">${s.name_arabic}</td>
                            <td><span class="chip">${prettyStatus(p.status)}</span></td>
                            <td>${scoreCell(p.memorisation_score)}</td>
                            <td>${scoreCell(p.quality_score)}</td>
                            <td>${p.last_revised_on || '—'}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
}

function prettyStatus(s) {
    return ({ not_started: 'Not Started', not_applicable: 'Not Applicable', completed: 'Completed' })[s] || s || '';
}
function scoreCell(v) {
    if (v == null || v === '') return '—';
    return `<strong>${v}</strong> / 5`;
}
