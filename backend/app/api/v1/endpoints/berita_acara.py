import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, get_current_user
from app.models.berita_acara import BeritaAcara, StatusPenanganan
from app.models.inventory_item import InventoryItem
from app.models.user import User
from app.schemas.berita_acara import BeritaAcaraCreate, BeritaAcaraUpdate, BeritaAcaraOut

router = APIRouter()


@router.get("/berita-acara", response_model=List[BeritaAcaraOut])
def list_berita_acara(
    aktif_only: bool = Query(False, description="Jika True, hanya tampilkan status perlu_perbaikan"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List semua berita acara (history lengkap), atau hanya yang aktif."""
    query = db.query(BeritaAcara).options(
        joinedload(BeritaAcara.inventory_item),
        joinedload(BeritaAcara.device),
        joinedload(BeritaAcara.lab)
    )
    if aktif_only:
        query = query.filter(BeritaAcara.status_penanganan == StatusPenanganan.perlu_perbaikan)
    return query.order_by(BeritaAcara.tanggal_lapor.desc()).all()


@router.get("/berita-acara/{id}", response_model=BeritaAcaraOut)
def get_berita_acara(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detail satu berita acara."""
    ba = db.query(BeritaAcara).options(
        joinedload(BeritaAcara.inventory_item),
        joinedload(BeritaAcara.device),
        joinedload(BeritaAcara.lab)
    ).filter(BeritaAcara.id == id).first()
    if not ba:
        raise HTTPException(status_code=404, detail="Berita acara tidak ditemukan")
    return ba


@router.post("/berita-acara", response_model=BeritaAcaraOut)
def create_berita_acara(
    data: BeritaAcaraCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Buat berita acara baru secara manual (opsional, biasanya dibuat otomatis dari inventory)."""
    item = db.query(InventoryItem).filter(InventoryItem.id == data.inventory_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Aset inventaris tidak ditemukan")

    ba = BeritaAcara(
        inventory_item_id=data.inventory_item_id,
        lab_id=data.lab_id,
        keterangan_kerusakan=data.keterangan_kerusakan,
        status_penanganan=StatusPenanganan.perlu_perbaikan,
        tanggal_lapor=datetime.utcnow()
    )
    db.add(ba)
    db.commit()
    db.refresh(ba)

    # Reload with relationships
    ba = db.query(BeritaAcara).options(
        joinedload(BeritaAcara.inventory_item),
        joinedload(BeritaAcara.device),
        joinedload(BeritaAcara.lab)
    ).filter(BeritaAcara.id == ba.id).first()
    return ba


@router.put("/berita-acara/{id}", response_model=BeritaAcaraOut)
def update_berita_acara(
    id: uuid.UUID,
    data: BeritaAcaraUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update status penanganan berita acara.
    - Jika telah_diperbaiki atau alat_baru → kondisi aset berubah ke 'Baik'
    - Data tetap tersimpan sebagai history
    """
    ba = db.query(BeritaAcara).options(
        joinedload(BeritaAcara.inventory_item)
    ).filter(BeritaAcara.id == id).first()
    if not ba:
        raise HTTPException(status_code=404, detail="Berita acara tidak ditemukan")

    if ba.status_penanganan != StatusPenanganan.perlu_perbaikan:
        raise HTTPException(
            status_code=400,
            detail="Berita acara ini sudah ditangani dan tidak dapat diubah lagi"
        )

    ba.status_penanganan = data.status_penanganan
    ba.keterangan_perbaikan = data.keterangan_perbaikan
    ba.tanggal_selesai = datetime.utcnow()

    # Update kondisi aset di inventaris menjadi "Baik"
    if data.status_penanganan in (StatusPenanganan.telah_diperbaiki, StatusPenanganan.alat_baru):
        item = db.query(InventoryItem).filter(InventoryItem.id == ba.inventory_item_id).first()
        if item:
            item.condition = "Baik"

    db.commit()
    db.refresh(ba)

    # Reload with relationships
    ba = db.query(BeritaAcara).options(
        joinedload(BeritaAcara.inventory_item),
        joinedload(BeritaAcara.device),
        joinedload(BeritaAcara.lab)
    ).filter(BeritaAcara.id == ba.id).first()
    return ba
