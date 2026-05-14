/* Site-wide niceties: mobile nav toggle + theme persistence */
(function () {
    'use strict';
    // Theme
    const saved = localStorage.getItem('isms-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    document.addEventListener('DOMContentLoaded', () => {
        const tog = document.getElementById('theme-toggle');
        if (tog) {
            tog.addEventListener('click', () => {
                const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('isms-theme', next);
            });
        }
        const burger = document.getElementById('nav-toggle');
        const links  = document.getElementById('nav-links');
        if (burger && links) {
            burger.addEventListener('click', () => links.classList.toggle('open'));
        }
        // Mark current page in nav
        const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
        document.querySelectorAll('.nav-links a').forEach(a => {
            if ((a.getAttribute('href') || '').toLowerCase().endsWith(here)) a.classList.add('active');
        });
    });
})();
