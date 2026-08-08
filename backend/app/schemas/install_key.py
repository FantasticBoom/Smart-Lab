from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional

class CreateKeyRequest(BaseModel):
    is_global: bool = False
    device_id: Optional[UUID] = None

class InstallKeyOut(BaseModel):
    id: UUID
    key_code: str
    status: str
    expires_at: datetime
    generated_by: UUID
    device_id: Optional[UUID] = None
    is_global: bool = False

    class Config:
        from_attributes = True

class ValidateKeyRequest(BaseModel):
    key_code: str

