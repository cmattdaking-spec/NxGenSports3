"""
Teacher-specific API endpoints.
Teachers can only see students in their assigned classes/subjects.
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends

from utils import get_current_user, serialize_doc

router = APIRouter(prefix="/api/teachers", tags=["teachers"])


def _require_teacher(user: dict):
    if user.get("user_type") not in ("teacher",) and user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Teacher access required")


async def _get_faculty_record(user: dict):
    """Get the faculty record linked to this teacher user."""
    from database import db
    faculty_id = user.get("faculty_id")
    if faculty_id:
        try:
            return await db.faculty.find_one({"_id": ObjectId(faculty_id)})
        except Exception:
            pass
    email = user.get("email", "")
    if email:
        return await db.faculty.find_one({"email": email, "team_id": user.get("team_id")})
    return None


async def _get_teacher_subject_names(user: dict):
    """Return list of subject/course names this teacher teaches."""
    faculty = await _get_faculty_record(user)
    if not faculty:
        return [], None
    faculty_id = str(faculty["_id"])
    from database import db
    schedules = await db.class_schedules.find({"faculty_id": faculty_id}).to_list(length=200)
    subject_names = set()
    for s in schedules:
        if s.get("subject_name"):
            subject_names.add(s["subject_name"])
        if s.get("subject"):
            subject_names.add(s["subject"])
    return list(subject_names), faculty_id


@router.get("/my-dashboard")
async def teacher_dashboard(user: dict = Depends(get_current_user)):
    _require_teacher(user)
    from database import db
    team_id = user.get("team_id")
    if not team_id:
        raise HTTPException(status_code=403, detail="No team assigned")

    faculty = await _get_faculty_record(user)
    faculty_id = str(faculty["_id"]) if faculty else None

    subject_names, _ = await _get_teacher_subject_names(user)

    # Also include the faculty department name as a subject match
    if faculty and faculty.get("department"):
        subject_names = list(set(subject_names + [faculty["department"]]))
    # Include subjects from faculty record
    if faculty and faculty.get("subjects"):
        subject_names = list(set(subject_names + faculty["subjects"]))

    schedules = []
    if faculty_id:
        schedules = await db.class_schedules.find({"faculty_id": faculty_id}).to_list(length=200)
        schedules = [serialize_doc(s) for s in schedules]

    student_ids = set()
    if subject_names:
        grades = await db.grades.find({
            "team_id": team_id,
            "$or": [
                {"course_name": {"$in": subject_names}},
                {"subject": {"$in": subject_names}},
            ]
        }).to_list(length=5000)
        for g in grades:
            if g.get("student_id"):
                student_ids.add(g["student_id"])

    if faculty_id:
        faculty_grades = await db.grades.find({"faculty_id": faculty_id}).to_list(length=5000)
        for g in faculty_grades:
            if g.get("student_id"):
                student_ids.add(g["student_id"])

    student_count = len(student_ids)

    recent_grades = []
    if student_ids:
        recent = await db.grades.find({
            "student_id": {"$in": list(student_ids)}
        }).sort("created_at", -1).to_list(length=10)
        for g in recent:
            sid = g.get("student_id")
            try:
                st = await db.students.find_one({"_id": ObjectId(sid)})
                if st:
                    student_name = st.get("full_name") or f"{st.get('first_name', '')} {st.get('last_name', '')}".strip()
                else:
                    student_name = ""
            except Exception:
                student_name = ""
            rg = serialize_doc(g)
            rg["student_name"] = student_name
            recent_grades.append(rg)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    attendance_today = 0
    if student_ids:
        attendance_today = await db.attendance_records.count_documents({
            "student_id": {"$in": list(student_ids)},
            "date": today,
        })

    total_students_school = await db.students.count_documents({"team_id": team_id, "status": "active"})

    faculty_resp = None
    if faculty:
        faculty_resp = serialize_doc(faculty)
        if not faculty_resp.get("full_name"):
            faculty_resp["full_name"] = f"{faculty.get('first_name', '')} {faculty.get('last_name', '')}".strip()

    return {
        "faculty": faculty_resp,
        "classes": schedules,
        "subject_names": subject_names,
        "student_count": student_count,
        "total_students_school": total_students_school,
        "recent_grades": recent_grades,
        "attendance_recorded_today": attendance_today,
    }


@router.get("/my-students")
async def teacher_students(user: dict = Depends(get_current_user)):
    """Get students linked to teacher via grades/class schedules."""
    _require_teacher(user)
    from database import db
    team_id = user.get("team_id")
    if not team_id:
        raise HTTPException(status_code=403, detail="No team assigned")

    subject_names, faculty_id = await _get_teacher_subject_names(user)

    # Also include department as a subject match
    faculty = await _get_faculty_record(user)
    if faculty and faculty.get("department"):
        subject_names = list(set(subject_names + [faculty["department"]]))
    if faculty and faculty.get("subjects"):
        subject_names = list(set(subject_names + faculty["subjects"]))

    student_ids = set()
    grade_query_parts = []
    if subject_names:
        grade_query_parts.append({"course_name": {"$in": subject_names}, "team_id": team_id})
        grade_query_parts.append({"subject": {"$in": subject_names}, "team_id": team_id})
    if faculty_id:
        grade_query_parts.append({"faculty_id": faculty_id})

    if grade_query_parts:
        grades = await db.grades.find({"$or": grade_query_parts}).to_list(length=5000)
        for g in grades:
            if g.get("student_id"):
                student_ids.add(g["student_id"])

    students = []
    for sid in student_ids:
        try:
            st = await db.students.find_one({"_id": ObjectId(sid)})
            if st:
                students.append(serialize_doc(st))
        except Exception:
            pass

    students.sort(key=lambda s: s.get("last_name", ""))
    return students


@router.get("/my-classes")
async def teacher_classes(user: dict = Depends(get_current_user)):
    _require_teacher(user)
    from database import db

    faculty = await _get_faculty_record(user)
    if not faculty:
        return []

    faculty_id = str(faculty["_id"])
    schedules = await db.class_schedules.find({"faculty_id": faculty_id}).sort(
        [("day_of_week", 1), ("period", 1)]
    ).to_list(length=200)
    return [serialize_doc(s) for s in schedules]



# ─── Gradebook ────────────────────────────────────────────────────────────────

async def _get_teacher_student_ids(user: dict):
    """Return set of student IDs and the subject names for this teacher."""
    from database import db
    team_id = user.get("team_id")
    subject_names, faculty_id = await _get_teacher_subject_names(user)
    faculty = await _get_faculty_record(user)
    if faculty and faculty.get("department"):
        subject_names = list(set(subject_names + [faculty["department"]]))
    if faculty and faculty.get("subjects"):
        subject_names = list(set(subject_names + faculty["subjects"]))

    student_ids = set()
    grade_query_parts = []
    if subject_names:
        grade_query_parts.append({"course_name": {"$in": subject_names}, "team_id": team_id})
        grade_query_parts.append({"subject": {"$in": subject_names}, "team_id": team_id})
    if faculty_id:
        grade_query_parts.append({"faculty_id": faculty_id})
    if grade_query_parts:
        grades = await db.grades.find({"$or": grade_query_parts}).to_list(length=5000)
        for g in grades:
            if g.get("student_id"):
                student_ids.add(g["student_id"])
    return student_ids, subject_names, faculty_id


@router.get("/gradebook")
async def teacher_gradebook(user: dict = Depends(get_current_user)):
    """Full gradebook: students, assignments, grades for teacher's subjects."""
    _require_teacher(user)
    from database import db
    team_id = user.get("team_id")
    if not team_id:
        raise HTTPException(status_code=403, detail="No team assigned")

    student_ids, subject_names, faculty_id = await _get_teacher_student_ids(user)

    # Fetch students
    students = []
    for sid in student_ids:
        try:
            st = await db.students.find_one({"_id": ObjectId(sid)})
            if st:
                s = serialize_doc(st)
                if not s.get("full_name"):
                    s["full_name"] = f"{st.get('first_name', '')} {st.get('last_name', '')}".strip()
                students.append(s)
        except Exception:
            pass
    students.sort(key=lambda s: s.get("last_name", ""))

    # Fetch all grades for these students in teacher's subjects
    grade_query = []
    if subject_names:
        grade_query.append({"course_name": {"$in": subject_names}})
        grade_query.append({"subject": {"$in": subject_names}})
    if faculty_id:
        grade_query.append({"faculty_id": faculty_id})

    all_grades = []
    if student_ids and grade_query:
        all_grades = await db.grades.find({
            "student_id": {"$in": list(student_ids)},
            "$or": grade_query,
        }).sort("created_at", -1).to_list(length=10000)

    # Normalize grades and build response
    grades = []
    assignment_set = set()
    subject_set = set()
    for g in all_grades:
        ng = serialize_doc(g)
        subj = g.get("subject") or g.get("course_name") or ""
        asgn = g.get("assignment_name") or ""
        ng["subject"] = subj
        ng["assignment_name"] = asgn
        ng["score"] = g.get("score") or g.get("grade_percent")
        ng["max_score"] = g.get("max_score", 100)
        ng["percentage"] = g.get("percentage") or g.get("grade_percent")
        ng["letter_grade"] = g.get("letter_grade") or g.get("grade_letter") or ""
        grades.append(ng)
        if subj:
            subject_set.add(subj)
        if asgn and subj:
            assignment_set.add((subj, asgn))

    assignments = [{"subject": s, "name": n} for s, n in sorted(assignment_set)]

    return {
        "students": students,
        "grades": grades,
        "subjects": sorted(subject_set),
        "assignments": assignments,
    }


