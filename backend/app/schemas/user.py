from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID

class UserBase(BaseModel):
    username: str
    role: str

    @field_validator('role', mode='before')
    @classmethod
    def coerce_role_to_str(cls, v):
        """Paksa Enum UserRole -> string murni (e.g. 'superadmin', bukan 'UserRole.superadmin')"""
        if hasattr(v, 'value'):
            return v.value
        return str(v)

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None

class UserOut(UserBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
