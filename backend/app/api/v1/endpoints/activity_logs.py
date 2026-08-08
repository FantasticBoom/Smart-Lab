import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.schemas.activity_log import ActivityLogOut

router = APIRouter()

@router.get("", response_model=List[ActivityLogOut])
def get_activity_logs(
    device_id: Optional[uuid.UUID] = None,
    user_id: Optional[uuid.UUID] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ActivityLog)
    
    if device_id:
        query = query.filter(ActivityLog.device_id == device_id)
    if user_id:
        query = query.filter(ActivityLog.performed_by == user_id)
    if date_from:
        query = query.filter(ActivityLog.created_at >= date_from)
    if date_to:
        query = query.filter(ActivityLog.created_at <= date_to)
        
    logs = query.order_by(ActivityLog.created_at.desc()).all()
    return logs