@router.post("/gradebook/entry")
async def add_gradebook_entry(body: dict, user: dict = Depends(get_current_user)):
    """Add a single grade entry."""
    _require_teacher(user)
    from database import db
    team_id = user.get("team_id")

    student_id = body.get("student_id")
    subject = body.get("subject", "")
    assignment_name = body.get("assignment_name", "")
    score = body.get("score")
    max_score = body.get("max_score", 100)

    if not student_id or not subject or not assignment_name:
        raise HTTPException(status_code=400, detail="student_id, subject, and assignment_name are required")

    try:
        score = float(score)
        max_score = float(max_score) if max_score else 100
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Score must be a number")

    pct = round(score / max_score * 100, 1) if max_score > 0 else 0
    letter = _letter_from_pct(pct)

    faculty = await _get_faculty_record(user)
    faculty_id = str(faculty["_id"]) if faculty else None
    teacher_name = ""
    if faculty:
        teacher_name = faculty.get("full_name") or f"{faculty.get('first_name', '')} {faculty.get('last_name', '')}".strip()

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "student_id": student_id,
        "team_id": team_id,
        "school_id": user.get("school_id", ""),
        "subject": subject,
        "course_name": subject,
        "assignment_name": assignment_name,
        "score": score,
        "max_score": max_score,
        "percentage": pct,
        "letter_grade": letter,
        "grade_letter": letter,
        "grade_percent": pct,
        "teacher_name": teacher_name,
        "faculty_id": faculty_id,
        "term": body.get("term", ""),
        "semester": body.get("term", ""),
        "date": body.get("date", now[:10]),
        "notes": body.get("notes", ""),
        "created_at": now,
    }
    result = await db.grades.insert_one(doc)
    created = await db.grades.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/gradebook/entry/{grade_id}")
