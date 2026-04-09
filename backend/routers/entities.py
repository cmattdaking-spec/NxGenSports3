import asyncio
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, Depends

from utils import entity_to_collection, serialize_doc, parse_sort, get_current_user
from ws_manager import manager as ws_manager

router = APIRouter(prefix="/api/entities", tags=["entities"])


async def _broadcast_push(team_id: str, user_id: str, payload: dict):
    """Send push notification to all team members except the sender."""
    from database import db
    from config import vapid_private_pem, VAPID_PUBLIC_KEY, VAPID_CONTACT
    import json
    from pywebpush import webpush, WebPushException

    pem = vapid_private_pem()
    if not pem or not VAPID_PUBLIC_KEY:
        return
    subs = await db.push_subscriptions.find({
        "team_id": team_id,
        "user_id": {"$ne": user_id},
    }).to_list(length=500)
    for sub in subs:
        try:
            sub_info = {
                "endpoint": sub["endpoint"],
                "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
            }
            await asyncio.to_thread(
                webpush,
                subscription_info=sub_info,
                data=json.dumps(payload),
                vapid_private_key=pem,
                vapid_claims={"sub": VAPID_CONTACT},
            )
        except WebPushException as e:
            if e.response and e.response.status_code in (404, 410):
                await db.push_subscriptions.delete_one({"_id": sub["_id"]})
        except Exception as e:
            print(f"[PUSH] Error: {e}")


@router.get("/{entity_name}")
async def list_entity(entity_name: str, request: Request, user: dict = Depends(get_current_user)):
    from database import db
    collection = db[entity_to_collection(entity_name)]
    params = dict(request.query_params)
    sort_str = params.get("sort", "-created_at")
    limit = int(params.get("limit", 500))
    skip = int(params.get("skip", 0))
    sort_field, sort_dir = parse_sort(sort_str)

    mongo_filter = {}
    if user.get("role") != "super_admin" and user.get("team_id"):
        mongo_filter["team_id"] = user["team_id"]

    cursor = collection.find(mongo_filter).sort(sort_field, sort_dir).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [serialize_doc(d) for d in docs]


@router.post("/{entity_name}/filter")
async def filter_entity(entity_name: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    collection = db[entity_to_collection(entity_name)]
    query = body.get("query", {})
    sort_str = body.get("sort", "-created_at")
    limit = int(body.get("limit", 500))
    sort_field, sort_dir = parse_sort(sort_str)

    if user.get("role") != "super_admin":
        if "team_id" not in query and "email" not in query and user.get("team_id"):
            query["team_id"] = user["team_id"]

    cursor = collection.find(query).sort(sort_field, sort_dir).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [serialize_doc(d) for d in docs]


@router.get("/{entity_name}/{doc_id}")
async def get_entity(entity_name: str, doc_id: str, user: dict = Depends(get_current_user)):
    from database import db
    collection = db[entity_to_collection(entity_name)]
    try:
        doc = await collection.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return serialize_doc(doc)


@router.post("/{entity_name}")
async def create_entity(entity_name: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    collection = db[entity_to_collection(entity_name)]
    body.pop("id", None)
    body.pop("_id", None)
    now = datetime.now(timezone.utc).isoformat()
    if "created_at" not in body:
        body["created_at"] = now
    if "created_date" not in body:
        body["created_date"] = now
    result = await collection.insert_one(body)
    doc = await collection.find_one({"_id": result.inserted_id})
    serialized = serialize_doc(doc)

    # Real-time: broadcast new messages via WebSocket + push
    if entity_name == "Message":
        team_id = body.get("team_id") or user.get("team_id", "")
        user_id = user.get("id") or user.get("_id", "")
        ws_payload = {"type": "new_message", "data": serialized}
        asyncio.create_task(ws_manager.broadcast(team_id, ws_payload))

        sender_name = user.get("full_name") or user.get("email", "Someone")
        content_preview = (body.get("content", "") or "")[:80]
        push_payload = {
            "type": "new_message",
            "title": f"NxMessage from {sender_name}",
            "body": content_preview,
            "icon": "/logo192.png",
            "conversation_id": body.get("conversation_id"),
        }
        asyncio.create_task(_broadcast_push(team_id, str(user_id), push_payload))

    elif entity_name == "Conversation":
        team_id = body.get("team_id") or user.get("team_id", "")
        asyncio.create_task(ws_manager.broadcast(team_id, {"type": "new_conversation", "data": serialized}))

    return serialized


@router.patch("/{entity_name}/{doc_id}")
async def update_entity(entity_name: str, doc_id: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    collection = db[entity_to_collection(entity_name)]
    body.pop("id", None)
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    try:
        await collection.update_one({"_id": ObjectId(doc_id)}, {"$set": body})
        doc = await collection.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    return serialize_doc(doc)


@router.delete("/{entity_name}/{doc_id}")
async def delete_entity(entity_name: str, doc_id: str, user: dict = Depends(get_current_user)):
    from database import db
    collection = db[entity_to_collection(entity_name)]
    try:
        await collection.delete_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    return {"success": True}
