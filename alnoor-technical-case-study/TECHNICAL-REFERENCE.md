# Technical Reference — AL-NOOR Student Chat

Companion to ARTICLE.md. This document describes the implemented source reviewed during preparation; it is not an independent penetration-test report.

## Source map

| File or directory | Role |
| --- | --- |
| `student-chat.html` | Page structure, composer, management forms, dialogs, shortcut destinations |
| `student-chat.js` | Authentication state, class access, history, realtime inserts, form orchestration |
| `student-chat-admin.js` | Student/teacher tables, membership pickers, class settings, destructive-action dialogs |
| `student-chat-media.js` | Image optimization, microphone capture, PCM WAV conversion, previews and authenticated retrieval |
| `student-chat-navigation.js` | Role-aware management shortcuts, sticky offsets and section navigation |
| `student-chat*.css` | Scoped layout, theme, tables, media and navigation styles |
| `supabase/functions/chat-admin/index.ts` | Privileged account/class operations, media settings and Owner-only cleanup/deletion endpoints |
| `supabase/functions/chat-password/index.ts` | Current-password verification and replacement-password flow |
| `supabase/functions/chat-media/index.ts` | Authenticated multipart processing, file validation, upload and transactional publication |
| `supabase/functions/_shared/security.ts` | Origin handling, bearer-token validation, current profile checks and shared validation helpers |
| `supabase/functions/_shared/media-validation.ts` | WAV format/duration and media-batch validation |
| `supabase/functions/_shared/media-gc.ts` | Retryable batches of private-object cleanup |
| `supabase/migrations/` | Ordered schema and permission changes |
| `supabase/tests/` | SQL access-control and lifecycle assertions |
| `tests/` | Node tests for handlers and validation |

## Data model

| Object | Principal data / relationship |
| --- | --- |
| `auth.users` | Auth-managed identity; application profiles reference identity IDs |
| `public.chat_profiles` | Display name, stored role, active flag, initial-password-change flag |
| `public.chat_classes` | Class name, archive flag, media flags, history revision |
| `public.chat_memberships` | Class-to-user assignments; one account may join several classes |
| `public.chat_messages` | Class, author identity/name snapshot, text, reply link, announcement, timestamp, attachment references |
| `public.chat_admin_audit` | Administrative actor, action, target and timestamp |
| `chat_private.chat_owner` | Protected singleton Owner identity |
| `public.chat_media_gc` | Object paths queued for removal and earliest cleanup time |
| `storage.objects` | Storage-managed object metadata, protected by media-read policy |

The article's Owner/Teacher distinction is implemented using a protected Owner identity plus the `admin` profile role. It is not implemented by trusting user-editable metadata. Admins currently have application-wide class authority.

Messages retain author-name snapshots. When an account is deleted, its author link is cleared and its old label becomes Former student/Former teacher. This is partial author anonymization, not automatic removal of personal information from message content or image/audio content.

Reply relationships include class identity so replies cannot point across classes. Deleting an original clears the surviving reply's pointer and marks it as a deleted-original reply.

## Principal request paths

### Read history

The browser requests `chat_messages` for the selected class, ordered by message ID. History uses batches of 50; older history can be requested. Grants and RLS determine accessible records. A two-second send interval and a 2,000-character text/caption limit are application constraints, not load capacity measurements.

### Send text

`chat_send_message` derives the sender from the authenticated database session. It checks the current profile and class access, limits announcements by role, validates the body and enforces the send interval. Browser table insert rights are not the ordinary text-write path.

### Change administrative data

The Edge Function validates the bearer token with Auth, loads the current application profile and enforces active/admin/password-change rules. It resolves the protected Owner identity for Owner-only actions. Database credentials stay on the server. Administrative changes generally write audit entries; protected destructive database operations write their audit entries transactionally.

### Send media

The server bounds the multipart request, validates membership and media settings, checks actual WAV bytes or decodes/re-encodes JPEG, generates object names, reserves cleanup rows and uploads with overwrite disabled. `chat_publish_media` rechecks permissions inside the database before inserting references. A failed publish attempts removal; reserved cleanup paths support later recovery.

The service-only publication RPC treats the Edge Function as the file-validation boundary. It validates reference structure, file existence, limits, class and role rules; it does not decode image/audio bytes inside PostgreSQL. The distinction is intentional.

### Retrieve media

`storage.download` uses the signed-in session. The Storage SELECT policy requires a matching message attachment and current class-chat access. No public object URL is embedded in the message. The design does not promise revocation of bytes already downloaded or copied.

### Delete class / history

Owner-only preview and execution RPCs compare the confirmed snapshot, lock the class and perform database changes with an audit entry in one transaction. Message deletion triggers queue object paths. Physical Storage removal follows separately and can require retry. No cross-system atomicity is claimed.

## Migration order

1. `202610200001_student_chat.sql` — initial schema, message write path, read policies, realtime publication.
2. `202610200002_chat_owner.sql` — protected Owner identity and associated controls.
3. `202610200003_chat_deletion_cleanup.sql` — account-history preservation and Owner history cleanup.
4. `202610200004_chat_media.sql` — media flags, attachment references, private bucket, cleanup queue, media publish function.
5. `202610200005_class_management.sql` — Owner-only class deletion preview and execution.

Sticky navigation is frontend-only and introduced no additional migration.

## Important operational properties

- Revoke and delete are separate operations. Revoke is reversible; delete is not reversible through the application.
- Revocation disables the database profile before attempting the Auth ban. Restore clears the Auth ban before enabling the profile. Failures keep access closed rather than reporting a successful restore.
- Password reset gates access while requiring a new password. Current passwords are not displayed to administrators.
- Media settings default OFF. Turning OFF blocks new uploads, while class access still governs old attachments.
- Archived classes are kept but fail normal class-chat access checks until reopened.
- History cleanup uses Europe/Madrid local midnight, including the timezone's offset changes; it is not the user's arbitrary browser-local midnight.
- Existing chat pages periodically check access/history state. The check interval is 15 seconds; server authorization remains the actual enforcement point.
- The Owner cannot be removed through ordinary app controls; infrastructure owners still control the database/project.
- Origin validation limits expected browser origins but does not replace authentication or authorization.
- Admin operations have trusted server credentials, so their validation must be evaluated separately from browser RLS policies.
- The code is not presented as end-to-end encryption, a compliance certification, or a replacement for independent review.

## Validation ledger

The recorded 80-test Node suite includes both existing functionality and new media/class-deletion checks. The 75 SQL assertions are accumulated across five feature suites: 22 + 9 + 19 + 11 + 14. Fifteen extra media-handler cases were also exercised with the actual JPEG codec; seven existing inquiry API tests passed.

Browser checks covered mock Owner/Teacher/Student accounts, compact tables, class assignment, failure rollback, revoke/restore, password reset, account deletion, history preview, class delete confirmation, media preview/send, Chromium recording preparation and sticky navigation. Widths from 320 to 1280 pixels were checked across the suites.

These test levels are complementary. SQL tests use a real PostgreSQL engine with local Auth/Storage stubs. Handler tests mock service responses. Browser tests mock remote data. User-provided live screenshots show selected hosted workflows working. None is represented as sustained-load testing, independent security audit, or physical mobile-device coverage.

## Reviewer discussion points

For a next review, examine privileged handler authorization, SQL function privileges, server-held key handling, profile/membership transitions, upload failure cleanup, object retention, database-to-Storage consistency, reconnect behavior and direct API requests from unauthorized users. Consider quotas and compressed audio before significantly expanding media volume. Evaluate teacher-specific scope only if application-wide teaching administration no longer matches the organization.
