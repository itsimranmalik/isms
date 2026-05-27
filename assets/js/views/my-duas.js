export const title = 'My Duas';

export async function render(root, { profile, supabase }) {
    if (!profile.student_id) {
        root.innerHTML = '<div class="alert alert-info">Your student profile isn\'t linked yet.</div>';
        return;
    }
    const [{ data: duas }, { data: prog }] = await Promise.all([
        supabase.from('duas').select('*').order('category').order('sort_order'),
        supabase.from('dua_progress').select('dua_id, status, score, tajweed_verified, comments').eq('student_id', profile.student_id),
    ]);
    const map = new Map((prog || []).map(p => [p.dua_id, p]));
    const groups = {};
    for (const d of (duas || [])) (groups[d.category] ||= []).push(d);

    root.innerHTML = Object.entries(groups).map(([cat, items]) => {
        const completed = items.filter(d => map.get(d.id)?.status === 'completed').length;
        const pct = items.length ? Math.round(completed / items.length * 100) : 0;
        return `
        <div class="card" style="margin-bottom: 16px">
            <h3 style="text-transform:capitalize">${cat} — ${completed}/${items.length} (${pct}%)</h3>
            <div class="progress" style="margin-bottom: 12px"><span style="width:${pct}%"></span></div>
            <table class="table">
                <thead><tr><th>Title</th><th>Arabic</th><th>Transliteration</th><th>Status</th><th>Score</th></tr></thead>
                <tbody>
                    ${items.map(d => {
                        const p = map.get(d.id) || {};
                        return `<tr>
                            <td><strong>${d.title}</strong><br><span class="text-muted" style="font-size:12px">${d.translation || ''}</span></td>
                            <td class="arabic">${d.arabic_text || ''}</td>
                            <td>${d.transliteration || ''}</td>
                            <td><span class="chip">${prettyStatus(p.status || 'pending')}</span></td>
                            <td>${p.score ?? '—'}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
    }).join('');
}

function prettyStatus(s) {
    return ({ pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' })[s] || s || '';
}
