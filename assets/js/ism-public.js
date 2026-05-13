/* global ISM */
/**
 * Public-facing dashboards (student & teacher).
 */
(function () {
    'use strict';

    const api = async (path) => {
        const res = await fetch(ISM.apiBase + path, {
            credentials: 'same-origin',
            headers: { 'X-WP-Nonce': ISM.nonce },
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
        return res.json();
    };
    const $ = (sel, root = document) => root.querySelector(sel);

    const root = $('#ism-root');
    if (!root) return;

    const setTheme = (t) => {
        document.documentElement.setAttribute('data-ism-theme', t);
        document.body.setAttribute('data-ism-theme', t);
        localStorage.setItem('ism-theme', t);
    };
    setTheme(localStorage.getItem('ism-theme') || 'light');
    $('#ism-theme-toggle')?.addEventListener('click', () =>
        setTheme(document.body.getAttribute('data-ism-theme') === 'dark' ? 'light' : 'dark'));

    // Student dashboard --------------------------------------------------
    const sid = root.dataset.studentId;
    if (sid) {
        // Lazy load Chart.js from CDN to avoid bloat on non-chart pages.
        const ensureChart = () => new Promise((resolve) => {
            if (window.Chart) return resolve(window.Chart);
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
            s.onload = () => resolve(window.Chart);
            document.head.appendChild(s);
        });

        (async () => {
            const trend = await api('/assessments/quran-recitation?student_id=' + sid + '&limit=10');
            const memo  = await api('/memorisation/student/' + sid);
            const duas  = await api('/duas/student/' + sid);

            const Chart = await ensureChart();
            const ctx = $('#ism-stu-trend');
            if (ctx && trend.data.length) {
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: trend.data.map(t => t.assessed_on),
                        datasets: [
                            { label: 'Average', data: trend.data.map(t => Number(t.average_score)), borderColor: '#056656', backgroundColor: 'rgba(5,102,86,.15)', tension: 0.3 },
                        ],
                    },
                    options: { scales: { y: { min: 0, max: 5 } } },
                });
            }

            $('#ism-stu-memo').innerHTML =
                `<p><strong>${memo.ayahs_memorised}</strong> ayahs memorised
                 (<strong>${memo.percent_of_quran}%</strong> of Quran).</p>
                 <div class="ism-progress"><span style="width:${memo.percent_of_quran}%"></span></div>
                 <p style="margin-top:8px">${memo.surahs_completed} surahs completed.</p>`;

            const duaBlocks = Object.entries(duas).map(([cat, info]) =>
                `<div style="margin-bottom:10px">
                    <strong>${cat.toUpperCase()}</strong> — ${info.completed}/${info.total} (${info.percent_complete}%)
                    <div class="ism-progress"><span style="width:${info.percent_complete}%"></span></div>
                 </div>`).join('');
            $('#ism-stu-duas').innerHTML = duaBlocks || '<em>No duas tracked yet.</em>';
        })().catch(err => console.error(err));

        $('#ism-stu-pdf')?.addEventListener('click', () => {
            window.open(ISM.apiBase + '/reports/student/' + sid + '/pdf?_wpnonce=' + encodeURIComponent(ISM.nonce), '_blank');
        });
    }

    // Teacher dashboard --------------------------------------------------
    const tid = root.dataset.teacherId;
    if (tid) {
        api('/dashboard/teacher').then(d => {
            $('#ism-teacher-classes').innerHTML =
                (d.classes || []).map(c =>
                    `<div class="ism-kpi" style="margin-bottom:8px"><strong>${c.name}</strong> — ${c.students} students <span class="ism-tag">${c.level || ''}</span></div>`
                ).join('') || '<em>No classes assigned.</em>';
        }).catch(err => console.error(err));
    }
})();
