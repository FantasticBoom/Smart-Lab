import uuid
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum

class DeviceStatus(str, enum.Enum):
    online = "online"
    offline = "offline"

class LockStatus(str, enum.Enum):
    unlocked = "unlocked"
    pending = "pending"
    locked = "locked"

class Device(Base):
    __tablename__ = "devices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lab_id = Column(UUID(as_uuid=True), ForeignKey("labs.id"), index=True, nullable=False)
    code = Column(String, nullable=False)
    device_token = Column(String, unique=True, index=True, nullable=False)
    status = Column(Enum(DeviceStatus), default=DeviceStatus.offline, nullable=False)
    lock_status = Column(Enum(LockStatus), default=LockStatus.unlocked, nullable=False)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    ip_address = Column(String, nullable=True)
    condition = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    origin = Column(String, nullable=True)
    handover_date = Column(DateTime, nullable=True)

    lab = relationship("Lab", backref="devices")
    specs = relationship("DeviceSpec", backref="device", cascade="all, delete-orphan")
