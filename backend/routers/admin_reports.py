import asyncio
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
import os
import uuid

from utils import get_current_user, serialize_doc, send_email
from config import UPLOAD_DIR

router = APIRouter(prefix="/api/admin", tags=["admin_reports"])


def _team_filter(user: dict) -> dict:
    if user.get("role") == "super_admin":
        return {}
    team_id = user.get("team_id")
    if not team_id:
        raise HTTPException(status_code=403, detail="No team assigned")
    return {"team_id": team_id}


def _require_staff(user: dict):
    allowed_roles = {"admin", "super_admin"}
    allowed_coaching = {"head_coach", "athletic_director", "associate_head_coach"}
    if user.get("role") in allowed_roles or user.get("coaching_role") in allowed_coaching:
        return
    if user.get("user_type") not in ("player", "parent"):
        return
    raise HTTPException(status_code=403, detail="Staff access required")


# ═══════════════════════════════════════════════════════════════════════════════
# ANNOUNCEMENTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/announcements")
async def list_announcements(user: dict = Depends(get_current_user)):
    from database import db
    filt = _team_filter(user)
    docs = await db.announcements.find(filt).sort("created_at", -1).to_list(length=200)
    return [serialize_doc(d) for d in docs]


@router.post("/announcements")
async def create_announcement(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "team_id": user.get("team_id", ""),
        "school_id": user.get("school_id", ""),
        "title": body.get("title", ""),
        "content": body.get("content", ""),
        "priority": body.get("priority", "medium"),
        "audience": body.get("audience", "all"),
        "status": body.get("status", "published"),
        "email_broadcast": body.get("email_broadcast", False),
        "created_by": user.get("full_name") or user.get("email", ""),
        "created_by_id": user.get("_id", ""),
        "created_at": now,
        "updated_at": now,
    }
    result = await db.announcements.insert_one(doc)
    created = await db.announcements.find_one({"_id": result.inserted_id})

    if doc["email_broadcast"] and doc["status"] == "published":
        asyncio.create_task(_broadcast_announcement(db, user, doc))

    return serialize_doc(created)


