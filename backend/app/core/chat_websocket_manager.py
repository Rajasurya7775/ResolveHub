
from collections import defaultdict
from uuid import UUID

from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder


class ChatWebSocketManager:

    def __init__(self):
        # Each issue has its own group of connected users
        self.active_connections: dict[UUID, set[WebSocket]] = defaultdict(set)

    async def connect(self, issue_id: UUID, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[issue_id].add(websocket)

    def disconnect(self, issue_id: UUID, websocket: WebSocket):
        connections = self.active_connections.get(issue_id)

        if connections:
            connections.discard(websocket)

            if not connections:
                self.active_connections.pop(issue_id, None)

    async def broadcast(self, issue_id: UUID, message: dict):
        payload = jsonable_encoder(message)
        connections = self.active_connections.get(issue_id, set())
        disconnected = []

        for websocket in list(connections):
            try:
                await websocket.send_json(payload)
            except Exception:
                disconnected.append(websocket)

        for websocket in disconnected:
            self.disconnect(issue_id, websocket)


chat_manager = ChatWebSocketManager()
