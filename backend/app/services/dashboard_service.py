from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.lab import Lab
from app.models.lab_category import LabCategory
from app.models.device import Device, DeviceStatus

def get_active_labs_count(db: Session) -> int:
    return db.query(Lab).filter(Lab.is_active == True).count()

def get_labs_count_by_type(db: Session) -> dict:
    results = db.query(Lab.type, func.count(Lab.id)).group_by(Lab.type).all()
    # Format the result into a dict: {"komputer": 5, "teknik": 2, "kedokteran": 1}
    stats = {lab_type: count for lab_type, count in results}
    
    # Ensure all available categories are present even if count is 0
    categories = db.query(LabCategory.slug).all()
    for cat in categories:
        if cat.slug not in stats:
            stats[cat.slug] = 0
            
    return stats

def get_devices_count_by_status(db: Session) -> dict:
    results = db.query(Device.status, func.count(Device.id)).group_by(Device.status).all()
    stats = {status.value if hasattr(status, 'value') else status: count for status, count in results}
    
    for d_status in DeviceStatus:
        if d_status.value not in stats:
            stats[d_status.value] = 0
            
    return stats

def get_dashboard_stats(db: Session) -> dict:
    return {
        "active_labs_count": get_active_labs_count(db),
        "labs_by_type": get_labs_count_by_type(db),
        "devices_by_status": get_devices_count_by_status(db)
    }
