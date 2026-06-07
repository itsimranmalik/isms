/* Guidelines for Teachers — links to the official PDF marking rubrics. */
export const title = 'Guidelines for Teachers';

const DOCS = [
    {
        name:        'Quran Reading Assessment — Marking Guidelines',
        path:        'docs/guidelines/quran-reading-assessment-marking-guidelines.pdf',
        description: '0-5 scoring rubric for Fluency, Makharij, Tajweed, Waqf and Accuracy. Use this when grading Quran recitation.',
        icon:        '۝',
    },
    {
        name:        'Qaidah, Juz Amm, Juz 1 and 2 — Marking Guidelines',
        path:        'docs/guidelines/qaidah-juz-marking-guidelines.pdf',
        description: '1-5 scoring rubric for Letter Recognition, Joining & Reading, Makharij & Tajweed, and Fluency & Confidence. Use this when grading Qaidah or Juz Amm / 1 / 2 students.',
        icon:        '🕌',
    },
    {
        name:        'Surah & Duas — Marking Guidelines',
        path:        'docs/guidelines/surah-and-duas-marking-guidelines.pdf',
        description: '1-5 scoring rubric for Memorisation and Pronunciation. Use this when grading Memorisation or Duas.',
        icon:        '📖',
    },
];

export async function render(root, { profile }) {
    if (profile.role !== 'admin' && profile.role !== 'teacher') {
        root.innerHTML = '<div class="alert alert-danger">Available to admin and teachers only.</div>';
        return;
    }

    root.innerHTML = `
        <p class="text-muted" style="margin-top:0">
            Reference these documents while assessing students. They define what each 0-5 / 1-5 score means.
        </p>
        <div class="grid-app">
            ${DOCS.map(d => `
                <div class="card span-6">
                    <div style="display:flex; align-items:center; gap:14px; margin-bottom:10px">
                        <span style="font-size:36px; color: var(--gold-500); line-height:1">${d.icon}</span>
                        <h3 style="margin:0; color: var(--green-700)">${d.name}</h3>
                    </div>
                    <p class="text-muted" style="margin:0 0 14px">${d.description}</p>
                    <div style="display:flex; gap:10px; flex-wrap:wrap">
                        <a class="btn btn-primary" href="${d.path}" target="_blank" rel="noopener">Open PDF</a>
                        <a class="btn" href="${d.path}" download>Download</a>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="card" style="margin-top:18px">
            <h3 style="margin-top:0">Quick reference: Quran Recitation 0-5 scoring</h3>
            <table class="table">
                <thead><tr><th>Mark</th><th>Fluency</th><th>Makharij</th><th>Tajweed</th><th>Waqf</th><th>Accuracy</th></tr></thead>
                <tbody>
                    <tr><td><strong>5</strong></td><td>Clear, smooth, confident</td><td>Accurate throughout</td><td>Applied correctly + confidently</td><td>Excellent stopping throughout</td><td>Little to no mistakes</td></tr>
                    <tr><td><strong>4</strong></td><td>Smooth, minor pauses</td><td>Few minor mistakes</td><td>Correct in most areas</td><td>Minor errors</td><td>Very few mistakes</td></tr>
                    <tr><td><strong>3</strong></td><td>Some pauses; improving</td><td>Basic, some errors</td><td>Basic, inconsistent</td><td>Basic understanding</td><td>Self-corrects occasionally</td></tr>
                    <tr><td><strong>2</strong></td><td>Frequent pauses</td><td>Pronunciation issues</td><td>Rarely applied</td><td>Many mistakes</td><td>Noticeable mistakes</td></tr>
                    <tr><td><strong>1</strong></td><td>Very slow, hesitant</td><td>Many incorrect letters</td><td>Cannot apply rules</td><td>Frequent incorrect stops</td><td>Many reading mistakes</td></tr>
                    <tr><td><strong>0</strong></td><td>Did not attempt</td><td>Cannot pronounce</td><td>No application</td><td>Breaks meaning</td><td>Cannot read accurately</td></tr>
                </tbody>
            </table>
        </div>

        <div class="card" style="margin-top:14px">
            <h3 style="margin-top:0">Quick reference: Surah & Duas 1-5 scoring</h3>
            <table class="table">
                <thead><tr><th>Mark</th><th>Memorisation Accuracy</th><th>Pronunciation</th></tr></thead>
                <tbody>
                    <tr><td><strong>5</strong></td><td>Perfect, no mistakes</td><td>Clear and accurate throughout</td></tr>
                    <tr><td><strong>4</strong></td><td>1-2 small mistakes, confident</td><td>Mostly clear with minor slips</td></tr>
                    <tr><td><strong>3</strong></td><td>A few mistakes / minor prompts</td><td>Some noticeable mistakes</td></tr>
                    <tr><td><strong>2</strong></td><td>Frequent mistakes, prompts needed</td><td>Frequent errors affecting clarity</td></tr>
                    <tr><td><strong>1</strong></td><td>Unable to complete independently</td><td>Often unclear or incorrect</td></tr>
                </tbody>
            </table>
            <p class="text-muted" style="font-size:13px; margin-top:8px">
                <strong>Small mistake:</strong> minor hesitation, repetition, or self-corrected slip.
                <strong>Major mistake:</strong> missing words/ayahs, incorrect order, or requiring teacher correction.
            </p>
        </div>
    `;
}
