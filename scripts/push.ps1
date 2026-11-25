$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
function GitRun { & git @args; if($LASTEXITCODE -ne 0){throw "Git failed: $args"} }
if (!(Test-Path .git)){throw 'This ZIP has no Git history. Follow LEARNING-DEPLOYMENT.md to clone and overlay it first.'}
$remote=(& git remote get-url origin).Trim()
if($remote -notmatch 'github\.com[:/]Navid-Ishaq/aapkaustaad-website(?:\.git)?$'){throw 'Unexpected origin'}
$branch=(& git branch --show-current).Trim()
if(!$branch){throw 'Detached HEAD'}
GitRun fetch origin
GitRun status --short
GitRun add -A
$files=@(& git diff --cached --name-only)
if($files | Where-Object {$_ -match '(?i)(^|/)(private-learning/|\.env($|\.)|.*\.xml$|learning-seed.*\.zip$|learning-history.*\.csv$)' -and $_ -notmatch '\.env\.example$'}){throw 'Private material staged. Unstage before pushing.'}
GitRun diff --cached --stat
if((Read-Host "Review staged changes. Push to $branch? Type PUSH") -ne 'PUSH'){throw 'Cancelled; no push'}
if($files.Count){$msg=Read-Host 'Commit message';if(!$msg){$msg='Update academy website'};GitRun commit -m $msg}
GitRun push -u origin $branch
