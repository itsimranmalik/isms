export const title = 'My Memorisation';

export async function render(root, { profile, supabase }) {
    if (!profile.student_id) {
        root.innerHTML = '<div class="alert alert-info">Your student profile isn\'t linked yet.</div>';
        return;
    }
    const [{ data: surahs }, { data: prog }] = await Promise.all([
        supabase.from('surahs').select('id, number, name_arabic, name_transliteration, total_ayahs, juz_start').order('number'),
        supabase.from('memorisation_progress').select('surah_id, ayahs_memorised, status, quality_score, last_revised_on').eq('student_id', profile.student_id),
    ]);
    const map = new Map((prog || []).map(p => [p.surah_id, p]));
    let totalMem = 0, completed = 0;
    for (const s of (surahs || [])) {
        const p = map.get(s.id);
        if (p) { totalMem += p.ayahs_memorised || 0; if (p.status === 'completed') completed++; }
    }
    const pct = (totalMem / 6236 * 100).toFixed(2);

    root.innerHTML = `
        <div class="kpis">
            <div class="kpi"><div class="label">Ayahs memorised</div><div class="value">${totalMem}</div></div>
            <div class="kpi"><div class="label">% of Quran</div><div class="value">${pct}%</div></div>
            <div class="kpi"><div class="label">Surahs complete</div><div class="value">${completed}</div></div>
        </div>
        <div class="card">
            <h3>Surah-by-surah progress</h3>
            <table class="table">
                <thead><tr><th>#</th><th>Surah</th><th>Arabic</th><th>Progress</th><th>Status</th><th>Last revised</th></tr></thead>
                <tbody>
                    ${(surahs || []).map(s => {
                        const p = map.get(s.id) || { ayahs_memorised: 0, status: 'not_started' };
                        const surahPct = Math.round((p.ayahs_memorised || 0) / s.total_ayahs * 100);
                        return `<tr>
                            <td>${s.number}</td>
                            <td>${s.name_transliteration}</td>
                            <td class="arabic">${s.name_arabic}</td>
                            <td><div class="progress" style="min-width:120px"><span style="width:${surahPct}%"></span></div> <span class="text-muted" style="font-size:12px">${p.ayahs_memorised || 0}/${s.total_ayahs}</span></td>
                            <td><span class="chip">${p.status}</span></td>
                            <td>${p.last_revised_on || '—'}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
}
