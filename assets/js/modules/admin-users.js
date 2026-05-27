/**
 * Thin client for the create-user Edge Function + username helpers.
 *
 * Users on this site sign in with a username (e.g. "ahmed.teacher"). Internally
 * we map that to "ahmed.teacher@<USERNAME_DOMAIN>" so Supabase Auth — which
 * insists on email-shaped identifiers — accepts it. If the admin enters a real
 * email, we use it as-is.
 */
import { supabase } from '../supabase-client.js';

const DOMAIN = () => (window.ISMS_CONFIG?.USERNAME_DOMAIN || 'madrasa.local').toLowerCase();

/** Normalise input from a login form into a Supabase-acceptable email. */
export function usernameToEmail(input) {
    if (!input) return input;
    const v = String(input).trim();
    if (v.includes('@')) return v.toLowerCase();
    return `${v.toLowerCase()}@${DOMAIN()}`;
}

/** Reverse: present an internal email back as a username if it uses our suffix. */
export function emailToDisplayName(email) {
    if (!email) return '';
    const suffix = '@' + DOMAIN();
    return email.endsWith(suffix) ? email.slice(0, -suffix.length) : email;
}

/** Validate a username before sending it: letters/digits and . _ - only. */
export function validUsername(u) {
    return typeof u === 'string' && /^[a-zA-Z0-9._-]{3,40}$/.test(u);
}

/**
 * Call the admin-only create-user Edge Function.
 * @param {object} p
 * @param {string} p.username     username OR real email
 * @param {string} p.password     min 8 chars
 * @param {string} p.full_name    display name
 * @param {'admin'|'teacher'|'student'|'parent'} p.role
 * @param {number} [p.teacher_id]
 * @param {number} [p.student_id]
 */
export async function createLogin({ username, password, full_name, role, teacher_id, student_id }) {
    const cfg = window.ISMS_CONFIG || {};
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) throw new Error('Not signed in.');

    // Validate username format if it's not an email.
    if (!username) throw new Error('Username is required.');
    if (!username.includes('@') && !validUsername(username)) {
        throw new Error('Username must be 3–40 characters: letters, digits, . _ -');
    }

    const email = usernameToEmail(username);
    const url   = `${cfg.SUPABASE_URL}/functions/v1/create-user`;
    const res   = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey':        cfg.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password, full_name, role, teacher_id, student_id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
}

/**
 * Call the admin-update-user Edge Function to change a user's password
 * or display name (auth-side). Requires the function to be deployed.
 *
 * @param {object} p
 * @param {string} p.user_id      target auth UUID
 * @param {string} [p.password]   new password (min 8 chars)
 * @param {string} [p.full_name]  new display name
 */
export async function adminUpdateUser({ user_id, password, full_name }) {
    const cfg = window.ISMS_CONFIG || {};
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) throw new Error('Not signed in.');
    const url = `${cfg.SUPABASE_URL}/functions/v1/admin-update-user`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey':        cfg.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ user_id, password, full_name }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
}
