# Voice messages and image uploads

Implemented in `D:\DETLENG2\aapkaustaad-website`. Installation preserves existing accounts, memberships, messages and settings. No production deployment has been performed by the coding agent.

## Install in this order

1. Supabase SQL Editor → New query: run **202610200004_chat_media.sql once**. The previous three migrations must already be installed. This creates the private bucket and media permissions; do not rerun the older migrations.
2. Deploy both functions from the original source folder:

```powershell
Set-Location 'D:\DETLENG2\aapkaustaad-website'
npx.cmd supabase functions deploy chat-admin --project-ref wxgtrydzkrlimmlnvhdk --no-verify-jwt
npx.cmd supabase functions deploy chat-media --project-ref wxgtrydzkrlimmlnvhdk --no-verify-jwt
```

The functions validate bearer tokens and current profiles themselves. The existing chat-password function does not require redeployment.

3. Refresh local preview with Ctrl+F5. Under Manage classes & students, enable the required media switches for a test class. Test with an admin and a student before publishing.
4. Copy to the existing publish checkout and review/push:

```powershell
robocopy 'D:\DETLENG2\aapkaustaad-website' 'D:\DETLENG2\aapkaustaad-website-publish' /E /XD .git node_modules .temp .branches /XF .env .env.* *.log
if ($LASTEXITCODE -ge 8) { throw 'Copy failed. Stop here.' }
Set-Location 'D:\DETLENG2\aapkaustaad-website-publish'
git status --short
git diff --stat
git diff
# After reviewing the changes:
git add .
git commit -m "Add private class voice messages and image uploads"
if ($LASTEXITCODE -ne 0) { throw 'Commit failed. Stop here.' }
git push origin main
```

If Git reports nothing to commit, the files are already committed; do not repeat the commit. Refresh the live page after hosting updates.

## Class controls and messages

Owner and active Teacher Admins can independently set **Admin/Teacher Voice**, **Student Voice** and **Image Upload** per class. All start OFF. Images apply to both roles. Turning OFF blocks new uploads; existing authorized class members can still access previously sent media.

When enabled, the composer displays:

- “You can record a voice message up to 2 minutes.”
- “You can select up to 5 images at a time.”

Record → Stop → listen to preview → Send, or Remove to discard. Recording stops at 2 minutes. Select up to 5 JPG/PNG/WebP images from mobile gallery or computer, review thumbnails, remove unwanted selections, optionally add a caption, then Send. A message contains either one voice note or up to five images. Text-only messages and Meet links continue to work. No calling or transcription is added.

## Storage and access

The private `alnoor-chat-media` bucket stores files. PostgreSQL stores only paths and metadata. Images are resized to a maximum 2048-pixel side and converted to JPEG in the browser; the server independently decodes and re-encodes JPEG, strips metadata and caps each at 2 MiB. Source JPG/PNG/WebP up to 15 MB are accepted by the browser. HEIC-only images are not supported; export as JPG if necessary.

Voice recordings are normalized to mono 16 kHz, 16-bit PCM WAV. The server validates actual WAV structure and sample duration, rather than trusting a filename or supplied duration. A full two-minute recording is approximately 3.84 MB. This is larger than compressed WhatsApp audio; it enables precise duration validation without another service. Multipart request limit is 11.5 MB.

Only the server uploads files, with random paths and no overwrites. Browser roles have no bucket upload/update/delete policy. A service-only transactional publish function rechecks account status, membership, class flags, announcement role and rate limit after upload. Private downloads use authenticated Storage requests with RLS against published message references and current class access. No public bucket or shared signed media URL is used. Revoked/removed users cannot make new authorized downloads; already downloaded or copied files cannot be recalled.

Deleting an account preserves its historical media alongside its Former student/Former teacher messages. Owner history cleanup removes message references immediately and queues physical file removal. Cleanup processes up to 100 files per batch. The Owner's **Clean unused media files** button retries pending batches. Failed/interrupted uploads are reserved for cleanup after one hour; the next media send, history cleanup or explicit Owner cleanup processes due reservations. No scheduled worker is installed.

## Verification and limits

Passed locally:

- 76 Node security/handler tests, including 22 new media cases.
- 61 real local PostgreSQL checks: 22 chat, 9 Owner, 19 deletion/cleanup, 11 media/Storage RLS (minimal Auth and Storage schema stubs).
- 15 additional handler checks using the actual jpeg-js codec.
- 7 existing inquiry API tests.
- Existing administrative browser regression at five widths; media browser checks at 1280/820/390/320 px, five-image preview/remove/send, sixth rejection, actual Chromium microphone capture to WAV preview and independent student voice OFF.

Browser tests use mock Supabase responses; SQL checks exercise database permissions, not the hosted Storage HTTP service. A real hosted smoke test is still required after installation: admin versus student voice flags, image access from two class members, outsider/removed member rejection, and cleanup with a disposable test class. Test on an actual Android/iPhone as well; mobile layout was checked but physical mobile devices were not used. Microphone access requires HTTPS (localhost is allowed) and browser permission.

No production accounts/messages were created or deleted during development. Existing website design, authentication, private classes, text chat, Meet links, owner/admin management, inquiry API and AI chatbot were retained.
