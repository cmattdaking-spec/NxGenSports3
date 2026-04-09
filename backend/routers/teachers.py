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
