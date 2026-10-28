# Compact chat, keyboard sending and link previews

Implemented on 28 October 2026 in `D:\DETLENG2\aapkaustaad-website`. No Git commit, push, database migration or hosted function deployment was performed.

## Completed changes

1. Enter submits the existing message form; Shift+Enter inserts a new line. Send still works. Empty text without attachments, held/repeated Enter and IME composition do not trigger keyboard sends; a disabled Send button prevents concurrent keyboard submissions.
2. A supported pasted link receives a title/description preview after a brief debounce. Visible received/sent links also request previews. Unsupported sites, network failures and unavailable metadata leave the original clickable URL. Preview failures do not block sending.
3. Compact bubbles fit the message, spacing is reduced, timestamps are short (full timestamp on hover), and the class header/composer stay inside a bounded conversation while history scrolls. Desktop has a class sidebar; mobile has a class-list screen and a Back to classes button. Choosing a class closes the management panel/shortcut bar to keep the conversation clear.
4. Attachment and microphone icons replace the large always-visible media controls. Recording shows elapsed time, Stop and Cancel; a voice preview follows recording. Selected images appear only as needed. Chat limits contains only the voice/image limits available to the current user's role; both unavailable means no dropdown. All server media validation and per-class permissions remain unchanged.

## Link preview scope and security

New function: `chat-preview`. It uses the existing authenticated context, checks active profile/initial-password status and current class access before fetching metadata or returning a cache entry. Admin access follows the existing application-wide class-admin model. No privileged key is added to frontend code.

Outbound requests are restricted to an exact trusted-host list in `_shared/link-preview.ts`: the AL-NOOR domain and selected DeTLeng hosts, YouTube hosts and dev.to. It is not a general arbitrary-URL proxy. Other websites continue as clickable links. Add a new host only after reviewing whether it is a trusted public destination; wildcard domains are deliberately not used.

Only HTTP/HTTPS links are considered and fetches are upgraded to HTTPS. Embedded credentials, nonstandard ports, IP/private targets and unlisted hosts are rejected. Every redirect is revalidated, with at most four requests, a four-second total timeout and a 256 KiB HTML-body limit. Cookies and caller authorization headers are not forwarded to the target site. The browser renders text fields through textContent, never remote HTML.

This first version displays title, description and domain, without remote thumbnails. It avoids third-party image hotlinks and extra media downloads. Some sites block preview fetches; some HTTPS pages do not provide metadata. In those cases the URL remains usable. One first link per message is previewed; per-class client requests are bounded. The server has a bounded five-minute in-memory cache and best-effort per-isolate request limits, not a distributed rate-limiting service. Membership is checked before cached metadata is returned.

No new database fields or tables are needed. Metadata is fetched on demand and is not stored with private message content. Dismissing the compose preview hides that local preview; it does not remove the URL from the message or impose a preview preference on recipients.

## Deployment: function only, then publish frontend yourself

```powershell
Set-Location 'D:\DETLENG2\aapkaustaad-website'
npx.cmd supabase functions deploy chat-preview --project-ref wxgtrydzkrlimmlnvhdk --no-verify-jwt
```

There is no SQL migration. Existing chat-admin, chat-password and chat-media do not require redeployment for these changes. The function validates the bearer token itself through shared context. If chat-preview has not been deployed yet, the frontend still sends messages and displays ordinary clickable URLs.

After testing, copy reviewed changes to your existing publish checkout and push yourself. This document does not run Git commands. Updated frontend files are `student-chat.html`, `student-chat.js`, `student-chat-media.js`, and new `student-chat-compact.css`, `student-chat-composer.js`, `student-chat-links.js`. Backend files: new `supabase/functions/chat-preview/index.ts`, `_shared/link-preview.ts`, and the chat-preview entry in `supabase/config.toml`. Two new preview test files are in `tests/`.

## Verification

- 106 Node tests passed: existing 80 handler/security cases plus 17 metadata/fetch safety checks and 9 preview endpoint authorization checks.
- 7 existing inquiry API tests passed.
- Browser suite passed Enter/Shift+Enter, empty/composition handling, send button, compose preview/dismiss, received link preview, all four media permission combinations, microphone capture to WAV preview, five-image/sixth rejection, role-based student permissions and 1280/820/390/320 px layouts.
- Class-management browser regression and Owner/Teacher shortcut navigation regression passed.
- JavaScript syntax checks passed for all student-chat JS modules.
- A real metadata fetch from the AL-NOOR homepage returned its current title and description using the new bounded-fetch helper.

Browser scenarios used mock Supabase responses and Chromium's fake microphone device. They do not establish physical iPhone/Android keyboard behavior or hosted Supabase Edge runtime deployment. Test a short voice note, five images, Enter/Shift+Enter, mobile Back navigation and a supported link on the live site after installation. Existing RLS and media write policies were not changed.

Local backup of prior chat HTML/JS: the task workspace's `work/before-chat-ux/`. Desktop/mobile mock-data previews are provided in this task's outputs. No real class, account or message was changed during development.
