/* Classes — with student enrolment + teacher assignment */
import { audit } from '../supabase-client.js';
export const title = 'Classes';

export async function render(root, { profile, supabase }) {
    const canWrite = profile.role === 'admin';
    root.innerHTML = `
        <div class="card">
            <div class="toolbar">
                ${canWrite ? '<button class="btn btn-primary" id="add-btn">+ New class</button>' : ''}
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
                    <label>Level<input name="level" placeholder="Beginner / Intermediate / …"></label>
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
        tbody.innerHTML = (data || []).map(c => `
            <tr>
                <td><a href="#" data-cid="${c.id}" class="detail-link"><strong>${c.name}</strong></a></td>
                <td>${c.level || ''}</td>
                <td>${c.class_students?.[0]?.count || 0}</td>
                <td>${c.class_teachers?.[0]?.count || 0}</td>
                <td>${canWrite ? `<button class="btn edit-btn" data-cls='${JSON.stringify(c)}'>Edit</button>
                                   <button class="btn del-btn" data-id="${c.id}">Delete</button>` : ''}</td>
            </tr>`).join('') || '<tr><td colspan="5"><em>No classes.</em></td></tr>';

        tbody.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', () => openEdit(JSON.parse(b.dataset.cls))));
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
        if (error) return alert(error.message);
        await audit('class.delete', 'class', id);
        load();
    }

    async function showDetail(classId) {
        const [{ data: cls }, { data: enrolled }, { data: assigned }, { data: students }, { data: teachers }] = await Promise.all([
            supabase.from('classes').select('*').eq('id', classId).single(),
            supabase.from('class_students').select('student_id, students(first_name,last_name,student_code)').eq('class_id', classId),
            supabase.from('class_teachers').select('teacher_id, is_lead, teachers(first_name,last_name,staff_code)').eq('class_id', classId),
            supabase.from('students').select('id, first_name, last_name, student_code').order('last_name'),
            supabase.from('teachers').select('id, first_name, last_name, staff_code').order('last_name'),
        ]);
        const enrolledIds = new Set((enrolled || []).map(r => r.student_id));
        const assignedIds = new Set((assigned || []).map(r => r.teacher_id));
        const detail = document.getElementById('detail-card');
        detail.style.display = '';
        detail.innerHTML = `
            <h3>${cls.name} ${cls.level ? '<span class="chip">' + cls.level + '</span>' : ''}</h3>
            <div class="grid-app" style="margin-top:12px">
                <div class="card span-6">
                    <h3>Enrolled students (${enrolled?.length || 0})</h3>
                    <ul style="max-height:280px;overflow:auto;padding-left:18px">
                        ${(enrolled || []).map(e => `<li>${e.students?.first_name} ${e.students?.last_name} <button class="btn unenrol-btn" data-id="${e.student_id}">Remove</button></li>`).join('') || '<em>None.</em>'}
                    </ul>
                    ${canWrite ? `<div class="toolbar">
                        <select id="enrol-select">
                            <option value="">Pick a student…</option>
                            ${(students || []).filter(s => !enrolledIds.has(s.id)).map(s => `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`).join('')}
                        </select>
                        <button class="btn btn-primary" id="enrol-btn">Enrol</button>
                    </div>` : ''}
                </div>
                <div class="card span-6">
                    <h3>Assigned teachers (${assigned?.length || 0})</h3>
                    <ul style="max-height:280px;overflow:auto;padding-left:18px">
                        ${(assigned || []).map(t => `<li>${t.teachers?.first_name} ${t.teachers?.last_name} ${t.is_lead ? '<span class="chip gold">Lead</span>' : ''}
                            <button class="btn unassign-btn" data-id="${t.teacher_id}">Remove</button></li>`).join('') || '<em>None.</em>'}
                    </ul>
                    ${canWrite ? `<div class="toolbar">
                        <select id="assign-select">
                            <option value="">Pick a teacher…</option>
                            ${(teachers || []).filter(t => !assignedIds.has(t.id)).map(t => `<option value="${t.id}">${t.first_name} ${t.last_name}</option>`).join('')}
                        </select>
                        <label><input type="checkbox" id="assign-lead"> Lead</label>
                        <button class="btn btn-primary" id="assign-btn">Assign</button>
                    </div>` : ''}
                </div>
            </div>`;

        if (canWrite) {
            document.getElementById('enrol-btn').addEventListener('click', async () => {
                const sid = Number(document.getElementById('enrol-select').value);
                if (!sid) return;
                await supabase.from('class_students').insert({ class_id: classId, student_id: sid });
                await audit('class.enrol', 'class', classId, { student_id: sid });
                showDetail(classId);
            });
            document.getElementById('assign-btn').addEventListener('click', async () => {
                const tid = Number(document.getElementById('assign-select').value);
                const lead = document.getElementById('assign-lead').checked;
                if (!tid) return;
                await supabase.from('class_teachers').insert({ class_id: classId, teacher_id: tid, is_lead: lead });
                await audit('class.assign_teacher', 'class', classId, { teacher_id: tid, lead });
                showDetail(classId);
            });
            detail.querySelectorAll('.unenrol-btn').forEach(b => b.addEventListener('click', async () => {
                await supabase.from('class_students').delete().eq('class_id', classId).eq('student_id', b.dataset.id);
                showDetail(classId);
            }));
            detail.querySelectorAll('.unassign-btn').forEach(b => b.addEventListener('click', async () => {
                await supabase.from('class_teachers').delete().eq('class_id', classId).eq('teacher_id', b.dataset.id);
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
        if (res.error) { alert(res.error.message); return; }
        await audit(id ? 'class.update' : 'class.create', 'class', id || null, payload);
        dlg.close(); load();
    });

    load();
}
