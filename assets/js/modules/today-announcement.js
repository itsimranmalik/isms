/**
 * Today-only announcement modal.
 *
 * Shows a one-off message on a single date for the selected roles, once per
 * user (dismissal stored in localStorage). After TARGET_DATE has passed,
 * showIfApplicable() is a no-op even if the user has never seen it.
 *
 * To run a new announcement later: edit TARGET_DATE + the HTML below.
 */

const TARGET_DATE = '2026-06-08';                   // YYYY-MM-DD — only shows on this calendar day
const AUDIENCE    = ['admin', 'teacher'];           // roles that see the modal
const STORAGE_KEY = 'isms-announcement-' + TARGET_DATE;

export function showIfApplicable(profile) {
    if (!profile?.role) return;
    if (!AUDIENCE.includes(profile.role)) return;

    const today = new Date().toISOString().slice(0, 10);
    if (today !== TARGET_DATE) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const dlg = document.createElement('dialog');
    dlg.id = 'today-announcement';
    dlg.style.cssText = 'border:0; border-radius:16px; padding:0; max-width:520px; width:92%; box-shadow:0 24px 64px rgba(0,0,0,.25)';
    dlg.innerHTML = `
        <div style="padding:28px 28px 22px; background: linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 60%); border-radius:16px">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px">
                <span style="font-size:34px; color: var(--gold-500); line-height:1">☪</span>
                <h2 style="margin:0; color: var(--green-700); font-size:24px">Assalamu Alaikum</h2>
            </div>
            <p style="margin:14px 0 0; color: var(--text); font-size:15px; line-height:1.65">
                Today is <strong>assessment day</strong> for our students. Thank you for the time, patience and
                care you bring to every child — your steady effort shapes their reading, their Quran and
                their character every single week.
            </p>
            <p style="margin:14px 0 0; color: var(--text); font-size:15px; line-height:1.65">
                May Allah accept your service, ease your work today, and reward you with the very best in this
                world and the next. <em>Barakallahu feekum.</em>
            </p>
            <p style="margin:18px 0 6px; color: var(--green-700); font-style: italic; font-size:14px">
                — The Madrasa Team
            </p>
            <div style="display:flex; justify-content:flex-end; margin-top:18px">
                <button class="btn btn-primary" id="ann-close" style="padding: 10px 22px">Got it — thank you</button>
            </div>
        </div>`;
    document.body.appendChild(dlg);
    dlg.querySelector('#ann-close').addEventListener('click', () => {
        localStorage.setItem(STORAGE_KEY, '1');
        dlg.close();
        dlg.remove();
    });
    // ESC and backdrop click also dismiss (and remember).
    dlg.addEventListener('close', () => {
        localStorage.setItem(STORAGE_KEY, '1');
        dlg.remove();
    });
    dlg.showModal();
}