async def update_gradebook_entry(grade_id: str, body: dict, user: dict = Depends(get_current_user)):
    """Update an existing grade entry."""
    _require_teacher(user)
    from database import db

    try:
        existing = await db.grades.find_one({"_id": ObjectId(grade_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid grade ID")
    if not existing:
        raise HTTPException(status_code=404, detail="Grade not found")

    updates = {}
    if "score" in body:
        score = float(body["score"])
        max_score = float(body.get("max_score", existing.get("max_score", 100)))
        pct = round(score / max_score * 100, 1) if max_score > 0 else 0
        letter = _letter_from_pct(pct)
        updates.update({
            "score": score,
            "max_score": max_score,
            "percentage": pct,
            "letter_grade": letter,
            "grade_letter": letter,
            "grade_percent": pct,
        })
    if "notes" in body:
        updates["notes"] = body["notes"]
    if "assignment_name" in body:
        updates["assignment_name"] = body["assignment_name"]
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.grades.update_one({"_id": ObjectId(grade_id)}, {"$set": updates})
    updated = await db.grades.find_one({"_id": ObjectId(grade_id)})
    return serialize_doc(updated)


@router.delete("/gradebook/entry/{grade_id}")
async def delete_gradebook_entry(grade_id: str, user: dict = Depends(get_current_user)):
    """Delete a grade entry."""
    _require_teacher(user)
    from database import db
    try:
        await db.grades.delete_one({"_id": ObjectId(grade_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid grade ID")
    return {"success": True}


@router.post("/gradebook/bulk")
async def bulk_gradebook_entry(body: dict, user: dict = Depends(get_current_user)):
    """Bulk add grades for multiple students on one assignment."""
    _require_teacher(user)
    from database import db
    team_id = user.get("team_id")

    subject = body.get("subject", "")
    assignment_name = body.get("assignment_name", "")
    max_score = float(body.get("max_score", 100))
    entries = body.get("entries", [])
    term = body.get("term", "")

    if not subject or not assignment_name:
        raise HTTPException(status_code=400, detail="subject and assignment_name are required")
    if not entries:
        raise HTTPException(status_code=400, detail="entries list is required")

    faculty = await _get_faculty_record(user)
    faculty_id = str(faculty["_id"]) if faculty else None
    teacher_name = ""
    if faculty:
        teacher_name = faculty.get("full_name") or f"{faculty.get('first_name', '')} {faculty.get('last_name', '')}".strip()

    now = datetime.now(timezone.utc).isoformat()
    created = []
    for entry in entries:
        student_id = entry.get("student_id")
        score = entry.get("score")
        if student_id is None or score is None:
            continue
        score = float(score)
        pct = round(score / max_score * 100, 1) if max_score > 0 else 0
        letter = _letter_from_pct(pct)

        doc = {
            "student_id": student_id,
            "team_id": team_id,
            "school_id": user.get("school_id", ""),
            "subject": subject,
            "course_name": subject,
            "assignment_name": assignment_name,
            "score": score,
            "max_score": max_score,
            "percentage": pct,
            "letter_grade": letter,
            "grade_letter": letter,
            "grade_percent": pct,
            "teacher_name": teacher_name,
            "faculty_id": faculty_id,
            "term": term,
            "semester": term,
            "date": now[:10],
            "notes": entry.get("notes", ""),
            "created_at": now,
        }
        result = await db.grades.insert_one(doc)
        created.append(str(result.inserted_id))

    return {"success": True, "count": len(created), "ids": created}


def _letter_from_pct(pct: float) -> str:
    if pct >= 97:
        return "A+"
    if pct >= 93:
        return "A"
    if pct >= 90:
        return "A-"
    if pct >= 87:
        return "B+"
    if pct >= 83:
        return "B"
    if pct >= 80:
        return "B-"
    if pct >= 77:
        return "C+"
    if pct >= 73:
        return "C"
    if pct >= 70:
        return "C-"
    if pct >= 67:
        return "D+"
    if pct >= 63:
        return "D"
    if pct >= 60:
        return "D-"
    return "F"
