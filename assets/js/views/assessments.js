/* Quran Recitation 0-5 grader UI */
import { CATEGORIES, GUIDELINES, GRADE_BANDS, calculateAverage, resolveBand,
         identifyWeaknesses, generateRecommendations, recordAssessment } from '../modules/quran-recitation.js';
import { audit } from '../supabase-client.js';

export const title = 'Quran Recitation — Assessment';

export async function render(root, { profile, supabase }) {
    if (profile.role !== 'admin' && profile.role !== 'teacher') {
        root.innerHTML = '<div class="alert alert-danger">Only admin/teacher can record assessments.</div>';
        return;
    }
    const [students, surahs, classes] = await Promise.all([
        supabase.from('students').select('id, first_name, last_name, student_code').order('last_name'),
        supabase.from('surahs').select('id, number, name_transliteration').order('number'),
        supabase.from('classes').select('id, name').order('name'),
    ]);

    root.innerHTML = `
        <div class="grid-app">
            <div class="card span-12">
                <h3>New assessment</h3>
                <form id="assess-form">
                    <div class="toolbar">
                        <label class="field">Student
                            <select name="student_id" required>
                                ${(students.data || []).map(s => `<option value="${s.id}">${s.first_name} ${s.last_name} (${s.student_code})</option>`).join('')}
                            </select>
                        </label>
                        <label class="field">Class
                            <select name="class_id">
                                <option value="">—</option>
                                ${(classes.data || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                            </select>
                        </label>
                        <label class="field">Date
                            <input type="date" name="assessed_on" value="${new Date().toISOString().slice(0, 10)}" required>
                        </label>
                        <label class="field">Surah
                            <select name="surah_id">
                                <option value="">—</option>
                                ${(surahs.data || []).map(s => `<option value="${s.id}">${s.number}. ${s.name_transliteration}</option>`).join('')}
                            </select>
                        </label>
                        <label class="field">From ayah<input type="number" min="1" name="ayah_from"></label>
                        <label class="field">To ayah<input   type="number" min="1" name="ayah_to"></label>
                    </div>

                    <fieldset style="border:1px solid var(--border); border-radius: var(--radius); padding: 16px">
                        <legend style="color: var(--green-700); font-weight: 600">0–5 Category Scoring</legend>
                        ${CATEGORIES.map(c => `
                            <div class="grade-row">
                                <div>
                                    <strong style="text-transform:capitalize">${c}</strong>
                                    <div class="text-muted" style="font-size:12px">${categoryHelp(c)}</div>
                                </div>
                                <div class="grade-buttons" data-field="${c}">
                                    ${[0,1,2,3,4,5].map(i => `<button type="button" class="grade-btn" data-val="${i}">${i}</button>`).join('')}
                                </div>
                                <input type="hidden" name="${c}" required>
                            </div>
                        `).join('')}
                    </fieldset>

                    <label class="field" style="margin-top: 14px">Teacher comments
                        <textarea name="comments" rows="3" placeholder="Strengths, what to work on next…"></textarea>
                    </label>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; gap:10px; flex-wrap: wrap">
                        <div id="live-summary" class="chip">Average: 0.00 · Not Attempted</div>
                        <button class="btn btn-primary btn-lg" type="submit">Save assessment</button>
                    </div>
                    <div id="alert"></div>
                </form>
            </div>

            <div class="card span-6">
                <h3>Marking guidelines</h3>
                <table class="table">
                    <thead><tr><th>Score</th><th>Meaning</th></tr></thead>
                    <tbody>
                        ${Object.entries(GUIDELINES).map(([s, m]) => `<tr><td><strong>${s}</strong></td><td>${m}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
            <div class="card span-6">
                <h3>Grade bands</h3>
                <table class="table">
                    <thead><tr><th>Average</th><th>Label</th><th>GPA</th></tr></thead>
                    <tbody>
                        ${GRADE_BANDS.map(b => `<tr><td>≥ ${b[0].toFixed(1)}</td><td><span class="chip" style="background:${b[3]};color:#fff">${b[1]}</span></td><td>${b[2]}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;

    const form = document.getElementById('assess-form');
    const summary = document.getElementById('live-summary');

    // Pre-select class from query string if passed (e.g. ?class=3)
    const params = new URLSearchParams((location.hash.split('?')[1]) || '');
    if (params.get('class')) form.elements['class_id'].value = params.get('class');

    function currentScores() {
        const s = {};
        for (const c of CATEGORIES) s[c] = Number(form.elements[c].value || 0);
        return s;
    }
    function refreshSummary() {
        const s   = currentScores();
        const avg = calculateAverage(s);
        const b   = resolveBand(avg);
        summary.textContent = `Average: ${avg.toFixed(2)} · ${b.label}`;
        summary.style.background = b.color + '22';
        summary.style.color = b.color;
    }

    root.querySelectorAll('.grade-buttons').forEach(group => {
        const field = group.dataset.field;
        group.addEventListener('click', e => {
            const b = e.target.closest('.grade-btn');
            if (!b) return;
            group.querySelectorAll('.grade-btn').forEach(x => x.setAttribute('aria-pressed', 'false'));
            b.setAttribute('aria-pressed', 'true');
            form.elements[field].value = b.dataset.val;
            refreshSummary();
        });
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const alertBox = document.getElementById('alert');
        alertBox.innerHTML = '';
        for (const c of CATEGORIES) {
            if (form.elements[c].value === '') {
                alertBox.innerHTML = `<div class="alert alert-danger">Please score every category before saving.</div>`;
                return;
            }
        }
        const fd = new FormData(form);
        try {
            const payload = Object.fromEntries(fd.entries());
            payload.teacher_id = profile.teacher_id;
            if (!payload.teacher_id) {
                alertBox.innerHTML = `<div class="alert alert-danger">Your account isn't linked to a teacher profile. Ask an admin.</div>`;
                return;
            }
            const id = await recordAssessment(supabase, payload);
            await audit('quran_recitation.assessed', 'assessment', id);

            const scores = currentScores();
            const avg = calculateAverage(scores);
            const weak = identifyWeaknesses(scores);
            const recs = generateRecommendations(scores, avg);
            alertBox.innerHTML = `
                <div class="alert alert-success">
                    Saved (id ${id}). Average <strong>${avg.toFixed(2)}</strong>.
                    ${weak.length ? '<br><strong>Weaknesses:</strong> ' + weak.join(', ') : ''}
                    ${recs.length ? '<br><strong>Recommendations:</strong><ul style="margin:6px 0 0 18px">' + recs.map(r => `<li>${r}</li>`).join('') + '</ul>' : ''}
                </div>`;
            form.reset();
            form.querySelectorAll('.grade-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
            form.elements['assessed_on'].value = new Date().toISOString().slice(0, 10);
            refreshSummary();
        } catch (err) {
            alertBox.innerHTML = `<div class="alert alert-danger">${err.message || 'Save failed.'}</div>`;
        }
    });
}

function categoryHelp(c) {
    return {
        fluency:  'Smooth, confident flow without stops.',
        makharij: 'Correct articulation points of letters.',
        tajweed:  'Idgham, Ikhfa, Madd, Ghunnah, Qalqalah etc.',
        waqf:     'Stopping rules and signs.',
        accuracy: 'No letters missed, added, or substituted.',
    }[c] || '';
}
