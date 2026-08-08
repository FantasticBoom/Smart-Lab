import uuid
import asyncio
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.db.session import SessionLocal

from app.models.device import Device, DeviceStatus, LockStatus
from app.models.pending_command import PendingCommand, CommandType, CommandStatus
from app.models.activity_log import ActivityLog
from app.core.ws_manager import manager

async def handle_lock_timeout(device_id: uuid.UUID, action: CommandType, original_lock_status: LockStatus):
    await asyncio.sleep(5)
    
    db = SessionLocal()
    try:
        device = db.query(Device).filter(Device.id == device_id).first()
        if not device:
            return
            
        # Check if it's still pending (meaning no ack received)
        if device.lock_status == LockStatus.pending:
            # Revert to original
            device.lock_status = original_lock_status
            db.commit()
            
            # Broadcast update
            await manager.broadcast_to_admins({
                "type": "DEVICE_LOCK_STATUS_CHANGED",
                "device_id": str(device_id),
                "lock_status": original_lock_status.value
            })
    finally:
        db.close()

async def send_lock_command(
    device_id: uuid.UUID, 
    action: CommandType, 
    performed_by: uuid.UUID,
    db: Session
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise ValueError("Device not found")
        
    original_lock_status = device.lock_status
        
    # Update device lock status to pending
    device.lock_status = LockStatus.pending
    db.commit()
    
    # Broadcast to admins that it is pending
    await manager.broadcast_to_admins({
        "type": "DEVICE_LOCK_STATUS_CHANGED",
        "device_id": str(device_id),
        "lock_status": LockStatus.pending.value
    })
    
    # Insert to pending_commands
    pending_cmd = PendingCommand(
        device_id=device_id,
        command_type=action,
        status=CommandStatus.pending
    )
    db.add(pending_cmd)
    db.commit()
    
    # Check if online
    if device_id in manager.agent_connections:
        # Send via ws
        await manager.send_to_device(device_id, {
            "type": "COMMAND",
            "action": action.value
        })
        pending_cmd.status = CommandStatus.sent
        db.commit()
        
        # Start timeout task
        asyncio.create_task(handle_lock_timeout(device_id, action, original_lock_status))
    else:
        # Offline, command stays pending. 
        pass

async def handle_command_ack(
    device_id: uuid.UUID, 
    action: str, 
    success: bool, 
    db: Session
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        return
        
    # Find the corresponding command
    action_enum = CommandType(action)
    cmd = db.query(PendingCommand).filter(
        PendingCommand.device_id == device_id,
        PendingCommand.command_type == action_enum,
        PendingCommand.status.in_([CommandStatus.pending, CommandStatus.sent])
    ).order_by(PendingCommand.created_at.desc()).first()
    
    if cmd:
        cmd.status = CommandStatus.done
        db.commit()
        
    if success:
        new_status = LockStatus.locked if action == CommandType.lock.value else LockStatus.unlocked
        device.lock_status = new_status
    else:
        # Revert to unlocked if fail
        new_status = LockStatus.unlocked
        device.lock_status = new_status
        
    db.commit()
    
    # Broadcast to admins
    await manager.broadcast_to_admins({
        "type": "DEVICE_LOCK_STATUS_CHANGED",
        "device_id": str(device_id),
        "lock_status": new_status.value
    })

async def process_pending_commands(device_id: uuid.UUID, db: Session):
    cmds = db.query(PendingCommand).filter(
        PendingCommand.device_id == device_id,
        PendingCommand.status == CommandStatus.pending
    ).all()
    
    for cmd in cmds:
        await manager.send_to_device(device_id, {
            "type": "COMMAND",
            "action": cmd.command_type.value
        })
        cmd.status = CommandStatus.sent
        db.commit()
        
        device = db.query(Device).filter(Device.id == device_id).first()
        if device:
            asyncio.create_task(handle_lock_timeout(device_id, cmd.command_type, LockStatus.unlocked))
