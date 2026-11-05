# Building AL-NOOR Student Chat
## A development journey from a classroom need to a working private chat

**Prepared for Muhammad Naveed Ishaque · 5 November 2026**  
**Project:** AL-NOOR / AapkaUstaad Student Chat  
**Live entry point:** https://aapkaustaad.com/student-chat.html  
**Source repository:** https://github.com/Navid-Ishaq/aapkaustaad-website

> This project grew through use. Naveed described what teachers and students needed, tried the controls, shared screenshots and questioned anything that felt confusing. Codex helped translate those observations into code, database rules, tests and clearer interfaces.

## 1. What this report is—and how to read its evidence

This is a development history, rather than a copy of the published case study. It records the decisions, misunderstandings, limitations and improvements that are visible in our conversation and supporting files.

The earliest project brief is not fully reproduced in the available conversation. We should therefore avoid inventing a first meeting or a precise moment of inspiration. The available record begins with a functioning early chat being tested, and the source and deployment notes explain the underlying implementation.

The report uses four kinds of evidence:

- **Conversation and screenshots:** what Naveed observed, requested and demonstrated on local or hosted pages.
- **GitHub commits:** which groups of changes reached the repository and when.
- **Code and development notes:** how the features were implemented, including their limits.
- **Recorded verification results:** checks reported in the saved development records. These historical suites were not rerun for this report.

A successful local test is not the same as an independent audit of hosted Supabase. A screenshot proves the visible state at that moment; it does not prove every permission or error path. Where the evidence stops, this report says so.

## 2. The practical need

AL-NOOR already had an educational website. The new requirement was a private place where registered students could communicate with teachers inside their assigned classes. Students needed to see the right group, read announcements, send messages and open lesson or Google Meet links. Teachers needed to manage classes and students without depending on a developer for every account change.

The work had to fit the existing website. Course pages, the enquiry system and the existing assistant were to remain available. We did not set out to build calling, AI transcription or a separate messaging infrastructure.

The resulting foundation used the existing website frontend with Supabase Authentication, PostgreSQL, Realtime, private Storage and Edge Functions. The important design choice was that a visible button would never be the only permission check.

## 3. Building the first private text-chat foundation

The initial implementation separated identity, class membership and chat messages. An authenticated user also needed a provisioned application profile and current access to a class. This mattered because being logged in alone should not give someone access to every classroom.

Text messages used the authenticated `chat_send_message` database function. It derived the sender from `auth.uid()`, checked class access and validated the message before insertion. Browser roles did not receive direct message INSERT, UPDATE or DELETE privileges. Reads used an access helper and row-level security.

The first verification record, dated 20 October, documented 22 PostgreSQL authorization checks, 15 Edge Function tests and seven existing enquiry API tests. Browser fixtures covered login transitions, class selection, messages, replies, clickable Meet links, plain-text rendering of an XSS payload and layouts down to 320 pixels. Most browser backend responses were mocked. Hosted provisioning and multi-session delivery still needed installation and live checks.

This was our first recurring lesson: the interface and the database had to agree about who could do what.

## 4. “Remove” and “Revoke” exposed a missing recovery journey

Naveed tested removing a student from a class. Screenshots showed the student moving from two class memberships to one. That was useful confirmation that class membership could change independently.

Then he tried **Revoke all chat access**. The student lost access and returned to the login screen with an access-revoked message. Naveed immediately asked how to add the same student again, because the name was still visible in management.

The problem was not simply a failed delete. Two different operations were being confused:

- Removing one membership changes access to one class.
- Revoking chat access disables the account's chat access while preserving the record.

The improved interface used a Chat access checkbox for revoke and restore. Class assignments remained separately editable. Restoration reused the same account rather than requiring a duplicate student. The documented backend order was deliberate: revoke the profile first, then attempt the Auth ban; on restoration, unban first, then enable the profile. A failed unban should not accidentally grant database access.

**Lesson:** a restriction feature needs a clear recovery path. “Disable” is only half of the workflow.

## 5. Turning large student blocks into usable records

The early management screen gave every student several lines of controls: long Remove from class buttons, an add-class dropdown and a revoke button. Naveed noticed how quickly this would consume space as the roster grew.

His proposed interaction was precise: one row per student, a Classes dropdown containing checkboxes, and a closed summary such as “2 classes added.” Ticking would add a membership; unticking would remove it.

We implemented a compact table with Name, Email, Password, Classes and Chat access, followed later by Actions. Membership changes saved individually, so changing one class would not overwrite unrelated assignments. Failed changes restored the previous checkbox state. The documented table paginated records in groups of 25 and scrolled horizontally inside its container on narrow screens.

