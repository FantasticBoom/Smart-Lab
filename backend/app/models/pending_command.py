import uuid
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum

class CommandType(str, enum.Enum):
    lock = "lock"
    unlock = "unlock"

class CommandStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    done = "done"

class PendingCommand(Base):
    __tablename__ = "pending_commands"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=False)
    command_type = Column(Enum(CommandType), nullable=False)
    status = Column(Enum(CommandStatus), default=CommandStatus.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    device = relationship("Device")
