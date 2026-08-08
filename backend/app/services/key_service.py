import uuid
import random
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.install_key import InstallKey, KeyStatus
from app.services.activity_service import log_activity

def expire_old_keys(db: Session):
    now = datetime.now(timezone.utc)
    db.query(InstallKey).filter(
        InstallKey.status == KeyStatus.pending,
        InstallKey.expires_at < now
    ).update({InstallKey.status: KeyStatus.expired})
    db.commit()

def generate_key(
    performed_by: uuid.UUID,
    db: Session,
    is_global: bool = False,
    target_device_id: Optional[uuid.UUID] = None
) -> InstallKey:
    expire_old_keys(db)
    
    for _ in range(10): 
        code = str(random.randint(100000, 999999))
        existing = db.query(InstallKey).filter(
            InstallKey.key_code == code,
            InstallKey.status == KeyStatus.pending
        ).first()
        if not existing:
            break
    else:
        raise HTTPException(status_code=500, detail="Could not generate unique key")
        
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    install_key = InstallKey(
        generated_by=performed_by,
        key_code=code,
        status=KeyStatus.pending,
        expires_at=expires_at,
        is_global=is_global,
        device_id=target_device_id
    )
    db.add(install_key)
    db.commit()
    db.refresh(install_key)
    
    key_type = "Global" if is_global else "Per-Device"
    log_activity(db, None, performed_by, f"Generate Install Key ({key_type}): {code}")
    
    return install_key

def validate_key(key_code: str, device_id: uuid.UUID, db: Session) -> bool:
    expire_old_keys(db)
    
    key = db.query(InstallKey).filter(
        InstallKey.key_code == key_code,
        InstallKey.status == KeyStatus.pending
    ).first()
    
    if not key:
        return False
        
    if key.expires_at < datetime.now(timezone.utc):
        key.status = KeyStatus.expired
        db.commit()
        return False
    
    # If the key is tied to a specific device, only that device can use it
    if not key.is_global and key.device_id is not None:
        if key.device_id != device_id:
            return False
    
    # Global keys stay pending (reusable by any device until expired)
    # Per-device keys become used after one validation
    if not key.is_global:
        key.status = KeyStatus.used
        key.device_id = device_id
        db.commit()
    
    return True

