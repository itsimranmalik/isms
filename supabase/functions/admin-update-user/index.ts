// Supabase Edge Function: admin-update-user
// Lets an admin reset another user's password (or change other auth-side
// attributes in future). Uses the service-role key — never exposed in browser.
//
// Deploy: Supabase dashboard -> Edge Functions -> New function ->
//         name: admin-update-user -> paste this code -> Deploy.
//         (Verify JWT: ON. The function itself does a second admin check.)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth) return reply(401, { error: "Missing Authorization header" });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user }, error: uerr } = await userClient.auth.getUser();
    if (uerr || !user) return reply(401, { error: "Invalid session" });

    const { data: caller } = await userClient
      .from("profiles").select("role").eq("id", user.id).single();
    if (caller?.role !== "admin") {
      return reply(403, { error: "Forbidden — admin role required" });
    }

    const { user_id, password, full_name } = await req.json();
    if (!user_id) return reply(400, { error: "user_id required" });

    const updates: Record<string, unknown> = {};
    if (password) {
      if (String(password).length < 8) {
        return reply(400, { error: "password must be at least 8 characters" });
      }
      updates.password = password;
    }
    if (full_name) updates.user_metadata = { full_name };

    if (Object.keys(updates).length === 0) {
      return reply(400, { error: "Nothing to update — supply password and/or full_name" });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: updated, error: uerr2 } = await admin.auth.admin.updateUserById(user_id, updates);
    if (uerr2) return reply(400, { error: uerr2.message });

    // Mirror full_name onto the profiles row too if provided
    if (full_name) {
      await admin.from("profiles").update({ full_name }).eq("id", user_id);
    }

    // Audit
    await admin.from("audit_logs").insert({
      actor_id:    user.id,
      action:      password ? "user.password_reset" : "user.update",
      object_type: "auth_user",
      object_id:   null,
      meta:        { target_user_id: user_id, full_name_set: !!full_name, password_reset: !!password },
    });

    return reply(200, { id: user_id, updated: true });
  } catch (e) {
    return reply(500, { error: String((e as Error)?.message || e) });
  }
});

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
