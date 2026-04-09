import jwt
from bson import ObjectId
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends

from config import JWT_SECRET, JWT_ALGORITHM, VAPID_PUBLIC_KEY
from utils import get_current_user
from ws_manager import manager as ws_manager

router = APIRouter(tags=["messages"])


async def _ws_authenticate(token: str):
    from database import db
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_doc = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user_doc:
            return None
        team_id = user_doc.get("team_id") or str(user_doc["_id"])
        user_id = str(user_doc["_id"])
        return team_id, user_id
    except Exception:
        return None


async def _ws_disconnect_and_broadcast(websocket: WebSocket) -> None:
    gone_team, gone_uid = ws_manager.disconnect(websocket)
    if gone_team and gone_uid:
        await ws_manager.broadcast(gone_team, {"type": "user_offline", "user_id": gone_uid})


@router.websocket("/api/ws/messages/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    auth = await _ws_authenticate(token)
    if auth is None:
        await websocket.close(code=4001)
        return

    team_id, user_id = auth
    await ws_manager.connect(websocket, team_id, user_id)
    try:
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except (WebSocketDisconnect, Exception):
        await _ws_disconnect_and_broadcast(websocket)


@router.get("/api/presence/{team_id}")
async def get_presence(team_id: str, user: dict = Depends(get_current_user)):
    return {"online_users": ws_manager.online_users(team_id)}


# ─── Push Subscription Endpoints ─────────────────────────────────────────────
@router.get("/api/push/vapid-public-key")
async def get_vapid_public_key():
    return {"publicKey": VAPID_PUBLIC_KEY}


@router.post("/api/push/subscribe")
async def push_subscribe(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    from datetime import datetime, timezone
    endpoint = body.get("endpoint")
    p256dh = body.get("p256dh")
    auth = body.get("auth")
    if not endpoint or not p256dh or not auth:
        raise HTTPException(status_code=400, detail="endpoint, p256dh, auth required")

    user_id = user.get("id") or user.get("_id")
    team_id = user.get("team_id", "")

    await db.push_subscriptions.update_one(
        {"user_id": user_id, "endpoint": endpoint},
        {"$set": {
            "user_id": user_id,
            "team_id": team_id,
            "endpoint": endpoint,
            "p256dh": p256dh,
            "auth": auth,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"success": True}


@router.delete("/api/push/subscribe")
async def push_unsubscribe(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    user_id = user.get("id") or user.get("_id")
    await db.push_subscriptions.delete_many({"user_id": user_id})
    return {"success": True}
