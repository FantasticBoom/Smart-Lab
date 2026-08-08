import uuid
import os
import shutil
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.schemas.inventory import InventoryItemCreate, InventoryItemUpdate, InventoryItemOut
from app.models.inventory_item import InventoryItem
from app.models.lab import Lab
from app.models.user import User
from app.models.berita_acara import BeritaAcara, StatusPenanganan

router = APIRouter()

# Setup upload directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/labs/{lab_id}/inventory-items", response_model=List[InventoryItemOut])
def list_inventory_items(
    lab_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lab = db.query(Lab).filter(Lab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
        
    items = db.query(InventoryItem).filter(InventoryItem.lab_id == lab_id).all()
    return items

@router.post("/labs/{lab_id}/inventory-items", response_model=InventoryItemOut)
def create_inventory_item(
    lab_id: uuid.UUID,
    item_in: InventoryItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lab = db.query(Lab).filter(Lab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
        
    item = InventoryItem(
        lab_id=lab_id,
        name=item_in.name,
        specification=item_in.specification,
        quantity=item_in.quantity,
        condition=item_in.condition
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/inventory-items/{id}", response_model=InventoryItemOut)
def update_inventory_item(
    id: uuid.UUID,
    item_in: InventoryItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(InventoryItem).filter(InventoryItem.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    # Ambil keterangan kerusakan sebelum di-exclude dari update data
    keterangan_kerusakan = item_in.keterangan_kerusakan
    kondisi_baru = item_in.condition

    update_data = item_in.model_dump(exclude_unset=True, exclude={"keterangan_kerusakan"})
    for field, value in update_data.items():
        setattr(item, field, value)

    # Jika kondisi berubah ke "Perlu Perbaikan", buat entri berita acara
    if kondisi_baru and kondisi_baru.lower() in ("perlu perbaikan", "perbaikan"):
        if not keterangan_kerusakan:
            raise HTTPException(
                status_code=422,
                detail="Keterangan kerusakan wajib diisi ketika kondisi 'Perlu Perbaikan'"
            )
        ba = BeritaAcara(
            inventory_item_id=item.id,
            lab_id=item.lab_id,
            keterangan_kerusakan=keterangan_kerusakan,
            status_penanganan=StatusPenanganan.perlu_perbaikan,
            tanggal_lapor=datetime.utcnow()
        )
        db.add(ba)

    db.commit()
    db.refresh(item)
    return item

@router.delete("/inventory-items/{id}")
def delete_inventory_item(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(InventoryItem).filter(InventoryItem.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
        
    db.delete(item)
    db.commit()
    return {"detail": "Inventory item deleted successfully"}

@router.post("/inventory-items/{id}/photo", response_model=InventoryItemOut)
def upload_inventory_photo(
    id: uuid.UUID,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(InventoryItem).filter(InventoryItem.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
        
    file_ext = os.path.splitext(photo.filename)[1]
    filename = f"inventory_{id}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)
        
    photo_url = f"/uploads/{filename}"
    item.photo_url = photo_url
    
    db.commit()
    db.refresh(item)
    return item
