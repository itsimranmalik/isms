/**
 * Supabase client + thin wrappers used everywhere else.
 * Uses the official ESM bundle from jsdelivr — no build step needed.
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const cfg = window.ISMS_CONFIG || {};
if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.startsWith('YOUR_')) {
    console.warn('[ISMS] config.js needs your Supabase URL + anon key before login will work.');
}

export const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Return the current logged-in user or null. */
export async function currentUser() {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
}

/** Return the current user's profile row from public.profiles (includes role). */
export async function currentProfile() {
    const u = await currentUser();
    if (!u) return null;
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single();
    if (error) { console.warn('profile fetch', error); return null; }
    return data;
}

/** Sign in with email + password. */
export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

/** Sign up (creates auth user). The DB trigger creates the profile row. */
export async function signUp({ email, password, full_name, role = 'student' }) {
    const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name, role } },
    });
    if (error) throw error;
    return data;
}

/** Sign out and redirect. */
export async function signOut(redirect = 'login.html') {
    await supabase.auth.signOut();
    location.href = redirect;
}

/** Guard: redirect to login if no session. Returns the profile if logged in. */
export async function requireLogin(loginUrl = 'login.html') {
    const profile = await currentProfile();
    if (!profile) { location.href = loginUrl; return null; }
    return profile;
}

/** Append an audit log row. */
export async function audit(action, object_type, object_id = null, meta = null) {
    try {
        const u = await currentUser();
        await supabase.from('audit_logs').insert({
            actor_id: u?.id || null,
            action, object_type, object_id, meta,
            user_agent: navigator.userAgent.slice(0, 240),
        });
    } catch (e) { /* swallow; audit must never break flow */ }
}