Naveed also asked to display and change passwords. The final control was **Reset password**, rather than a display of existing passwords. Existing passwords cannot be retrieved from Supabase Auth. Administrator email retrieval and changes went through the protected administrative function rather than exposing every student's email through a student-readable table.

**Lesson:** compact layout is not just decoration. It reduces repeated reading and makes the current state easier to understand.

## 6. Giving teachers useful authority while protecting ownership

Naveed wanted two or three trusted teachers to do the ongoing class and student work. He also clarified that “daily management” must not mean granting rights again every day.

The role design became:

| Role | Intended authority |
| --- | --- |
| Owner | Manage classes/students and create, manage, revoke or delete Teacher Admins; perform protected cleanup actions |
| Teacher Admin | Manage classes and students, with persistent rights until revoked |
| Student | Use assigned classes while access is active |
| Visitor | See the entry notice and login screen |

Teacher Admins could not promote another administrator or take over the protected Owner role. The Owner migration identified the existing administrator and added protected ownership rules. This application role did not replace the underlying Supabase project owner's infrastructure authority.

An early hosted screenshot showed **Database operation failed**, with management lists empty even though chat history was visible. The available installation notes tied the new management interface to the Owner migration and updated function. Later screenshots showed populated student records and the Owner controls. The record supports an upgrade/deployment dependency; it does not contain the raw database error needed to identify the exact failed statement.

Later, Naveed showed that Teacher Bilal had created a VTC group and added a student. Messages from the student, Bilal and Naveed appeared in the group. That was meaningful evidence of real use. A visible Reconnecting status also reminds us that a screenshot does not establish uninterrupted Realtime delivery.

## 7. Adding deletion without accidentally losing class history

Passing students leave. Naveed asked for a Delete option inside an Actions dropdown, rather than a permanently exposed destructive button. He then requested the same capability for Teacher Admin accounts.

We kept account deletion separate from history cleanup. Deleting an account removed its Auth identity, profile and memberships, while old messages remained under **Former student** or **Former teacher**. This preserved the conversation around the departed person. It did not remove names someone had typed inside a message body.

The confirmation displayed the target account and required typing DELETE. Teacher Admins could delete students; only the Owner could delete a Teacher Admin. The protected Owner had no account-delete action. The backend rechecked identity and the account email to reject stale rows.

Naveed also wanted to remove old messages before a chosen date. The Owner-only cleanup preview showed the class, cutoff and message count before confirmation. The cutoff used Europe/Madrid midnight and retained the selected date itself. The database checked the preview again before executing; changed data required another preview. Newer replies could survive with an Original message deleted label.

Later, class deletion was added separately from Archive/Reopen. Archiving retained the class and history. Deleting a class removed that class's memberships and messages while retaining the student and teacher accounts.

**Lesson:** account lifecycle, class lifecycle and message retention are different decisions. Combining them into one delete button would have made consequences harder to predict.

## 8. Voice notes and screenshots made the chat more useful

The next request was WhatsApp-style voice messages and multiple image uploads, with independent per-class controls for Admin/Teacher Voice and Student Voice, plus Image Upload.

Naveed agreed to a two-minute voice limit and five images per message. He also requested gentle English guidance when those functions were available.

The implementation provided record, stop, preview, remove and send steps, as well as multiple-image preview and removal. Files went into a private Supabase Storage bucket; PostgreSQL held references and metadata. Permissions were checked through the authenticated backend and database, including a recheck before publication.

There were practical engineering trade-offs:

- Images were resized in the browser; the server independently decoded and re-encoded them, stripped metadata and enforced size limits.
- Voice was normalized to mono 16 kHz PCM WAV so actual structure and duration could be checked. A two-minute recording was approximately 3.84 MB—larger than compressed WhatsApp audio.
- A message could contain one voice note or up to five images, with an optional text caption.
- Turning uploads off stopped new uploads; it did not hide previously sent media from still-authorized members.
- Removed access could block future authorized downloads, but could not recall files already downloaded or copied.

The media verification notes recorded handler, codec and PostgreSQL/Storage-RLS checks, five-image previews, sixth-image rejection and Chromium microphone capture. Browser backend responses were mocked; layout testing did not equal testing on a physical iPhone or Android device.

## 9. The controls worked, but the interface still felt heavy

Naveed kept testing after functionality appeared. The media permissions repeated long labels under every class. We moved class management into a full-width table: class name, teacher voice, student voice, image upload and Actions.

As management grew, scrolling became another problem. Naveed requested category shortcuts below the main menu, visible while scrolling, and a Back to top link at each category. Owner shortcuts included Teacher Admins and history cleanup; Teacher Admins saw only their permitted categories. Students did not receive the management bar.

