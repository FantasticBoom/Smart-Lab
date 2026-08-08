import smtplib
from email.message import EmailMessage
import os
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Kredensial SMTP ditarik dari Environment Variables
# Panduan untuk mendapatkan App Password Gmail:
# 1. Buka Akun Google Anda (myaccount.google.com).
# 2. Buka bagian "Keamanan" (Security).
# 3. Aktifkan "Verifikasi 2 Langkah" (2-Step Verification) jika belum aktif.
# 4. Cari "Sandi Aplikasi" (App Passwords) di bilah pencarian atau di bawah menu Verifikasi 2 Langkah.
# 5. Buat sandi aplikasi baru dengan nama misal "SmartLab App".
# 6. Salin 16 digit password yang muncul.
# 7. Letakkan di file .env backend Anda seperti ini:
# SMTP_SERVER=smtp.gmail.com
# SMTP_PORT=465
# SMTP_USERNAME=email.anda@gmail.com
# SMTP_PASSWORD=16digitpasswordtanpaspasi

SMTP_SERVER = settings.SMTP_SERVER
SMTP_PORT = settings.SMTP_PORT
SMTP_USERNAME = settings.SMTP_USERNAME
SMTP_PASSWORD = settings.SMTP_PASSWORD

def send_approval_email(to_email: str, student_name: str, lab_name: str, pdf_bytes: bytes, filename: str = "Surat_Persetujuan_Lab.pdf") -> bool:
    """Mengirim email persetujuan beserta lampiran PDF"""
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.error("Kredensial SMTP belum diatur di .env. Email gagal dikirim.")
        return False
        
    msg = EmailMessage()
    msg['Subject'] = 'Persetujuan Peminjaman Ruang LAB'
    msg['From'] = SMTP_USERNAME
    msg['To'] = to_email

    msg.set_content(f"""Halo {student_name},

Permohonan peminjaman ruang {lab_name} Anda telah disetujui.
Silakan temukan surat persetujuan terlampir pada email ini.
Tunjukkan file ini beserta QR Code di dalamnya kepada petugas LAB yang bertugas saat Anda menggunakan ruangan.

Terima kasih,
LPTIK UIGM
""")

    # Attach PDF
    msg.add_attachment(pdf_bytes, maintype='application', subtype='pdf', filename=filename)

    try:
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        logger.info(f"Email persetujuan berhasil dikirim ke {to_email}")
        return True
    except Exception as e:
        logger.error(f"Gagal mengirim email ke {to_email}: {e}")
        return False

def send_rejection_email(to_email: str, student_name: str) -> bool:
    """Mengirim email penolakan"""
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.error("Kredensial SMTP belum diatur di .env. Email gagal dikirim.")
        return False
        
    msg = EmailMessage()
    msg['Subject'] = 'Penolakan Peminjaman Ruang LAB'
    msg['From'] = SMTP_USERNAME
    msg['To'] = to_email

    msg.set_content(f"""Halo {student_name},

Mohon maaf, permohonan peminjaman ruang LAB Anda tidak dapat disetujui pada waktu tersebut karena bentrok dengan jadwal lain atau alasan operasional.
Silakan ajukan permohonan peminjaman di waktu yang berbeda.

Terima kasih,
Tim Admin Smart-Lab
""")

    try:
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        logger.info(f"Email penolakan berhasil dikirim ke {to_email}")
        return True
    except Exception as e:
        logger.error(f"Gagal mengirim email ke {to_email}: {e}")
        return False
