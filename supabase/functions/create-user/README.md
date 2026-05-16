# Deploying the create-user Edge Function

This function lets admins (and only admins) create auth users (email + password)
and link them to a `teachers` or `students` row in a single server-side call.

The browser cannot create auth users with a password directly because that
requires the **service-role key**, which must never be exposed publicly. This
function lives on Supabase's servers and uses the service-role key safely.

## One-time deploy (3 minutes, no CLI needed)

1. Open: <https://supabase.com/dashboard/project/uebocirpdmumscifnnhd/functions>
2. Click **Deploy a new function** (or **+ New function** depending on UI version).
3. Function name: `create-user`
4. Verify JWT: **leave ON** (default). The function itself does a second admin-role check.
5. Replace the placeholder code with the contents of `index.ts` in this folder.
6. Click **Deploy function** (top right).
7. Wait ~20 seconds for the build to finish. You'll see a green "Active" badge.

## How the function gets its service-role key

Supabase Edge Functions automatically inject these env vars at runtime — you do
NOT have to set them manually:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

If you've customized the project (rotated keys, custom domains), check
**Project Settings → Edge Functions → Secrets** to confirm they're present.

## Quick sanity check after deploy

In the Edge Functions dashboard, click `create-user` → **Logs**. With no calls
yet, the log will be empty — that's expected. Then go to your live site:

1. Sign in as admin.
2. Open **Teachers → + Add teacher**.
3. Fill the form including a Login email + 8+ char password.
4. Click Save. You should see "Teacher saved and login created."
5. Back in the function's Logs tab, you'll see one POST 200 entry.

If a call returns 401: your admin session has expired — sign out and back in.
If a call returns 403: your `profiles.role` isn't `admin` — fix in Table Editor.
If a call returns 400: usually means email already exists or password < 8 chars.
