# Sticky management shortcuts

Implemented in `D:\DETLENG2\aapkaustaad-website`.

Click Manage classes & students to show a sticky shortcut bar between the site menu and blue banner. Owner sees Class groups, Create student account, Student access & memberships, Teacher Admins and Class history cleanup. Teacher Admins see only the first three. Students have no shortcut bar. Closing management hides the bar.

Each section includes Back to top. Section navigation accounts for both the site menu and shortcut bar so headings remain visible. The cleanup shortcut opens its collapsed section. On mobile, shortcuts scroll horizontally within the bar. Reduced-motion preferences are respected.

Files changed: student-chat.html, student-chat.js, student-chat-media.css; new student-chat-navigation.js. No SQL migration or Supabase function deployment is needed.

Browser checks passed for Owner/Teacher/Student visibility, five destination links, heading offsets, sticky position, all Back to top links, open/close state and widths 1280/820/390/320 px. Class-management browser regression also passed. Browser checks used mock accounts.

## Publish

```powershell
robocopy 'D:\DETLENG2\aapkaustaad-website' 'D:\DETLENG2\aapkaustaad-website-publish' /E /XD .git node_modules .temp .branches /XF .env .env.* *.log
if ($LASTEXITCODE -ge 8) { throw 'Copy failed. Stop here.' }
Set-Location 'D:\DETLENG2\aapkaustaad-website-publish'
git status --short
git diff --stat
git diff
# After review:
git add .
git commit -m "Add sticky admin management shortcuts"
if ($LASTEXITCODE -ne 0) { throw 'Commit failed. Stop here.' }
git push origin main
```

Refresh the live page with Ctrl+F5 after hosting updates. If Git reports nothing to commit, do not repeat the commit. No push or production changes were performed by the coding agent.
