import uuid
import os
import shutil
import secrets
from datetime import datetime
from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.schemas.device import (
    DeviceCreate, DeviceUpdate, DeviceListOut, DeviceDetailOut, DeviceSpecOut
)
from app.models.device import Device
from app.models.device_spec import DeviceSpec
from app.models.lab import Lab
from app.models.user import User
from app.models.berita_acara import BeritaAcara, StatusPenanganan
from app.services.lock_service import send_lock_command
from app.models.pending_command import CommandType
from app.services.activity_service import log_activity
from pydantic import BaseModel

class DeviceStatusOut(BaseModel):
    lock_status: str
    status: str
    last_window_title: Optional[str] = None

router = APIRouter()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/labs/{lab_id}/devices", response_model=List[DeviceDetailOut])
def list_devices_in_lab(
    lab_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lab = db.query(Lab).filter(Lab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
        
    devices = db.query(Device).filter(Device.lab_id == lab_id).all()
    return devices

@router.post("/labs/{lab_id}/devices", response_model=DeviceDetailOut)
def create_device(
    lab_id: uuid.UUID,
    device_in: DeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lab = db.query(Lab).filter(Lab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
        
    # Check if code is unique per lab
    existing = db.query(Device).filter(Device.lab_id == lab_id, Device.code == device_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device code already exists in this lab")
        
    device_token = secrets.token_urlsafe(32)
    
    device = Device(
        lab_id=lab_id,
        code=device_in.code,
        device_token=device_token,
        condition=device_in.condition,
        photo_url=device_in.photo_url
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    
    # Add specs
    if device_in.specs:
        for k, v in device_in.specs.items():
            spec = DeviceSpec(
                device_id=device.id,
                spec_key=k,
                spec_value=v
            )
            db.add(spec)
        db.commit()
        db.refresh(device)
        
    return device

@router.get("/devices/{id}", response_model=DeviceDetailOut)
def get_device_detail(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = db.query(Device).filter(Device.id == id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

@router.put("/devices/{id}", response_model=DeviceDetailOut)
def update_device_info(
    id: uuid.UUID,
    device_in: DeviceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = db.query(Device).filter(Device.id == id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    kondisi_baru = device_in.condition
    keterangan_kerusakan = device_in.keterangan_kerusakan

    if kondisi_baru is not None:
        device.condition = kondisi_baru
    if hasattr(device_in, 'code') and device_in.code is not None:
        device.code = device_in.code
    if device_in.origin is not None:
        device.origin = device_in.origin
    if device_in.handover_date is not None:
        device.handover_date = device_in.handover_date

    # Jika kondisi berubah ke "Perlu Perbaikan", buat entri berita acara
    if kondisi_baru and kondisi_baru.lower() in ("perlu perbaikan", "perbaikan"):
        if not keterangan_kerusakan:
            raise HTTPException(
                status_code=422,
                detail="Keterangan kerusakan wajib diisi ketika kondisi 'Perlu Perbaikan'"
            )
        ba = BeritaAcara(
            device_id=device.id,
            lab_id=device.lab_id,
            keterangan_kerusakan=keterangan_kerusakan,
            status_penanganan=StatusPenanganan.perlu_perbaikan,
            tanggal_lapor=datetime.utcnow()
        )
        db.add(ba)

    db.commit()
    db.refresh(device)
    return device

@router.put("/devices/{id}/specs", response_model=DeviceDetailOut)
def update_device_specs(
    id: uuid.UUID,
    specs: Dict[str, str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = db.query(Device).filter(Device.id == id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    # Remove old specs
    db.query(DeviceSpec).filter(DeviceSpec.device_id == id).delete()
    db.flush()
    
    # Insert new specs
    for k, v in specs.items():
        spec = DeviceSpec(
            device_id=device.id,
            spec_key=k,
            spec_value=v
        )
        db.add(spec)
        
    db.commit()
    db.refresh(device)
    return device

@router.delete("/devices/{id}")
def delete_device(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = db.query(Device).filter(Device.id == id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    db.delete(device)
    db.commit()
    return {"detail": "Device deleted successfully"}

@router.post("/devices/{id}/photo", response_model=DeviceDetailOut)
def upload_device_photo(
    id: uuid.UUID,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = db.query(Device).filter(Device.id == id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    file_ext = os.path.splitext(photo.filename)[1]
    filename = f"device_{id}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)
        
    device.photo_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(device)
    return device

@router.post("/devices/{id}/lock")
async def lock_device(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await send_lock_command(id, CommandType.lock, current_user.id, db)
    log_activity(db, id, current_user.id, "Lock Device")
    return {"detail": "Lock command sent"}

@router.post("/devices/{id}/unlock")
async def unlock_device(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await send_lock_command(id, CommandType.unlock, current_user.id, db)
    log_activity(db, id, current_user.id, "Unlock Device")
    return {"detail": "Unlock command sent"}

@router.get("/devices/{id}/status", response_model=DeviceStatusOut)
def get_device_status(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = db.query(Device).filter(Device.id == id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    return {
        "lock_status": device.lock_status.value,
        "status": device.status.value,
        "last_window_title": None
    }
