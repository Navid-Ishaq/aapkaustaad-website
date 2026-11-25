@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\push.ps1"
set RC=%ERRORLEVEL%
pause
exit /b %RC%
