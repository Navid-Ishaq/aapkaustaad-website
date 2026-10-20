# Student Chat: compact records, Owner controls and colour update

## Existing project: apply this upgrade

Your first migration, student records, classes, messages, administrator login and deployed password function remain in place. Do not re-run the first migration or create your administrator again.

1. Open Supabase SQL Editor → **New query**. Copy `supabase/migrations/202610200002_chat_owner.sql` in full and Run **once**. It designates the existing active administrator whose Auth email is `mnvid@hotmail.com` as the single protected Owner. If that account is missing, it aborts without applying changes. Verify this is your administrator email before running. It does not create/delete students or messages.
2. In a new PowerShell tab:

```powershell
Set-Location 'D:\DETLENG2\aapkaustaad-website'
npx supabase functions deploy chat-admin --no-verify-jwt
```

3. Keep the local preview server open. Reload `http://127.0.0.1:8080/student-chat.html` with **Ctrl+F5**. Sign in to your existing administrator account. The **Owner** badge and **Teacher Admins** section should appear.
4. Verify the new controls using test accounts before your GitHub push.

No change to `chat-password`, hosting or existing AI/inquiry backend is needed. This migration is non-idempotent; run it once. If you use CLI migrations later, reconcile the manually applied migration history before `db push`.

## Student records

Each student occupies one compact row: **Name · Email · Password · Classes · Chat access**. The table shows 25 records per page with Previous/Next controls. Mobile uses a horizontally scrollable table, keeping the page itself within the screen.

- Click the name or email to edit in a dialog. Email is obtained through the admin Edge Function from Supabase Auth; it is not added to a student-readable profile table. Students cannot retrieve other students' email addresses through this UI or endpoint.
- **Reset password** accepts a strong temporary password and confirmation. It never displays an existing password. The database `must_change_password` flag is set before the Auth password update, blocking existing sessions from class data until the account changes the temporary password using its current credentials. On a partial reset failure the account remains gated; retry the reset. Passwords are not recorded in custom tables, audit rows or browser persistence.
- **Classes** opens a checkbox list. Every tick/untick saves an individual membership immediately through the Edge Function; the count changes after success. Clicking outside/Escape closes the dropdown. Failure restores the previous check state and displays an error. No whole-list overwrite occurs, so editing one class does not erase unrelated memberships. Active classes plus any already-assigned archived classes are shown; archived classes cannot be newly assigned.
- **Chat access** checked = active, unchecked = revoked. Confirmation is required. Restore unbans the Auth account first, then enables its database profile. If unban fails, database access stays revoked. Revoking disables the profile first, then attempts an Auth ban. Same account, email, password and memberships are preserved; the student must log in again after restoration. Assignments can be prepared while access is revoked; this does not reactivate the account.
- Names and emails use safe DOM text rendering. Old messages keep their sender-name snapshot.

## Teacher Admins and Owner

Only the protected Owner can view the Teacher Admin account list, create a Teacher Admin, change another Teacher Admin's name/email/password, or revoke/restore that account. Create Teacher Admin asks for name, email and a strong temporary password. Accounts are created directly with `email_confirm: true`; no invitation/confirmation flow is invoked. Initial password change is mandatory.

Teacher Admin rights do not expire daily. Each active Teacher Admin can manage all classes and students, reset student credentials, add/remove class memberships, revoke/restore student access and post announcements/Meet links. A Teacher Admin cannot create another admin, promote a student, alter another admin or alter the Owner. Revoking a teacher disables their administrative access and login; restoring re-enables their existing role.

The existing `admin` role represents teacher/owner capabilities for class chat. The Owner identity is independently stored in a private singleton table. A service-only SQL function resolves that identity for each admin request; browser-supplied role/owner flags and user metadata are ignored. A database trigger also prevents deactivating, demoting or deleting the Owner profile through ordinary profile writes. The application exposes no owner-transfer operation. A Supabase project/database owner with direct SQL privileges remains the ultimate infrastructure administrator.

The trusted `scripts/create-chat-admin.ps1` is intended only for the initial bootstrap. Do not distribute service keys to Teacher Admins; use the new Owner interface for subsequent teacher accounts. Possessing a service key is privileged infrastructure access and must remain with the project owner/runtime.

## Visual treatment

Only `student-chat.html` loads `student-chat-theme.css`. The page uses a royal blue/teal header, blue own-message bubbles, neutral member messages, warm gold announcements and compact green access indicators. Existing course pages, navigation styling, AI assistant and enquiry form are unchanged by this upgrade.

## Verification before publishing

```powershell
node --test tests/*.test.mjs
node --test api/server.test.js
node --check student-chat.js
node --check student-chat-admin.js
```

The upgrade was locally verified with **40 Edge Function tests** (mock Auth/database), **31 PostgreSQL checks** (22 existing chat + 9 owner protection) and **7 inquiry API regression tests**. Browser tests with mock data exercised compact rows, checkbox add/remove/failure rollback, revoke/restore, email editing, temporary-password reset, teacher creation, Owner/Teacher/Student/Visitor visibility, and 1280/1024/820/390/320 px layouts. The new SQL migration and updated function have not been applied to hosted Supabase by the coding agent.

For plain local PostgreSQL tests, the owner migration needs an existing `auth.users.email` column and a matching active admin fixture. `supabase/tests/owner-security.sql` verifies service-only owner lookup and protected owner profile writes after that migration. Do not run Auth stub/fixture SQL on hosted Supabase.

After deploying, test two browsers: Owner creates a Teacher Admin; teacher logs in and changes initial password; teacher can manage a test student but cannot create/manage admins. Owner revokes/restores that teacher. Restore your revoked test student using its access checkbox. Verify changed student email, temporary password gating, membership counts and persistent message history. Keep real passwords/keys out of screenshots.

Admin email/password updates use [Supabase's server-side Admin API](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid). These changes are direct; optional Supabase security-notification emails, if separately enabled in your project, are governed by those Auth notification settings.
