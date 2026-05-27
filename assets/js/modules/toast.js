/**
 * Lightweight toast notifications.
 * Usage:  import { toast } from './modules/toast.js';
 *         toast.success('Details saved');
 *         toast.error('Could not save: ' + err.message);
 *         toast.info('Loading…', { duration: 0 }); // sticky
 *
 * Toasts stack at the bottom-right and auto-dismiss after 3.5s by default.
 */

const HOST_ID = 'ism-toast-host';

function ensureHost() {
    let host = document.getElementById(HOST_ID);
    if (!host) {
        host = document.createElement('div');
        host.id = HOST_ID;
        host.setAttribute('aria-live', 'polite');
        host.style.cssText = [
            'position:fixed',
            'right:16px',
            'bottom:16px',
            'z-index:9999',
            'display:flex',
            'flex-direction:column',
            'gap:10px',
            'pointer-events:none',
            'max-width:calc(100% - 32px)',
        ].join(';');
        document.body.appendChild(host);
    }
    return host;
}

function show(message, kind = 'success', { duration = 3500 } = {}) {
    const host = ensureHost();
    const el = document.createElement('div');
    el.role = 'status';
    el.dataset.kind = kind;
    el.style.cssText = [
        'min-width:240px',
        'max-width:380px',
        'padding:12px 16px',
        'border-radius:10px',
        'box-shadow:0 10px 25px rgba(0,0,0,.18)',
        'color:#fff',
        'font-weight:600',
        'font-size:14px',
        'pointer-events:auto',
        'cursor:pointer',
        'transition:opacity .18s, transform .18s',
        'opacity:0',
        'transform:translateY(8px)',
        'display:flex',
        'align-items:center',
        'gap:10px',
        'background:' + bgFor(kind),
    ].join(';');
    el.innerHTML = '<span style="font-size:18px">' + iconFor(kind) + '</span>'
                 + '<span style="flex:1">' + escapeHtml(message) + '</span>'
                 + '<span style="opacity:.7; font-size:18px; padding-left:6px">×</span>';

    el.addEventListener('click', () => dismiss());

    host.appendChild(el);
    requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
    });

    let timer = duration > 0 ? setTimeout(dismiss, duration) : null;
    function dismiss() {
        if (timer) { clearTimeout(timer); timer = null; }
        el.style.opacity = '0';
        el.style.transform = 'translateY(8px)';
        setTimeout(() => el.remove(), 220);
    }
    return { dismiss };
}

function bgFor(kind) {
    return {
        success: '#059669',
        error:   '#DC2626',
        info:    '#0F766E',
        warn:    '#D97706',
    }[kind] || '#0F766E';
}
function iconFor(kind) {
    return {
        success: '✓',
        error:   '⚠',
        info:    'ℹ',
        warn:    '!',
    }[kind] || 'ℹ';
}
function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

export const toast = {
    success: (msg, opt) => show(msg, 'success', opt),
    error:   (msg, opt) => show(msg, 'error',   opt),
    info:    (msg, opt) => show(msg, 'info',    opt),
    warn:    (msg, opt) => show(msg, 'warn',    opt),
};
