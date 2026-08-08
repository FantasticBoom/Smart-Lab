from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum


class StatusPenanganan(str, Enum):
    perlu_perbaikan = "perlu_perbaikan"
    telah_diperbaiki = "telah_diperbaiki"
    alat_baru = "alat_baru"


class InventoryItemNested(BaseModel):
    id: UUID
    name: str
    specification: Optional[str] = None
    quantity: int
    condition: str
    photo_url: Optional[str] = None

    class Config:
        from_attributes = True


class LabNested(BaseModel):
    id: UUID
    name: str
    type: str
    location: Optional[str] = None

    class Config:
        from_attributes = True


class BeritaAcaraCreate(BaseModel):
    inventory_item_id: UUID
    lab_id: UUID
    keterangan_kerusakan: str


class BeritaAcaraUpdate(BaseModel):
    status_penanganan: StatusPenanganan
    keterangan_perbaikan: str


class DeviceNested(BaseModel):
    id: UUID
    code: str
    condition: Optional[str] = None
    photo_url: Optional[str] = None

    class Config:
        from_attributes = True


class BeritaAcaraOut(BaseModel):
    id: UUID
    inventory_item_id: Optional[UUID] = None
    device_id: Optional[UUID] = None
    lab_id: UUID
    keterangan_kerusakan: str
    keterangan_perbaikan: Optional[str] = None
    status_penanganan: StatusPenanganan
    tanggal_lapor: datetime
    tanggal_selesai: Optional[datetime] = None
    inventory_item: Optional[InventoryItemNested] = None
    device: Optional[DeviceNested] = None
    lab: Optional[LabNested] = None

    class Config:
        from_attributes = True
