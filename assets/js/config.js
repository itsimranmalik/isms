/**
 * Supabase connection details + site-wide config.
 *
 * The anon key below is safe to commit — Row Level Security is enforced
 * server-side via the policies in supabase/02_rls.sql.
 *
 * USERNAME_DOMAIN: usernames the admin assigns (e.g. "ahmed.teacher") are
 * stored internally as "ahmed.teacher@<USERNAME_DOMAIN>" so Supabase Auth
 * (which expects an email) is happy. Users only ever see the username.
 */
window.ISMS_CONFIG = {
    SUPABASE_URL:      'https://uebocirpdmumscifnnhd.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlYm9jaXJwZG11bXNjaWZubmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODYxMjgsImV4cCI6MjA5NDM2MjEyOH0.d4-3RjIAgwvIVRZNwJRtlr3cFupT1WqpSyd5MslXQss',
    SCHOOL_NAME:       'My Madrasa',
    USERNAME_DOMAIN:   'madrasa.local',   // internal-only suffix for username logins
};
