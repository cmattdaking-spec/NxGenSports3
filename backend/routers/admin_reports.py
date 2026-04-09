import asyncio
from datetime import datetime, timezone, timedelta
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


# ═══════════════════════════════════════════════════════════════════════════════
# WEEKLY DIGEST
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/digest/settings")
async def get_digest_settings(user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    team_id = user.get("team_id", "")
    settings = await db.digest_settings.find_one({"team_id": team_id})
    if not settings:
        return {"enabled": False, "day": "monday", "hour": 8, "audience": "staff", "team_id": team_id}
    return serialize_doc(settings)


@router.patch("/digest/settings")
async def update_digest_settings(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    team_id = user.get("team_id", "")
    now = datetime.now(timezone.utc).isoformat()
    await db.digest_settings.update_one(
        {"team_id": team_id},
        {"$set": {
            "team_id": team_id,
            "enabled": body.get("enabled", False),
            "day": body.get("day", "monday"),
            "hour": body.get("hour", 8),
            "audience": body.get("audience", "staff"),
            "updated_at": now,
        }},
        upsert=True,
    )
    settings = await db.digest_settings.find_one({"team_id": team_id})
    return serialize_doc(settings)


@router.post("/digest/send")
async def send_digest_now(user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    team_id = user.get("team_id", "")
    count = await _send_weekly_digest(db, team_id, "staff")
    return {"success": True, "recipients": count}


async def _send_weekly_digest(db, team_id: str, audience: str = "staff"):
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    week_ahead = (now + timedelta(days=7)).isoformat()[:10]
    today_str = now.isoformat()[:10]

    filt = {"team_id": team_id} if team_id else {}

    # Recent announcements
    ann_docs = await db.announcements.find(
        {**filt, "created_at": {"$gte": week_ago}}
    ).sort("created_at", -1).to_list(length=10)

    # Upcoming events
    evt_docs = await db.school_events.find(
        {**filt, "event_date": {"$gte": today_str, "$lte": week_ahead}}
    ).sort("event_date", 1).to_list(length=10)

    # Quick stats
    total_students = await db.students.count_documents(filt)
    total_faculty = await db.faculty.count_documents(filt)
    total_clubs = await db.clubs.count_documents({**filt, "status": "active"})

    # Build announcements HTML
    ann_html = ""
    for a in ann_docs:
        priority = a.get("priority", "medium")
        p_color = {"urgent": "#ef4444", "high": "#f59e0b", "medium": "#3b82f6", "low": "#6b7280"}.get(priority, "#3b82f6")
        ann_html += f"""
        <div style="background:#1a1a1a;border-radius:8px;padding:12px 16px;margin-bottom:8px">
          <div style="display:inline-block;background:{p_color};color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;text-transform:uppercase;margin-bottom:4px">{priority}</div>
          <p style="color:#e8e8e8;font-size:14px;font-weight:600;margin:4px 0 2px">{a.get('title', '')}</p>
          <p style="color:#9ca3af;font-size:12px;margin:0">{(a.get('content', '')[:100] + '...') if len(a.get('content', '')) > 100 else a.get('content', '')}</p>
        </div>"""

    if not ann_html:
        ann_html = '<p style="color:#6b7280;font-size:13px">No new announcements this week.</p>'

    # Build events HTML
    evt_html = ""
    for e in evt_docs:
        evt_html += f"""
        <div style="background:#1a1a1a;border-radius:8px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
          <div style="text-align:center;min-width:40px">
            <div style="color:#fff;font-size:18px;font-weight:700">{e.get('event_date', '??')[-2:]}</div>
            <div style="color:#6b7280;font-size:10px;text-transform:uppercase">{e.get('event_type', 'event')}</div>
          </div>
          <div>
            <p style="color:#e8e8e8;font-size:14px;font-weight:600;margin:0">{e.get('title', '')}</p>
            <p style="color:#6b7280;font-size:11px;margin:2px 0 0">{e.get('event_time', '')} {('@ ' + e.get('location')) if e.get('location') else ''}</p>
          </div>
        </div>"""

    if not evt_html:
        evt_html = '<p style="color:#6b7280;font-size:13px">No upcoming events this week.</p>'

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
            <p style="color:#6b7280;font-size:13px;margin:0 0 28px">Weekly Digest &mdash; {now.strftime('%B %d, %Y')}</p>

            <div style="display:flex;gap:12px;margin-bottom:28px">
              <div style="flex:1;background:#1a1a1a;border-radius:8px;padding:12px;text-align:center">
                <div style="color:#00f2ff;font-size:22px;font-weight:700">{total_students}</div>
                <div style="color:#6b7280;font-size:11px">Students</div>
              </div>
              <div style="flex:1;background:#1a1a1a;border-radius:8px;padding:12px;text-align:center">
                <div style="color:#10b981;font-size:22px;font-weight:700">{total_faculty}</div>
                <div style="color:#6b7280;font-size:11px">Faculty</div>
              </div>
              <div style="flex:1;background:#1a1a1a;border-radius:8px;padding:12px;text-align:center">
                <div style="color:#8b5cf6;font-size:22px;font-weight:700">{total_clubs}</div>
                <div style="color:#6b7280;font-size:11px">Active Clubs</div>
              </div>
            </div>

            <h2 style="color:#e8e8e8;font-size:15px;font-weight:700;margin:0 0 12px;border-bottom:1px solid #1f2937;padding-bottom:8px">Recent Announcements</h2>
            {ann_html}

            <h2 style="color:#e8e8e8;font-size:15px;font-weight:700;margin:24px 0 12px;border-bottom:1px solid #1f2937;padding-bottom:8px">Upcoming Events</h2>
            {evt_html}

            <hr style="border:none;border-top:1px solid #1f2937;margin:28px 0 16px">
            <p style="color:#4b5563;font-size:11px;margin:0;text-align:center">
              This is your weekly school digest from NxGenSports. Manage digest settings in School Admin.
            </p>
          </div>
        </td></tr>
      </table>
    </body></html>
    """

    # Determine recipients
    user_filter = {"team_id": team_id} if team_id else {}
    if audience == "staff":
        user_filter["user_type"] = {"$nin": ["player", "parent"]}
    elif audience == "all":
        pass

    recipients = await db.users.find(user_filter, {"email": 1}).to_list(length=500)
    count = 0
    for r in recipients:
        email = r.get("email")
        if email:
            try:
                await send_email(email, f"[NxGenSports] Weekly Digest - {now.strftime('%b %d')}", html)
                count += 1
            except Exception as e:
                print(f"[DIGEST] Failed to send to {email}: {e}")

    return count


async def run_digest_scheduler():
    """Background task that checks every hour if it's time to send digests."""
    from database import db
    while True:
        try:
            await asyncio.sleep(3600)  # Check every hour
            now = datetime.now(timezone.utc)
            day_name = now.strftime("%A").lower()

            # Find all teams with enabled digests matching current day/hour
            cursor = db.digest_settings.find({"enabled": True, "day": day_name, "hour": now.hour})
            async for settings in cursor:
                team_id = settings.get("team_id", "")
                audience = settings.get("audience", "staff")
                last_sent = settings.get("last_sent_at", "")
                today_str = now.isoformat()[:10]
                if last_sent and last_sent.startswith(today_str):
                    continue  # Already sent today
                print(f"[DIGEST] Sending weekly digest for team {team_id}")
                count = await _send_weekly_digest(db, team_id, audience)
                await db.digest_settings.update_one(
                    {"_id": settings["_id"]},
                    {"$set": {"last_sent_at": now.isoformat()}}
                )
                print(f"[DIGEST] Sent to {count} recipients for team {team_id}")
        except Exception as e:
            print(f"[DIGEST] Scheduler error: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# ENGAGEMENT ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/analytics")
async def engagement_analytics(user: dict = Depends(get_current_user)):
    from database import db
    filt = _team_filter(user)
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()

    # ── Login activity (last 30 days) ──
    login_pipeline = [
        {"$match": {"success": True, "attempted_at": {"$gte": datetime.fromisoformat(month_ago)}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$attempted_at"}},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    login_activity = await db.login_attempts.aggregate(login_pipeline).to_list(length=31)

    # ── Message activity (last 30 days) ──
    msg_filt = {**(filt if filt else {}), "created_at": {"$gte": month_ago}}
    msg_pipeline = [
        {"$match": msg_filt},
        {"$addFields": {"date_str": {"$substr": ["$created_at", 0, 10]}}},
        {"$group": {"_id": "$date_str", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    msg_activity = await db.messages.aggregate(msg_pipeline).to_list(length=31)

    # ── Meeting activity ──
    meetings_total = await db.meetings.count_documents(filt if filt else {})
    meetings_week = await db.meetings.count_documents({**(filt if filt else {}), "created_at": {"$gte": week_ago}})
    meetings_by_status = [
        {"$match": filt if filt else {}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    meeting_status_dist = await db.meetings.aggregate(meetings_by_status).to_list(length=10)

    # ── Attendance rate ──
    today_str = now.isoformat()[:10]
    month_ago_str = month_ago[:10]
    att_total = await db.attendance_records.count_documents(
        {**(filt if filt else {}), "date": {"$gte": month_ago_str}}
    )
    att_present = await db.attendance_records.count_documents(
        {**(filt if filt else {}), "date": {"$gte": month_ago_str}, "status": "present"}
    )
    attendance_rate = round((att_present / att_total * 100), 1) if att_total > 0 else 0

    # ── Assignment completion ──
    assign_total = await db.student_assignments.count_documents(filt if filt else {})
    assign_submitted = await db.student_assignments.count_documents(
        {**(filt if filt else {}), "status": {"$in": ["submitted", "graded"]}}
    )
    assignment_rate = round((assign_submitted / assign_total * 100), 1) if assign_total > 0 else 0

    # ── New users this week / month ──
    new_users_week = await db.users.count_documents(
        {**(filt if filt else {}), "created_at": {"$gte": week_ago}}
    )
    new_users_month = await db.users.count_documents(
        {**(filt if filt else {}), "created_at": {"$gte": month_ago}}
    )

    # ── Announcements this week ──
    ann_week = await db.announcements.count_documents(
        {**(filt if filt else {}), "created_at": {"$gte": week_ago}}
    )

    # ── Messages this week ──
    msgs_week = await db.messages.count_documents(
        {**(filt if filt else {}), "created_at": {"$gte": week_ago}}
    )
    msgs_month = await db.messages.count_documents(
        {**(filt if filt else {}), "created_at": {"$gte": month_ago}}
    )

    # ── Conversations count ──
    convos_total = await db.conversations.count_documents(filt if filt else {})

    # ── Discipline this month ──
    discipline_month = await db.discipline_records.count_documents(
        {**(filt if filt else {}), "date": {"$gte": month_ago_str}}
    )

    return {
        "login_activity": [{"date": l["_id"], "logins": l["count"]} for l in login_activity],
        "message_activity": [{"date": m["_id"], "messages": m["count"]} for m in msg_activity],
        "attendance_rate": attendance_rate,
        "attendance_total": att_total,
        "attendance_present": att_present,
        "assignment_completion_rate": assignment_rate,
        "assignments_total": assign_total,
        "assignments_submitted": assign_submitted,
        "meetings_total": meetings_total,
        "meetings_this_week": meetings_week,
        "meeting_status_distribution": [{"status": m["_id"] or "unknown", "count": m["count"]} for m in meeting_status_dist],
        "new_users_this_week": new_users_week,
        "new_users_this_month": new_users_month,
        "announcements_this_week": ann_week,
        "messages_this_week": msgs_week,
        "messages_this_month": msgs_month,
        "conversations_total": convos_total,
        "discipline_incidents_this_month": discipline_month,
    }
