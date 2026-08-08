param (
    [string]$AgentExePath = "$PSScriptRoot\agent.exe"
)

$TaskName = "SmartLabAgent"
$TaskDescription = "Runs the SmartLab Agent in the background"

Write-Host "=== SmartLab Agent Installer ==="

# Pastikan file exe ada (akan dibuild di tahap 2.6)
if (-not (Test-Path $AgentExePath)) {
    Write-Host "[Peringatan] Executable agent tidak ditemukan di $AgentExePath."
    Write-Host "Pastikan Anda sudah mem-build agent.py menggunakan PyInstaller sebelum menjalankan script ini."
    # Kita tidak exit karena mungkin user hanya ingin mencoba meregister task
}

# Action: Jalankan via PowerShell Wrapper secara tersembunyi (Hidden)
# Sesuai requirement: -WindowStyle Hidden
$ActionArgs = "-WindowStyle Hidden -Command `\"& '$AgentExePath'`\""
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $ActionArgs

# Trigger: Dijalankan saat user Log On
$Trigger = New-ScheduledTaskTrigger -AtLogOn

# Principal: Dijalankan sebagai grup Interactive Users agar GUI (dialog) bisa muncul
$Principal = New-ScheduledTaskPrincipal -GroupId "BUILTIN\Users" -RunLevel Highest

Write-Host "Meregistrasikan Scheduled Task '$TaskName'..."
try {
    Register-ScheduledTask -TaskName $TaskName -Description $TaskDescription -Action $Action -Trigger $Trigger -Principal $Principal -Force | Out-Null
    Write-Host "[Sukses] Scheduled Task berhasil dibuat."
    
    Write-Host "Memulai agent sekarang..."
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "[Sukses] Agent berjalan di background."
} catch {
    Write-Host "[Error] Gagal membuat Scheduled Task. Pastikan script dijalankan sebagai Administrator (Run as Administrator)."
    Write-Host $_.Exception.Message
}

Write-Host ""
Read-Host -Prompt "Tekan Enter untuk menutup jendela ini..."
