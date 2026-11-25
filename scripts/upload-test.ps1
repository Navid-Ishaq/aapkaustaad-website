$ErrorActionPreference = 'Stop'
try {
    $repo = Split-Path -Parent $PSScriptRoot
    $private = 'D:\DETLENG2\private-learning'
    $url = 'https://wxgtrydzkrlimmlnvhdk.supabase.co'
    Set-Location -LiteralPath $repo
    foreach ($f in @('scripts/convert_moodle.py','scripts/import_learning.py')) {
        if (!(Test-Path -LiteralPath $f)) { throw "Missing $f" }
    }
    if (!(Test-Path -LiteralPath $private -PathType Container)) { throw 'Private folder missing' }
    Add-Type -AssemblyName System.Windows.Forms
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.InitialDirectory = $private
    $dialog.Filter = 'Moodle XML (*.xml)|*.xml'
    $dialog.Title = 'Select a private Moodle XML test'
    if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return }
    $xml = [IO.Path]::GetFullPath($dialog.FileName)
    $dialog.Dispose()
    if (!$xml.StartsWith($private + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Move the XML to private-learning first.' }
    $course = (Read-Host 'Course code [DRV-B]').Trim(); if (!$course) { $course = 'DRV-B' }
    $section = (Read-Host 'Collection name [General Tests]').Trim(); if (!$section) { $section = 'General Tests' }
    $number = (Read-Host 'Test number').Trim()
    if ($number -notmatch '^[1-9][0-9]{0,8}$') { throw 'Enter a positive test number' }
    $language = (Read-Host 'Language: both (Spanish then English), es, en [both]').Trim(); if (!$language) { $language = 'both' }
    if ($language -notin @('both','es','en')) { throw 'Invalid language' }
    $minutes = (Read-Host 'Exam minutes [30]').Trim(); if (!$minutes) { $minutes = '30' }
    $errors = (Read-Host 'Maximum allowed errors [3]').Trim(); if (!$errors) { $errors = '3' }
    if ($minutes -notmatch '^[1-9][0-9]{0,3}$' -or $errors -notmatch '^[0-9]{1,3}$') { throw 'Invalid exam settings' }
    $outdir = Join-Path $private 'converted'
    New-Item -ItemType Directory -Path $outdir -Force | Out-Null
    $out = Join-Path $outdir ('test-' + $number + '-' + [guid]::NewGuid().ToString('N') + '.json')
    py scripts/convert_moodle.py $xml $number $out --language $language
    if ($LASTEXITCODE -ne 0) { throw 'Conversion failed; nothing uploaded' }
    $summary = Get-Content -LiteralPath $out -Raw -Encoding UTF8 | ConvertFrom-Json
    $questions = @($summary.PSObject.Properties[$number].Value)
    if ([int]$errors -ge $questions.Count) { throw 'Maximum errors must be less than question count' }
    Write-Host "Course: $course | Collection: $section | Test: $number | Questions: $($questions.Count) | Language: $language | Minutes: $minutes | Max errors: $errors"
    Write-Host 'Upload mode: DRAFT only. Existing test numbers will not be overwritten.'
    Write-Host "Private converted file: $out"
    if ((Read-Host 'Review the converted file if needed. Type UPLOAD to continue') -cne 'UPLOAD') { return }
    Write-Host 'Copy the legacy service_role key from the correct Supabase project, then return here.'
    Start-Process 'https://supabase.com/dashboard/project/wxgtrydzkrlimmlnvhdk/settings/api-keys'
    [void](Read-Host 'Press ENTER after copying the key (do not paste it here)')
    try {
        $key = (Get-Clipboard -Raw).Trim()
        if ($key -notmatch '^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$') { throw 'Copy the legacy service_role key, not the publishable key' }
        $env:ALNOOR_IMPORT_KEY = $key
        Set-Clipboard -Value ' '
        py scripts/import_learning.py $out --url $url --course $course --section $section --minutes $minutes --max-errors $errors --production
        if ($LASTEXITCODE -ne 0) { throw 'Import failed; inspect the error before retrying' }
    } finally {
        Remove-Item Env:ALNOOR_IMPORT_KEY -ErrorAction SilentlyContinue
        Remove-Variable key -ErrorAction SilentlyContinue
        Set-Clipboard -Value ' '
    }
    Write-Host 'Importer finished. Check whether it reported Imported or Skipping existing.' -ForegroundColor Green
    Start-Process 'https://aapkaustaad.com/learning/'
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
