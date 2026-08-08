@echo off
color 0A
echo Memeriksa hak akses Administrator...

:: Cek apakah dijalankan sebagai Administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Hak akses Administrator terdeteksi.
    echo Memulai proses uninstall...
    powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0uninstall_agent.ps1"
) else (
    color 0C
    echo =======================================================
    echo [ERROR] AKSES DITOLAK!
    echo Anda belum menjalankan file ini sebagai Administrator.
    echo.
    echo CARA MEMPERBAIKI:
    echo 1. Tutup jendela hitam ini.
    echo 2. KLIK KANAN pada file "uninstall_agent.bat".
    echo 3. Pilih "Run as administrator" (Jalankan sebagai administrator).
    echo =======================================================
)

echo.
pause
