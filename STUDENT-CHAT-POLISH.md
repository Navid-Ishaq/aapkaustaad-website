# AL-NOOR chat polish and public link previews

Completed: 28 October 2026. Source: D:\DETLENG2\aapkaustaad-website.
No commit, push, production deployment or database changes performed.

## What changed

- Warm off-white conversation canvas, white received bubbles and soft mint sent bubbles with dark text. Blue AL-NOOR branding remains. Compact class sidebar, date separators and composer make the conversation feel like a chat application.
- Chat and management are separate views. Manage classes & students opens management; Back to chat returns to the conversation. Existing role restrictions remain.
- Unsent attachments have a clear Not sent yet label. A voice draft with a caption is sent as one message. Sent messages stay on the sender's right side when another message arrives.
- Compact voice player provides Play/Pause, seeking and elapsed/total duration. Sent audio loads through the existing authenticated media path. Only one audio plays at a time.
- Public HTTP/HTTPS links can request title/description metadata without manually registering each domain. YouTube uses its public oEmbed metadata. Urdu/Arabic preview text uses automatic direction.
- Enter sends; Shift+Enter adds a line. Permission-aware attachment/microphone buttons and conditional Chat limits remain intact.

## Link preview safety and limitations

The backend checks the authenticated user and current class access. Each outbound request resolves DNS, rejects private/reserved addresses (including mixed public/private answers), and pins the connection to the validated address while retaining hostname TLS verification. Redirects are validated again. Requests have time, redirect and response-size limits. No user cookies or authorization headers are forwarded to target websites.

Only titles and descriptions are displayed; remote thumbnails are not fetched. Preview metadata is best effort: websites that block automated requests, require login, expose no usable metadata or fail validation remain ordinary clickable links. This is not a guarantee that every website will produce a preview. Existing short-lived cache and request limits remain.

## Validation

- 154 Node tests passed: 147 chat/security/helper tests and 7 existing enquiry API tests.
- JavaScript syntax checks passed.
- Browser fixture checks passed for keyboard sending, draft removal, voice playback, sending voice with a caption, stable audio after subsequent messages, image limits, media permission combinations, Owner/Teacher/Student navigation, class management and responsive widths down to 320px.
- Deno 2.9.6 checked the chat-preview function successfully.
- Real public metadata retrieval passed in Node and Deno for Arrange My Files AI, BBC Urdu and the supplied YouTube video.
- Browser backend responses were mocked. Hosted deployment and real-device microphone/mobile checks still need a smoke test after publishing. No production records were created or deleted.

## Activate on the hosted website

Redeploy only the updated preview function from the source directory:

```powershell
Set-Location 'D:\DETLENG2\aapkaustaad-website'
npx.cmd supabase functions deploy chat-preview --project-ref wxgtrydzkrlimmlnvhdk --no-verify-jwt
```

No SQL migration is required. No chat-admin, chat-media or chat-password redeployment is required for this update. Publish the updated frontend files through your normal workflow, then refresh the website.

After publishing, try a voice draft, send a caption with it, send another text, and confirm both sent messages stay on the right. Try the three public example URLs. Check management opens separately and Back to chat returns correctly. Verify student controls still follow class permissions.

## Main files

Frontend: student-chat.js, student-chat-media.js, student-chat-links.js, student-chat-compact.css; new student-chat-audio.js and student-chat-view.js.
Backend helpers: supabase/functions/_shared/link-preview.ts; new public-address.ts and public-fetch.ts.
Tests: public-preview.test.mjs, public-transport.test.mjs, preview-test-loader.mjs and updated link preview tests.

The older STUDENT-CHAT-COMPACT-UPDATE.md describes the previous allowlist-based preview version; this guide supersedes that limitation.
