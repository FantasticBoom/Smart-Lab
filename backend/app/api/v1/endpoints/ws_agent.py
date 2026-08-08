import json
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.device import Device, DeviceStatus
from app.core.ws_manager import manager
from app.services.lock_service import process_pending_commands, handle_command_ack

router = APIRouter()

@router.websocket("/agent")
async def websocket_agent(
    websocket: WebSocket, 
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(Device.device_token == token).first()
    
    if not device:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    device_id = device.id
    await manager.connect_agent(device_id, websocket)
    
    # Update status to online
    device.status = DeviceStatus.online
    device.last_seen_at = datetime.now(timezone.utc)
    db.commit()
    
    # Bug Fix #2: Broadcast lock_status juga saat device online
    await manager.broadcast_to_admins({
        "type": "DEVICE_STATUS_CHANGED",
        "device_id": str(device_id),
        "status": "online",
        "lock_status": device.lock_status.value,
    })
    
    # Process pending commands
    await process_pending_commands(device_id, db)
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                msg_type = message.get("type", "")

                # Bug Fix #1: Agent mengirim "heartbeat" lowercase, backend harus
                # menerima keduanya (case-insensitive)
                if msg_type.upper() == "HEARTBEAT":
                    device.last_seen_at = datetime.now(timezone.utc)
                    new_ip = message.get("ip_address")
                    if new_ip and device.ip_address != new_ip:
                        device.ip_address = new_ip
                    db.commit()

                    # Broadcast active_window and open_windows to admins
                    active_window = message.get("active_window")
                    open_windows = message.get("open_windows")
                    
                    if active_window is not None or open_windows is not None:
                        payload = {
                            "type": "DEVICE_STATUS_CHANGED",
                            "device_id": str(device_id),
                        }
                        if active_window is not None:
                            payload["active_window"] = active_window
                        if open_windows is not None:
                            payload["open_windows"] = open_windows
                            
                        await manager.broadcast_to_admins(payload)

                elif msg_type.upper() == "COMMAND_ACK":
                    action = message.get("action")
                    success = message.get("success", True)
                    await handle_command_ack(device_id, action, success, db)

            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect_agent(device_id)
        
        device.status = DeviceStatus.offline
        device.last_seen_at = datetime.now(timezone.utc)
        db.commit()
        
        await manager.broadcast_to_admins({
            "type": "DEVICE_STATUS_CHANGED",
            "device_id": str(device_id),
            "status": "offline",
        })
