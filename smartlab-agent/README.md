# Panduan Instalasi SmartLab Agent di Komputer Client (Windows)

Panduan ini ditujukan bagi Administrator atau Teknisi Laboratorium yang bertugas memasang aplikasi pemantauan (Agent) secara massal di komputer-komputer client Windows.

## 1. Persiapan Master File (Di Komputer Development)
Sebelum dipasang ke komputer client, Anda harus mengubah *source code* Python menjadi aplikasi Windows (`.exe`) mandiri.
1. Buka komputer yang sudah terpasang Python dan OS Windows.
2. Buka Terminal / PowerShell di dalam folder `smartlab-agent`.
3. **KLIK KANAN** pada file **`build.bat`** (atau `build` saja), lalu pilih **Run as administrator**. Jendela hitam akan tetap terbuka sampai proses selesai.
4. Jika berhasil, akan terbentuk sebuah folder bernama `dist`. Di dalam folder tersebut terdapat 2 file penting:
   - `agent.exe` (Aplikasi utama yang berjalan di latar belakang).
   - `config.exe` (Alat bantu untuk mengisi token secara aman).

## 2. Proses Distribusi
Pindahkan/*copy* keempat file di bawah ini ke dalam sebuah flashdisk, lalu bawa ke komputer-komputer Client di Laboratorium. Letakkan di dalam satu folder khusus yang aman dari jangkauan mahasiswa (Misalnya: `C:\SmartLabAgent\`).
1. `agent.exe` (Dari dalam folder `dist`)
2. `config.exe` (Dari dalam folder `dist`)
3. `install_agent.bat` dan `install_agent.ps1` (Skrip installer)
4. `uninstall_agent.bat` dan `uninstall_agent.ps1` (Skrip uninstaller)

---

## 3. Tahap Instalasi & Konfigurasi (Dilakukan di setiap PC Client)

### Langkah A: Konfigurasi Token (Otentikasi)
Setiap komputer client butuh otentikasi unik agar server bisa membedakan komputer PC-01 dan PC-02.
1. Buka folder `C:\SmartLabAgent\` di komputer client tersebut.
2. Klik dua kali (*double-click*) pada file **`config.exe`**.
3. Jendela hitam (Console) akan terbuka.
4. Masukkan **Server URL** sesuai alamat IP server Proxmox/Backend Anda (contoh: `http://192.168.1.10:8000`).
5. Masukkan **Device Token** yang Anda dapatkan dari *Dashboard* Web Admin untuk PC tersebut.
6. Tekan Enter. Konfigurasi berhasil disimpan dengan aman di Windows Credential Manager.

### Langkah B: Mendaftarkan Background Task (Instalasi)
Langkah ini untuk memastikan agent langsung berjalan otomatis secara tersembunyi ketika PC dinyalakan, bahkan sebelum mahasiswa sempat membuka apapun.
1. Buka folder `C:\SmartLabAgent\` tempat Anda menyimpan file tadi.
2. Cari file bernama **`install_agent.bat`** (atau `install_agent` bertipe Windows Batch File).
3. **KLIK KANAN** pada file tersebut, lalu pilih **"Run as administrator"** (Sangat Penting!).
4. Jendela hitam akan muncul, mengecek hak akses, melewati proteksi Windows, dan menampilkan tulisan hijau *"[Sukses] Agent berjalan di background."*
5. Tekan Enter untuk menutup jendela. **Selesai!** Komputer ini sekarang sudah terhubung dengan server dan bisa di-Lock/Unlock.

---

## 4. Cara Menghapus / Memperbarui Agent (Update)
Jika di masa depan Anda memperbaiki kode agent dan memiliki `agent.exe` versi baru:
1. Buka folder `C:\SmartLabAgent\`.
2. **KLIK KANAN** pada file **`uninstall_agent.bat`**, pilih **Run as administrator**.
3. Jendela hitam akan terbuka dan proses agent lama akan "dibunuh" secara paksa. Tekan Enter untuk menutupnya.
4. *Copy-Paste* dan timpa (Replace) file `agent.exe` lama dengan yang versi baru.
5. Jalankan kembali **`install_agent.bat`** (Run as admin) seperti biasa.
