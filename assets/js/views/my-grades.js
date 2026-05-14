export const title = 'My Grades';

export async function render(root, { profile, supabase }) {
    if (!profile.student_id) {
        root.innerHTML = '<div class="alert alert-info">Your student profile isn\'t linked yet.</div>';
        return;
    }
    const { data: rows } = await supabase
        .from('assessments')
        .select('assessed_on, overall_score, overall_grade, comments, quran_recitation_grades(fluency,makharij,tajweed,waqf,accuracy,weaknesses,recommendations)')
        .eq('student_id', profile.student_id)
        .eq('module_type', 'quran_recitation')
        .order('assessed_on', { ascending: false })
        .limit(50);

    root.innerHTML = `
        <div class="card span-12">
            <h3>Quran Recitation history</h3>
            <table class="table">
                <thead><tr><th>Date</th><th>F</th><th>M</th><th>T</th><th>W</th><th>A</th><th>Avg</th><th>Grade</th><th>Comments</th></tr></thead>
                <tbody>
                    ${(rows || []).map(r => {
                        const g = Array.isArray(r.quran_recitation_grades) ? r.quran_recitation_grades[0] : r.quran_recitation_grades;
                        return `<tr>
                            <td>${r.assessed_on}</td>
                            <td>${g?.fluency  ?? ''}</td>
                            <td>${g?.makharij ?? ''}</td>
                            <td>${g?.tajweed  ?? ''}</td>
                            <td>${g?.waqf     ?? ''}</td>
                            <td>${g?.accuracy ?? ''}</td>
                            <td><strong>${r.overall_score ?? ''}</strong></td>
                            <td>${r.overall_grade ?? ''}</td>
                            <td>${r.comments ?? ''}</td>
                        </tr>`;
                    }).join('') || '<tr><td colspan="9"><em>No assessments yet.</em></td></tr>'}
                </tbody>
            </table>
        </div>`;
}
