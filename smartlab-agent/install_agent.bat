@echo off
color 0A
echo =====================================================
echo      SmartLab Agent - Installer
echo =====================================================
echo.

:: ---- Cek Administrator ----
net session >nul 2>&1
if NOT %errorLevel% == 0 (
    color 0C
    echo [ERROR] Anda harus menjalankan file ini sebagai Administrator!
    echo.
    echo Caranya:
    echo  1. Tutup jendela ini.
    echo  2. KLIK KANAN pada file "install_agent.bat"
    echo  3. Pilih "Run as administrator"
    echo.
    goto END
)

:: ---- Cek agent.py ----
if not exist "%~dp0agent.py" (
    color 0C
    echo [ERROR] File "agent.py" tidak ditemukan di folder ini!
    echo.
    echo Pastikan file "agent.py" berada di folder yang sama dengan
    echo file "install_agent.bat" ini, yaitu:
    echo %~dp0
    echo.
    goto END
)

:: ---- Hapus task lama jika ada ----
echo Menghapus task lama (jika ada)...
schtasks /delete /tn "SmartLabAgent" /f >nul 2>&1

:: ---- Daftarkan Scheduled Task baru ----
schtasks /create /tn "SmartLabAgent" /tr "\"%~dp0agent.exe\"" /sc ONLOGON /ru "BUILTIN\Users" /rl HIGHEST /f

if %errorLevel% == 0 (
    color 0A
    echo.
    echo [SUKSES] Agent berhasil didaftarkan ke Task Scheduler!
    echo Agent akan berjalan otomatis di background setiap PC dinyalakan.
    echo.
    echo Menjalankan agent sekarang...
    schtasks /run /tn "SmartLabAgent"
    echo [SUKSES] Agent berjalan di background.
) else (
    color 0C
    echo.
    echo [ERROR] Gagal mendaftarkan Task Scheduler.
)

:END
echo.
echo Tekan sembarang tombol untuk menutup jendela ini...
pause >nul
