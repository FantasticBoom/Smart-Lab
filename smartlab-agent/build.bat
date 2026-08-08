@echo off
color 0A
echo Memulai proses build agent...
echo Memanggil PowerShell (Bypass Execution Policy)...

powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0build.ps1"

echo.
pause
