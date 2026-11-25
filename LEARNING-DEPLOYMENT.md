# AL NOOR Learning Platform — development preview (2026-11-25)

**Do not publish to production yet.** This full repository copy is based on the supplied ZIP. The existing chat, chatbot, course information, API and existing SQL migrations remain unchanged; the only existing chat HTML change is a Learning & Exams link inside the logged-in account controls. The new migration is additive. The project is public: never put XML, answer keys, private JSON, student exports or service-role secrets in GitHub.

## Included

- Same-origin `/learning/` frontend; reuses the existing sessionStorage key and Supabase Auth account. Direct login fallback; no separate signup. Master account revoke remains effective through shared server authorization.
- Dynamic courses and collections, test library search/status filters and pagination, individual course permissions and group-to-course mappings (individual entries override group grants), bilingual teacher access, MCQ practice/exam, timer, result history, layout toggles, server-side answers and scoring, owner-only date-based cleanup with count preview, and recent CSV export.
- Private storage for embedded images; external HTTPS images remain external and require authorized access and connectivity. Signed image URLs expire after one hour; already delivered content cannot be recalled. Questions are loaded into the browser for the attempt, but correct answers and reference images are not sent during an active exam. This is a study system, not proctoring or a guarantee against prior study of answers.
- Test 34/51 separate private seed archive supplied with release. Moodle XML converter tested against the two supplied exports, 30 questions each, correct answers verified against the earlier prototype by question text. Original XML ordering retained. Converter supports bilingual two-line or explicitly selected monolingual, single-correct MCQ; unsupported question types/option images/partial credit fail. Text-only general feedback is not currently retained. Review all imported content before publishing.

## Known gaps / release blockers

Live Supabase migration, hosted authentication, edge function, browser end-to-end flows and Windows push script have not been executed here. Existing regression tests passed but are not proof of new feature behavior. This is not a production-ready release. Existing Chat global revoke blocks both modules; independent **course/test-only** block works through individual permission entries. A separate chat-only block without global revoke is not yet implemented (avoids changing existing chat security). No automatic inactivity job yet; the settings table is reserved, timestamps currently update on direct enrollment activity, not group-only enrollment. Detailed performance charts, complete history export/pagination, course-scoped cleanup, preserve-status-on-cleanup, fully bulk upload UI, test rename/delete/duplicate, permanent course deletion, exact cleanup snapshot/confirmation, new-module audit trail and storage garbage collection are unfinished. No advanced question types. Some admin lists/results are bounded at 1000 rows, and the current frontend library fetch is not fully server-paginated. Unfinished attempts are retained; add a safe cleanup policy before production. Concurrent updates use optimistic equality checks; failed submissions must be retried/reviewed. Do not enable students until security and functional checks pass. Existing test content is not automatically installed by pushing code.

## 1. Safe local installation (PowerShell)

Download the full repository ZIP. Keep your current D-drive folder intact. Clone into a NEW sibling checkout (if the folder already exists, stop and choose another name). Extract the ZIP to a temporary folder, then copy only the reviewed changes over the current clone. The commands below assume Downloads and the delivered file name.

```powershell
Set-Location 'D:\DETLENG2'
git clone https://github.com/Navid-Ishaq/aapkaustaad-website.git aapkaustaad-learning-review
Set-Location 'D:\DETLENG2\aapkaustaad-learning-review'
git switch -c learning-platform-review
$zip = "$env:USERPROFILE\Downloads\aapkaustaad-learning-development.zip"
$stage = Join-Path $env:TEMP ('alnoor-' + [guid]::NewGuid())
Expand-Archive -LiteralPath $zip -DestinationPath $stage
$src = Join-Path $stage 'aapkaustaad-website-main'
robocopy "$src\learning" '.\learning' /E
if ($LASTEXITCODE -ge 8) { throw 'Copy failed' }
Copy-Item "$src\supabase\functions\learning" '.\supabase\functions' -Recurse
Copy-Item "$src\supabase\migrations\202611250001_learning.sql" '.\supabase\migrations'
Copy-Item "$src\scripts\convert_moodle.py","$src\scripts\import_learning.py","$src\scripts\push.ps1" '.\scripts'
# Review these existing-file changes against current GitHub before copying:
git diff --no-index -- student-chat.html "$src\student-chat.html"
git diff --no-index -- supabase/config.toml "$src\supabase\config.toml"
git diff --no-index -- .gitignore "$src\.gitignore"
# If differences are only the intended additions, proceed:
Copy-Item "$src\student-chat.html","$src\.gitignore","$src\push.cmd","$src\LEARNING-DEPLOYMENT.md" .
Copy-Item "$src\supabase\config.toml" '.\supabase\config.toml'
git status --short
node --test tests/*.test.mjs api/server.test.js
.\push.cmd
```

