import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status

from app.core.security import decode_access_token
from app.core.ws_manager import manager
from app.db.session import SessionLocal
from app.models.device import Device, DeviceStatus

router = APIRouter()


@router.websocket("/admin")
async def websocket_admin(
    websocket: WebSocket,
    token: str = Query(...),
):
    # Authenticate via JWT before accepting the connection
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect_admin(websocket)

    # Bug Fix #4: Kirim snapshot semua device yang saat ini ONLINE kepada admin
    # yang baru saja konek, agar tidak ketinggalan broadcast sebelumnya.
    # Gunakan SessionLocal langsung (bukan Depends) agar aman untuk WS long-lived connections.
    try:
        db = SessionLocal()
        try:
            online_devices = db.query(Device).filter(
                Device.status == DeviceStatus.online
            ).all()
            for device in online_devices:
                await websocket.send_json({
                    "type": "DEVICE_STATUS_CHANGED",
                    "device_id": str(device.id),
                    "status": device.status.value,
                    "lock_status": device.lock_status.value,
                })
        finally:
            db.close()
    except Exception:
        pass  # Jangan crash jika snapshot gagal

    try:
        while True:
            # Keep the connection alive; admins only receive broadcasts
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        # Always clean up, regardless of how the connection ended
        manager.disconnect_admin(websocket)
