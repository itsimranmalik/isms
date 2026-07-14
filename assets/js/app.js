/**
 * App shell: auth gate, hash-based router, role-aware sidebar, view loader.
 */
import { supabase, currentProfile, signOut } from './supabase-client.js';
import { watchContainer as watchSortable } from './modules/sortable-table.js';
import { start as startIdleWatcher, stop as stopIdleWatcher } from './modules/idle-timeout.js';
import { showIfApplicable as showTodayAnnouncement } from './modules/today-announcement.js';

const NAV_BY_ROLE = {
    admin: [
        { grp: 'Overview' },
        { hash: 'dashboard',    label: 'Dashboard',     icon: '📊' },
        { grp: 'School' },
        { hash: 'students',     label: 'Students',      icon: '🎓' },
        { hash: 'teachers',     label: 'Teachers',      icon: '👨‍🏫' },
        { hash: 'classes',      label: 'Classes',       icon: '🏫' },
        { hash: 'import',       label: 'Bulk Import',   icon: '📥' },
        { grp: 'Assessment' },
        { hash: 'assessments',  label: 'Quran Grading', icon: '۝' },
        { hash: 'memorisation', label: 'Memorisation',  icon: '📖' },
        { hash: 'duas',         label: 'Duas',          icon: '🤲' },
        { hash: 'attendance',   label: 'Attendance',    icon: '✅' },
        { grp: 'Admin' },
        { hash: 'reports',          label: 'Reports',          icon: '📄' },
        { hash: 'admissions',       label: 'Admissions',       icon: '📝' },
        { hash: 'feedback',         label: 'Parent Feedback',  icon: '💬' },
        { hash: 'regrade-requests', label: 'Regrade Requests', icon: '🔁' },
        { hash: 'admins',           label: 'Admins',           icon: '🛡️' },
        { hash: 'audit',            label: 'Audit log',        icon: '📜' },
        { hash: 'settings',         label: 'Settings',         icon: '⚙️' },
        { grp: 'You' },
        { hash: 'account',      label: 'My Account',    icon: '👤' },
        { hash: 'guidelines',   label: 'Guidelines',    icon: '📑' },
        { hash: 'help',         label: 'Help',          icon: '📘' },
    ],
    teacher: [
        { hash: 'dashboard',    label: 'Dashboard',     icon: '📊' },
        { hash: 'students',     label: 'My Students',   icon: '🎓' },
        { hash: 'classes',      label: 'My Classes',    icon: '🏫' },
        { hash: 'assessments',  label: 'Quran Grading', icon: '۝' },
        { hash: 'memorisation', label: 'Memorisation',  icon: '📖' },
        { hash: 'duas',         label: 'Duas',          icon: '🤲' },
        { hash: 'attendance',   label: 'Attendance',    icon: '✅' },
        { hash: 'reports',      label: 'Reports',       icon: '📄' },
        { hash: 'guidelines',   label: 'Guidelines',    icon: '📑' },
        { hash: 'account',      label: 'My Account',    icon: '👤' },
        { hash: 'help',         label: 'Help',          icon: '📘' },
    ],
    student: [
        { hash: 'dashboard',    label: 'My Dashboard',  icon: '📊' },
        { hash: 'my-grades',    label: 'My Grades',     icon: '۝' },
        { hash: 'my-memorisation', label: 'Memorisation', icon: '📖' },
        { hash: 'my-duas',      label: 'Duas',          icon: '🤲' },
        { hash: 'my-attendance',label: 'Attendance',    icon: '✅' },
        { hash: 'reports',      label: 'My Reports',    icon: '📄' },
        { hash: 'account',      label: 'My Account',    icon: '👤' },
        { hash: 'help',         label: 'Help',          icon: '📘' },
    ],
    parent: [
        { hash: 'dashboard',    label: 'Overview',      icon: '📊' },
        { hash: 'account',      label: 'My Account',    icon: '👤' },
        { hash: 'help',         label: 'Help',          icon: '📘' },
    ],
};

