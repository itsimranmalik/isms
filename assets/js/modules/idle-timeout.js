/**
 * Idle-timeout watcher.
 *
 * After 30 minutes of inactivity the user is signed out and bounced to login.
 * A warning appears at 25 minutes with a "Stay signed in" button.
 *
 * Activity = mousemove, keydown, click, scroll, touchstart. The timestamp of
 * the latest activity is mirrored to localStorage, so action in any tab
 * counts for every tab (no double-warnings).
 */

const STORAGE_KEY  = 'isms-last-activity';
const IDLE_MS      = 30 * 60 * 1000;   // sign out at 30 minutes
const WARN_BEFORE  = 5  * 60 * 1000;   // warning 5 min before sign-out
const POLL_MS      = 30 * 1000;        // check every 30 seconds
const ACTIVITY     = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

let pollTimer  = null;
let warnDialog = null;
let started    = false;

function now()           { return Date.now(); }
function getLast()       { return Number(localStorage.getItem(STORAGE_KEY) || now()); }
function setLast(t = now()) { localStorage.setItem(STORAGE_KEY, String(t)); }

function onActivity() {
    setLast();
    // If the warning is up but the user is moving again, close it — they're back.
    if (warnDialog && warnDialog.open) warnDialog.close();
}

function ensureWarnDialog() {
    if (warnDialog) return warnDialog;
    const dlg = document.createElement('dialog');
    dlg.id = 'idle-warn-dialog';
    dlg.style.cssText = 'border:0; border-radius:14px; padding:0; max-width:420px; width:90%';
    dlg.innerHTML = `
        <div style="padding:22px 24px">
            <h2 style="margin:0 0 8px; color: var(--green-700, #056656)">Still there?</h2>
            <p style="margin:0 0 14px; color: var(--text, #1f2937)">
                You've been idle for a while. For security you'll be signed out in
                <strong id="idle-countdown">5 minutes</strong>.
            </p>
            <div style="display:flex; gap:10px; justify-content:flex-end">
                <button class="btn"          id="idle-signout-now">Sign out now</button>
                <button class="btn btn-primary" id="idle-stay">Stay signed in</button>
            </div>
        </div>`;
    document.body.appendChild(dlg);
    dlg.querySelector('#idle-stay').addEventListener('click', () => {
        setLast();          // mark fresh activity
        dlg.close();
    });
    dlg.querySelector('#idle-signout-now').addEventListener('click', async () => {
        dlg.close();
        await signOutAndRedirect();
    });
    warnDialog = dlg;
    return dlg;
}

function showWarning(remainingMs) {
    const dlg = ensureWarnDialog();
    const cd  = dlg.querySelector('#idle-countdown');
    const mins = Math.max(1, Math.round(remainingMs / 60000));
    cd.textContent = mins === 1 ? '1 minute' : `${mins} minutes`;
    if (!dlg.open) dlg.showModal();
}

async function signOutAndRedirect() {
    try {
        const mod = await import('../supabase-client.js');
        await mod.signOut();
    } catch { /* fall through */ }
    // Hard redirect to login regardless
    location.href = 'login.html?reason=idle';
}

async function tick() {
    const last      = getLast();
    const elapsed   = now() - last;
    const remaining = IDLE_MS - elapsed;

    if (remaining <= 0) {
        stop();
        await signOutAndRedirect();
        return;
    }
    if (remaining <= WARN_BEFORE) {
        showWarning(remaining);
    } else if (warnDialog?.open) {
        warnDialog.close();
    }
}

export function start() {
    if (started) return;
    started = true;
    setLast();
    ACTIVITY.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }));
    // Re-evaluate when the tab regains focus (it may have been backgrounded a while).
    window.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
    pollTimer = setInterval(tick, POLL_MS);
}

export function stop() {
    if (!started) return;
    started = false;
    ACTIVITY.forEach(ev => window.removeEventListener(ev, onActivity));
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (warnDialog?.open) warnDialog.close();
}

/** Convenience for testing: pretend the user has been idle for N minutes. */
export function debug_setIdleMinutes(mins) {
    setLast(now() - mins * 60000);
}
