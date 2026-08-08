from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional

class ActivityLogOut(BaseModel):
    id: UUID
    device_id: Optional[UUID] = None
    performed_by: UUID
    action: str
    created_at: datetime

    class Config:
        from_attributes = True
