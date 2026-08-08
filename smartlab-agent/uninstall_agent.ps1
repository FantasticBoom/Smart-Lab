$TaskName = "SmartLabAgent"

Write-Host "=== SmartLab Agent Uninstaller / Updater ==="

# Cek apakah Scheduled Task ada
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($task) {
    Write-Host "Menghentikan Scheduled Task '$TaskName'..."
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    
    # Tunggu beberapa detik untuk memastikan proses berhenti
    Start-Sleep -Seconds 2
    
    Write-Host "Menghapus (unregister) Scheduled Task '$TaskName'..."
    try {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "[Sukses] Scheduled Task telah dihapus."
    } catch {
        Write-Host "[Error] Gagal menghapus task. Pastikan script ini dijalankan sebagai Administrator."
    }
} else {
    Write-Host "[Info] Scheduled Task '$TaskName' tidak ditemukan."
}

# Hentikan paksa (kill) jika masih ada sisa proses agent.exe yang berjalan di memori
$processes = Get-Process -Name "agent" -ErrorAction SilentlyContinue
if ($processes) {
    Write-Host "Menghentikan paksa sisa proses agent.exe yang berjalan..."
    try {
        Stop-Process -Name "agent" -Force
        Write-Host "[Sukses] Proses agent.exe telah dihentikan."
    } catch {
        Write-Host "[Error] Gagal menghentikan proses agent.exe."
    }
}

Write-Host "`nUninstall/Stop selesai."
Write-Host "Sekarang Anda dapat me-replace file agent.exe jika ingin melakukan UPDATE."
Write-Host "Setelah di-replace, jalankan kembali install_agent.ps1."

Write-Host ""
Read-Host -Prompt "Tekan Enter untuk menutup jendela ini..."
