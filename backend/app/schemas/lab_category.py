import uuid
from pydantic import BaseModel, ConfigDict

class LabCategoryBase(BaseModel):
    name: str
    slug: str

class LabCategoryCreate(LabCategoryBase):
    pass

class LabCategoryUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None

class LabCategoryOut(LabCategoryBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)
