# Smart-Lab Management System 

Smart-Lab adalah sistem manajemen laboratorium terpadu dan cerdas. Sistem ini dirancang untuk mengelola peminjaman lab, inventarisasi barang, penjadwalan, hingga kontrol akses pintu secara otomatis menggunakan perangkat IoT.

Proyek ini mencakup ekosistem lengkap mulai dari antarmuka web, API, perangkat keras, *background agent* untuk komputer lab, hingga ekstensi browser.

## Struktur Proyek

Repository ini menggunakan arsitektur *monorepo* yang terdiri dari beberapa modul utama:

- **`/backend`** - REST API yang dibangun menggunakan Python (FastAPI). Menangani logika bisnis, database (SQLAlchemy & Alembic), autentikasi, WebSockets, dan pembuatan dokumen PDF (Berita Acara).
- **`/frontend`** - Antarmuka pengguna (Dashboard) interaktif yang dibangun dengan React.js, TypeScript, dan Vite.
- **`/iot-firmware`** - Kode C/C++ (Arduino IDE) untuk perangkat keras / mikrokontroler yang mengatur sistem kunci pintu (Smart Lock).
- **`/smartlab-agent`** - Program *client/agent* berbasis Python yang berjalan di latar belakang komputer laboratorium.
- **`/smartlab-extension`** - Ekstensi browser (Chrome/Edge) pendukung untuk memfasilitasi fungsionalitas tambahan.

## Fitur Utama

- **Dashboard & Analitik:** Pemantauan aktivitas lab secara *real-time*.
- **Manajemen Peminjaman & Penjadwalan:** Sistem *booking* lab dan persetujuan jadwal.
- **Manajemen Inventaris:** Pendataan perangkat, komputer, dan spesifikasi barang di dalam lab.
- **Kontrol Akses Cerdas (Smart Lock):** Integrasi IoT untuk membuka/menutup pintu lab sesuai jadwal dan otorisasi.
- **Generate Berita Acara:** Pembuatan laporan atau berita acara serah terima lab secara otomatis dalam format PDF.
- **Live Monitoring (WebSocket):** Komunikasi dua arah untuk status perangkat dan agen secara *real-time*.

## Tech Stack

**Frontend:**
- React 18, TypeScript, Vite
- Tailwind CSS (berdasarkan struktur UI components)
- Zustand / Context API (State Management)

**Backend:**
- Python 3.8+
- FastAPI, Uvicorn
- SQLAlchemy (ORM), Alembic (Database Migrations)

**IoT & Lainnya:**
- C/C++ (Arduino Framework)
- WebSockets

---

## Panduan Instalasi (Quick Start)

> **Catatan Penting:** Untuk instruksi instalasi dan *deployment* yang lebih rinci, silakan merujuk pada file **`PANDUAN_INSTALLASI.txt`** yang ada di direktori utama repository ini.

### 1. Setup Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Untuk Windows: venv\Scripts\activate
pip install -r requirements.txt

# Menjalankan migrasi database
alembic upgrade head

# Menjalankan server
uvicorn app.main:app --reload
```

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Setup Smartlab-agent
```
Silakan jalankan script instalasi yang telah disediakan di folder smartlab-agent (gunakan install_agent.bat untuk Windows atau install_agent.ps1 untuk PowerShell).
panduan lengkap ada pada file PANDUAN_INSTALLASI.txt
```

## Kontribusi
Silakan buat Pull Request atau laporkan Issue jika Anda menemukan bug atau memiliki saran fitur baru untuk pengembangan Smart-Lab ini.
