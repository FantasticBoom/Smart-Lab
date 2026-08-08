import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_current_device
from app.models.user import User
from app.models.device import Device
from app.schemas.install_key import InstallKeyOut, ValidateKeyRequest, CreateKeyRequest
from app.services.key_service import generate_key, validate_key, expire_old_keys
from app.models.install_key import InstallKey

router = APIRouter()

@router.post("", response_model=InstallKeyOut)
def create_install_key(
    req: CreateKeyRequest = CreateKeyRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    key = generate_key(
        performed_by=current_user.id,
        db=db,
        is_global=req.is_global,
        target_device_id=req.device_id
    )
    return key

@router.get("", response_model=List[InstallKeyOut])
def list_install_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expire_old_keys(db)
    keys = db.query(InstallKey).order_by(InstallKey.expires_at.desc()).all()
    return keys

@router.post("/validate")
def validate_install_key(
    req: ValidateKeyRequest,
    device: Device = Depends(get_current_device),
    db: Session = Depends(get_db)
):
    is_valid = validate_key(req.key_code, device.id, db)
    if is_valid:
        return {"valid": True, "detail": "Key is valid"}
    else:
        return {"valid": False, "detail": "Key is invalid or expired"}
