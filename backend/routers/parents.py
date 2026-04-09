from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends

from utils import get_current_user, serialize_doc

router = APIRouter(prefix="/api/parents", tags=["parents"])


def _require_parent_or_admin(user: dict):
    if user.get("role") == "super_admin":
        return
    if user.get("user_type") == "parent":
        return
    if user.get("role") in ("admin", "head_coach", "athletic_director"):
        return
    raise HTTPException(status_code=403, detail="Parent or admin access required")


# ─── Parent-Student Links ─────────────────────────────────────────────────────
@router.get("/my-students")
async def my_students(user: dict = Depends(get_current_user)):
    from database import db
    user_id = user.get("id") or user.get("_id")

    links = await db.parent_student_links.find({"parent_id": user_id}).to_list(length=50)
    student_ids = [l.get("student_id") for l in links]

    students = []
    for sid in student_ids:
        try:
            student = await db.students.find_one({"_id": ObjectId(sid)})
            if student:
                students.append(serialize_doc(student))
        except Exception:
            pass

    return students


@router.post("/link-student")
async def link_student(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    _require_parent_or_admin(user)

    student_id = body.get("student_id")
    student_code = body.get("student_code", "").strip()
    parent_id = body.get("parent_id") or user.get("id") or user.get("_id")

    if not student_id and not student_code:
        raise HTTPException(status_code=400, detail="student_id or student_code required")

    # Resolve student
    if student_code:
        student = await db.students.find_one({"student_id": student_code})
        if not student:
            raise HTTPException(status_code=404, detail="No student found with that ID code")
        student_id = str(student["_id"])
    else:
        try:
            student = await db.students.find_one({"_id": ObjectId(student_id)})
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid student_id")
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

    # Check for duplicate link
    existing = await db.parent_student_links.find_one({
        "parent_id": parent_id,
        "student_id": student_id,
    })
    if existing:
        raise HTTPException(status_code=409, detail="Student already linked")

    now = datetime.now(timezone.utc).isoformat()
    await db.parent_student_links.insert_one({
        "parent_id": parent_id,
        "student_id": student_id,
        "student_name": student.get("full_name", ""),
        "team_id": student.get("team_id", ""),
        "created_at": now,
    })
    return {"success": True, "student": serialize_doc(student)}


@router.delete("/unlink-student/{student_id}")
async def unlink_student(student_id: str, user: dict = Depends(get_current_user)):
    from database import db
    _require_parent_or_admin(user)
    parent_id = user.get("id") or user.get("_id")
    await db.parent_student_links.delete_one({
        "parent_id": parent_id,
        "student_id": student_id,
    })
    return {"success": True}


# ─── Progress Report ──────────────────────────────────────────────────────────
@router.get("/progress/{student_id}")
async def progress_report(student_id: str, user: dict = Depends(get_current_user)):
    from database import db

    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Grades
    grades = await db.grades.find({"student_id": student_id}).sort("semester", 1).to_list(length=500)

    # Group grades by semester
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
        tp, tc = 0.0, 0.0
        for g in sem_grades:
            letter = g.get("grade_letter", "")
            credits = g.get("credit_hours", 1) or 1
            if letter in grade_map:
                tp += grade_map[letter] * credits
                tc += credits
        semester_data.append({
            "semester": sem_name,
            "grades": sem_grades,
            "semester_gpa": round(tp / tc, 2) if tc > 0 else None,
            "total_credits": tc,
        })

    # Attendance
    attendance = await db.attendance_records.find({"student_id": student_id}).to_list(length=5000)
    total_att = len(attendance)
    present = sum(1 for a in attendance if a.get("status") == "present")
    absent = sum(1 for a in attendance if a.get("status") == "absent")
    tardy = sum(1 for a in attendance if a.get("status") == "tardy")
    excused = sum(1 for a in attendance if a.get("status") == "excused")
    att_rate = round((present / total_att) * 100, 1) if total_att > 0 else None

    # Recent attendance (last 14)
    recent_att = sorted(attendance, key=lambda a: a.get("date", ""), reverse=True)[:14]

    # Assignments
    assignments = await db.student_assignments.find({"student_id": student_id}).sort("due_date", -1).to_list(length=200)
    total_asgn = len(assignments)
    completed = sum(1 for a in assignments if a.get("status") in ("submitted", "graded"))
    missing = sum(1 for a in assignments if a.get("status") == "missing")

    # Discipline
    discipline = await db.discipline_records.find({"student_id": student_id}).sort("incident_date", -1).to_list(length=100)

    return {
        "student": serialize_doc(student),
        "semesters": semester_data,
        "cumulative_gpa": student.get("gpa"),
        "attendance": {
            "total": total_att, "present": present, "absent": absent,
            "tardy": tardy, "excused": excused, "rate": att_rate,
            "recent": [serialize_doc(a) for a in recent_att],
        },
        "assignments": {
            "total": total_asgn, "completed": completed, "missing": missing,
            "recent": [serialize_doc(a) for a in assignments[:10]],
        },
        "discipline": {
            "total": len(discipline),
            "unresolved": sum(1 for d in discipline if not d.get("resolved")),
            "recent": [serialize_doc(d) for d in discipline[:5]],
        },
    }


# ─── Meetings ─────────────────────────────────────────────────────────────────
@router.get("/meetings")
async def list_meetings(user: dict = Depends(get_current_user)):
    from database import db
    user_id = user.get("id") or user.get("_id")

    # Parents see meetings they requested; faculty/admin see meetings requested with them
    query = {"$or": [
        {"parent_id": user_id},
        {"faculty_id": user_id},
    ]}
    docs = await db.meetings.find(query).sort("meeting_date", -1).to_list(length=200)
    return [serialize_doc(d) for d in docs]


@router.post("/meetings")
async def request_meeting(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    parent_id = user.get("id") or user.get("_id")

    faculty_id = body.get("faculty_id")
    student_id = body.get("student_id")
    meeting_date = body.get("meeting_date", "")
    meeting_time = body.get("meeting_time", "")
    subject = body.get("subject", "")
    notes = body.get("notes", "")

    if not faculty_id or not meeting_date:
        raise HTTPException(status_code=400, detail="faculty_id and meeting_date required")

    # Resolve names
    faculty_name = ""
    student_name = ""
    parent_name = user.get("full_name") or user.get("email", "")

    try:
        faculty = await db.faculty.find_one({"_id": ObjectId(faculty_id)})
        if faculty:
            faculty_name = faculty.get("full_name", "")
    except Exception:
        pass

    if student_id:
        try:
            student = await db.students.find_one({"_id": ObjectId(student_id)})
            if student:
                student_name = student.get("full_name", "")
        except Exception:
            pass

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "parent_id": parent_id,
        "parent_name": parent_name,
        "faculty_id": faculty_id,
        "faculty_name": faculty_name,
        "student_id": student_id or "",
        "student_name": student_name,
        "team_id": user.get("team_id", ""),
        "meeting_date": meeting_date,
        "meeting_time": meeting_time,
        "subject": subject,
        "notes": notes,
        "status": "requested",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.meetings.insert_one(doc)
    created = await db.meetings.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.patch("/meetings/{meeting_id}")
async def update_meeting(meeting_id: str, body: dict, user: dict = Depends(get_current_user)):
    from database import db
    body.pop("id", None)
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    try:
        await db.meetings.update_one({"_id": ObjectId(meeting_id)}, {"$set": body})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    updated = await db.meetings.find_one({"_id": ObjectId(meeting_id)})
    return serialize_doc(updated)


@router.delete("/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str, user: dict = Depends(get_current_user)):
    from database import db
    try:
        await db.meetings.delete_one({"_id": ObjectId(meeting_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    return {"success": True}


# ─── Faculty List (for meeting scheduling) ────────────────────────────────────
@router.get("/available-faculty")
async def available_faculty(user: dict = Depends(get_current_user)):
    from database import db
    filt = {"status": "active"}
    if user.get("team_id"):
        filt["team_id"] = user["team_id"]
    docs = await db.faculty.find(filt).sort("last_name", 1).to_list(length=500)
    return [{"id": str(d["_id"]), "full_name": d.get("full_name", ""),
             "position": d.get("position", ""), "department": d.get("department", ""),
             "email": d.get("email", "")} for d in docs]
