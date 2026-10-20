# Account deletion and class history cleanup

## Apply to the existing project

This update is in `D:\DETLENG2\aapkaustaad-website`. Existing students, teachers, messages, Owner role and classes remain intact when the migration is applied. No account is deleted by installing this update.

1. In Supabase SQL Editor → **New query**, paste the complete `supabase/migrations/202610200003_chat_deletion_cleanup.sql` and Run **once**. The first two migrations must already be applied. Do not rerun the first/Owner migrations. This migration changes relationships and installs protected cleanup functions; it contains no bulk deletion of existing data.
2. Deploy the updated administrative function from the correct folder/project:

```powershell
Set-Location 'D:\DETLENG2\aapkaustaad-website'
npx.cmd supabase functions deploy chat-admin --project-ref wxgtrydzkrlimmlnvhdk --no-verify-jwt
```

3. Refresh local preview with Ctrl+F5. Verify the new controls using a **disposable** student/teacher account and a test class. Do not delete real records simply to test installation. No teacher is created automatically.
4. Your Git checkout already exists at `D:\DETLENG2\aapkaustaad-website-publish`; **do not clone it again**. Copy reviewed changes there and push yourself:

```powershell
robocopy 'D:\DETLENG2\aapkaustaad-website' 'D:\DETLENG2\aapkaustaad-website-publish' /E /XD .git node_modules .temp .branches /XF .env .env.* *.log
if ($LASTEXITCODE -ge 8) { throw 'Copy failed. Stop here.' }
Set-Location 'D:\DETLENG2\aapkaustaad-website-publish'
git status --short
git diff --stat
git diff
# After review:
git add .
git commit -m "Add confirmed account deletion and owner-only class history cleanup"
if ($LASTEXITCODE -ne 0) { throw 'Commit failed. Stop here.' }
git push origin main
```

Keep the local HTTP server in its own terminal tab. After GitHub Pages updates, refresh `https://aapkaustaad.com/student-chat.html` and verify the live controls. This update does not change hosting or the existing inquiry API/AI chatbot.

## Actions → Delete account

Each student row has an **Actions** dropdown with **Delete account…**. Teacher Admins have the same dropdown in the Owner-only teacher list. Selecting it opens a confirmation dialog showing the account name/email, what will be removed and what remains. The operator must type **DELETE**, then press **Delete permanently**. Cancel/Escape leaves records unchanged. A failure stays in the dialog and does not claim success.

- Active Teacher Admins can delete student accounts, matching their student-management permissions.
- Only the Owner can delete a Teacher Admin. Teachers cannot delete themselves or other admins through this action.
- The Owner row has no delete option; the server and database also protect the Owner.
- Account deletion removes the Supabase Auth identity, application profile and class memberships. The function revokes the database profile first to stop existing sessions. If Auth deletion fails, the profile remains revoked for a safe retry; the UI reports the failure.
- The account email is checked against Auth again before deletion. A stale row with a changed email is rejected and must be reloaded.
- Existing messages are preserved with an empty author ID and **Former student** / **Former teacher** as the sender label. Message body content is preserved; this does not scrub names that were typed inside messages.
- Historical admin audit rows remain, with the departed actor ID set to null. No deleted account password/email is kept in audit data.
- This is permanent account removal, not the reversible Chat/Admin access checkbox. Recreating the same email later creates a new identity and does not restore old memberships or reconnect anonymized messages.

## Owner → Class history cleanup

Under **Teacher Admins**, expand **Class history cleanup**. Choose one class and **Delete messages before** date, then press **Preview deletion**. The preview contains the class name, cutoff and exact message count. Type **DELETE** and confirm to perform the cleanup. A zero count produces a notice with no deletion. No automatic retention schedule is enabled.

- Dates mean **00:00 in Europe/Madrid**, including daylight-saving changes. Selecting 1 October keeps all messages from 1 October onward and deletes only messages strictly before that local midnight. Today or earlier dates are allowed; future cutoffs are rejected on the server.
- Only the selected class is affected, including its old announcements. Other classes, accounts and memberships are untouched. Archived classes may be cleaned by the Owner too.
- Newer replies to a deleted original stay intact and display **Original message deleted**. Class IDs on those replies are preserved.
- The database rechecks the Owner and locks the class during execution. Count/revision must still match the preview; otherwise the request fails and the Owner must preview again. Cleanup and its audit entry commit in one database transaction.
- Active chat pages check a history revision every 15 seconds and reload their accessible history after cleanup/anonymization. Retained history remains paginated in batches of 50. Previously viewed screenshots or copied text cannot be withdrawn.
- Only service-role Edge Functions can invoke the SQL cleanup functions. Browser roles have no table-delete or cleanup-RPC permission. Client-supplied owner/actor flags are ignored.

## Verification

Passed locally: **54 Edge Function tests**, **50 PostgreSQL checks** (22 chat + 9 Owner + 19 deletion/cleanup), **7 existing inquiry API tests**, JavaScript syntax checks, and browser checks at 1280/1024/820/390/320 px. The browser suite used mock accounts to check Actions dropdowns, cancel/error behavior, successful student/teacher deletion, protected Owner, cutoff preview, typed confirmation and existing account/class controls. PostgreSQL tests exercised real foreign keys, Auth deletion cascades with minimal Auth stubs, former-member labels, retained audit rows, Madrid cutoff boundaries, stale preview rejection, surviving replies and other-class isolation.

```powershell
node --test tests/*.test.mjs
node --test api/server.test.js
node --check student-chat.js
node --check student-chat-admin.js
```

Run SQL test files only against a disposable local/test database. Hosted Supabase migration/function deployment and real Auth deletions were not performed by the coding agent. No production student, teacher or message was deleted during development. Complete the hosted smoke test yourself with a disposable account/class after installation.

Official API: [Supabase Admin deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser).
