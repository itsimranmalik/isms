# Deploy your Madrasa website

This is the full step-by-step. Total cost: **£0** until you buy a domain (~£9/yr).
Time required: about 30 minutes.

You will use two free services:

1. **Supabase** — runs your database, login system, and security rules.
2. **Cloudflare Pages** — serves your website files to the world.

Both have generous free tiers. You don't need a credit card for either.

---

## Step 1 — Create a free Supabase project (10 min)

1. Open <https://supabase.com> and click **Start your project** → sign in with GitHub.
2. Click **New project**.
3. Fill in:
   - **Name:** `madrasa` (or whatever you like)
   - **Database password:** click *Generate*, then **copy it somewhere safe** (you'll rarely need it but you can't recover it).
   - **Region:** pick the one closest to you (London / Frankfurt / Mumbai etc.)
4. Click **Create new project**. Provisioning takes ~2 minutes.

When ready, on the left sidebar click the **SQL Editor** icon (looks like `</>`).

### Run the three SQL files in order

In your project files there's a `supabase/` folder with three files. Open each, copy the contents, paste into a *new query* in the Supabase SQL Editor, and click **RUN**:

1. `supabase/01_schema.sql` — creates 18 tables
2. `supabase/02_rls.sql`    — sets up row-level security
3. `supabase/03_seed.sql`   — adds Quran surahs and dua reference data

Each query takes a few seconds. If you see "Success. No rows returned." you're good. (Some create-statements may report no rows — that's expected.)

### Copy your project credentials

In the Supabase sidebar click **Project Settings (gear icon) → API**.

Copy two values:

- **Project URL** — looks like `https://abcd1234.supabase.co`
- **anon public** key (under "Project API keys") — long string starting with `eyJ…`

Open `assets/js/config.js` in the project and replace the placeholders:

```js
window.ISMS_CONFIG = {
    SUPABASE_URL:      'https://abcd1234.supabase.co',
    SUPABASE_ANON_KEY: 'eyJ...your-anon-key...',
    SCHOOL_NAME:       'My Madrasa',
};
```

> The anon key is **safe to commit and ship publicly**. The security rules from `02_rls.sql` enforce who can read/write what, server-side. The dangerous one is the *service_role* key — never use that in the browser.

### Create your first admin account

Still in Supabase, sidebar → **Authentication → Users → Add user → "Create new user"**.

- **Email:** yours
- **Password:** any 8+ chars
- **Auto Confirm User:** ✅ tick it (so you don't need to verify the email)

Click **Create user**. The signup trigger automatically gives this user a `student` role by default.

Promote yourself to admin: sidebar → **Table Editor → profiles** → find your row → change `role` from `student` to `admin` → save.

---

## Step 2 — Deploy the site to Cloudflare Pages (10 min)

You can deploy two ways. Pick whichever sounds easier.

### Option A — Direct upload (no GitHub needed)

1. Open <https://dash.cloudflare.com> and sign up (free, no card).
2. Sidebar → **Workers & Pages → Create application → Pages → Upload assets**.
3. Project name: `madrasa-site`.
4. Drag your **whole ISMS folder** into the upload box. Cloudflare will accept everything except the `supabase/` folder (or include it, doesn't matter — only the HTML/CSS/JS at the root is served).
5. Click **Deploy site**.
6. After ~30 seconds you'll get a URL like `madrasa-site.pages.dev`. Open it.

### Option B — Connect to GitHub (auto-redeploys on every push)

1. Make sure your code is pushed to GitHub (you've already done this).
2. Cloudflare dashboard → **Workers & Pages → Create application → Pages → Connect to Git**.
3. Authorize Cloudflare to access your GitHub account.
4. Pick your `isms` repo, branch `main`.
5. **Build settings:** leave **Framework preset** as *None*, **Build command** *empty*, **Build output directory** `/`.
6. Click **Save and deploy**.

From now on every `git push` to `main` triggers an automatic redeploy.

### Test it

Visit your Cloudflare URL, click **Sign in**, enter the admin credentials you made in Supabase. You should land on the dashboard.

If sign-in fails with a CORS error, go to Supabase → **Project Settings → API → URL Configuration → Site URL** and add your `*.pages.dev` URL.

---

## Step 3 — Add a custom domain (when you have one)

You don't need this for the site to work, but it makes you look like a real school.

1. Buy a domain from <https://www.namecheap.com> (~£9/yr for `.com`, `.org`, or `.school`). Cloudflare itself also sells domains at-cost — even cheaper.
2. In Cloudflare Pages → your project → **Custom domains → Set up a custom domain**.
3. Enter `yourschool.com` (or `www.yourschool.com`).
4. Cloudflare gives you DNS records to add at your registrar (or, if you bought the domain through Cloudflare, it's automatic).
5. SSL certificate gets issued automatically (no action needed, takes ~1 minute).
6. Back in Supabase → **Project Settings → API → URL Configuration** → add your new domain to **Site URL** and **Redirect URLs**.

---

## Step 4 — Day-to-day admin

### Create teachers and students

1. **Authentication → Users → Add user** in Supabase (or use the *Create account* form on the login page).
2. Sign in as admin on your site → **Teachers → + Add teacher** (or **Students → + Add student**).
3. To link a WP auth user to a teacher/student profile, paste the user's UUID into the *Linked WP user* field. Find the UUID in Supabase's Authentication → Users page.

### Grade a Quran recitation

Sign in as a teacher or admin → **Quran Grading** → pick student, set the 0-5 buttons across all five categories, save. The system instantly:

- calculates the average
- assigns a grade band (Very Weak → Excellent)
- flags weakest categories
- generates teacher recommendations

### Download a report card

**Reports → Student progress report (PDF) → Download PDF**. Works in any browser, no server-side rendering.

---

## Costs

| Service           | Free tier limits                          | Sufficient for         |
|-------------------|-------------------------------------------|------------------------|
| Supabase          | 500 MB DB, 50 k monthly active users, 1 GB file storage, 2 GB egress | Schools of up to ~500 students |
| Cloudflare Pages  | Unlimited bandwidth, 500 builds / month, custom domain free | Any traffic level |
| Domain (optional) | ~£9–£15 / year                            | One name forever       |

**Total: £0/month, plus £9/yr if/when you want a custom domain.**

---

## Troubleshooting

**"Invalid login credentials"** — your Supabase user wasn't created, or the email isn't confirmed. Edit the user in Supabase → tick *Email confirmed*.

**"row-level security policy violation"** — the logged-in user doesn't have permission for that action. Check their `role` in the `profiles` table.

**Blank page after deploy** — open browser DevTools (F12) → Console. If you see "config.js needs your Supabase URL", you forgot Step 1. If you see an import error, the file path is case-sensitive on Cloudflare — make sure your folder structure exactly matches the repo.

**PDF doesn't open** — popup blocker may be active. Allow popups for your site.

**Forgot admin password** — Supabase → Authentication → Users → ⋯ → *Send password recovery*.

---

## Backups

Supabase backs up your project automatically every day on the free tier (7-day retention). For belt-and-braces, you can also download a `.sql` dump from **Project Settings → Database → Backups → Download**.

---

## What's next

If you outgrow the free tier (more than ~500 active students), Supabase Pro is **$25/month** and supports tens of thousands of users — still cheaper than any WordPress hosting plan with managed backups.
