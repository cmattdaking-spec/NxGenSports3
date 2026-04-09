from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends

from utils import get_current_user, serialize_doc

router = APIRouter(prefix="/api/students", tags=["students"])


def _team_filter(user: dict) -> dict:
    if user.get("role") == "super_admin":
        return {}
    team_id = user.get("team_id")
    if not team_id:
        raise HTTPException(status_code=403, detail="No team assigned")
    return {"team_id": team_id}


def _require_staff(user: dict):
    blocked = {"player", "parent"}
    if user.get("user_type") in blocked and user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Staff access required")


# ─── Students CRUD ────────────────────────────────────────────────────────────
@router.get("/")
async def list_students(user: dict = Depends(get_current_user)):
    from database import db
    filt = _team_filter(user)
    docs = await db.students.find(filt).sort("last_name", 1).to_list(length=2000)
    return [serialize_doc(d) for d in docs]


@router.post("/")
async def create_student(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "team_id": user.get("team_id", ""),
        "school_id": user.get("school_id", ""),
        "first_name": body.get("first_name", ""),
        "last_name": body.get("last_name", ""),
        "full_name": f"{body.get('first_name', '')} {body.get('last_name', '')}".strip(),
        "student_id": body.get("student_id", ""),
        "email": body.get("email", ""),
        "grade_level": body.get("grade_level", ""),
        "date_of_birth": body.get("date_of_birth", ""),
        "gender": body.get("gender", ""),
        "phone": body.get("phone", ""),
        "address": body.get("address", ""),
        "guardian_name": body.get("guardian_name", ""),
        "guardian_phone": body.get("guardian_phone", ""),
        "guardian_email": body.get("guardian_email", ""),
        "enrollment_date": body.get("enrollment_date", now[:10]),
        "status": body.get("status", "active"),
        "sports": body.get("sports", []),
        "player_id": body.get("player_id"),
        "gpa": body.get("gpa"),
        "created_at": now,
        "updated_at": now,
    }
    result = await db.students.insert_one(doc)
    created = await db.students.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/{student_id}")
