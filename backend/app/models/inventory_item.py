import uuid
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lab_id = Column(UUID(as_uuid=True), ForeignKey("labs.id"), index=True, nullable=False)
    name = Column(String, nullable=False)
    specification = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False, default=0)
    condition = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)

    lab = relationship("Lab", backref="inventory_items")
