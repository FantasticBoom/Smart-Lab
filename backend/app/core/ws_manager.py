from fastapi import WebSocket
from fastapi.websockets import WebSocketState
from typing import Dict, List
import asyncio
import uuid


class ConnectionManager:
    def __init__(self):
        self.agent_connections: Dict[uuid.UUID, WebSocket] = {}
        self.admin_connections: List[WebSocket] = []

    async def connect_agent(self, device_id: uuid.UUID, websocket: WebSocket):
        await websocket.accept()
        self.agent_connections[device_id] = websocket

    def disconnect_agent(self, device_id: uuid.UUID):
        self.agent_connections.pop(device_id, None)

    async def connect_admin(self, websocket: WebSocket):
        await websocket.accept()
        self.admin_connections.append(websocket)

    def disconnect_admin(self, websocket: WebSocket):
        try:
            self.admin_connections.remove(websocket)
        except ValueError:
            pass

    async def send_to_device(self, device_id: uuid.UUID, message: dict):
        websocket = self.agent_connections.get(device_id)
        if websocket and websocket.client_state == WebSocketState.CONNECTED:
            try:
                await websocket.send_json(message)
            except Exception:
                self.disconnect_agent(device_id)

    async def broadcast_to_admins(self, message: dict):
        """Broadcast a message to all connected admin WebSocket clients in parallel."""
        if not self.admin_connections:
            return

        # Snapshot the list to avoid mutation during iteration
        connections = list(self.admin_connections)
        failed: List[WebSocket] = []

        async def _send(ws: WebSocket):
            if ws.client_state != WebSocketState.CONNECTED:
                failed.append(ws)
                return
            try:
                await ws.send_json(message)
            except Exception:
                failed.append(ws)

        await asyncio.gather(*[_send(ws) for ws in connections], return_exceptions=True)

        # Clean up stale connections
        for ws in failed:
            self.disconnect_admin(ws)


manager = ConnectionManager()
