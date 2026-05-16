// Supabase Edge Function: create-user
// Allows an admin to create an auth user (email + password) and link it to a
// teacher or student row in one server-side call. Uses the service-role key
// which never leaves Supabase.
//
// Deploy:
//   Supabase dashboard -> Edge Functions -> New function -> name: create-user
//   -> paste this file -> Deploy. JWT verification: leave ON (default).
//
// Call from the browser with the user's session token in the Authorization
// header. The function verifies the caller's profiles.role = 'admin' before
// touching anything sensitive.

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

    // 1) Identify the caller via their JWT.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user }, error: uerr } = await userClient.auth.getUser();
    if (uerr || !user) return reply(401, { error: "Invalid session" });

    // 2) Check the caller is admin.
    const { data: caller } = await userClient
      .from("profiles").select("role").eq("id", user.id).single();
    if (caller?.role !== "admin") {
      return reply(403, { error: "Forbidden — admin role required" });
    }

    // 3) Validate request body.
    const body = await req.json();
    const { email, password, full_name, role, teacher_id, student_id } = body;
    if (!email || !password || !role) {
      return reply(400, { error: "email, password and role are required" });
    }
    if (!["admin", "teacher", "student", "parent"].includes(role)) {
      return reply(400, { error: "role must be admin | teacher | student | parent" });
    }
    if (String(password).length < 8) {
      return reply(400, { error: "password must be at least 8 characters" });
    }

    // 4) Use service-role to create the auth user (auto-confirmed).
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: created, error: cerr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email.split("@")[0], role },
    });
    if (cerr || !created?.user) return reply(400, { error: cerr?.message || "Create user failed" });

    const newId = created.user.id;

    // 5) Upsert the profile row with the chosen role + linked entity ids.
    //    (The DB trigger creates a default profile; we overwrite with what admin chose.)
    await admin.from("profiles").upsert({
      id:         newId,
      role,
      full_name:  full_name || email.split("@")[0],
      teacher_id: teacher_id ? Number(teacher_id) : null,
      student_id: student_id ? Number(student_id) : null,
    });

    // 6) Wire user_id back onto the teacher / student row.
    if (teacher_id) {
      await admin.from("teachers").update({ user_id: newId }).eq("id", Number(teacher_id));
    }
    if (student_id) {
      await admin.from("students").update({ user_id: newId }).eq("id", Number(student_id));
    }

    // 7) Audit (best effort).
    await admin.from("audit_logs").insert({
      actor_id:    user.id,
      action:      "user.create",
      object_type: "auth_user",
      meta:        { email, role, teacher_id, student_id },
    });

    return reply(200, { id: newId, email, role });
  } catch (e) {
    return reply(500, { error: String(e?.message || e) });
  }
});

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
