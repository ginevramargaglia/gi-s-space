# Activate your private app on Netlify and Supabase

Code alone does not configure your accounts. Follow these steps once.

1. In Supabase **SQL Editor**, run `supabase/schema.sql` from this repository. This creates private user-owned storage, conflict-safe saves, and an AI rate limit (20 requests per account per hour). Do not disable row-level security. Use a dedicated project for this app.
2. In Supabase **Authentication → Users**, create your own user with your email and a strong password (confirm the email through the dashboard if required). The app uses password login; registration and password-reset screens are not included. Manage password recovery through Supabase until a recovery flow is added. Disable public signup if only you will use it.
3. In Netlify, link the GitHub repository `ginevramargaglia/gi-s-space`, branch `main`, publish directory `public`, functions directory `netlify/functions`. The committed `netlify.toml` supplies these settings. No build command is needed.
4. Add these in **Netlify → Site configuration → Environment variables** (runtime/function scope):
   - `SUPABASE_URL`: your HTTPS Supabase project URL.
   - `SUPABASE_ANON_KEY`: the project's legacy anon API key (not service-role). The server uses this plus your logged-in user's token so row-level security remains active.
   - `ASSISTANT_API_KEY`: your AI provider key, entered securely in Netlify, never in GitHub or chat.
   - Optional `ASSISTANT_MODEL`: defaults to `gpt-4.1-mini`.
5. Redeploy. Open your HTTPS Netlify link and sign in. Add a task and wait for **Saved to your account**. Open the same app on another device, sign in, and confirm that task is present. Check meals and runs too. Reload to fetch another device's newest changes.
6. Ask the assistant a question. Tick **Include my saved information** only when you want recent records sent to the AI provider. Test a question about the task you saved. AI can advise and draft but cannot mutate records, set reminders, or contact others. Every question is independent; persistent conversation history is not implemented.

## Privacy, sync and backup

Auth tokens are in Secure HttpOnly SameSite cookies, not frontend code. Each Supabase row belongs to the authenticated user; no service-role key is required. All task/workout/grocery/expense/plan lists, meal preferences and running settings/logs save together to that user's cloud record. Local browser storage is still used as a working cache; signing out clears it. For a new account with existing browser lists, the app asks before importing them.

This version reads cloud state at login/reload, then saves on edits. It is not realtime. Stale-device edits return a conflict instead of overwriting newer information. Export those edits before reloading. Offline edits are not automatically reconciled: failed saves show a warning and keep edits available for backup. Never assume a save completed without its status. Account storage persists independently of the browser; database recovery/backups depend on your Supabase plan. Export backups regularly. Set provider spending limits, especially for AI.

The login gate is enforced by API authentication, not just hidden HTML. The frontend code is public; personal records are not stored in GitHub. Netlify-hosted HTTPS is required for secure cookies. Do not place secrets in `public/`. Tests use simulated authentication/storage/AI and do not establish live account readiness. After configuration, verify cross-device saving and live AI as described above.