Later, Naveed compared the chat with WhatsApp. Large always-visible recording/upload controls and oversized message blocks still made it feel like a form on a webpage.

We introduced a compact composer, attachment and microphone icons, shorter timestamps, content-sized bubbles, a bounded conversation area, a fixed conversation header/composer and mobile class navigation. Enter sent a message; Shift+Enter added a new line. The keyboard handling also considered empty submissions, repeated Enter and IME composition.

The limits dropdown became permission-aware. If only images were available, it showed only the image limit. If neither media capability was available to that user, the dropdown was hidden.

**Lesson:** a feature can be technically complete while its everyday interaction still needs work.

## 10. A voice preview was mistaken for a sent message

One screenshot showed audio on the left near a Remove button. After Naveed sent text, a voice message with the text appeared on the right. He asked why it had moved.

The left-hand audio was an unsent draft. Sending the caption published the voice and text together. The behavior was explainable, but the draft was not labelled clearly enough. We added **Not sent yet** so the interface could explain itself.

The follow-up polish also introduced a compact voice player with play/pause, seeking and elapsed/total duration. The records describe stable sender-side alignment and limiting playback to one audio at a time. Regression fixtures checked voice with captions and audio behavior after later messages.

The heavy blue conversation treatment was softened: warm off-white canvas, white received bubbles and soft mint sent bubbles, with AL-NOOR blue retained for branding. Chat and management became separate views.

**Lesson:** explaining an interface after confusion is useful; changing the interface to prevent that confusion is better.

## 11. Link previews took more than one attempt

Naveed expected pasted links to show a useful title, as WhatsApp did. Our first implementation used a limited trusted-host list and displayed title, description and domain. It kept the normal clickable link when preview fetching failed.

That limitation became visible when Arrange My Files AI did not produce a preview, while the AL-NOOR homepage did. Naveed then tried BBC Urdu and YouTube and asked whether every URL had to be stored manually in Supabase.

This was a genuine gap between expectation and the first implementation. The later version supported public HTTP/HTTPS metadata retrieval without manually registering every domain. YouTube used public oEmbed metadata. Outbound requests validated DNS and public addresses, rejected private/reserved destinations, revalidated redirects, enforced time/size limits and did not forward user credentials or cookies. The transport pinned validated addresses while retaining hostname TLS verification.

The scope remained honest: title/description previews were best effort, not a promise that every website would work. Login requirements, blocked requests, missing metadata and validation failures could still leave a plain link. Remote thumbnails were not added.

Real metadata fetches were recorded for Arrange My Files AI, BBC Urdu and the supplied YouTube video in Node and Deno. These were separate from mocked browser chat scenarios.

**Lesson:** when a familiar product creates an expectation, the supported scope must be clear. Expanding URL support also requires addressing server-side request safety.

## 12. Deployment taught us to distinguish several kinds of failure

The conversation contains small but important operational problems:

| What we saw | What it meant and how the workflow changed |
| --- | --- |
| PowerShell blocked npx.ps1 | We used npx.cmd to invoke the command without changing the machine-wide script policy. |
| Entrypoint path did not exist | A deployment had run from the user home directory. Changing to the source directory made the function files available. |
| An unintended project was selected | Subsequent deployment commands named the intended project explicitly. |
| Docker is not running | In the shown successful runs, the upload and deployed-function confirmation followed this warning. It was not a failed deployment in those runs. |
| Nothing to commit followed by Commit failed | The same update had already been committed; the second commit attempt had no changes. The first push had succeeded. |
| Push rejected: fetch first | The remote contained work absent from the publish checkout. The record later shows the rebased layout commit in GitHub, but does not preserve every reconciliation command. |

Screenshots showed successful deployments of chat-admin, chat-media, chat-preview and chat-password at different stages. Frontend publishing and function deployment were separate steps. A Git push could not substitute for applying a database migration or updating a hosted function.

## 13. Community feedback became a security regression review

After the DEV Community article, Cenk highlighted classroom-member reads, cross-class writes and unauthorized updates. His examples were general recommendations, not a demonstrated exploit against this repository.

We reviewed them against the architecture rather than copying SQL blindly. The recorded review confirmed the authenticated text-write function, sender identity derived from auth.uid(), the read helper and lack of direct browser message write privileges.

Six explicit regression checks were added to the original 22 local database checks. The saved review reported **28 passing checks**, including zero-row cross-class reads, denied unauthorized updates/deletes and absence of permissive ALL/UPDATE message policies.

