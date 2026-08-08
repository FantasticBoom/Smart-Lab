from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class InventoryItemBase(BaseModel):
    name: str
    specification: Optional[str] = None
    quantity: int = 0
    condition: Optional[str] = None

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    specification: Optional[str] = None
    quantity: Optional[int] = None
    condition: Optional[str] = None
    keterangan_kerusakan: Optional[str] = None

class InventoryItemOut(InventoryItemBase):
    id: UUID
    lab_id: UUID
    photo_url: Optional[str] = None

    class Config:
        from_attributes = True
