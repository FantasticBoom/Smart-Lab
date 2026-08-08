from pydantic import BaseModel, EmailStr, validator, constr
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from app.models.lab_borrowing import BorrowingStatus

class LabBorrowingMemberBase(BaseModel):
    npm: str
    name: str

class LabBorrowingMemberCreate(LabBorrowingMemberBase):
    pass

class LabBorrowingMemberResponse(LabBorrowingMemberBase):
    id: UUID
    lab_borrowing_id: UUID

    class Config:
        from_attributes = True

class LabBorrowingBase(BaseModel):
    user_npm: str
    user_name: str
    user_email: EmailStr
    num_people: int
    lab_type: str
    lab_name: str
    start_datetime: datetime
    end_datetime: datetime
    purpose: str
    is_urgent: bool = False

class LabBorrowingCreate(LabBorrowingBase):
    members: List[LabBorrowingMemberCreate] = []
    
    @validator('user_email')
    def validate_email_domain(cls, v):
        if not v.endswith('@uigm.ac.id'):
            raise ValueError('Email must be a @uigm.ac.id domain')
        return v
        
    @validator('end_datetime')
    def validate_end_datetime(cls, v, values):
        if 'start_datetime' in values and v <= values['start_datetime']:
            raise ValueError('End time must be after start time')
        return v

class LabBorrowingUpdateStatus(BaseModel):
    status: BorrowingStatus

class LabBorrowingResponse(LabBorrowingBase):
    id: UUID
    status: BorrowingStatus
    booking_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    members: List[LabBorrowingMemberResponse] = []

    class Config:
        from_attributes = True
