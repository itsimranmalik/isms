/* Classes — admin: full; teacher: enrol students in classes they teach.
 * Each enrolment can have a "primary teacher" so multiple teachers in a
 * class can split students between them. */
import { audit } from '../supabase-client.js';
import { toast } from '../modules/toast.js';
export const title = 'Classes';

export async function render(root, { profile, supabase }) {
    const isAdmin   = profile.role === 'admin';
    const isTeacher = profile.role === 'teacher';

    let myClassIds = new Set();
    if (isTeacher && profile.teacher_id) {
        const { data: mine } = await supabase
            .from('class_teachers').select('class_id')
            .eq('teacher_id', profile.teacher_id);
        myClassIds = new Set((mine || []).map(r => r.class_id));
    }
    const canEnrolInClass = (classId) => isAdmin || (isTeacher && myClassIds.has(classId));

    root.innerHTML = `
        <div class="card">
            <div class="toolbar">
                ${isAdmin ? '<button class="btn btn-primary" id="add-btn">+ New class</button>' : ''}
                <span class="text-muted" id="count" style="margin-left:auto"></span>
            </div>
            <table class="table">
                <thead><tr><th>Name</th><th>Level</th><th>Students</th><th>Teachers</th><th></th></tr></thead>
                <tbody></tbody>
            </table>
        </div>
        <div class="card" id="detail-card" style="display:none; margin-top:16px"></div>

        <dialog id="class-dialog" style="border:0; border-radius: var(--radius); padding:0; max-width:480px; width:90%">
            <form id="class-form" style="padding:24px">
                <h2 style="margin-top:0; color: var(--green-700)">Class</h2>
                <input type="hidden" name="id">
                <div class="form">
                    <label>Name *<input required name="name"></label>
                    <label>Level<input name="level" placeholder="Beginner / Intermediate / ..."></label>
                    <label>Description<textarea name="description" rows="2"></textarea></label>
                </div>
                <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px">
                    <button class="btn" type="button" id="dlg-cancel">Cancel</button>
                    <button class="btn btn-primary" type="submit">Save</button>
                </div>
            </form>
        </dialog>`;

    const dlg  = document.getElementById('class-dialog');
    const form = document.getElementById('class-form');

    async function load() {
        const { data } = await supabase
            .from('classes')
            .select('id, name, level, class_students(count), class_teachers(count)')
            .order('name');
        document.getElementById('count').textContent = `${data?.length || 0} classes`;
        const tbody = root.querySelector('tbody');
        tbody.innerHTML = (data || []).map(c => {
            const youTeach = myClassIds.has(c.id);
            return `<tr>
                <td><a href="#" data-cid="${c.id}" class="detail-link"><strong>${c.name}</strong></a>${youTeach ? ' <span class="chip gold">you teach</span>' : ''}</td>
                <td>${c.level || ''}</td>
                <td>${c.class_students?.[0]?.count || 0}</td>
                <td>${c.class_teachers?.[0]?.count || 0}</td>
                <td>${isAdmin ? `<button class="btn edit-btn" data-cls='${JSON.stringify(c).replace(/'/g, "&apos;")}'>Edit</button>
                                  <button class="btn del-btn" data-id="${c.id}">Delete</button>` : ''}</td>
            </tr>`;
        }).join('') || '<tr><td colspan="5"><em>No classes.</em></td></tr>';

        tbody.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', () => {
            const raw = b.dataset.cls.replace(/&apos;/g, "'");
            openEdit(JSON.parse(raw));
        }));
        tbody.querySelectorAll('.del-btn').forEach(b => b.addEventListener('click', () => del(b.dataset.id)));
        tbody.querySelectorAll('.detail-link').forEach(a => a.addEventListener('click', e => {
            e.preventDefault();
            showDetail(Number(a.dataset.cid));
        }));
    }

    function openEdit(c) {
        for (const el of form.elements) if (el.name) el.value = c && c[el.name] != null ? c[el.name] : '';
        form.elements['id'].value = c?.id || '';
        dlg.showModal();
    }
    async function del(id) {
        if (!confirm('Delete this class? Enrolments and assignments will be removed.')) return;
        const { error } = await supabase.from('classes').delete().eq('id', id);
        if (error) { toast.error(error.message); return; }
        await audit('class.delete', 'class', id);
        toast.success('Class deleted.');
        load();
    }

    async function showDetail(classId) {
        const [{ data: cls }, { data: enrolled }, { data: assigned }, { data: students }, { data: teachers }] = await Promise.all([
            supabase.from('classes').select('*').eq('id', classId).single(),
            supabase.from('class_students').select('student_id, primary_teacher_id, students(first_name,last_name,student_code)').eq('class_id', classId),
            supabase.from('class_teachers').select('teacher_id, is_lead, teachers(first_name,last_name,staff_code)').eq('class_id', classId),
            supabase.from('students').select('id, first_name, last_name, student_code').order('last_name'),
            supabase.from('teachers').select('id, first_name, last_name, staff_code').order('last_name'),
        ]);
        const enrolledIds = new Set((enrolled || []).map(r => r.student_id));
        const assignedIds = new Set((assigned || []).map(r => r.teacher_id));
        const classTeachers = (assigned || []).map(a => ({ id: a.teacher_id, name: `${a.teachers?.first_name} ${a.teachers?.last_name}` }));
        const detail = document.getElementById('detail-card');
        const canEnrol = canEnrolInClass(classId);

        detail.style.display = '';
        detail.innerHTML = `
            <h3>${cls.name} ${cls.level ? '<span class="chip">' + cls.level + '</span>' : ''}
                ${myClassIds.has(classId) ? '<span class="chip gold">you teach this class</span>' : ''}
            </h3>
            ${!isAdmin && !canEnrol ? '<div class="alert alert-info">Read-only — you are not assigned to teach this class.</div>' : ''}
            <div class="grid-app" style="margin-top:12px">
                <div class="card span-6">
                    <h3>Enrolled students (${enrolled?.length || 0})</h3>
                    <table class="table">
                        <thead><tr><th>Student</th><th>Primary teacher</th>${canEnrol ? '<th></th>' : ''}</tr></thead>
                        <tbody>
                            ${(enrolled || []).map(e => `
                                <tr data-sid="${e.student_id}">
                                    <td>${e.students?.first_name} ${e.students?.last_name}</td>
                                    <td>
                                        ${canEnrol ? `<select class="primary-tch-sel" data-sid="${e.student_id}" style="font-size:13px; padding:4px">
                                            <option value="">— unassigned —</option>
                                            ${classTeachers.map(t => `<option value="${t.id}" ${t.id === e.primary_teacher_id ? 'selected' : ''}>${t.name}</option>`).join('')}
                                        </select>` : (classTeachers.find(t => t.id === e.primary_teacher_id)?.name || '—')}
                                    </td>
                                    ${canEnrol ? `<td><button class="btn unenrol-btn" data-id="${e.student_id}">Remove</button></td>` : ''}
                                </tr>`).join('') || `<tr><td colspan="${canEnrol ? 3 : 2}"><em>None.</em></td></tr>`}
                        </tbody>
                    </table>
                    ${canEnrol ? `<div class="toolbar" style="margin-top:10px">
                        <select id="enrol-select">
                            <option value="">Pick a student...</option>
                            ${(students || []).filter(s => !enrolledIds.has(s.id)).map(s => `<option value="${s.id}">${s.first_name} ${s.last_name} (${s.student_code})</option>`).join('')}
                        </select>
                        <select id="enrol-teacher">
                            <option value="">primary teacher (optional)</option>
                            ${classTeachers.map(t => `<option value="${t.id}" ${t.id === profile.teacher_id ? 'selected' : ''}>${t.name}</option>`).join('')}
                        </select>
                        <button class="btn btn-primary" id="enrol-btn">Enrol</button>
                    </div>` : ''}
                </div>
                <div class="card span-6">
                    <h3>Assigned teachers (${assigned?.length || 0})</h3>
                    <ul style="max-height:280px;overflow:auto;padding-left:18px">
                        ${(assigned || []).map(t => `<li>${t.teachers?.first_name} ${t.teachers?.last_name} ${t.is_lead ? '<span class="chip gold">Lead</span>' : ''}
                            ${isAdmin ? '<button class="btn unassign-btn" data-id="' + t.teacher_id + '">Remove</button>' : ''}
                          </li>`).join('') || '<em>None.</em>'}
                    </ul>
                    ${isAdmin ? `<div class="toolbar">
                        <select id="assign-select">
                            <option value="">Pick a teacher...</option>
                            ${(teachers || []).filter(t => !assignedIds.has(t.id)).map(t => `<option value="${t.id}">${t.first_name} ${t.last_name}</option>`).join('')}
                        </select>
                        <label><input type="checkbox" id="assign-lead"> Lead</label>
                        <button class="btn btn-primary" id="assign-btn">Assign</button>
                    </div>` : ''}
                </div>
            </div>`;

        if (canEnrol) {
            document.getElementById('enrol-btn').addEventListener('click', async () => {
                const sid = Number(document.getElementById('enrol-select').value);
                const tch = Number(document.getElementById('enrol-teacher').value) || null;
                if (!sid) return;
                const { error } = await supabase.from('class_students')
                    .insert({ class_id: classId, student_id: sid, primary_teacher_id: tch });
                if (error) { toast.error(error.message); return; }
                await audit('class.enrol', 'class', classId, { student_id: sid, primary_teacher_id: tch });
                toast.success('Student enrolled');
                showDetail(classId);
            });
            detail.querySelectorAll('.unenrol-btn').forEach(b => b.addEventListener('click', async () => {
                const { error } = await supabase.from('class_students').delete().eq('class_id', classId).eq('student_id', b.dataset.id);
                if (error) { toast.error(error.message); return; }
                toast.success('Student unenrolled');
                showDetail(classId);
            }));
            detail.querySelectorAll('.primary-tch-sel').forEach(sel => sel.addEventListener('change', async () => {
                const sid = Number(sel.dataset.sid);
                const newT = sel.value ? Number(sel.value) : null;
                const { error } = await supabase.from('class_students')
                    .update({ primary_teacher_id: newT })
                    .eq('class_id', classId).eq('student_id', sid);
                if (error) { toast.error(error.message); return; }
                await audit('class.reassign', 'class_students', null, { class_id: classId, student_id: sid, primary_teacher_id: newT });
                toast.success('Primary teacher updated');
            }));
        }
        if (isAdmin) {
            document.getElementById('assign-btn').addEventListener('click', async () => {
                const tid = Number(document.getElementById('assign-select').value);
                const lead = document.getElementById('assign-lead').checked;
                if (!tid) return;
                const { error } = await supabase.from('class_teachers').insert({ class_id: classId, teacher_id: tid, is_lead: lead });
                if (error) { toast.error(error.message); return; }
                await audit('class.assign_teacher', 'class', classId, { teacher_id: tid, lead });
                toast.success('Teacher assigned');
                showDetail(classId);
            });
            detail.querySelectorAll('.unassign-btn').forEach(b => b.addEventListener('click', async () => {
                const { error } = await supabase.from('class_teachers').delete().eq('class_id', classId).eq('teacher_id', b.dataset.id);
                if (error) { toast.error(error.message); return; }
                toast.success('Teacher removed');
                showDetail(classId);
            }));
        }
    }

    document.getElementById('add-btn')?.addEventListener('click', () => openEdit(null));
    document.getElementById('dlg-cancel').addEventListener('click', () => dlg.close());

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(form).entries());
        const id = payload.id; delete payload.id;
        let res;
        if (id) res = await supabase.from('classes').update(payload).eq('id', id);
        else    res = await supabase.from('classes').insert(payload);
        if (res.error) { toast.error(res.error.message); return; }
        await audit(id ? 'class.update' : 'class.create', 'class', id || null, payload);
        toast.success(id ? 'Class updated' : 'Class created');
        dlg.close(); load();
    });

    load();
}