@router.patch("/announcements/{ann_id}")
async def update_announcement(ann_id: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    body.pop("id", None)
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()

    send_broadcast = body.pop("send_broadcast_now", False)

    try:
        await db.announcements.update_one({"_id": ObjectId(ann_id)}, {"$set": body})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")

    updated = await db.announcements.find_one({"_id": ObjectId(ann_id)})

    if send_broadcast and updated:
        asyncio.create_task(_broadcast_announcement(db, user, updated))

    return serialize_doc(updated)


@router.delete("/announcements/{ann_id}")
async def delete_announcement(ann_id: str, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    try:
        await db.announcements.delete_one({"_id": ObjectId(ann_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    return {"success": True}


async def _broadcast_announcement(db, user: dict, announcement: dict):
    team_id = user.get("team_id")
    if not team_id:
        return

    audience = announcement.get("audience", "all")
    user_filter = {"team_id": team_id}
    if audience == "staff":
        user_filter["user_type"] = {"$nin": ["player", "parent"]}
    elif audience == "students":
        user_filter["user_type"] = "player"
    elif audience == "parents":
        user_filter["user_type"] = "parent"

    recipients = await db.users.find(user_filter, {"email": 1}).to_list(length=500)

    title = announcement.get("title", "School Announcement")
    content = announcement.get("content", "")
    priority = announcement.get("priority", "medium")
    priority_color = {"urgent": "#ef4444", "high": "#f59e0b", "medium": "#3b82f6", "low": "#6b7280"}.get(priority, "#3b82f6")

    html = f"""
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"></head>
    <body style="background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:40px 20px">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">
        <tr><td>
          <div style="background:#111111;border:1px solid #1f2937;border-radius:16px;padding:40px">
            <h1 style="color:#ffffff;font-size:22px;font-weight:900;margin:0 0 4px">
              Nx<span style="color:#00f2ff">GenSports</span>
            </h1>
            <p style="color:#6b7280;font-size:13px;margin:0 0 24px">School Announcement</p>
            <div style="display:inline-block;background:{priority_color};color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;margin:0 0 16px;text-transform:uppercase">{priority}</div>
            <h2 style="color:#e8e8e8;font-size:18px;font-weight:700;margin:0 0 12px">{title}</h2>
            <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 20px;white-space:pre-wrap">{content}</p>
            <hr style="border:none;border-top:1px solid #1f2937;margin:0 0 16px">
            <p style="color:#4b5563;font-size:12px;margin:0">
              Posted by {announcement.get('created_by', 'Administration')}
            </p>
          </div>
        </td></tr>
      </table>
    </body></html>
    """

    for r in recipients:
        email = r.get("email")
        if email:
            try:
                await send_email(email, f"[NxGenSports] {title}", html)
            except Exception as e:
                print(f"[BROADCAST] Failed to send to {email}: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# SCHOOL CALENDAR
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/calendar")
async def list_calendar_events(user: dict = Depends(get_current_user)):
    from database import db
    filt = _team_filter(user)
    docs = await db.school_events.find(filt).sort("event_date", 1).to_list(length=500)
    return [serialize_doc(d) for d in docs]


@router.post("/calendar")
async def create_calendar_event(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "team_id": user.get("team_id", ""),
        "school_id": user.get("school_id", ""),
        "title": body.get("title", ""),
        "description": body.get("description", ""),
        "event_date": body.get("event_date", ""),
        "event_time": body.get("event_time", ""),
        "end_date": body.get("end_date", ""),
        "end_time": body.get("end_time", ""),
        "location": body.get("location", ""),
        "event_type": body.get("event_type", "academic"),
        "all_day": body.get("all_day", False),
        "created_by": user.get("full_name") or user.get("email", ""),
        "created_at": now,
        "updated_at": now,
    }
    result = await db.school_events.insert_one(doc)
    created = await db.school_events.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.patch("/calendar/{event_id}")
async def update_calendar_event(event_id: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    body.pop("id", None)
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    try:
        await db.school_events.update_one({"_id": ObjectId(event_id)}, {"$set": body})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    updated = await db.school_events.find_one({"_id": ObjectId(event_id)})
    return serialize_doc(updated)


@router.delete("/calendar/{event_id}")
async def delete_calendar_event(event_id: str, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    try:
        await db.school_events.delete_one({"_id": ObjectId(event_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    return {"success": True}


# ═══════════════════════════════════════════════════════════════════════════════
# DOCUMENT CENTER
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/documents")
async def list_documents(user: dict = Depends(get_current_user)):
    from database import db
    filt = _team_filter(user)
    docs = await db.school_documents.find(filt).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(d) for d in docs]


@router.post("/documents")
async def create_document(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "team_id": user.get("team_id", ""),
        "school_id": user.get("school_id", ""),
        "title": body.get("title", ""),
        "description": body.get("description", ""),
        "category": body.get("category", "other"),
        "doc_type": body.get("doc_type", "link"),
        "file_url": body.get("file_url", ""),
        "link_url": body.get("link_url", ""),
        "file_name": body.get("file_name", ""),
        "uploaded_by": user.get("full_name") or user.get("email", ""),
        "created_at": now,
        "updated_at": now,
    }
    result = await db.school_documents.insert_one(doc)
    created = await db.school_documents.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(""),
    description: str = Form(""),
    category: str = Form("other"),
    user: dict = Depends(get_current_user),
):
    from database import db
    _require_staff(user)

    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_name = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(UPLOAD_DIR, unique_name)
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    contents = await file.read()
    with open(save_path, "wb") as f:
        f.write(contents)

    file_url = f"/static/uploads/{unique_name}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "team_id": user.get("team_id", ""),
        "school_id": user.get("school_id", ""),
        "title": title or file.filename or "Untitled",
        "description": description,
        "category": category,
        "doc_type": "file",
        "file_url": file_url,
        "link_url": "",
        "file_name": file.filename or unique_name,
        "file_size": len(contents),
        "uploaded_by": user.get("full_name") or user.get("email", ""),
        "created_at": now,
        "updated_at": now,
    }
    result = await db.school_documents.insert_one(doc)
    created = await db.school_documents.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    try:
        doc = await db.school_documents.find_one({"_id": ObjectId(doc_id)})
        if doc and doc.get("doc_type") == "file" and doc.get("file_url"):
            file_path = f"/app{doc['file_url']}"
            if os.path.exists(file_path):
                os.remove(file_path)
        await db.school_documents.delete_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    return {"success": True}


# ═══════════════════════════════════════════════════════════════════════════════
# ENROLLMENT STATS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/stats")
async def enrollment_stats(user: dict = Depends(get_current_user)):
    from database import db
    filt = _team_filter(user)

    total_students = await db.students.count_documents(filt)
    total_faculty = await db.faculty.count_documents(filt)
    total_clubs = await db.clubs.count_documents(filt)
    active_clubs = await db.clubs.count_documents({**filt, "status": "active"})
    total_users = await db.users.count_documents(filt if filt else {})

    # Users by type
    staff_count = await db.users.count_documents({**filt, "user_type": {"$nin": ["player", "parent"]}}) if filt else 0
    player_count = await db.users.count_documents({**filt, "user_type": "player"}) if filt else 0
    parent_count = await db.users.count_documents({**filt, "user_type": "parent"}) if filt else 0

    # Announcements
    total_announcements = await db.announcements.count_documents(filt)

    # Upcoming events
    today = datetime.now(timezone.utc).isoformat()[:10]
    upcoming_events = await db.school_events.count_documents({**filt, "event_date": {"$gte": today}})

    # Documents
    total_documents = await db.school_documents.count_documents(filt)

    # Grade distribution
    grade_pipeline = [
        {"$match": filt} if filt else {"$match": {}},
        {"$group": {"_id": "$grade_level", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    grade_dist = await db.students.aggregate(grade_pipeline).to_list(length=20)

    return {
        "total_students": total_students,
        "total_faculty": total_faculty,
        "total_clubs": total_clubs,
        "active_clubs": active_clubs,
        "total_users": total_users,
        "staff_count": staff_count,
        "player_count": player_count,
        "parent_count": parent_count,
        "total_announcements": total_announcements,
        "upcoming_events": upcoming_events,
        "total_documents": total_documents,
        "grade_distribution": [{"grade": g["_id"] or "Unknown", "count": g["count"]} for g in grade_dist],
    }
