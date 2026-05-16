/**
 * Thin client for the create-user Edge Function.
 * Calls it with the caller's session token; the function enforces admin-only.
 */
import { supabase } from '../supabase-client.js';

export async function createLogin({ email, password, full_name, role, teacher_id, student_id }) {
    const cfg = window.ISMS_CONFIG || {};
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) throw new Error('Not signed in.');

    const url = `${cfg.SUPABASE_URL}/functions/v1/create-user`;
    const res = await fetch(url, {
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
