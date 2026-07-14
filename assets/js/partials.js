/* Shared nav + footer injected at runtime so every page has them without duplication. */
(function () {
    'use strict';
    const NAV_HTML = `
        <header class="nav">
            <div class="container nav-inner">
                <a href="index.html" class="brand">
                    <span class="crescent">☪</span>
                    <span>Madrasa</span>
                </a>
                <button class="nav-toggle" id="nav-toggle" aria-label="Open menu">☰</button>
                <nav class="nav-links" id="nav-links">
                    <a href="index.html">Home</a>
                    <a href="about.html">About</a>
                    <a href="admissions.html">Admissions</a>
                    <a href="feedback.html">Feedback</a>
                    <a href="contact.html">Contact</a>
                    <button class="nav-theme-btn" aria-label="Toggle dark mode" title="Toggle dark mode">🌓</button>
                    <a href="login.html" class="btn btn-primary">Sign in</a>
                </nav>
            </div>
        </header>`;
    const FOOTER_HTML = `
        <footer class="footer">
            <div class="container">
                <div class="footer-cols">
                    <div>
                        <div class="brand" style="color:#fff"><span class="crescent">☪</span>&nbsp;Madrasa</div>
                        <p class="text-muted" style="color:rgba(255,255,255,.7);margin-top:8px">
                            Nurturing Quran, character, and confidence — one student at a time.
                        </p>
                    </div>
                    <div>
                        <h4>Site</h4>
                        <p><a href="index.html">Home</a><br><a href="about.html">About</a><br><a href="admissions.html">Admissions</a><br><a href="feedback.html">Feedback</a><br><a href="contact.html">Contact</a></p>
                    </div>
                    <div>
                        <h4>Portal</h4>
                        <p><a href="login.html">Sign in</a><br><a href="login.html#student">Student portal</a><br><a href="login.html#teacher">Teacher portal</a></p>
                    </div>
                    <div>
                        <h4>Contact</h4>
                        <p class="text-muted" style="color:rgba(255,255,255,.7)">
                            <span id="ft-address">123 Madrasa Street</span><br>
                            <span id="ft-phone">+44 0000 000000</span><br>
                            <span id="ft-email">hello@madrasa.example</span>
                        </p>
                    </div>
                </div>
                <div class="footer-bot">
                    <span>© <span id="ft-year"></span> <span id="ft-school">Madrasa</span>. All rights reserved.</span>
                    <span>Built with care · GDPR friendly</span>
                </div>
            </div>
        </footer>`;
    function inject() {
        const navMount    = document.getElementById('site-nav');
        const footerMount = document.getElementById('site-footer');
        if (navMount)    navMount.innerHTML    = NAV_HTML;
        if (footerMount) footerMount.innerHTML = FOOTER_HTML;
        const yr = document.getElementById('ft-year');
        if (yr) yr.textContent = new Date().getFullYear();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else { inject(); }
})();
