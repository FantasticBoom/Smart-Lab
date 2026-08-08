import io
import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.units import inch
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

def generate_qr_code(data: str) -> io.BytesIO:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    return img_byte_arr

def generate_approval_pdf(booking_data: dict, verification_url: str) -> bytes:
    """
    Men-generate PDF persetujuan dengan QR code.
    booking_data: dict berisi informasi peminjaman (nama, npm, lab, tanggal, dll).
    verification_url: url yang akan di-encode ke QR code.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Center', alignment=1))
    styles.add(ParagraphStyle(name='Justify', alignment=TA_JUSTIFY))
    
    elements = []
    
    # Kop Surat
    try:
        kop_img = RLImage("app/assets/uigm.png", width=1.5*inch, height=0.6*inch)
    except Exception:
        kop_img = ""
        
    kop_text = """<font size=11><b>LEMBAGA PENGELOLAAN</b></font><br/>
<font size=11><b>TEKNOLOGI INFORMASI DAN KOMUNIKASI</b></font><br/>
<font size=11><b>BAGIAN LABORATORIUM, JARINGAN DAN HARDWARE</b></font><br/>
<font size=11><b>UNIVERSITAS INDO GLOBAL MANDIRI</b></font>"""
    kop_paragraph = Paragraph(kop_text, styles['Center'])
    
    kop_table = Table([[kop_img, kop_paragraph]], colWidths=[1.8*inch, 4.7*inch])
    kop_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (0,0), 'LEFT'),
        ('ALIGN', (1,0), (1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LINEBELOW', (0,0), (-1,-1), 1.5, colors.black),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    
    elements.append(kop_table)
    elements.append(Spacer(1, 0.3 * inch))
    
    # Title
    elements.append(Paragraph("<b>SURAT PERSETUJUAN PEMINJAMAN LAB</b>", styles['Title']))
    elements.append(Spacer(1, 0.4 * inch))
    
    # Text Content
    elements.append(Paragraph("Telah disetujui peminjaman fasilitas laboratorium dengan rincian sebagai berikut:", styles['Justify']))
    elements.append(Spacer(1, 0.2 * inch))
    
    # Data Table
    start_dt = booking_data.get('start_datetime')
    if isinstance(start_dt, datetime):
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=timezone.utc)
        start_str = start_dt.astimezone(ZoneInfo("Asia/Jakarta")).strftime("%d %B %Y, %H:%M")
    else:
        start_str = start_dt

    end_dt = booking_data.get('end_datetime')
    if isinstance(end_dt, datetime):
        if end_dt.tzinfo is None:
            end_dt = end_dt.replace(tzinfo=timezone.utc)
        end_str = end_dt.astimezone(ZoneInfo("Asia/Jakarta")).strftime("%d %B %Y, %H:%M")
    else:
        end_str = end_dt
    
    data = [
        ["Booking ID", ":", booking_data.get('booking_id', '-')],
        ["Nama Lengkap", ":", booking_data.get('user_name', '-')],
        ["NPM", ":", booking_data.get('user_npm', '-')],
        ["Tipe LAB", ":", booking_data.get('lab_type', '-')],
        ["Nama LAB", ":", booking_data.get('lab_name', '-')],
        ["Waktu Mulai", ":", start_str],
        ["Waktu Selesai", ":", end_str],
        ["Tujuan", ":", booking_data.get('purpose', '-')],
        ["Jumlah Orang", ":", str(booking_data.get('num_people', 1))],
    ]
    
    t = Table(data, colWidths=[1.5*inch, 0.2*inch, 4*inch])
    t.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 0.5 * inch))
    
    elements.append(Paragraph("Surat ini diterbitkan secara otomatis oleh sistem Smart-Lab dan merupakan bukti sah peminjaman ruangan. Harap tunjukkan surat ini kepada asisten laboratorium yang bertugas beserta scan QR Code di bawah ini untuk verifikasi.", styles['Justify']))
    elements.append(Spacer(1, 0.5 * inch))
    
    # QR Code
    qr_img_buffer = generate_qr_code(verification_url)
    qr_img = RLImage(qr_img_buffer, width=1.5*inch, height=1.5*inch)
    elements.append(qr_img)
    
    # Build PDF
    doc.build(elements)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