let PROFILE = null;
let CURRENT_VIEW = null;
let SORT_OBSERVER = null;   // tear down between routes so we don't leak observers

async function boot() {
    PROFILE = await currentProfile();
    if (!PROFILE) { location.href = 'login.html'; return; }

    renderSidebar();
    bindTopbar();
    window.addEventListener('hashchange', route);
    if (!location.hash) location.hash = '#/dashboard';
    route();

    // Auto sign-out after 30 minutes of inactivity (warns at 25 min).
    startIdleWatcher();

    // One-shot, date-gated announcement (e.g. assessment day message).
    showTodayAnnouncement(PROFILE);
}

function renderSidebar() {
    const nav = document.getElementById('app-nav');
    const items = NAV_BY_ROLE[PROFILE.role] || NAV_BY_ROLE.student;
    nav.innerHTML = items.map(i =>
        i.grp ? `<div class="grp">${i.grp}</div>`
              : `<a href="#/${i.hash}" data-route="${i.hash}"><span>${i.icon}</span> ${i.label}<span class="nav-badge" data-badge-for="${i.hash}" style="display:none"></span></a>`
    ).join('');

    document.getElementById('app-user').innerHTML =
        `<div class="who">${PROFILE.full_name}</div>
         <div style="text-transform:capitalize">${PROFILE.role}</div>`;

    // Admin: live count of pending regrade requests as a sidebar badge.
    if (PROFILE.role === 'admin') {
        refreshRegradeBadge();
        // Refresh every minute, and whenever the user navigates.
        setInterval(refreshRegradeBadge, 60_000);
        window.addEventListener('hashchange', refreshRegradeBadge);
    }

    // Load school name from settings.
    supabase.from('settings').select('school_name').eq('id', 1).single()
        .then(({ data }) => {
            if (data?.school_name) {
                document.getElementById('brand-school').textContent = data.school_name;
            }
        });
}

async function refreshRegradeBadge() {
    const badge = document.querySelector('.nav-badge[data-badge-for="regrade-requests"]');
    if (!badge) return;
    const { count, error } = await supabase
        .from('assessment_regrade_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
    if (error) return;
    if (count && count > 0) {
        badge.textContent = String(count);
        badge.style.display = '';
    } else {
        badge.style.display = 'none';
    }
}

function bindTopbar() {
    document.getElementById('signout-btn').addEventListener('click', () => { stopIdleWatcher(); signOut(); });
    document.getElementById('theme-toggle').addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('isms-theme', next);
    });
    document.getElementById('app-burger').addEventListener('click', () => {
        document.getElementById('app-sidebar').classList.toggle('open');
    });
    document.documentElement.setAttribute('data-theme', localStorage.getItem('isms-theme') || 'light');
}

async function route() {
    const hash = (location.hash || '#/dashboard').replace(/^#\/?/, '') || 'dashboard';
    const [name] = hash.split('?');
    document.querySelectorAll('#app-nav a').forEach(a => {
        a.classList.toggle('active', a.dataset.route === name);
    });
    document.getElementById('app-sidebar').classList.remove('open');

    const root = document.getElementById('page-root');
    if (SORT_OBSERVER) { SORT_OBSERVER.disconnect(); SORT_OBSERVER = null; }
    root.innerHTML = '<div class="loader">Loading…</div>';
    try {
        const mod = await import(`./views/${name}.js`);
        CURRENT_VIEW = mod;
        document.getElementById('page-title').textContent = mod.title || name;
        await mod.render(root, { profile: PROFILE, supabase });
        // Every table.table inside the page becomes click-to-sort, including
        // ones that views populate asynchronously later (MutationObserver).
        SORT_OBSERVER = watchSortable(root);
    } catch (err) {
        console.error(err);
        root.innerHTML = `<div class="alert alert-danger">View "${name}" failed to load.<br><code style="font-size:12px">${err.message}</code></div>`;
    }
}

boot();
