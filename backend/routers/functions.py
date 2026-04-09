import secrets
import asyncio
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, Depends

from utils import (
    get_current_user, serialize_doc, public_base_url,
    send_email, invite_email_html,
)

router = APIRouter(prefix="/api/functions", tags=["functions"])

_ADMIN_COACHING_ROLES = frozenset({
    "head_coach", "athletic_director", "associate_head_coach",
    "offensive_coordinator", "defensive_coordinator",
    "special_teams_coordinator", "strength_conditioning_coordinator",
})


def _platform_role(coaching_role: str) -> str:
    return "admin" if coaching_role in _ADMIN_COACHING_ROLES else "user"


def _check_invite_permission(user: dict) -> None:
    allowed = {"admin", "super_admin", "head_coach", "athletic_director", "school_admin"}
    effective_role = user.get("coaching_role") or user.get("role", "")
    if user.get("role") not in allowed and effective_role not in allowed:
        raise HTTPException(status_code=403, detail="Forbidden")


async def _resolve_school_context(invite_type, team_id, school_id, school_name, school_code):
    from database import db
    if invite_type != "school_setup" or not team_id or school_id:
        return school_id, school_name, school_code
    existing = await db.school.find_one({"team_id": team_id})
    if existing:
        school_id = str(existing["_id"])
        school_name = school_name or existing.get("school_name", "")
        school_code = school_code or existing.get("school_code", "")
    return school_id, school_name, school_code


def _resolve_coaching_role(invite_type: str, raw_role: str) -> str:
    return {"player": "player", "parent": "parent", "teacher": "teacher", "school_admin": "school_admin"}.get(invite_type, raw_role)


def _generate_player_id(last_name: str) -> str:
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    initial = (last_name[0] if last_name else "X").upper()
    rand = "".join(secrets.choice(chars) for _ in range(3))
    return initial + rand


def _build_invite_record(email, team_id, school_id, school_name, school_code,
                         coaching_role, assigned_sports, invite_type, first_name,
                         last_name, player_id, invite_token, invited_by, body):
    record = {
        "email": email, "team_id": team_id, "school_id": school_id,
        "school_name": school_name, "school_code": school_code,
        "coaching_role": coaching_role, "assigned_sports": assigned_sports,
        "assigned_positions": body.get("assigned_positions", []),
        "assigned_phases": body.get("assigned_phases", []),
        "status": "pending", "invited_by": invited_by, "invite_type": invite_type,
        "first_name": first_name, "last_name": last_name,
        "poc_name": f"{first_name} {last_name}",
        "child_player_id": body.get("child_player_id"),
        "player_id": player_id, "invite_token": invite_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_date": datetime.now(timezone.utc).isoformat(),
    }
    if invite_type == "school_setup":
        for field in ("poc_phone", "mascot", "subscribed_sports",
                      "subscription_term", "location_city", "location_state"):
            if body.get(field) is not None:
                record[field] = body[field]
    if invite_type == "teacher":
        if body.get("department"):
            record["department"] = body["department"]
        if body.get("subjects"):
            record["subjects"] = body["subjects"]
    return record


async def _sync_existing_user_to_invite(email, team_id, school_id, school_name,
                                         school_code, coaching_role, assigned_sports):
    from database import db
    existing = await db.users.find_one({"email": email})
    if not existing:
        return
    await db.users.update_one({"email": email}, {"$set": {
        "team_id": team_id, "school_id": school_id, "school_name": school_name,
        "school_code": school_code, "coaching_role": coaching_role,
        "assigned_sports": assigned_sports,
        "role": _platform_role(coaching_role),
        "profile_verified": False,
    }})


@router.post("/getTeamUsers")
async def fn_get_team_users(body: dict = None, user: dict = Depends(get_current_user)):
    from database import db
    if user.get("role") == "super_admin":
        all_users = await db.users.find({"role": {"$ne": "super_admin"}}).to_list(length=2000)
        return [serialize_doc(u) for u in all_users]
    team_id = user.get("team_id")
    if not team_id:
        return []
    team_users = await db.users.find({
        "team_id": team_id, "role": {"$ne": "super_admin"}
    }).to_list(length=500)
    return [serialize_doc(u) for u in team_users]


@router.post("/listAllSchools")
async def fn_list_all_schools(body: dict = None, user: dict = Depends(get_current_user)):
    from database import db
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    schools = await db.school.find({}).sort("created_at", -1).to_list(length=500)
    return {"schools": [serialize_doc(s) for s in schools]}


