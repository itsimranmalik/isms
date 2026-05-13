/* global ISM, Chart */
/**
 * Admin SPA-lite: AJAX calls against the REST API.
 * Each view detects its DOM hooks and self-initialises.
 */
(function () {
    'use strict';

    const api = async (path, opts = {}) => {
        const res = await fetch(ISM.apiBase + path, {
            method: opts.method || 'GET',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': ISM.nonce,
            },
            body: opts.body ? JSON.stringify(opts.body) : undefined,
        });
        if (!res.ok) {
            const e = await res.json().catch(() => ({}));
            throw new Error(e.message || res.statusText);
        }
        const ct = res.headers.get('content-type') || '';
        return ct.includes('application/json') ? res.json() : res.text();
    };
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    // ---- Theme toggle (persists in localStorage) -------------------------
    const themeBtn = $('#ism-theme-toggle');
    const setTheme = (t) => {
        document.documentElement.setAttribute('data-ism-theme', t);
        document.body.setAttribute('data-ism-theme', t);
        localStorage.setItem('ism-theme', t);
    };
    setTheme(localStorage.getItem('ism-theme') || 'light');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const next = (document.body.getAttribute('data-ism-theme') === 'dark') ? 'light' : 'dark';
            setTheme(next);
        });
    }

    // ---- Dashboard ------------------------------------------------------
    if ($('#ism-kpis')) {
        const loadDashboard = async () => {
            try {
                const d = await api('/dashboard/admin');
                $('[data-kpi="total_students"]').textContent = d.total_students;
                $('[data-kpi="total_teachers"]').textContent = d.total_teachers;
                $('[data-kpi="total_classes"]').textContent  = d.total_classes;
                const pres = (d.attendance_today || []).find(x => x.status === 'present');
                $('[data-kpi="attendance_today"]').textContent = pres ? pres.n : 0;

                const ol = $('#ism-top-performers');
                if (ol) {
                    ol.innerHTML = (d.top_performers || []).map(p =>
                        `<li>${p.first_name} ${p.last_name} — <strong>${Number(p.avg_score).toFixed(2)}</strong></li>`
                    ).join('');
                }
                const tbody = $('#ism-recent-assessments tbody');
                if (tbody) {
                    tbody.innerHTML = (d.recent_assessments || []).map(a =>
                        `<tr><td>${a.assessed_on}</td><td>${a.first_name} ${a.last_name}</td>
                        <td>${a.module_type}</td><td>${a.overall_score}</td><td>${a.overall_grade || ''}</td></tr>`
                    ).join('');
                }

                // Chart: distribution of latest grades across the top performers (placeholder).
                const ctx = document.getElementById('ism-chart-perf');
                if (ctx && window.Chart) {
                    new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: (d.top_performers || []).map(p => `${p.first_name} ${p.last_name}`),
                            datasets: [{
                                label: 'Avg Score (0-5)',
                                data: (d.top_performers || []).map(p => Number(p.avg_score)),
                                backgroundColor: '#056656',
                            }],
                        },
                        options: { scales: { y: { min: 0, max: 5 } }, plugins: { legend: { display: false } } },
                    });
                }
            } catch (e) { console.error('ISM dashboard error', e); }
        };
        loadDashboard();
        $('#ism-refresh')?.addEventListener('click', loadDashboard);
    }

    // ---- Students table ------------------------------------------------
    if ($('#ism-students-table')) {
        const tbody = $('#ism-students-table tbody');
        const load = async (q = '') => {
            const r = await api('/students?q=' + encodeURIComponent(q) + '&per_page=50');
            tbody.innerHTML = (r.data || []).map(s =>
                `<tr><td>${s.student_code}</td><td>${s.first_name} ${s.last_name}</td>
                <td>${s.guardian_name || ''}</td><td>${s.status}</td>
                <td><a href="?page=ism-reports&student=${s.id}">Report</a></td></tr>`
            ).join('');
        };
        load();
        $('#ism-students-search')?.addEventListener('input', (e) => load(e.target.value));
    }

    // ---- Teachers table ------------------------------------------------
    if ($('#ism-teachers-table')) {
        const tbody = $('#ism-teachers-table tbody');
        api('/teachers').then(rows => {
            tbody.innerHTML = (rows || []).map(t =>
                `<tr><td>${t.staff_code}</td><td>${t.first_name} ${t.last_name}</td><td>${t.email || ''}</td><td>${t.status}</td></tr>`
            ).join('');
        });
    }

    // ---- Classes table -------------------------------------------------
    if ($('#ism-classes-table')) {
        const tbody = $('#ism-classes-table tbody');
        api('/classes').then(rows => {
            tbody.innerHTML = (rows || []).map(c =>
                `<tr><td>${c.name}</td><td>${c.level || ''}</td><td>${c.student_count}</td><td>${c.teacher_count}</td>
                 <td><a href="?page=ism-assessments&class=${c.id}">Assess</a></td></tr>`
            ).join('');
        });
    }

    // ---- Assessment form (0-5 grader) ----------------------------------
    const assessForm = $('#ism-assess-form');
    if (assessForm) {
        // Populate students & surahs.
        api('/students?per_page=500').then(r => {
            const sel = assessForm.elements['student_id'];
            sel.innerHTML = (r.data || []).map(s => `<option value="${s.id}">${s.first_name} ${s.last_name} (${s.student_code})</option>`).join('');
        });
        api('/memorisation/surahs').then(rows => {
            const sel = assessForm.elements['surah_id'];
            sel.innerHTML = '<option value="">—</option>' + rows.map(s => `<option value="${s.id}">${s.number}. ${s.name_transliteration}</option>`).join('');
        });
        api('/classes').then(rows => {
            const sel = assessForm.elements['class_id'];
            sel.innerHTML = '<option value="">—</option>' + rows.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        });

        // Grade button behaviour.
        $$('.ism-grade-buttons').forEach(group => {
            const field = group.dataset.field;
            group.addEventListener('click', e => {
                const b = e.target.closest('.ism-grade-btn');
                if (!b) return;
                group.querySelectorAll('.ism-grade-btn').forEach(x => x.setAttribute('aria-pressed', 'false'));
                b.setAttribute('aria-pressed', 'true');
                assessForm.elements[field].value = b.dataset.val;
                updateLiveSummary();
            });
        });

        function currentScores() {
            const cats = ['fluency', 'makharij', 'tajweed', 'waqf', 'accuracy'];
            const scores = {};
            cats.forEach(c => scores[c] = Number(assessForm.elements[c].value || 0));
            return scores;
        }
        function updateLiveSummary() {
            const s = currentScores();
            const avg = (s.fluency + s.makharij + s.tajweed + s.waqf + s.accuracy) / 5;
            const bands = [
                [0,'Not Attempted'], [0.5,'Very Weak'], [1.5,'Weak'],
                [2.5,'Satisfactory'], [3.5,'Good'], [4.5,'Excellent'],
            ];
            let label = bands[0][1];
            for (const [min, l] of bands) if (avg >= min) label = l;
            $('#ism-live-summary').textContent = `Average: ${avg.toFixed(2)} • ${label}`;
        }

        assessForm.addEventListener('submit', async e => {
            e.preventDefault();
            const fd = new FormData(assessForm);
            const payload = Object.fromEntries(fd.entries());
            try {
                const r = await api('/assessments/quran-recitation', { method: 'POST', body: payload });
                alert('Assessment saved (ID: ' + r.assessment_id + ')');
                assessForm.reset();
                $$('.ism-grade-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
                updateLiveSummary();
            } catch (err) {
                alert('Error: ' + err.message);
            }
        });
    }

    // ---- Reports view --------------------------------------------------
    if ($('#ism-report-student')) {
        api('/students?per_page=500').then(r => {
            $('#ism-report-student').innerHTML = (r.data || []).map(s =>
                `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`
            ).join('');
        });
        api('/classes').then(rows => {
            $('#ism-report-class').innerHTML = rows.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        });
        const go = (path) => {
            const url = ISM.apiBase + path + '?_wpnonce=' + encodeURIComponent(ISM.nonce);
            window.open(url, '_blank');
        };
        $('#ism-report-pdf').addEventListener('click', () => go('/reports/student/' + $('#ism-report-student').value + '/pdf'));
        $('#ism-report-xlsx').addEventListener('click', () => go('/reports/class/' + $('#ism-report-class').value + '/excel'));
        $('#ism-report-csv').addEventListener('click',  () => go('/reports/class/' + $('#ism-report-class').value + '/csv'));
    }

    // ---- Attendance grid ----------------------------------------------
    if ($('#ism-att-class')) {
        const tbody = $('#ism-att-table tbody');
        api('/classes').then(rows => {
            $('#ism-att-class').innerHTML = rows.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            loadRoster();
        });
        async function loadRoster() {
            const classId = $('#ism-att-class').value;
            if (!classId) return;
            const r = await api('/students?class_id=' + classId + '&per_page=200');
            tbody.innerHTML = (r.data || []).map(s => `
                <tr data-student="${s.id}">
                    <td>${s.first_name} ${s.last_name}</td>
                    ${['present','absent','late','excused'].map(st => `
                        <td><input type="radio" name="att-${s.id}" value="${st}" ${st==='present'?'checked':''}></td>
                    `).join('')}
                </tr>`).join('');
        }
        $('#ism-att-class').addEventListener('change', loadRoster);
        $('#ism-att-save').addEventListener('click', async () => {
            const entries = $$('#ism-att-table tbody tr').map(tr => {
                const sid = Number(tr.dataset.student);
                const chk = tr.querySelector('input[type=radio]:checked');
                return { student_id: sid, status: chk ? chk.value : 'absent' };
            });
            await api('/attendance', { method: 'POST', body: {
                class_id: Number($('#ism-att-class').value),
                attended_on: $('#ism-att-date').value,
                entries,
            } });
            alert('Attendance saved.');
        });
    }

    // ---- Memorisation tracker --------------------------------------------
    if ($('#ism-memo-student')) {
        api('/students?per_page=500').then(r => {
            $('#ism-memo-student').innerHTML = (r.data || []).map(s =>
                `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`
            ).join('');
            loadMemo();
        });
        $('#ism-memo-student').addEventListener('change', loadMemo);
        async function loadMemo() {
            const sid = $('#ism-memo-student').value;
            if (!sid) return;
            const data = await api('/memorisation/student/' + sid);
            $('#ism-memo-summary').innerHTML = `
                <strong>${data.ayahs_memorised}</strong> ayahs memorised
                (<strong>${data.percent_of_quran}%</strong> of Quran) •
                ${data.surahs_completed} surahs completed.
                <div class="ism-progress"><span style="width:${data.percent_of_quran}%"></span></div>`;
            const tbody = $('#ism-memo-table tbody');
            tbody.innerHTML = (data.detail || []).map(d => `
                <tr data-surah="${d.surah_id}">
                    <td>${d.number}</td><td>${d.name_transliteration}</td>
                    <td><input type="number" min="0" max="${d.total_ayahs}" value="${d.ayahs_memorised}" data-field="ayahs"> / ${d.total_ayahs}</td>
                    <td>
                        <select data-field="status">
                            ${['not_started','in_progress','completed'].map(s => `<option ${s===d.status?'selected':''}>${s}</option>`).join('')}
                        </select>
                    </td>
                    <td><input type="number" min="0" max="5" value="${d.quality_score || 0}" data-field="quality"></td>
                    <td>${d.last_revised_on || '—'}</td>
                    <td><button class="ism-btn ism-btn-primary ism-memo-save">Save</button></td>
                </tr>`).join('');
            tbody.querySelectorAll('.ism-memo-save').forEach(btn => {
                btn.addEventListener('click', async ev => {
                    const tr = ev.target.closest('tr');
                    await api('/memorisation/progress', { method: 'POST', body: {
                        student_id: Number(sid),
                        surah_id:   Number(tr.dataset.surah),
                        ayahs_memorised: Number(tr.querySelector('[data-field=ayahs]').value),
                        status:    tr.querySelector('[data-field=status]').value,
                        quality_score: Number(tr.querySelector('[data-field=quality]').value),
                        revised_on: new Date().toISOString().slice(0, 10),
                    } });
                    loadMemo();
                });
            });
        }
    }

    // ---- Duas tracker ----------------------------------------------------
    if ($('#ism-dua-student')) {
        api('/students?per_page=500').then(r => {
            $('#ism-dua-student').innerHTML = (r.data || []).map(s =>
                `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`
            ).join('');
            loadDuas();
        });
        $('#ism-dua-student').addEventListener('change', loadDuas);
        $('#ism-dua-category').addEventListener('change', loadDuas);
        async function loadDuas() {
            const sid = $('#ism-dua-student').value;
            const cat = $('#ism-dua-category').value;
            if (!sid) return;
            const data = await api('/duas/student/' + sid + (cat ? '?category=' + cat : ''));
            const container = $('#ism-dua-list');
            container.innerHTML = '';
            Object.entries(data).forEach(([category, info]) => {
                const block = document.createElement('div');
                block.className = 'ism-card';
                block.innerHTML = `<h2>${category.toUpperCase()} (${info.completed}/${info.total} — ${info.percent_complete}%)</h2>`;
                const table = document.createElement('table');
                table.className = 'ism-table';
                table.innerHTML = `<thead><tr><th>Title</th><th>Arabic</th><th>Status</th><th>Score</th><th>Tajweed</th><th></th></tr></thead><tbody></tbody>`;
                info.items.forEach(it => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${it.title}</td>
                        <td class="ism-arabic">${it.arabic_text || ''}</td>
                        <td><select data-field="status">${['pending','in_progress','completed'].map(s => `<option ${s===(it.status||'pending')?'selected':''}>${s}</option>`).join('')}</select></td>
                        <td><input type="number" min="0" max="5" value="${it.score || 0}" data-field="score"></td>
                        <td><input type="checkbox" data-field="tajweed" ${it.tajweed_verified ? 'checked' : ''}></td>
                        <td><button class="ism-btn ism-btn-primary">Save</button></td>`;
                    tr.querySelector('button').addEventListener('click', async () => {
                        await api('/duas/progress', { method: 'POST', body: {
                            student_id: Number(sid),
                            dua_id: it.id,
                            status: tr.querySelector('[data-field=status]').value,
                            score:  Number(tr.querySelector('[data-field=score]').value),
                            tajweed_verified: tr.querySelector('[data-field=tajweed]').checked,
                        } });
                        loadDuas();
                    });
                    table.querySelector('tbody').appendChild(tr);
                });
                block.appendChild(table);
                container.appendChild(block);
            });
        }
    }
})();