The script checks the remote, fetches, stages nonignored changes, rejects known private file patterns, shows staged statistics, asks for `PUSH` and a commit message, then pushes the **current branch** without force. Review `git diff --cached` yourself first. This is not a secret scanner. Never push private files even if they have unusual names. A non-fast-forward push fails rather than overwriting remote history. GitHub ZIPs do not contain `.git`; do not use `git init` and force push. After review and production acceptance, merge the review branch through GitHub; only then replace/sync your original working checkout. Do not overwrite uncommitted local changes.

## 2. Test environment first

Use a disposable Supabase project with equivalent chat migrations and test accounts. The owner migration expects the existing designated owner account; adapt bootstrap only for the disposable project. Do not run all old migrations again on production. The new migration requires existing chat tables, owner function, storage and Supabase roles. Apply `202611250001_learning.sql` exactly once after backing up and confirming migration history. For production use the existing project only after staging acceptance. The importer currently points at the existing project: change its URL to your staging project before testing. The browser config likewise needs staging values, and the allowed origins secret must include the exact staging web origin. Never use a service_role key in browser configuration. Deploy only the new function:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_TEST_PROJECT_REF
# Inspect pending migrations; do not apply unexpected old migrations.
npx supabase migration list
npx supabase db push --dry-run
# Apply only after the migration list is verified.
npx supabase db push
npx supabase functions deploy learning --no-verify-jwt
```

The function independently validates bearer tokens through existing `context`, checks active profile and applies per-course permissions. Direct browser access to new tables is denied. Confirm storage is private. For local testing set `CHAT_ALLOWED_ORIGINS` for the exact test origin on the disposable project, not a wildcard. Do not change production origins unnecessarily.

## 3. Import private tests (never GitHub)

Keep seed/XML outside the checkout (e.g. D:\DETLENG2\private-learning). Install dependencies locally:

```powershell
py -m pip install pillow beautifulsoup4 defusedxml
Expand-Archive "$env:USERPROFILE\Downloads\learning-seed-private.zip" 'D:\DETLENG2\private-learning'
# After verifying importer URL points to the intended database:
py scripts/import_learning.py 'D:\DETLENG2\private-learning\tests-34-51.json'
```

Importer prompts for the legacy service_role key locally (hidden); never send it to ChatGPT or commit it. No overwrite of existing test numbers in a collection. Imported tests are drafts by default; publish through Learning Administration after review. Images are compressed and addressed by SHA-256. Failed imports may leave unreferenced image objects; do not delete objects without checking other test references. To add a new test, create course/collection first, then:

```powershell
py scripts/convert_moodle.py 'D:\DETLENG2\private-learning\Test-52.xml' 52 'D:\DETLENG2\private-learning\Test-52.json'
py scripts/import_learning.py 'D:\DETLENG2\private-learning\Test-52.json' --course DRV-B --section 'General Tests'
```

Use `--language es` or `--language en` with converter for single-language source. Assign students matching language permissions. `--minutes` and `--max-errors` customize rules on import. Import multiple files by running the two commands for each. Publishing test data does not require a GitHub push. Existing course codes can be managed through the admin UI. Keep original XML backups outside GitHub.

## 4. Acceptance before live use

- Verify existing chat login, class management, messages/media, block/restore, deletion, chatbot and inquiry API in a test deployment.
- Verify same-tab session reuse and direct login; no anonymous access; blocked accounts and cross-student attempt IDs denied; direct REST access to all new tables denied.
- Verify English-only/Spanish-only/both, group enrollment and individual deny override, teacher access, hidden/draft tests, course archive, deletion cascade behavior in disposable database.
- Verify correct answers not returned before exam completion, timing, answer selection, scoring, reference image access, image expiry, navigation, mobile, permission revocation, simultaneous requests, failed network requests, unfinished attempts.
- Verify CSV and cleanup preview on dummy records. Confirm database/storage and bandwidth quotas on current Supabase plan and existing usage. Implement remaining blockers above; obtain owner approval before deployment.
- Rollback frontend by reverting the reviewed merge commit (no force push). Do not drop learning tables containing real results without backup and explicit owner approval. Disable new module or function if needed; existing chat uses independent tables/functions.
