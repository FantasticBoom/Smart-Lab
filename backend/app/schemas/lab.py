from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class LabBase(BaseModel):
    name: str
    type: str
    location: Optional[str] = None
    is_active: bool = True

class LabCreate(LabBase):
    pass

class LabUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None

class LabOut(LabBase):
    id: UUID

    class Config:
        from_attributes = True
