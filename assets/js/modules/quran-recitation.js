/**
 * Quran Recitation grading domain logic — pure, framework-free.
 * Categories: Fluency, Makharij, Tajweed, Waqf, Accuracy (0..5 each).
 * Mirrors the PHP module 1:1 so the maths is identical.
 */

export const CATEGORIES = ['fluency', 'makharij', 'tajweed', 'waqf', 'accuracy'];

export const GRADE_BANDS = [
    // [min_average_inclusive, label, gpa_letter, css_color]
    [0.0, 'Not Attempted', 'NA', '#9CA3AF'],
    [0.5, 'Very Weak',     'E',  '#DC2626'],
    [1.5, 'Weak',          'D',  '#F97316'],
    [2.5, 'Satisfactory',  'C',  '#F59E0B'],
    [3.5, 'Good',          'B',  '#10B981'],
    [4.5, 'Excellent',     'A',  '#059669'],
];

export const GUIDELINES = {
    0: 'Not Attempted — student did not read.',
    1: 'Very Weak — many mistakes; full teacher assistance needed.',
    2: 'Weak — frequent pauses; Tajweed rarely applied.',
    3: 'Satisfactory — basic Tajweed inconsistently applied.',
    4: 'Good — steady fluency; Tajweed in most areas.',
    5: 'Excellent — clear recitation, Tajweed throughout.',
};

export function clamp05(v) {
    v = Number(v) | 0;
    if (v < 0) return 0;
    if (v > 5) return 5;
    return v;
}

export function calculateAverage(scores) {
    let t = 0;
    for (const c of CATEGORIES) t += clamp05(scores[c]);
    return Math.round((t / CATEGORIES.length) * 100) / 100;
}

export function resolveBand(avg) {
    let m = GRADE_BANDS[0];
    for (const b of GRADE_BANDS) if (avg >= b[0]) m = b;
    return { min: m[0], label: m[1], gpa: m[2], color: m[3] };
}

export function identifyWeaknesses(scores) {
    const weak = [];
    for (const c of CATEGORIES) {
        const v = clamp05(scores[c]);
        if (v <= 2) weak.push({ category: c, score: v });
    }
    return weak.sort((a, b) => a.score - b.score).map(w => w.category);
}

const TIPS = {
    fluency:  'Daily 10-minute reading aloud sessions to build flow.',
    makharij: 'Practice articulation points (huroof) with mirror exercises.',
    tajweed:  'Review specific tajweed rules (Idgham, Ikhfa, Madd) with worked examples.',
    waqf:     'Drill on stopping signs (waqf marks); read short ayahs with deliberate pauses.',
    accuracy: 'Read with a Mushaf open; have a peer check missed or added letters.',
};

export function generateRecommendations(scores, avg) {
    const recs = [];
    for (const c of CATEGORIES) {
        if (clamp05(scores[c]) <= 3) {
            recs.push(c.charAt(0).toUpperCase() + c.slice(1) + ': ' + TIPS[c]);
        }
    }
    if (avg >= 4.5) recs.push('Maintain excellence — introduce longer surahs and harder Tajweed rules.');
    else if (avg >= 3.5 && recs.length === 0) recs.push('Solid progress — focus on consistency and reduce occasional slips.');
    return recs;
}

/** Persist an assessment + per-category grades. Returns the new assessment id. */
export async function recordAssessment(sb, payload) {
    const scores = {
        fluency:  clamp05(payload.fluency),
        makharij: clamp05(payload.makharij),
        tajweed:  clamp05(payload.tajweed),
        waqf:     clamp05(payload.waqf),
        accuracy: clamp05(payload.accuracy),
    };
    const avg   = calculateAverage(scores);
    const band  = resolveBand(avg);
    const weak  = identifyWeaknesses(scores);
    const recs  = generateRecommendations(scores, avg);

    const { data: a, error: e1 } = await sb.from('assessments').insert({
        student_id:   Number(payload.student_id),
        teacher_id:   Number(payload.teacher_id),
        class_id:     payload.class_id ? Number(payload.class_id) : null,
        module_type:  'quran_recitation',
        assessed_on:  payload.assessed_on,
        overall_score: avg,
        overall_grade: band.label,
        comments:     payload.comments || null,
    }).select('id').single();
    if (e1) throw e1;

    const { error: e2 } = await sb.from('quran_recitation_grades').insert({
        assessment_id: a.id,
        surah_id:      payload.surah_id  ? Number(payload.surah_id)  : null,
        ayah_from:     payload.ayah_from ? Number(payload.ayah_from) : null,
        ayah_to:       payload.ayah_to   ? Number(payload.ayah_to)   : null,
        ...scores,
        average_score:    avg,
        grade_label:      band.label,
        weaknesses:       weak.length ? weak : null,
        recommendations:  recs.length ? recs : null,
    });
    if (e2) throw e2;

    return a.id;
}
