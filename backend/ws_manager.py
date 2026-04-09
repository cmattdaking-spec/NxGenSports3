from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    """
    Tracks active WebSocket connections and per-team user presence.
    team_id -> {ws, ...}
    team_id -> {user_id, ...}   (presence)
    ws      -> (team_id, user_id)
    """
    def __init__(self):
        self._connections: Dict[str, Set[WebSocket]] = {}
        self._presence:    Dict[str, Set[str]]       = {}
        self._ws_meta:     Dict[int, tuple]           = {}

    async def connect(self, ws: WebSocket, team_id: str, user_id: str):
        await ws.accept()
        self._connections.setdefault(team_id, set()).add(ws)
        self._presence.setdefault(team_id, set()).add(user_id)
        self._ws_meta[id(ws)] = (team_id, user_id)

        await ws.send_json({
            "type": "presence_init",
            "online_users": list(self._presence[team_id]),
        })
        await self.broadcast(team_id, {"type": "user_online", "user_id": user_id}, exclude=ws)

    def disconnect(self, ws: WebSocket):
        meta = self._ws_meta.pop(id(ws), None)
        if not meta:
            return None, None
        team_id, user_id = meta
        self._connections.get(team_id, set()).discard(ws)

        still_here = any(
            self._ws_meta.get(id(w), (None,))[1] == user_id
            for w in self._connections.get(team_id, set())
        )
        if not still_here:
            self._presence.get(team_id, set()).discard(user_id)
            return team_id, user_id
        return team_id, None

    def online_users(self, team_id: str) -> list:
        return list(self._presence.get(team_id, set()))

    async def broadcast(self, team_id: str, payload: dict, exclude: WebSocket = None):
        dead = set()
        for ws in list(self._connections.get(team_id, [])):
            if ws is exclude:
                continue
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self._connections[team_id].discard(ws)
            self._ws_meta.pop(id(ws), None)


manager = ConnectionManager()
