# Private Student Chat deployment

**Latest feature update:** see [STUDENT-CHAT-DELETION.md](STUDENT-CHAT-DELETION.md) for confirmed student/teacher deletion, Owner-only date-based history cleanup and the third migration. Apply upgrades in numeric order; never rerun already-applied migrations.

**Current upgrade:** after the initial administrator bootstrap, apply the Owner migration and deploy the updated `chat-admin` function as described in [STUDENT-CHAT-UPGRADE.md](STUDENT-CHAT-UPGRADE.md). The compact account table, teacher creation and access restoration require that upgrade. For a fresh installation, bootstrap the initial admin with `mnvid@hotmail.com` before applying that migration; do not try to use the management UI until the upgrade is complete.

The website stays on its existing host. The inquiry API and Hola AI chatbot are unchanged. No new Render service is needed. Supabase hosts authentication, chat history, Realtime and the two Edge Functions.

## 1. Configure hosted Auth BEFORE publishing the chat

In the **aapkaustaad-student-chat** project (`wxgtrydzkrlimmlnvhdk`):

- Authentication → Sign In / Providers (or general Auth configuration): turn **Allow new users to sign up OFF**. Disable **anonymous sign-ins** and unused providers. Keep email/password login enabled. Do not disable login itself.
- Email password policy: minimum **12**, require uppercase, lowercase, digits and symbols. Enable leaked-password protection if available for your plan.
- Keep email confirmations enabled. Our server's `createUser({ email_confirm: true })` explicitly confirms administrator-created accounts; it does not send invitations or confirmation mail. Do not use Invite User.
- Set Site URL to `https://aapkaustaad.com`; allow `https://www.aapkaustaad.com/student-chat.html` if using www.
- Verify hosted settings in the Dashboard: deploying functions/migrations does **not** automatically apply the Auth settings in `supabase/config.toml`.

## 2. Apply database migration

Open SQL Editor → New query. Paste the complete contents of `supabase/migrations/202610200001_student_chat.sql` and Run **once**. It creates only the `chat_*` tables, private authorization helpers, message RPC, RLS policies and Realtime publication entry. There are no anonymous table grants or browser write grants.

Alternatively, with the Supabase CLI authenticated:

```powershell
Set-Location 'D:\DETLENG2\aapkaustaad-website'
npx supabase login
npx supabase link --project-ref wxgtrydzkrlimmlnvhdk
npx supabase db push
```

Use either SQL Editor OR CLI migrations for the initial apply. If applied manually, repair CLI migration history before a later `db push`; do not run this non-idempotent migration twice. Never run `supabase/tests/local-auth-stub.sql` on hosted Supabase.

## 3. Deploy secure functions

```powershell
Set-Location 'D:\DETLENG2\aapkaustaad-website'
npx supabase login
npx supabase link --project-ref wxgtrydzkrlimmlnvhdk
npx supabase secrets set CHAT_ALLOWED_ORIGINS=https://aapkaustaad.com,https://www.aapkaustaad.com
npx supabase functions deploy chat-admin --no-verify-jwt
npx supabase functions deploy chat-password --no-verify-jwt
```

`verify_jwt=false` supports current signing keys; it does **not** permit anonymous operations. Both handlers independently verify bearer tokens using `auth.getUser(token)`, reject anonymous Auth users and require an active provisioned database profile. Administrative actions also require the database admin role and a completed initial password change. The functions use Supabase's built-in `SUPABASE_SERVICE_ROLE_KEY` only inside the function runtime; do not put it in website code. Built-in `SUPABASE_URL` and `SUPABASE_ANON_KEY` are used there too.

For local HTTP testing, add your exact localhost origin to `CHAT_ALLOWED_ORIGINS` temporarily. Do not add wildcard origins. CORS is supplementary; server authorization is always required.

## 4. Bootstrap the first administrator

From your own PowerShell terminal, run:

```powershell
Set-Location 'D:\DETLENG2\aapkaustaad-website'
powershell -NoProfile -File .\scripts\create-chat-admin.ps1
```

The script privately prompts for your initial password and the **legacy service_role key**, creates a confirmed Auth user and an admin database profile. No credentials are stored in files or printed. Copy that privileged key only into this local hidden prompt; never paste it into chat, commit it, or use it in a browser. This is a one-time trusted administrative setup script, not website JavaScript. Close the terminal after use. Use the same script again only if you intentionally need another administrator. Students cannot become administrators through the application.

