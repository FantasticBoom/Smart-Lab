import uuid
from pydantic import BaseModel, ConfigDict
from datetime import time

class LabScheduleBase(BaseModel):
    day_of_week: str
    start_time: time
    end_time: time
    subject: str
    lecturer: str

class LabScheduleCreate(LabScheduleBase):
    lab_id: uuid.UUID

class LabScheduleUpdate(BaseModel):
    day_of_week: str | None = None
    start_time: time | None = None
    end_time: time | None = None
    subject: str | None = None
    lecturer: str | None = None

class LabScheduleOut(LabScheduleBase):
    id: uuid.UUID
    lab_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)
