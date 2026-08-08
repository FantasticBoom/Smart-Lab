from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, labs, devices, dashboard, lab_categories, schedules, inventory, ws_agent, ws_admin, install_keys, activity_logs, berita_acara, lab_borrowing

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(labs.router, prefix="/labs", tags=["labs"])
api_router.include_router(lab_categories.router, prefix="/lab-categories", tags=["lab-categories"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(inventory.router, tags=["inventory"])
api_router.include_router(devices.router, tags=["devices"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])
api_router.include_router(ws_agent.router, prefix="/ws", tags=["ws"])
api_router.include_router(ws_admin.router, prefix="/ws", tags=["ws"])
api_router.include_router(install_keys.router, prefix="/install-keys", tags=["install-keys"])
api_router.include_router(activity_logs.router, prefix="/activity-logs", tags=["activity-logs"])
api_router.include_router(berita_acara.router, tags=["berita-acara"])
api_router.include_router(lab_borrowing.router, prefix="/lab-borrowings", tags=["lab-borrowings"])
