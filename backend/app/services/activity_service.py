import uuid
from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog

def log_activity(db: Session, device_id: uuid.UUID | None, performed_by: uuid.UUID, action: str):
    log = ActivityLog(
        device_id=device_id,
        performed_by=performed_by,
        action=action
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
