# Optional password change and eight-character minimum

Implemented 28 October 2026 in D:\DETLENG2\aapkaustaad-website. No push, deployment, live account creation or existing password reset was performed.

## Behavior

- New student accounts, Teacher Admin accounts, admin password resets and self-service password changes accept 8–128 characters, including uppercase, lowercase, a number and a symbol.
- New accounts and successful resets set must_change_password=false. Failed Auth resets do not alter the profile flag.
- Logging in does not force the password form. The message is: “You can change your password anytime from your account.” The Change password button remains available.
- Self-service password changes still verify the current password. Role, membership, revoked-account, Owner protection and media permissions remain in force.
- A new migration clears the legacy forced-change flag and changes its default to false. It does not change any actual Auth password, email, group membership, role or active status. Existing backend guards remain as defense in depth; the normal application no longer sets the gate.

## Installation

1. Supabase Email provider minimum length should be 8 (the owner has saved this setting).
2. Run the complete contents of supabase/migrations/202610280001_optional_password_change.sql in this project's Supabase SQL Editor. This is needed for existing accounts that still have the legacy flag.
3. Redeploy BOTH updated functions:

```powershell
Set-Location 'D:\DETLENG2\aapkaustaad-website'
npx.cmd supabase functions deploy chat-admin --project-ref wxgtrydzkrlimmlnvhdk --no-verify-jwt
npx.cmd supabase functions deploy chat-password --project-ref wxgtrydzkrlimmlnvhdk --no-verify-jwt
```

4. Publish the updated frontend files through your normal workflow. No push has been performed here.

No chat-media or chat-preview redeployment is needed: their access guards work once legacy flags are cleared.

## Verification

- 157 Node tests passed, including acceptance of eight-character mixed passwords, rejection of seven-character passwords, creation via the authenticated admin handler and current-password verification for replacement.
- Browser fixture test entered a test student's email and an eight-character password, opened a class, sent a message without a compulsory change, and opened the optional password form. Auth/backend were mocked; this was not a hosted Supabase login.
- Migration ran against disposable local PostgreSQL fixtures: legacy gate cleared, active/role preserved and new default false. Changes rolled back after testing.
- All 28 existing local database security regression checks passed.
- Frontend JavaScript syntax checks passed. Deno checked both updated Edge Functions.

After installation, create a disposable student through the admin UI using a generated eight-character mixed password, assign one class and test in a private browser session. Confirm immediate access and optional Change password. Do not reset a real student's existing password solely for testing. Live test remains pending deployment and an authenticated admin session.

The Excel bulk student import and password workbook have not been executed as part of this password-policy update. Existing students' passwords cannot be retrieved from Supabase; any deliberate reset would need to be recorded separately.
