/* Regrade Requests — admin queue for Quran / Qaidah regrade approvals. */
import { audit } from '../supabase-client.js';
import { toast } from '../modules/toast.js';

export const title = 'Regrade Requests';

export async function render(root, { profile, supabase }) {
    if (profile.role !== 'admin') {
        root.innerHTML = '<div class="alert alert-danger">Admin only.</div>';
        return;
    }

    root.innerHTML = `
        <p class="text-muted" style="margin-top:0">
            Pending teacher requests to re-grade a Quran or Qaidah assessment. Approve to delete the existing
            row (so the teacher can save a fresh one) or reject with a note.
        </p>
        <div class="card">
            <table class="table">
                <thead><tr>
                    <th>Student</th><th>Class</th><th>Module</th><th>Original</th>
                    <th>Requested by</th><th>Reason</th><th>When</th><th></th>
                </tr></thead>
                <tbody id="regrade-body"><tr><td colspan="8"><em>Loading…</em></td></tr></tbody>
            </table>
        </div>

        <dialog id="reject-dialog" style="border:0; border-radius:14px; padding:0; max-width:480px; width:92%">
            <form id="reject-form" style="padding:22px 24px">
                <h2 style="margin:0 0 8px; color:var(--green-700)">Reject regrade request</h2>
                <input type="hidden" name="request_id">
                <label>Reason for the teacher (optional)
                    <textarea name="admin_note" maxlength="500" rows="4" placeholder="e.g. Original score stands - discuss with student first."></textarea>
                </label>
                <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:12px">
                    <button class="btn" type="button" id="reject-cancel">Cancel</button>
                    <button class="btn btn-primary" type="submit" id="reject-submit">Reject</button>
                </div>
            </form>
        </dialog>`;

    await load();

    async function load() {
        const tbody = document.getElementById('regrade-body');
        const { data, error } = await supabase
            .from('assessment_regrade_requests')
            .select(`
                id, reason, created_at, assessed_on, module_type,
                student_id, students(first_name, last_name, student_code, class_students(classes(name))),
                requester_id, requester_teacher_id, teachers:requester_teacher_id(staff_code, first_name, last_name),
                assessment_id, assessments(
                    overall_score, overall_grade, assessed_on,
                    quran_recitation_grades(fluency, makharij, tajweed, waqf, accuracy),
                    qaidah_grades(total_score, letter_recognition, joining_reading, makharij_tajweed, fluency_confidence)
                )
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="8"><div class="alert alert-danger">${error.message}</div></td></tr>`;
            return;
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8"><em>No pending regrade requests.</em></td></tr>';
            return;
        }

        tbody.innerHTML = data.map(r => {
            const stu = r.students || {};
            const cls = stu.class_students?.[0]?.classes?.name || '—';
            const teacher = r.teachers
                ? `${(r.teachers.first_name||'')} ${(r.teachers.last_name||'')}`.trim() + ` (${r.teachers.staff_code||''})`
                : '—';
            const a = r.assessments || {};
            const moduleLabel = r.module_type === 'quran_recitation' ? 'Quran' : 'Qaidah';
            let originalCell = '—';
            if (r.module_type === 'quran_recitation') {
                const g = Array.isArray(a.quran_recitation_grades) ? a.quran_recitation_grades[0] : a.quran_recitation_grades;
                const total = g ? [g.fluency, g.makharij, g.tajweed, g.waqf, g.accuracy].reduce((s,v)=>s+Number(v||0),0) : '';
                originalCell = `${total !== '' ? total + ' / 25' : '—'} <span class="text-muted" style="font-size:12px">avg ${a.overall_score ?? '—'} · ${a.overall_grade ?? '—'}</span>`;
            } else {
                const g = Array.isArray(a.qaidah_grades) ? a.qaidah_grades[0] : a.qaidah_grades;
                originalCell = `${(g?.total_score ?? '—')} / 20 <span class="text-muted" style="font-size:12px">avg ${a.overall_score ?? '—'} · ${a.overall_grade ?? '—'}</span>`;
            }
            return `<tr>
                <td><strong>${escapeHtml((stu.first_name||'') + ' ' + (stu.last_name||''))}</strong>
                    <div class="text-muted" style="font-size:12px">${stu.student_code || ''}</div></td>
                <td>${escapeHtml(cls)}</td>
                <td><span class="chip">${moduleLabel}</span></td>
                <td>${originalCell}</td>
                <td>${escapeHtml(teacher)}</td>
                <td style="max-width:280px"><div style="white-space:normal">${escapeHtml(r.reason || '')}</div></td>
                <td>${new Date(r.created_at).toLocaleString()}</td>
                <td style="white-space:nowrap">
                    <button class="btn btn-primary approve-btn" data-rid="${r.id}" data-aid="${r.assessment_id}" data-name="${escapeAttr((stu.first_name||'') + ' ' + (stu.last_name||''))}">Approve</button>
                    <button class="btn reject-btn"          data-rid="${r.id}">Reject</button>
                </td>
            </tr>`;
        }).join('');

        root.querySelectorAll('.approve-btn').forEach(b => b.addEventListener('click', () => approve(b.dataset.rid, b.dataset.aid, b.dataset.name)));
        root.querySelectorAll('.reject-btn').forEach (b => b.addEventListener('click', () => openReject(b.dataset.rid)));
    }

    async function approve(requestId, assessmentId, studentName) {
        if (!confirm(`Approve regrade for ${studentName}? The existing assessment will be deleted so the teacher can save a fresh one.`)) return;
        // Deleting the assessment cascades the request away too.
        const { error } = await supabase.from('assessments').delete().eq('id', Number(assessmentId));
        if (error) { toast.error(error.message); return; }
        await audit('regrade.approve', 'assessment', Number(assessmentId), { request_id: Number(requestId) });
        toast.success('Regrade approved · assessment deleted.');
        load();
    }

    const rejectDlg  = document.getElementById('reject-dialog');
    const rejectForm = document.getElementById('reject-form');
    function openReject(requestId) {
        rejectForm.elements['request_id'].value  = requestId;
        rejectForm.elements['admin_note'].value  = '';
        rejectDlg.showModal();
    }
    document.getElementById('reject-cancel').addEventListener('click', () => rejectDlg.close());
    rejectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(rejectForm);
        const id   = Number(fd.get('request_id'));
        const note = (fd.get('admin_note') || '').toString().trim() || null;
        const { error } = await supabase.from('assessment_regrade_requests')
            .update({ status: 'rejected', admin_note: note, decided_at: new Date().toISOString(), decided_by: profile.id })
            .eq('id', id);
        if (error) { toast.error(error.message); return; }
        await audit('regrade.reject', 'assessment_regrade_requests', id, { admin_note: note });
        toast.success('Regrade rejected.');
        rejectDlg.close();
        load();
    });
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/`/g, '&#96;'); }
