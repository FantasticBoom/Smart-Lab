import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.schemas.lab import LabCreate, LabUpdate, LabOut
from app.models.lab import Lab
from app.models.device import Device
from app.models.inventory_item import InventoryItem
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[LabOut])
def read_labs(
    type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Lab)
    if type:
        query = query.filter(Lab.type == type)
    labs = query.offset(skip).limit(limit).all()
    return labs

@router.post("/", response_model=LabOut)
def create_lab(
    lab_in: LabCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lab = Lab(
        name=lab_in.name,
        type=lab_in.type,
        location=lab_in.location,
        is_active=lab_in.is_active
    )
    db.add(lab)
    db.commit()
    db.refresh(lab)
    return lab

@router.get("/{lab_id}", response_model=LabOut)
def read_lab(
    lab_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lab = db.query(Lab).filter(Lab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    return lab

@router.put("/{lab_id}", response_model=LabOut)
def update_lab(
    lab_id: uuid.UUID,
    lab_in: LabUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lab = db.query(Lab).filter(Lab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
    
    update_data = lab_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lab, field, value)
        
    db.commit()
    db.refresh(lab)
    return lab

@router.delete("/{lab_id}")
def delete_lab(
    lab_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lab = db.query(Lab).filter(Lab.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
        
    # Prevent deletion if there are associated devices or inventory items
    devices_count = db.query(Device).filter(Device.lab_id == lab_id).count()
    if devices_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete lab with associated devices")
        
    inventory_count = db.query(InventoryItem).filter(InventoryItem.lab_id == lab_id).count()
    if inventory_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete lab with associated inventory items")
        
    db.delete(lab)
    db.commit()
    return {"detail": "Lab deleted successfully"}
