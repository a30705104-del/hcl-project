import json
import logging
from typing import List, Dict
from fastapi import WebSocket

logger = logging.getLogger("WebSocketManager")

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, machine_id: str, websocket: WebSocket):
        await websocket.accept()
        if machine_id not in self.active_connections:
            self.active_connections[machine_id] = []
        self.active_connections[machine_id].append(websocket)
        logger.info(f"WebSocket client connected for machine {machine_id}. Total clients: {len(self.active_connections[machine_id])}")

    def disconnect(self, machine_id: str, websocket: WebSocket):
        if machine_id in self.active_connections:
            if websocket in self.active_connections[machine_id]:
                self.active_connections[machine_id].remove(websocket)
            if not self.active_connections[machine_id]:
                del self.active_connections[machine_id]
        logger.info(f"WebSocket client disconnected for machine {machine_id}.")

    async def broadcast_machine_packet(self, machine_id: str, packet: dict):
        if machine_id in self.active_connections:
            dead_connections = []
            message_text = json.dumps(packet)
            for connection in self.active_connections[machine_id]:
                try:
                    await connection.send_text(message_text)
                except Exception as e:
                    logger.debug(f"Failed to send to websocket client: {e}")
                    dead_connections.append(connection)
            for dead in dead_connections:
                self.disconnect(machine_id, dead)

ws_manager = ConnectionManager()
