from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.services.dashboard_service import get_dashboard_stats
from app.models.user import User

router = APIRouter()

@router.get("/stats")
def read_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stats = get_dashboard_stats(db)
    return stats
