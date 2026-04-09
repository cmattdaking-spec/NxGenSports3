from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends

from utils import get_current_user, serialize_doc

router = APIRouter(prefix="/api/clubs", tags=["clubs"])


def _team_filter(user: dict) -> dict:
    if user.get("role") == "super_admin":
        return {}
    team_id = user.get("team_id")
    if not team_id:
        raise HTTPException(status_code=403, detail="No team assigned")
    return {"team_id": team_id}


def _require_admin_or_advisor(user: dict):
    allowed_roles = {"admin", "super_admin"}
    allowed_coaching = {"head_coach", "athletic_director"}
    if user.get("role") in allowed_roles or user.get("coaching_role") in allowed_coaching:
        return
    raise HTTPException(status_code=403, detail="Admin access required")


# ─── Clubs CRUD ───────────────────────────────────────────────────────────────
@router.get("/")
async def list_clubs(user: dict = Depends(get_current_user)):
    from database import db
    filt = _team_filter(user)
    docs = await db.clubs.find(filt).sort("name", 1).to_list(length=500)
    # Enrich with member count
    result = []
    for d in docs:
        club = serialize_doc(d)
        club["member_count"] = await db.club_memberships.count_documents({"club_id": str(d["_id"])})
        result.append(club)
    return result


@router.post("/")
async def create_club(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_admin_or_advisor(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "team_id": user.get("team_id", ""),
        "school_id": user.get("school_id", ""),
        "name": body.get("name", ""),
        "description": body.get("description", ""),
        "club_type": body.get("club_type", "club"),
        "category": body.get("category", ""),
        "advisor_name": body.get("advisor_name", ""),
        "advisor_id": body.get("advisor_id"),
        "meeting_day": body.get("meeting_day", ""),
        "meeting_time": body.get("meeting_time", ""),
        "meeting_location": body.get("meeting_location", ""),
        "max_members": body.get("max_members"),
        "status": body.get("status", "active"),
        "created_at": now,
        "updated_at": now,
    }
    result = await db.clubs.insert_one(doc)
    created = await db.clubs.find_one({"_id": result.inserted_id})
    club = serialize_doc(created)
    club["member_count"] = 0
    return club


@router.get("/stats")
async def club_stats(user: dict = Depends(get_current_user)):
    from database import db
    filt = _team_filter(user)
    total_clubs = await db.clubs.count_documents(filt)
    active_clubs = await db.clubs.count_documents({**filt, "status": "active"})
    total_members = await db.club_memberships.count_documents(filt if filt else {})
    upcoming_events = await db.club_events.count_documents({
        **(filt if filt else {}),
        "event_date": {"$gte": datetime.now(timezone.utc).isoformat()[:10]},
    })
    return {
        "total_clubs": total_clubs,
        "active_clubs": active_clubs,
        "total_members": total_members,
        "upcoming_events": upcoming_events,
    }


@router.get("/{club_id}")
async def get_club(club_id: str, user: dict = Depends(get_current_user)):
    from database import db
    try:
        doc = await db.clubs.find_one({"_id": ObjectId(club_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Club not found")
    club = serialize_doc(doc)
    club["member_count"] = await db.club_memberships.count_documents({"club_id": club_id})
    return club


@router.patch("/{club_id}")
async def update_club(club_id: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_admin_or_advisor(user)
    body.pop("id", None)
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    try:
        await db.clubs.update_one({"_id": ObjectId(club_id)}, {"$set": body})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    updated = await db.clubs.find_one({"_id": ObjectId(club_id)})
    club = serialize_doc(updated)
    club["member_count"] = await db.club_memberships.count_documents({"club_id": club_id})
    return club


@router.delete("/{club_id}")
async def delete_club(club_id: str, user: dict = Depends(get_current_user)):
    from database import db
    _require_admin_or_advisor(user)
    try:
        await db.clubs.delete_one({"_id": ObjectId(club_id)})
        await db.club_memberships.delete_many({"club_id": club_id})
        await db.club_events.delete_many({"club_id": club_id})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    return {"success": True}


# ─── Memberships ──────────────────────────────────────────────────────────────
@router.get("/{club_id}/members")
async def list_members(club_id: str, user: dict = Depends(get_current_user)):
    from database import db
    docs = await db.club_memberships.find({"club_id": club_id}).sort("joined_at", -1).to_list(length=500)
    return [serialize_doc(d) for d in docs]


@router.post("/{club_id}/members")
async def add_member(club_id: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    student_id = body.get("student_id")
    if not student_id:
        raise HTTPException(status_code=400, detail="student_id required")

    # Resolve student name
    student_name = ""
    grade_level = ""
    try:
        student = await db.students.find_one({"_id": ObjectId(student_id)})
        if student:
            student_name = student.get("full_name", "")
            grade_level = student.get("grade_level", "")
    except Exception:
        pass

    # Check duplicate
    existing = await db.club_memberships.find_one({"club_id": club_id, "student_id": student_id})
    if existing:
        raise HTTPException(status_code=409, detail="Student already a member")

    # Check max members
    club = await db.clubs.find_one({"_id": ObjectId(club_id)})
    if club and club.get("max_members"):
        current = await db.club_memberships.count_documents({"club_id": club_id})
        if current >= club["max_members"]:
            raise HTTPException(status_code=400, detail="Club has reached maximum members")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "club_id": club_id,
        "student_id": student_id,
        "student_name": student_name,
        "grade_level": grade_level,
        "team_id": user.get("team_id", ""),
        "role": body.get("role", "member"),
        "joined_at": now,
        "created_at": now,
    }
    result = await db.club_memberships.insert_one(doc)
    created = await db.club_memberships.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.patch("/{club_id}/members/{membership_id}")
async def update_membership(club_id: str, membership_id: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    body.pop("id", None)
    body.pop("_id", None)
    await db.club_memberships.update_one({"_id": ObjectId(membership_id)}, {"$set": body})
    updated = await db.club_memberships.find_one({"_id": ObjectId(membership_id)})
    return serialize_doc(updated)


@router.delete("/{club_id}/members/{membership_id}")
async def remove_member(club_id: str, membership_id: str, user: dict = Depends(get_current_user)):
    from database import db
    await db.club_memberships.delete_one({"_id": ObjectId(membership_id)})
    return {"success": True}


# ─── Events ───────────────────────────────────────────────────────────────────
@router.get("/{club_id}/events")
async def list_events(club_id: str, user: dict = Depends(get_current_user)):
    from database import db
    docs = await db.club_events.find({"club_id": club_id}).sort("event_date", -1).to_list(length=200)
    return [serialize_doc(d) for d in docs]


@router.post("/{club_id}/events")
async def create_event(club_id: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "club_id": club_id,
        "team_id": user.get("team_id", ""),
        "school_id": user.get("school_id", ""),
        "title": body.get("title", ""),
        "description": body.get("description", ""),
        "event_date": body.get("event_date", ""),
        "event_time": body.get("event_time", ""),
        "location": body.get("location", ""),
        "event_type": body.get("event_type", "meeting"),
        "created_by": user.get("full_name") or user.get("email", ""),
        "created_at": now,
    }
    result = await db.club_events.insert_one(doc)
    created = await db.club_events.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.delete("/{club_id}/events/{event_id}")
async def delete_event(club_id: str, event_id: str, user: dict = Depends(get_current_user)):
    from database import db
    await db.club_events.delete_one({"_id": ObjectId(event_id)})
    return {"success": True}


# ─── All Upcoming Events ─────────────────────────────────────────────────────
@router.get("/events/upcoming")
async def upcoming_events(user: dict = Depends(get_current_user)):
    from database import db
    filt = _team_filter(user)
    today = datetime.now(timezone.utc).isoformat()[:10]
    event_filt = {**(filt if filt else {}), "event_date": {"$gte": today}}
    docs = await db.club_events.find(event_filt).sort("event_date", 1).to_list(length=100)

    # Enrich with club names
    club_ids = list(set(d.get("club_id") for d in docs if d.get("club_id")))
    club_map = {}
    for cid in club_ids:
        try:
            c = await db.clubs.find_one({"_id": ObjectId(cid)})
            if c:
                club_map[cid] = c.get("name", "")
        except Exception:
            pass

    result = []
    for d in docs:
        e = serialize_doc(d)
        e["club_name"] = club_map.get(d.get("club_id"), "")
        result.append(e)
    return result