The review explicitly did not query the hosted policy catalog. It was a local PostgreSQL verification using minimal Auth/Storage stubs and rolled-back fixtures. It was not an independent hosted security certification.

**Lesson:** useful outside criticism can strengthen tests without implying that every example applies directly to the existing architecture.

## 14. Importing students and revisiting passwords

Naveed supplied an Excel roster with two group columns. Some students belonged to both groups; others belonged to one. The requirement was one login identity per student, with the appropriate memberships—not duplicate accounts for each class.

He also asked to reduce the application minimum from 12 to eight characters and make password changes optional at login. The updated policy accepted 8–128 characters with uppercase, lowercase, a number and a symbol. The account message became: “You can change your password anytime from your account.” Self-service replacement still checked the current password.

The change needed frontend, function and database updates as well as the hosted Auth setting. The migration changed the legacy forced-change flag; it did not change actual passwords or memberships by itself.

The bulk import had another practical constraint: Codex's terminal could not access the user's saved Supabase CLI login. We prepared and locally tested the import script, then Naveed ran it from his authenticated PowerShell session. This is an important distinction between preparing a workflow and executing it against the hosted service.

The retained import report contains **35 rows**:

- **32 new accounts:** recorded as created, with login and groups verified.
- **3 existing accounts:** passwords unchanged, groups verified; loginVerified is false in the report, so we do not claim those existing passwords were tested.

A password workbook was produced locally. Credentials and student contact details are deliberately excluded from this report. The import report is a record of that run, not a new live recheck performed for this document.

**Lesson:** preserve existing identities and passwords where possible. A roster import needs explicit matching, membership checks and an understandable result for every row.

## 15. Testing as the project grew

Testing expanded with the risk and complexity of each change. Historical counts describe successive suites and should not be added together as if they were all unique tests.

| Milestone | Recorded verification |
| --- | --- |
| Initial chat | 22 local PostgreSQL checks; 15 Edge Function tests; 7 enquiry API tests; browser fixtures |
| Owner management | 40 mocked Edge Function tests; 31 PostgreSQL checks; existing enquiry regression |
| Account deletion/history | 54 Edge Function tests; 50 PostgreSQL checks; confirmation and responsive browser scenarios |
| Media | 76 Node security/handler cases; 61 PostgreSQL checks; additional codec checks; preview and recording fixtures |
| Class deletion | 80 Node cases and 14 new PostgreSQL checks, alongside earlier suite records |
| First compact/preview version | 106 Node tests plus 7 enquiry API tests; keyboard/media/navigation browser scenarios |
| Public preview and polish | 154 Node tests in the recorded run; Deno check and real metadata fetches |
| Optional password update | 157 Node tests; local migration fixtures; all 28 security regression checks |

The checks served different purposes. Real local SQL exercised authorization, constraints and transactions. Mocked handlers exercised decision paths without production records. Browser fixtures checked interaction and layout. Real metadata calls checked external fetch behavior. Naveed's hosted screenshots added evidence of actual teacher/student use.

Remaining limits included physical mobile-device testing, exhaustive hosted RLS/Storage checks and an independent live-policy comparison. Those limits should remain visible even when local results are strong.

## 16. The commit trail

The repository provides a useful chronological backbone:

