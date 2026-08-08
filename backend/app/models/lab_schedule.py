import uuid
from sqlalchemy import Column, String, ForeignKey, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base

class LabSchedule(Base):
    __tablename__ = "lab_schedules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    lab_id = Column(UUID(as_uuid=True), ForeignKey("labs.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(String, nullable=False)  # e.g., 'Senin', 'Selasa'
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    subject = Column(String, nullable=False)
    lecturer = Column(String, nullable=False)

    lab = relationship("Lab", backref="schedules")
