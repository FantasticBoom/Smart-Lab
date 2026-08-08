from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

class DeviceSpecBase(BaseModel):
    spec_key: str
    spec_value: str

class DeviceSpecCreate(DeviceSpecBase):
    pass

class DeviceSpecOut(DeviceSpecBase):
    id: UUID

    class Config:
        from_attributes = True

class DeviceCreate(BaseModel):
    code: str
    condition: Optional[str] = None
    photo_url: Optional[str] = None
    origin: Optional[str] = None
    handover_date: Optional[datetime] = None
    specs: Dict[str, str] = {}

class DeviceUpdate(BaseModel):
    code: Optional[str] = None
    condition: Optional[str] = None
    origin: Optional[str] = None
    handover_date: Optional[datetime] = None
    keterangan_kerusakan: Optional[str] = None

class DeviceListOut(BaseModel):
    id: UUID
    lab_id: UUID
    code: str
    status: str
    lock_status: str
    ip_address: Optional[str] = None

    class Config:
        from_attributes = True

class DeviceDetailOut(BaseModel):
    id: UUID
    lab_id: UUID
    code: str
    device_token: str
    status: str
    lock_status: str
    last_seen_at: Optional[datetime] = None
    ip_address: Optional[str] = None
    condition: Optional[str] = None
    photo_url: Optional[str] = None
    origin: Optional[str] = None
    handover_date: Optional[datetime] = None
    specs: List[DeviceSpecOut] = []

    class Config:
        from_attributes = True
