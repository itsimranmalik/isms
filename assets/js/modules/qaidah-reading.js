/**
 * Qaidah / Juz Amm, Juz 1, Juz 2 grading — pure, framework-free.
 * Categories: letter_recognition, joining_reading, makharij_tajweed, fluency_confidence (0..5 each).
 * Total /20.  Rubric from "Qāʿidah, Juz Amm, Juz 1 and Juz 2 - Assessment Guidelines.pdf".
 */

export const CATEGORIES = ['letter_recognition', 'joining_reading', 'makharij_tajweed', 'fluency_confidence'];

export const CATEGORY_LABELS = {
    letter_recognition:  'Letter Recognition',
    joining_reading:     'Joining & Reading',
    makharij_tajweed:    'Makharij & Tajweed',
    fluency_confidence:  'Fluency & Confidence',
};

export const CATEGORY_HELP = {
    letter_recognition:  'Recognises Arabic letters confidently without hesitation.',
    joining_reading:     'Reads joined letters and simple words accurately.',
    makharij_tajweed:    'Correct articulation points + basic tajweed (madd, vowel sounds, similar letters).',
    fluency_confidence:  'Reads smoothly and at a steady pace with little hesitation.',
};

export const GRADE_BANDS = [
    // [min_average_inclusive, label, gpa_letter, css_color]
    [0.0, 'Not Attempted',  'NA', '#9CA3AF'],
    [0.5, 'Needs Support',  'E',  '#DC2626'],
    [1.5, 'Needs Practice', 'D',  '#F97316'],
    [2.5, 'Good',           'C',  '#F59E0B'],
    [3.5, 'Very Good',      'B',  '#10B981'],
    [4.5, 'Excellent',      'A',  '#059669'],
];

export const GUIDELINES = {
    0: 'Not Attempted — did not read.',
    1: 'Needs Support — significant difficulties; works below the expected standard.',
    2: 'Needs Practice — some understanding; requires regular support and revision.',
    3: 'Good — meets the expected standard; needs more consistency.',
    4: 'Very Good — minor errors that don\'t significantly affect reading.',
    5: 'Excellent — secure understanding; performs independently and confidently.',
};

export function clamp05(v) {
    v = Number(v) | 0;
    if (v < 0) return 0;
    if (v > 5) return 5;
    return v;
}

export function calculateTotal(scores) {
    let t = 0;
    for (const c of CATEGORIES) t += clamp05(scores[c]);
    return t;
}

export function calculateAverage(scores) {
    return Math.round((calculateTotal(scores) / CATEGORIES.length) * 100) / 100;
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
    letter_recognition: 'Flashcard drills of the Arabic alphabet, focusing on letters they hesitate on.',
    joining_reading:    'Daily blending exercises — short joined words first, then longer ones.',
    makharij_tajweed:   'Mirror drills for the difficult letters (ع، غ، ح، خ، ص، ض، ط، ظ) + revise vowel marks.',
    fluency_confidence: 'Re-read the same page aloud 3x to build pace; reduce teacher prompting gradually.',
};

export function generateRecommendations(scores, avg) {
    const recs = [];
    for (const c of CATEGORIES) {
        if (clamp05(scores[c]) <= 3) {
            recs.push(CATEGORY_LABELS[c] + ': ' + TIPS[c]);
        }
    }
    if (avg >= 4.5) recs.push('Excellent — ready to move to the next page / juz; introduce harder words and tajweed rules.');
    else if (avg >= 3.5 && recs.length === 0) recs.push('Solid progress — focus on consistency and reduce occasional slips.');
    return recs;
}

/** Persist an assessment + per-category grades. Returns the new assessment id. */
export async function recordAssessment(sb, payload) {
    const scores = {
        letter_recognition: clamp05(payload.letter_recognition),
        joining_reading:    clamp05(payload.joining_reading),
        makharij_tajweed:   clamp05(payload.makharij_tajweed),
        fluency_confidence: clamp05(payload.fluency_confidence),
    };
    const total = calculateTotal(scores);
    const avg   = calculateAverage(scores);
    const band  = resolveBand(avg);
    const weak  = identifyWeaknesses(scores);
    const recs  = generateRecommendations(scores, avg);

    const { data: a, error: e1 } = await sb.from('assessments').insert({
        student_id:   Number(payload.student_id),
        teacher_id:   Number(payload.teacher_id),
        class_id:     payload.class_id ? Number(payload.class_id) : null,
        module_type:  'qaidah_reading',
        assessed_on:  payload.assessed_on,
        overall_score: avg,
        overall_grade: band.label,
        comments:     payload.comments || null,
    }).select('id').single();
    if (e1) throw e1;

    const { error: e2 } = await sb.from('qaidah_grades').insert({
        assessment_id:      a.id,
        page_at_assessment: payload.qaidah_page ? Number(payload.qaidah_page) : null,
        ...scores,
        total_score:        total,
        average_score:      avg,
        grade_label:        band.label,
        weaknesses:         weak.length ? weak : null,
        recommendations:    recs.length ? recs : null,
    });
    if (e2) throw e2;

    // Bonus: bump the student's current qaidah_page if the teacher updated it.
    if (payload.qaidah_page !== '' && payload.qaidah_page != null) {
        await sb.from('students')
            .update({ qaidah_page: Number(payload.qaidah_page) })
            .eq('id', Number(payload.student_id));
    }

    return a.id;
}
