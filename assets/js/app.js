/**
 * App shell: auth gate, hash-based router, role-aware sidebar, view loader.
 */
import { supabase, currentProfile, signOut } from './supabase-client.js';

const NAV_BY_ROLE = {
    admin: [
        { grp: 'Overview' },
        { hash: 'dashboard',    label: 'Dashboard',     icon: '📊' },
        { grp: 'School' },
        { hash: 'students',     label: 'Students',      icon: '🎓' },
        { hash: 'teachers',     label: 'Teachers',      icon: '👨‍🏫' },
        { hash: 'classes',      label: 'Classes',       icon: '🏫' },
        { grp: 'Assessment' },
        { hash: 'assessments',  label: 'Quran Grading', icon: '۝' },
        { hash: 'memorisation', label: 'Memorisation',  icon: '📖' },
        { hash: 'duas',         label: 'Duas',          icon: '🤲' },
        { hash: 'attendance',   label: 'Attendance',    icon: '✅' },
        { grp: 'Admin' },
        { hash: 'reports',      label: 'Reports',       icon: '📄' },
        { hash: 'admins',       label: 'Admins',        icon: '🛡️' },
        { hash: 'audit',        label: 'Audit log',     icon: '📜' },
        { hash: 'settings',     label: 'Settings',      icon: '⚙️' },
        { grp: 'You' },
        { hash: 'account',      label: 'My Account',    icon: '👤' },
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

async function boot() {
    PROFILE = await currentProfile();
    if (!PROFILE) { location.href = 'login.html'; return; }

    renderSidebar();
    bindTopbar();
    window.addEventListener('hashchange', route);
    if (!location.hash) location.hash = '#/dashboard';
    route();
}

function renderSidebar() {
    const nav = document.getElementById('app-nav');
    const items = NAV_BY_ROLE[PROFILE.role] || NAV_BY_ROLE.student;
    nav.innerHTML = items.map(i =>
        i.grp ? `<div class="grp">${i.grp}</div>`
              : `<a href="#/${i.hash}" data-route="${i.hash}"><span>${i.icon}</span> ${i.label}</a>`
    ).join('');

    document.getElementById('app-user').innerHTML =
        `<div class="who">${PROFILE.full_name}</div>
         <div style="text-transform:capitalize">${PROFILE.role}</div>`;

    // Load school name from settings.
    supabase.from('settings').select('school_name').eq('id', 1).single()
        .then(({ data }) => {
            if (data?.school_name) {
                document.getElementById('brand-school').textContent = data.school_name;
            }
        });
}

function bindTopbar() {
    document.getElementById('signout-btn').addEventListener('click', () => signOut());
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
    root.innerHTML = '<div class="loader">Loading…</div>';
    try {
        const mod = await import(`./views/${name}.js`);
        CURRENT_VIEW = mod;
        document.getElementById('page-title').textContent = mod.title || name;
        await mod.render(root, { profile: PROFILE, supabase });
    } catch (err) {
        console.error(err);
        root.innerHTML = `<div class="alert alert-danger">View "${name}" failed to load.<br><code style="font-size:12px">${err.message}</code></div>`;
    }
}

boot();