| Commit | Date | Milestone |
| --- | --- | --- |
| [dbd99b8](https://github.com/Navid-Ishaq/aapkaustaad-website/commit/dbd99b8) | 20 Oct 2026 | Private student chat and Owner-managed Teacher Admins |
| [a036542](https://github.com/Navid-Ishaq/aapkaustaad-website/commit/a036542) | 20 Oct 2026 | Confirmed account deletion and Owner-only history cleanup |
| [00cce4c](https://github.com/Navid-Ishaq/aapkaustaad-website/commit/00cce4c) | 20 Oct 2026 | Private class voice messages and image uploads |
| [0fda262](https://github.com/Navid-Ishaq/aapkaustaad-website/commit/0fda262) | 20 Oct 2026 | Compact class table and Owner-only class deletion |
| [afe1eb5](https://github.com/Navid-Ishaq/aapkaustaad-website/commit/afe1eb5) | 20 Oct 2026 | Sticky management shortcuts |
| [0d80bc7](https://github.com/Navid-Ishaq/aapkaustaad-website/commit/0d80bc7) | 20 Oct 2026 | Technical case study and screenshots |
| [c88077d](https://github.com/Navid-Ishaq/aapkaustaad-website/commit/c88077d) | 20 Oct 2026 | Live link and implementation references |
| [1731d84](https://github.com/Navid-Ishaq/aapkaustaad-website/commit/1731d84) | 28 Oct 2026 | Layout, keyboard sending and link previews |
| [78dba77](https://github.com/Navid-Ishaq/aapkaustaad-website/commit/78dba77) | 28 Oct 2026 | Chat polish and optional password changes |

These are commit dates, not a claim that every design discussion happened at that exact time. The first chat commit grouped several initial improvements. Supabase configuration and student import operations also do not necessarily appear as application commits.

## 17. What the final working version represents

By the final recorded application update, the project combined private text chat, announcements, replies, links, voice notes and images with class-aware permissions. It offered manageable student records, persistent Teacher Admin authority, protected ownership, reversible access controls and explicit destructive actions. It also supported an Excel-based provisioning workflow and a calmer chat interface.

The final screenshot supplied on 5 November shows the hosted login entry page. Earlier screenshots show authenticated chat and management activity. Together with the commits, source and import records, they establish a working project that evolved through real feedback. They do not establish a fresh end-to-end production audit on 5 November.

## 18. What we learned together

**Requirements often become clear through use.** The request for restoration appeared after revocation was tested. The compact tables came from seeing repeated buttons. Preview labels came from a real misunderstanding.

**Good product direction does not require writing every line of code.** Naveed supplied the classroom context, authority boundaries, examples, acceptance criteria and repeated usability feedback. Codex contributed implementation, technical explanations and verification work. The value came from connecting those roles.

**A familiar interface is a useful reference, but it is not a complete specification.** WhatsApp helped explain the desired experience. Our project still needed its own storage rules, limits, permissions and honest preview scope.

**Small failures should be recorded, not hidden.** Wrong directories, blocked commands, missing previews and awkward layouts taught us how to make the workflow clearer.

**Testing claims need context.** A local SQL result, a mocked browser test, a successful function deployment and a live screenshot are different pieces of evidence. Keeping them separate makes the report more credible.

The project did not arrive fully formed. It became useful through a repeated cycle: observe a need, build a version, try it, question the rough edges, improve it and verify the change. That is the development journey this report preserves.

## Evidence and source notes

Reviewed sources include the conversation and its supplied screenshots; the GitHub commit collection; source modules in D:/DETLENG2/aapkaustaad-website; and these development records:

- STUDENT-CHAT-TEST-REPORT.md and STUDENT-CHAT-DEPLOYMENT.md
- STUDENT-CHAT-UPGRADE.md, STUDENT-CHAT-DELETION.md and STUDENT-CHAT-CLASSES.md
- STUDENT-CHAT-MEDIA.md and STUDENT-CHAT-NAVIGATION.md
- STUDENT-CHAT-COMPACT-UPDATE.md and STUDENT-CHAT-POLISH.md
- STUDENT-CHAT-PASSWORD-UPDATE.md
- COMMUNITY-SECURITY-REVIEW.md and COMMUNITY-SECURITY-REGRESSION.sql
- The private student-import report and generated workbook existence, without reproducing credentials

Earlier notes sometimes describe behavior later superseded—for example mandatory initial password change and the trusted-host-only preview. This report follows the recorded sequence rather than treating every historical note as current behavior.

**Scope:** AL-NOOR Student Chat. The later Send Message, personal portfolio and Human Potential projects are separate journeys and have not been mixed into this report.

---

## Development updates

### 5 November 2026, 12:03 CET — Public “How to Build” documentation reader

Following a review of the AL-NOOR Student Chat website and this development journey, we prepared a public **How to Build** entry in the blue Student Chat banner. It opens a separate reading page without requiring student login or changing private classroom access. The registration notice was also rewritten in clear English.

The documentation page reads this Markdown file directly from the deployed repository and presents it as a responsive chapter-based guide, with a **sticky reading progress bar**, **sticky chapter navigation** on desktop, **current-chapter highlighting**, search, and a mobile chapter selector. The chapter list scrolls independently when it is longer than the screen. The original Student Chat messages, account management, permissions and Supabase integrations were left unchanged.

A companion `MAINTENANCE_GUIDE.txt` explains how to replace this Markdown file later. After the updated files are committed, pushed and successfully published, the reader loads the new content without requiring a JavaScript edit. The change is a documentation and navigation improvement, not a new chat backend feature. **Local verification:** The Student Chat Node test suite passed **155/155** cases, and the existing course enquiry API suite passed **7/7** cases. A sandboxed Chromium check rendered the exact new HTML, CSS and JavaScript with a controlled local Markdown response at desktop, tablet and mobile widths (1440, 900, 390 and 320 pixels). Sticky progress, chapter navigation, active highlighting, search, mobile navigation and visible chapter headings were checked. This does not claim a new live GitHub Pages deployment or authenticated Supabase test.
