# Compact class management and Owner-only class deletion

Updated source: `D:\DETLENG2\aapkaustaad-website`.

Class management now uses a full-width table with one row per class: Class name, Admin/Teacher Voice, Student Voice, Image Upload, Actions. The create-student form follows below. Small screens scroll inside the table. Actions contains Rename and Archive/Reopen for all active admins; Delete class is available only to the Owner.

## Installation

1. Run `supabase/migrations/202610200005_class_management.sql` once in Supabase SQL Editor. All four earlier migrations must already be applied. Installation does not delete any existing data.
2. Deploy the updated function:

```powershell
Set-Location 'D:\DETLENG2\aapkaustaad-website'
npx.cmd supabase functions deploy chat-admin --project-ref wxgtrydzkrlimmlnvhdk --no-verify-jwt
```

No chat-media or chat-password redeployment is needed for this update.

3. Copy and review frontend changes in your existing publish checkout:

```powershell
robocopy 'D:\DETLENG2\aapkaustaad-website' 'D:\DETLENG2\aapkaustaad-website-publish' /E /XD .git node_modules .temp .branches /XF .env .env.* *.log
if ($LASTEXITCODE -ge 8) { throw 'Copy failed. Stop here.' }
Set-Location 'D:\DETLENG2\aapkaustaad-website-publish'
git status --short
git diff --stat
git diff
# After review:
git add .
git commit -m "Add compact class table and owner-only class deletion"
if ($LASTEXITCODE -ne 0) { throw 'Commit failed. Stop here.' }
git push origin main
```

Refresh the live page with Ctrl+F5 after hosting updates.

## Behavior

Archive keeps the class and its history; Reopen restores the active class. Delete class opens a confirmation dialog with the class name, message count and membership count. Type DELETE and press Delete permanently. Cancel leaves all records unchanged.

Class deletion permanently removes that class, its memberships and all its messages/replies. Student/teacher accounts and all other classes remain. Message media is queued for physical deletion; private access through message references stops when messages are removed. Large queues may require the Owner's Clean unused media files button under history cleanup.

The backend ignores client-supplied ownership claims. Only the authenticated Owner can preview or execute deletion. A service-only SQL function rechecks the Owner, locks the class, checks its name/message count/membership count/history revision against the preview, deletes in a single transaction and writes an audit entry. Changed previews are rejected and must be reopened. Browser roles cannot call the deletion RPCs or directly delete classes.

## Validation

80 Node security/handler tests passed, including teacher rejection, missing confirmation and authenticated Owner identity checks. 14 new real PostgreSQL checks passed: Owner preview, teacher/browser rejection, stale name/count/membership rejection, message/reply deletion, media queue, student account preservation, other-class preservation and audit. Existing database suite was previously passing with the media migration.

Browser checks passed for class toggle, rename, archive/reopen, delete cancellation and confirmation, Owner-only delete option, retained student rows and layout at 1280/820/390/320 px. Existing student/admin and media browser regressions also passed. Browser backend responses are mocked; perform a hosted smoke test with a disposable class after installation. No real production class/account/history was deleted, and no deployment/push was performed by the coding agent.
