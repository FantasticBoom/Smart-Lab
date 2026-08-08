import uuid
import enum
from sqlalchemy import Column, String, DateTime, Enum, func, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class BorrowingStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class LabBorrowing(Base):
    __tablename__ = "lab_borrowings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_npm = Column(String, nullable=False)
    user_name = Column(String, nullable=False)
    user_email = Column(String, nullable=False)
    num_people = Column(Integer, nullable=False, default=1)
    lab_type = Column(String, nullable=False)
    lab_name = Column(String, nullable=False)
    start_datetime = Column(DateTime(timezone=True), nullable=False)
    end_datetime = Column(DateTime(timezone=True), nullable=False)
    purpose = Column(String, nullable=False)
    is_urgent = Column(Boolean, nullable=False, default=False)
    status = Column(Enum(BorrowingStatus), nullable=False, default=BorrowingStatus.pending)
    booking_id = Column(String, unique=True, index=True, nullable=True) # Generated upon approval
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    members = relationship("LabBorrowingMember", back_populates="borrowing", cascade="all, delete-orphan")


class LabBorrowingMember(Base):
    __tablename__ = "lab_borrowing_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lab_borrowing_id = Column(UUID(as_uuid=True), ForeignKey("lab_borrowings.id", ondelete="CASCADE"), nullable=False)
    npm = Column(String, nullable=False)
    name = Column(String, nullable=False)

    borrowing = relationship("LabBorrowing", back_populates="members")
