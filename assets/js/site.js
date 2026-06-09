/* Site-wide niceties: mobile nav toggle, theme persistence, scroll-reveal */
(function () {
    'use strict';

    // Apply saved theme immediately (before DOMContentLoaded) to prevent flash
    const saved = localStorage.getItem('isms-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);

    document.addEventListener('DOMContentLoaded', () => {
        // Theme toggle — both #theme-toggle (app) and .nav-theme-btn (site nav)
        function applyTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('isms-theme', theme);
        }
        function toggleTheme() {
            applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
        }
        document.querySelectorAll('#theme-toggle, .nav-theme-btn').forEach(btn => {
            btn.addEventListener('click', toggleTheme);
        });

        // Mobile nav burger
        const burger = document.getElementById('nav-toggle');
        const links  = document.getElementById('nav-links');
        if (burger && links) {
            burger.addEventListener('click', () => links.classList.toggle('open'));
            // Close nav when a link is clicked on mobile
            links.querySelectorAll('a').forEach(a => {
                a.addEventListener('click', () => links.classList.remove('open'));
            });
        }

        // Mark current page active in nav
        const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
        document.querySelectorAll('.nav-links a').forEach(a => {
            if ((a.getAttribute('href') || '').toLowerCase().endsWith(here)) a.classList.add('active');
        });

        // Scroll-reveal: observe all .reveal elements
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach(e => {
                    if (e.isIntersecting) {
                        e.target.classList.add('visible');
                        io.unobserve(e.target);
                    }
                });
            }, { threshold: 0.12 });
            document.querySelectorAll('.reveal').forEach(el => io.observe(el));
        } else {
            // Fallback: show everything immediately
            document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
        }
    });
})();