Log in on `student-chat.html`, change your initial password, create classes, then create students and assign classes. Give each student their email and initial password privately. Each new student must change that password before reading or sending class messages. Existing student memberships can be added/removed from the admin section. Revoke all access disables the database profile immediately and also attempts an Auth ban; a ban failure does not restore database access. Account reactivation and lost-password recovery currently require the trusted project owner; no public email reset flow is added.

## 5. Publish on the existing website host

`student-chat-config.js` contains only the public URL and publishable key provided by the owner. Confirm both before publishing. No changes to existing hosting, DNS, Render inquiry API, or AI chatbot configuration are required.

This supplied folder initially had no `.git` directory. To preserve the GitHub history, **clone the existing repository into a separate sibling directory**, then copy the reviewed website files into that checkout. Do not force-push or replace history:

```powershell
Set-Location 'D:\DETLENG2'
git clone https://github.com/Navid-Ishaq/aapkaustaad-website.git aapkaustaad-website-publish
robocopy 'D:\DETLENG2\aapkaustaad-website' 'D:\DETLENG2\aapkaustaad-website-publish' /E /XD .git node_modules .temp .branches /XF .env .env.* *.log
# Robocopy exit codes 0–7 are successful/nonfatal; 8+ means copy failure.
Set-Location 'D:\DETLENG2\aapkaustaad-website-publish'
git status --short
git diff --stat
git diff
# After reviewing:
git add .
git commit -m "Add private multi-class Student Chat with Supabase"
git push origin main
```

The clone destination must not already exist. Review all copied files before committing. The push can trigger the existing website deployment; finish Supabase setup first.

## 6. Verification

Node 24+:

```powershell
node --test tests/edge-security.test.mjs
node --test api/server.test.js
node --check student-chat.js
```

`supabase/tests/chat-security.sql` exercises RLS, anonymous denial, class isolation, privilege escalation, direct forged inserts, cross-class replies, rate limiting, initial password gating, revocation with an existing token, announcements and archived classes. Run against a **disposable local/test database** after the migration. For plain PostgreSQL only, run `local-auth-stub.sql` before the migration; it creates minimal Supabase Auth roles and UID behavior. It is not an emulator for hosted Auth or Realtime. Fixtures roll back; sequence increments do not. Use a fresh database per test run.

Edge tests use mock Auth/database clients. They verify handler authorization and validation, not actual hosted network behavior. Before admitting students, verify on hosted Supabase with an admin and two test students in different classes:

1. Visitor sees only login and the blue Contact page link. Sign-up and anonymous sign-in requests are rejected by hosted Auth.
2. Admin creates a student directly; no invitation or confirmation email is generated. Initial password change succeeds and wrong current/weak/new-equals-old passwords fail.
3. Two separate browser sessions in one class receive live messages; another class receives none. Refresh preserves history. Load older messages works after 50 messages. Reconnect fills missed messages.
4. A copied other-class UUID in direct REST/RPC requests cannot read/send. Student cannot announce, self-enrol, change role or invoke admin operations.
5. Student removal/revocation blocks new REST reads and sends immediately. With the old Realtime subscription still open, new messages must not arrive. The UI rechecks access every 15 seconds and clears inaccessible content; previously read text cannot be made unread or removed from screenshots.
6. Teacher announcements and HTTPS Google Meet links open safely in a separate tab. HTML and javascript: text do not execute. No attachment/media controls or Storage buckets exist.
7. Test desktop and mobile navigation, existing Hola chatbot and inquiry form on the deployed host.

### Scope and operations

- Admins act as teachers and can read/post to all active classes. Students may belong to multiple classes.
- One class feed contains messages and replies; names are displayed, other students' emails are not exposed. Sender names are a snapshot at posting time.
- History is paginated, 50 messages per page. Sending is limited to one message every two seconds per account, enforced in PostgreSQL with a row lock.
- Text is rendered with DOM text nodes; only HTTPS links become clickable. No HTML rendering, images, audio/video or file uploads.
- Supabase sessions use `sessionStorage` (per browser tab). Log out on shared computers. Message text is not separately cached in localStorage.
- Administrative actions write a server-only audit trail without passwords. Review `chat_admin_audit` in Dashboard SQL; no browser grants exist.
- Keep database backups and retention policies appropriate for student records. Archive a class to stop chat while preserving its history; reopen restores it. Revocation is deliberately not destructive.
- This change adds no dependency on the inquiry API and does not replace the AI chatbot. The new private chat page intentionally does not embed the general AI assistant over private class conversations; existing pages retain it.

Official references: [Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes), [Edge Function authentication](https://supabase.com/docs/guides/functions/auth).