@router.post("/sendInvite")
async def fn_send_invite(request: Request, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _check_invite_permission(user)

    email = body.get("email", "").strip().lower()
    first_name = body.get("first_name", "").strip()
    last_name = body.get("last_name", "").strip()
    if not email or not first_name or not last_name:
        raise HTTPException(status_code=400, detail="email, first_name, last_name are required")

    invite_type = body.get("invite_type", "staff")
    team_id = body.get("team_id") or user.get("team_id", "")
    school_id = body.get("school_id") or user.get("school_id")
    school_name = body.get("school_name") or user.get("school_name", "")
    school_code = body.get("school_code") or user.get("school_code", "")
    assigned_sports = body.get("assigned_sports", user.get("assigned_sports", ["football"]))

    school_id, school_name, school_code = await _resolve_school_context(
        invite_type, team_id, school_id, school_name, school_code
    )
    coaching_role = _resolve_coaching_role(invite_type, body.get("coaching_role", "position_coach"))
    player_id = _generate_player_id(last_name) if invite_type == "player" else None
    invite_token = secrets.token_urlsafe(32)

    invite_data = _build_invite_record(
        email, team_id, school_id, school_name, school_code,
        coaching_role, assigned_sports, invite_type, first_name, last_name,
        player_id, invite_token, user.get("email", ""), body,
    )

    await db.invites.update_many(
        {"email": email, "team_id": team_id, "status": "pending"},
        {"$set": {"status": "expired"}}
    )
    await db.invites.insert_one(invite_data)
    await _sync_existing_user_to_invite(
        email, team_id, school_id, school_name, school_code, coaching_role, assigned_sports
    )

    invite_url = f"{public_base_url(request)}/Login?invite_token={invite_token}"
    asyncio.create_task(send_email(
        to_email=email,
        subject=f"You've been invited to {school_name or 'NxGenSports'}",
        html=invite_email_html(invite_data, invite_url),
    ))
    print(f"[INVITE] {email} → {invite_url}")
    return {"success": True, "player_id": player_id, "invite_token": invite_token, "invite_url": invite_url}


@router.post("/updateTeamUser")
async def fn_update_team_user(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    allowed_roles = ["admin", "super_admin", "head_coach", "athletic_director"]
    effective_role = user.get("coaching_role") or user.get("role")
    if user.get("role") not in allowed_roles and effective_role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Forbidden")

    user_id = body.get("userId")
    data = body.get("data", {})
    if not user_id:
        raise HTTPException(status_code=400, detail="userId required")

    try:
        target = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid userId")
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("role") == "super_admin":
        if target.get("role") == "super_admin":
            raise HTTPException(status_code=403, detail="Cannot modify super admin")
    elif target.get("team_id") != user.get("team_id"):
        raise HTTPException(status_code=403, detail="User not on your team")

    data.pop("id", None)
    data.pop("_id", None)
    data.pop("password_hash", None)
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": data})
    return {"success": True}


@router.post("/createParentUser")
async def fn_create_parent_user(body: dict):
    from database import db
    first_name = body.get("first_name", "")
    last_name = body.get("last_name", "")
    school_id = body.get("school_id")
    assigned_sports = body.get("assigned_sports", [])
    if not first_name or not last_name or not school_id or not assigned_sports:
        raise HTTPException(status_code=400, detail="Missing required fields")

    try:
        school = await db.school.find_one({"_id": ObjectId(school_id)})
    except Exception:
        school = None

    user_doc = {
        "full_name": f"{first_name} {last_name}",
        "first_name": first_name, "last_name": last_name,
        "school_id": school_id,
        "team_id": school.get("team_id") if school else None,
        "assigned_sports": assigned_sports,
        "role": "user", "coaching_role": "parent", "user_type": "parent",
        "profile_verified": False, "status": "pending_approval",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if body.get("email"):
        user_doc["email"] = body["email"].lower()
    if body.get("child_player_id"):
        user_doc["child_ids"] = [body["child_player_id"]]

    result = await db.users.insert_one(user_doc)
    return {"success": True, "userId": str(result.inserted_id)}


@router.post("/joinSchoolByCode")
async def fn_join_school_by_code(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    school_code = body.get("school_code", "").strip().upper()
    if not school_code:
        raise HTTPException(status_code=400, detail="school_code required")
    school = await db.school.find_one({"school_code": school_code})
    if not school:
        raise HTTPException(status_code=404, detail="School not found. Check your school code.")
    if school.get("status") and school["status"] != "active":
        raise HTTPException(status_code=403, detail="This school account is not currently active.")

    user_id = user.get("id") or user.get("_id")
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {
        "team_id": school["team_id"],
        "school_id": str(school["_id"]),
        "school_name": school.get("school_name", ""),
        "school_code": school.get("school_code", ""),
    }})
    return {
        "success": True,
        "school": {
            "team_id": school["team_id"], "school_id": str(school["_id"]),
            "school_name": school.get("school_name", ""),
            "school_code": school.get("school_code", ""),
            "subscribed_sports": school.get("subscribed_sports", []),
        }
    }


@router.post("/listMasterTeams")
async def fn_list_master_teams(body: dict = None, user: dict = Depends(get_current_user)):
    from database import db
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    schools = await db.school.find({}).sort("created_at", -1).to_list(length=500)
    return {"teams": [{
        "id": str(s["_id"]), "team_id": s.get("team_id", ""),
        "school_name": s.get("school_name", ""),
        "assigned_admin_name": s.get("poc_name", ""),
        "assigned_admin_email": s.get("poc_email", ""),
        "assigned_admin_role": s.get("poc_role", "head_coach"),
        "subscription_status": s.get("status", "active"),
        "subscription_term": s.get("subscription_term", "annual"),
        "subscription_start": s.get("subscription_start"),
        "subscription_end": s.get("subscription_end"),
    } for s in schools]}


@router.post("/{function_name}")
async def generic_function(function_name: str, body: dict = None, user: dict = Depends(get_current_user)):
    return {"success": True, "data": None, "function": function_name}