async def get_student(student_id: str, user: dict = Depends(get_current_user)):
    from database import db
    try:
        doc = await db.students.find_one({"_id": ObjectId(student_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Student not found")
    filt = _team_filter(user)
    if filt and doc.get("team_id") != filt.get("team_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    return serialize_doc(doc)


@router.patch("/{student_id}")
async def update_student(student_id: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    body.pop("id", None)
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    if body.get("first_name") or body.get("last_name"):
        existing = await db.students.find_one({"_id": ObjectId(student_id)})
        fn = body.get("first_name", existing.get("first_name", ""))
        ln = body.get("last_name", existing.get("last_name", ""))
        body["full_name"] = f"{fn} {ln}".strip()
    try:
        await db.students.update_one({"_id": ObjectId(student_id)}, {"$set": body})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    updated = await db.students.find_one({"_id": ObjectId(student_id)})
    return serialize_doc(updated)


@router.delete("/{student_id}")
async def delete_student(student_id: str, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    try:
        await db.students.delete_one({"_id": ObjectId(student_id)})
        # Clean up related records
        oid = ObjectId(student_id)
        await db.grades.delete_many({"student_id": student_id})
        await db.attendance_records.delete_many({"student_id": student_id})
        await db.student_assignments.delete_many({"student_id": student_id})
        await db.discipline_records.delete_many({"student_id": student_id})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    return {"success": True}


# ─── Grades ───────────────────────────────────────────────────────────────────
@router.get("/{student_id}/grades")
async def list_grades(student_id: str, user: dict = Depends(get_current_user)):
    from database import db
    docs = await db.grades.find({"student_id": student_id}).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(d) for d in docs]


@router.post("/{student_id}/grades")
async def add_grade(student_id: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "student_id": student_id,
        "team_id": user.get("team_id", ""),
        "school_id": user.get("school_id", ""),
        "course_name": body.get("course_name", ""),
        "course_code": body.get("course_code", ""),
        "teacher_name": body.get("teacher_name", ""),
        "faculty_id": body.get("faculty_id"),
        "semester": body.get("semester", ""),
        "grade_letter": body.get("grade_letter", ""),
        "grade_percent": body.get("grade_percent"),
        "credit_hours": body.get("credit_hours", 1),
        "notes": body.get("notes", ""),
        "created_at": now,
    }
    result = await db.grades.insert_one(doc)
    created = await db.grades.find_one({"_id": result.inserted_id})

    # Recalculate GPA
    await _recalculate_gpa(student_id)

    return serialize_doc(created)


@router.delete("/{student_id}/grades/{grade_id}")
async def delete_grade(student_id: str, grade_id: str, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    await db.grades.delete_one({"_id": ObjectId(grade_id)})
    await _recalculate_gpa(student_id)
    return {"success": True}


async def _recalculate_gpa(student_id: str):
    from database import db
    grade_map = {"A+": 4.0, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
                 "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "D-": 0.7, "F": 0.0}
    grades = await db.grades.find({"student_id": student_id}).to_list(length=500)
    total_points = 0.0
    total_credits = 0.0
    for g in grades:
        letter = g.get("grade_letter", "")
        credits = g.get("credit_hours", 1) or 1
        if letter in grade_map:
            total_points += grade_map[letter] * credits
            total_credits += credits
    gpa = round(total_points / total_credits, 2) if total_credits > 0 else None
    await db.students.update_one({"_id": ObjectId(student_id)}, {"$set": {"gpa": gpa}})


# ─── Attendance ───────────────────────────────────────────────────────────────
@router.get("/{student_id}/attendance")
async def list_attendance(student_id: str, user: dict = Depends(get_current_user)):
    from database import db
    docs = await db.attendance_records.find({"student_id": student_id}).sort("date", -1).to_list(length=1000)
    return [serialize_doc(d) for d in docs]


@router.post("/{student_id}/attendance")
async def record_attendance(student_id: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "student_id": student_id,
        "team_id": user.get("team_id", ""),
        "school_id": user.get("school_id", ""),
        "date": body.get("date", now[:10]),
        "status": body.get("status", "present"),
        "period": body.get("period", ""),
        "notes": body.get("notes", ""),
        "recorded_by": user.get("full_name") or user.get("email", ""),
        "created_at": now,
    }
    result = await db.attendance_records.insert_one(doc)
    created = await db.attendance_records.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.delete("/{student_id}/attendance/{record_id}")
async def delete_attendance(student_id: str, record_id: str, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    await db.attendance_records.delete_one({"_id": ObjectId(record_id)})
    return {"success": True}


# ─── Assignments ──────────────────────────────────────────────────────────────
@router.get("/{student_id}/assignments")
async def list_assignments(student_id: str, user: dict = Depends(get_current_user)):
    from database import db
    docs = await db.student_assignments.find({"student_id": student_id}).sort("due_date", -1).to_list(length=500)
    return [serialize_doc(d) for d in docs]


@router.post("/{student_id}/assignments")
async def create_assignment(student_id: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "student_id": student_id,
        "team_id": user.get("team_id", ""),
        "school_id": user.get("school_id", ""),
        "title": body.get("title", ""),
        "course_name": body.get("course_name", ""),
        "due_date": body.get("due_date", ""),
        "status": body.get("status", "pending"),
        "grade": body.get("grade"),
        "max_grade": body.get("max_grade", 100),
        "notes": body.get("notes", ""),
        "created_at": now,
    }
    result = await db.student_assignments.insert_one(doc)
    created = await db.student_assignments.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.patch("/{student_id}/assignments/{assignment_id}")
async def update_assignment(student_id: str, assignment_id: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    body.pop("id", None)
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.student_assignments.update_one({"_id": ObjectId(assignment_id)}, {"$set": body})
    updated = await db.student_assignments.find_one({"_id": ObjectId(assignment_id)})
    return serialize_doc(updated)


@router.delete("/{student_id}/assignments/{assignment_id}")
async def delete_assignment(student_id: str, assignment_id: str, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    await db.student_assignments.delete_one({"_id": ObjectId(assignment_id)})
    return {"success": True}


# ─── Discipline ───────────────────────────────────────────────────────────────
@router.get("/{student_id}/discipline")
async def list_discipline(student_id: str, user: dict = Depends(get_current_user)):
    from database import db
    docs = await db.discipline_records.find({"student_id": student_id}).sort("incident_date", -1).to_list(length=500)
    return [serialize_doc(d) for d in docs]


@router.post("/{student_id}/discipline")
async def add_discipline(student_id: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "student_id": student_id,
        "team_id": user.get("team_id", ""),
        "school_id": user.get("school_id", ""),
        "incident_date": body.get("incident_date", now[:10]),
        "incident_type": body.get("incident_type", "warning"),
        "description": body.get("description", ""),
        "action_taken": body.get("action_taken", ""),
        "reported_by": body.get("reported_by", user.get("full_name", "")),
        "resolved": body.get("resolved", False),
        "notes": body.get("notes", ""),
        "created_at": now,
    }
    result = await db.discipline_records.insert_one(doc)
    created = await db.discipline_records.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.delete("/{student_id}/discipline/{record_id}")
async def delete_discipline(student_id: str, record_id: str, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    await db.discipline_records.delete_one({"_id": ObjectId(record_id)})
    return {"success": True}


# ─── Transcript ───────────────────────────────────────────────────────────────
@router.get("/{student_id}/transcript")
async def get_transcript(student_id: str, user: dict = Depends(get_current_user)):
    from database import db
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    grades = await db.grades.find({"student_id": student_id}).sort("semester", 1).to_list(length=500)

    # Group by semester
    semesters = {}
    for g in grades:
        sem = g.get("semester", "Unknown")
        if sem not in semesters:
            semesters[sem] = []
        semesters[sem].append(serialize_doc(g))

    grade_map = {"A+": 4.0, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
                 "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "D-": 0.7, "F": 0.0}

    semester_data = []
    for sem_name, sem_grades in semesters.items():
        total_points = 0.0
        total_credits = 0.0
        for g in sem_grades:
            letter = g.get("grade_letter", "")
            credits = g.get("credit_hours", 1) or 1
            if letter in grade_map:
                total_points += grade_map[letter] * credits
                total_credits += credits
        sem_gpa = round(total_points / total_credits, 2) if total_credits > 0 else None
        semester_data.append({
            "semester": sem_name,
            "grades": sem_grades,
            "semester_gpa": sem_gpa,
            "total_credits": total_credits,
        })

    return {
        "student": serialize_doc(student),
        "semesters": semester_data,
        "cumulative_gpa": student.get("gpa"),
    }


# ─── Bulk Attendance ──────────────────────────────────────────────────────────
@router.post("/attendance/bulk")
async def bulk_attendance(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    records = body.get("records", [])
    date = body.get("date", datetime.now(timezone.utc).isoformat()[:10])
    now = datetime.now(timezone.utc).isoformat()

    docs = []
    for r in records:
        docs.append({
            "student_id": r.get("student_id"),
            "team_id": user.get("team_id", ""),
            "school_id": user.get("school_id", ""),
            "date": date,
            "status": r.get("status", "present"),
            "period": body.get("period", ""),
            "notes": r.get("notes", ""),
            "recorded_by": user.get("full_name") or user.get("email", ""),
            "created_at": now,
        })

    if docs:
        await db.attendance_records.insert_many(docs)
    return {"success": True, "count": len(docs)}


# ─── Stats ────────────────────────────────────────────────────────────────────
@router.get("/{student_id}/stats")
async def get_student_stats(student_id: str, user: dict = Depends(get_current_user)):
    from database import db
    attendance = await db.attendance_records.find({"student_id": student_id}).to_list(length=5000)
    total = len(attendance)
    present = sum(1 for a in attendance if a.get("status") == "present")
    absent = sum(1 for a in attendance if a.get("status") == "absent")
    tardy = sum(1 for a in attendance if a.get("status") == "tardy")
    excused = sum(1 for a in attendance if a.get("status") == "excused")
    attendance_rate = round((present / total) * 100, 1) if total > 0 else None

    assignments = await db.student_assignments.find({"student_id": student_id}).to_list(length=500)
    total_assignments = len(assignments)
    completed = sum(1 for a in assignments if a.get("status") in ("submitted", "graded"))
    missing = sum(1 for a in assignments if a.get("status") == "missing")

    discipline = await db.discipline_records.find({"student_id": student_id}).to_list(length=500)

    student = await db.students.find_one({"_id": ObjectId(student_id)})

    return {
        "gpa": student.get("gpa") if student else None,
        "attendance": {
            "total": total, "present": present, "absent": absent,
            "tardy": tardy, "excused": excused, "rate": attendance_rate,
        },
        "assignments": {
            "total": total_assignments, "completed": completed, "missing": missing,
        },
        "discipline": {
            "total": len(discipline),
            "unresolved": sum(1 for d in discipline if not d.get("resolved")),
        },
    }
