@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\upload-test.ps1"
set "rc=%errorlevel%"
echo.
if not "%rc%"=="0" echo Upload stopped or failed. Review the message above.
pause
exit /b %rc%
