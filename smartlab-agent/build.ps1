Set-Location -Path $PSScriptRoot

Write-Host "=== Membangun Executable SmartLab Agent ==="

# Memastikan dependensi terinstal
Write-Host "Menginstal dependensi dan PyInstaller..."
pip install -r requirements.txt
pip install pyinstaller

# Menghapus folder sisa build sebelumnya jika ada
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "agent.spec") { Remove-Item -Force "agent.spec" }

# Menjalankan PyInstaller
# --onefile : Menyatukan semua file dalam 1 file .exe
# --noconsole : Menghilangkan jendela hitam console (penting untuk agent)
# Menjalankan PyInstaller untuk Agent Utama
Write-Host "Memulai proses build agent.exe..."
python -m PyInstaller --noconfirm --clean --onefile --noconsole --name "agent" agent.py

# Menjalankan PyInstaller untuk Tool Konfigurasi (Console app)
Write-Host "Memulai proses build config.exe..."
python -m PyInstaller --noconfirm --clean --onefile --name "config" config.py

Write-Host ""
if ((Test-Path "dist\agent.exe") -and (Test-Path "dist\config.exe")) {
    Write-Host "[SUKSES] Build selesai!" -ForegroundColor Green
    Write-Host "File berada di folder 'dist':"
    Write-Host "1. dist\agent.exe (Aplikasi Background)"
    Write-Host "2. dist\config.exe (Aplikasi Setup Token)"
    Write-Host "Pindahkan file-file di atas ke direktori root agent ini dan jalankan install_agent.ps1 untuk melakukan instalasi."
} else {
    Write-Host "[GAGAL] File .exe tidak ditemukan di folder dist!" -ForegroundColor Red
    Write-Host "Proses PyInstaller sepertinya terhenti atau crash sebelum selesai." -ForegroundColor Yellow
}

Write-Host ""
Read-Host -Prompt "Tekan Enter untuk menutup jendela ini..."
