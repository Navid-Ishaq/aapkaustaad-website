@echo off
setlocal
cd /d "%~dp0"
py -3 "%~dp0scripts\test_manager.py"
if errorlevel 1 pause
