from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends

from utils import get_current_user, serialize_doc

router = APIRouter(prefix="/api/faculty", tags=["faculty"])


def _team_filter(user: dict) -> dict:
    if user.get("role") == "super_admin":
        return {}
    team_id = user.get("team_id")
    if not team_id:
        raise HTTPException(status_code=403, detail="No team assigned")
    return {"team_id": team_id}


def _require_admin(user: dict):
    allowed_roles = {"admin", "super_admin"}
    allowed_coaching = {"head_coach", "athletic_director"}
    if user.get("role") not in allowed_roles and user.get("coaching_role") not in allowed_coaching:
        raise HTTPException(status_code=403, detail="Admin access required")


# ─── Faculty CRUD ─────────────────────────────────────────────────────────────
@router.get("/")
async def list_faculty(user: dict = Depends(get_current_user)):
    from database import db
    filt = _team_filter(user)
    docs = await db.faculty.find(filt).sort("last_name", 1).to_list(length=2000)
    return [serialize_doc(d) for d in docs]


@router.post("/")
async def create_faculty(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_admin(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "team_id": user.get("team_id", ""),
        "school_id": user.get("school_id", ""),
        "first_name": body.get("first_name", ""),
        "last_name": body.get("last_name", ""),
        "full_name": f"{body.get('first_name', '')} {body.get('last_name', '')}".strip(),
        "email": body.get("email", ""),
        "phone": body.get("phone", ""),
        "position": body.get("position", ""),
        "department": body.get("department", ""),
        "employee_id": body.get("employee_id", ""),
        "hire_date": body.get("hire_date", ""),
        "status": body.get("status", "active"),
        "qualifications": body.get("qualifications", ""),
        "subjects": body.get("subjects", []),
        "bio": body.get("bio", ""),
        "office_room": body.get("office_room", ""),
        "created_at": now,
        "updated_at": now,
    }
    result = await db.faculty.insert_one(doc)
    created = await db.faculty.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/stats")
async def faculty_stats(user: dict = Depends(get_current_user)):
    from database import db
    filt = _team_filter(user)
    total = await db.faculty.count_documents(filt)
    active_filt = {**filt, "status": "active"}
    active = await db.faculty.count_documents(active_filt)

    dept_filt = _team_filter(user)
    departments = await db.departments.count_documents(dept_filt)
    subjects = await db.subjects.count_documents(dept_filt)
    classrooms = await db.classrooms.count_documents(dept_filt)
    schedules = await db.class_schedules.count_documents(dept_filt)

    return {
        "total_faculty": total,
        "active_faculty": active,
        "on_leave": total - active,
        "departments": departments,
        "subjects": subjects,
        "classrooms": classrooms,
        "schedule_entries": schedules,
    }


@router.get("/member/{faculty_id}")
async def get_faculty(faculty_id: str, user: dict = Depends(get_current_user)):
    from database import db
    try:
        doc = await db.faculty.find_one({"_id": ObjectId(faculty_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Faculty member not found")
    filt = _team_filter(user)
    if filt and doc.get("team_id") != filt.get("team_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    return serialize_doc(doc)


@router.patch("/member/{faculty_id}")
async def update_faculty(faculty_id: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_admin(user)
    body.pop("id", None)
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    if body.get("first_name") or body.get("last_name"):
        existing = await db.faculty.find_one({"_id": ObjectId(faculty_id)})
        fn = body.get("first_name", existing.get("first_name", ""))
        ln = body.get("last_name", existing.get("last_name", ""))
        body["full_name"] = f"{fn} {ln}".strip()
    try:
        await db.faculty.update_one({"_id": ObjectId(faculty_id)}, {"$set": body})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    updated = await db.faculty.find_one({"_id": ObjectId(faculty_id)})
    return serialize_doc(updated)


@router.delete("/member/{faculty_id}")
async def delete_faculty(faculty_id: str, user: dict = Depends(get_current_user)):
    from database import db
    _require_admin(user)
    try:
        await db.faculty.delete_one({"_id": ObjectId(faculty_id)})
        await db.class_schedules.delete_many({"faculty_id": faculty_id})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    return {"success": True}


# ─── Departments ──────────────────────────────────────────────────────────────
@router.get("/departments")
async def list_departments(user: dict = Depends(get_current_user)):
    from database import db
    filt = _team_filter(user)
    docs = await db.departments.find(filt).sort("name", 1).to_list(length=500)
    return [serialize_doc(d) for d in docs]


@router.post("/departments")
async def create_department(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_admin(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "team_id": user.get("team_id", ""),
        "school_id": user.get("school_id", ""),
        "name": body.get("name", ""),
        "head_name": body.get("head_name", ""),
        "description": body.get("description", ""),
        "created_at": now,
    }
    result = await db.departments.insert_one(doc)
    created = await db.departments.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.delete("/departments/{dept_id}")
async def delete_department(dept_id: str, user: dict = Depends(get_current_user)):
    from database import db
    _require_admin(user)
    await db.departments.delete_one({"_id": ObjectId(dept_id)})
    return {"success": True}


# ─── Subjects ─────────────────────────────────────────────────────────────────
@router.get("/subjects")
async def list_subjects(user: dict = Depends(get_current_user)):
    from database import db
    filt = _team_filter(user)
    docs = await db.subjects.find(filt).sort("name", 1).to_list(length=500)
    return [serialize_doc(d) for d in docs]


@router.post("/subjects")
async def create_subject(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_admin(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "team_id": user.get("team_id", ""),
        "school_id": user.get("school_id", ""),
        "name": body.get("name", ""),
        "code": body.get("code", ""),
        "department": body.get("department", ""),
        "grade_levels": body.get("grade_levels", []),
        "credit_hours": body.get("credit_hours", 1),
        "description": body.get("description", ""),
        "created_at": now,
    }
    result = await db.subjects.insert_one(doc)
    created = await db.subjects.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: str, user: dict = Depends(get_current_user)):
    from database import db
    _require_admin(user)
    await db.subjects.delete_one({"_id": ObjectId(subject_id)})
    return {"success": True}


# ─── Classrooms ───────────────────────────────────────────────────────────────
@router.get("/classrooms")
async def list_classrooms(user: dict = Depends(get_current_user)):
    from database import db
    filt = _team_filter(user)
    docs = await db.classrooms.find(filt).sort("room_number", 1).to_list(length=500)
    return [serialize_doc(d) for d in docs]


@router.post("/classrooms")
async def create_classroom(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_admin(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "team_id": user.get("team_id", ""),
        "school_id": user.get("school_id", ""),
        "room_number": body.get("room_number", ""),
        "building": body.get("building", ""),
        "capacity": body.get("capacity"),
        "room_type": body.get("room_type", "classroom"),
        "equipment": body.get("equipment", []),
        "created_at": now,
    }
    result = await db.classrooms.insert_one(doc)
    created = await db.classrooms.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.delete("/classrooms/{classroom_id}")
async def delete_classroom(classroom_id: str, user: dict = Depends(get_current_user)):
    from database import db
    _require_admin(user)
    await db.classrooms.delete_one({"_id": ObjectId(classroom_id)})
    return {"success": True}


# ─── Class Schedules ──────────────────────────────────────────────────────────
@router.get("/member/{faculty_id}/schedule")
async def list_schedule(faculty_id: str, user: dict = Depends(get_current_user)):
    from database import db
    docs = await db.class_schedules.find({"faculty_id": faculty_id}).sort([("day_of_week", 1), ("period", 1)]).to_list(length=500)
    return [serialize_doc(d) for d in docs]


@router.post("/member/{faculty_id}/schedule")
async def add_schedule_entry(faculty_id: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_admin(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "faculty_id": faculty_id,
        "team_id": user.get("team_id", ""),
        "school_id": user.get("school_id", ""),
        "subject_name": body.get("subject_name", ""),
        "classroom": body.get("classroom", ""),
        "period": body.get("period", ""),
        "day_of_week": body.get("day_of_week", ""),
        "start_time": body.get("start_time", ""),
        "end_time": body.get("end_time", ""),
        "grade_level": body.get("grade_level", ""),
        "notes": body.get("notes", ""),
        "created_at": now,
    }
    result = await db.class_schedules.insert_one(doc)
    created = await db.class_schedules.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.delete("/member/{faculty_id}/schedule/{entry_id}")
async def delete_schedule_entry(faculty_id: str, entry_id: str, user: dict = Depends(get_current_user)):
    from database import db
    _require_admin(user)
    await db.class_schedules.delete_one({"_id": ObjectId(entry_id)})
    return {"success": True}


# ─── Master Schedule (all classes) ────────────────────────────────────────────
@router.get("/schedule/all")
async def master_schedule(user: dict = Depends(get_current_user)):
    from database import db
    filt = _team_filter(user)
    docs = await db.class_schedules.find(filt).sort([("day_of_week", 1), ("period", 1)]).to_list(length=2000)

    # Enrich with faculty names
    faculty_ids = list(set(d.get("faculty_id") for d in docs if d.get("faculty_id")))
    faculty_map = {}
    for fid in faculty_ids:
        try:
            f = await db.faculty.find_one({"_id": ObjectId(fid)})
            if f:
                faculty_map[fid] = f.get("full_name", "")
        except Exception:
            pass

    result = []
    for d in docs:
        s = serialize_doc(d)
        s["faculty_name"] = faculty_map.get(d.get("faculty_id"), "")
        result.append(s)
    return result
