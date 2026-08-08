import uuid
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum

class KeyStatus(str, enum.Enum):
    pending = "pending"
    used = "used"
    expired = "expired"

class InstallKey(Base):
    __tablename__ = "install_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=True)
    generated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    key_code = Column(String, unique=True, index=True, nullable=False)
    status = Column(Enum(KeyStatus), default=KeyStatus.pending, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_global = Column(Boolean, default=False, nullable=False)

    device = relationship("Device")
    user = relationship("User")
