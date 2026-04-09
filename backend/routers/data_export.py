import csv
import io
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse

from utils import get_current_user, serialize_doc

router = APIRouter(prefix="/api/data", tags=["data_export_import"])


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


def _make_csv_response(rows: list, headers: list, filename: str) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/export/students")
async def export_students(user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    filt = _team_filter(user)
    docs = await db.students.find(filt).sort("last_name", 1).to_list(length=5000)
    headers = ["First Name", "Last Name", "Email", "Student ID", "Grade Level", "Gender",
               "Date of Birth", "Sport", "Position", "Status", "GPA", "Emergency Contact",
               "Emergency Phone", "Medical Notes"]
    rows = []
    for d in docs:
        rows.append([
            d.get("first_name", ""), d.get("last_name", ""), d.get("email", ""),
            d.get("student_id", ""), d.get("grade_level", ""), d.get("gender", ""),
            d.get("date_of_birth", ""), d.get("sport", ""), d.get("position", ""),
            d.get("status", "active"), d.get("gpa", ""),
            d.get("emergency_contact_name", ""), d.get("emergency_contact_phone", ""),
            d.get("medical_notes", ""),
        ])
    return _make_csv_response(rows, headers, f"students_export_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv")


@router.get("/export/faculty")
async def export_faculty(user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    filt = _team_filter(user)
    docs = await db.faculty.find(filt).sort("last_name", 1).to_list(length=5000)
    headers = ["First Name", "Last Name", "Email", "Employee ID", "Department",
               "Position", "Phone", "Status", "Hire Date", "Certifications"]
    rows = []
    for d in docs:
        rows.append([
            d.get("first_name", ""), d.get("last_name", ""), d.get("email", ""),
            d.get("employee_id", ""), d.get("department", ""), d.get("position", ""),
            d.get("phone", ""), d.get("status", "active"),
            d.get("hire_date", ""), ", ".join(d.get("certifications", [])),
        ])
    return _make_csv_response(rows, headers, f"faculty_export_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv")


@router.get("/export/grades")
async def export_grades(user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    filt = _team_filter(user)
    docs = await db.grades.find(filt).sort("created_at", -1).to_list(length=10000)
    # Enrich with student names
    student_ids = list({d.get("student_id") for d in docs if d.get("student_id")})
    students = {}
    if student_ids:
        for sid in student_ids:
            try:
                s = await db.students.find_one({"_id": ObjectId(sid)})
                if s:
                    students[sid] = f"{s.get('first_name', '')} {s.get('last_name', '')}"
            except Exception:
                pass
    headers = ["Student", "Subject", "Assignment", "Score", "Max Score", "Percentage",
               "Letter Grade", "Term", "Date"]
    rows = []
    for d in docs:
        sid = d.get("student_id", "")
        rows.append([
            students.get(sid, sid), d.get("subject", ""), d.get("assignment_name", ""),
            d.get("score", ""), d.get("max_score", ""), d.get("percentage", ""),
            d.get("letter_grade", ""), d.get("term", ""), d.get("date", ""),
        ])
    return _make_csv_response(rows, headers, f"grades_export_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv")


@router.get("/export/attendance")
async def export_attendance(user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    filt = _team_filter(user)
    docs = await db.attendance_records.find(filt).sort("date", -1).to_list(length=10000)
    student_ids = list({d.get("student_id") for d in docs if d.get("student_id")})
    students = {}
    for sid in student_ids:
        try:
            s = await db.students.find_one({"_id": ObjectId(sid)})
            if s:
                students[sid] = f"{s.get('first_name', '')} {s.get('last_name', '')}"
        except Exception:
            pass
    headers = ["Student", "Date", "Status", "Notes"]
    rows = []
    for d in docs:
        sid = d.get("student_id", "")
        rows.append([
            students.get(sid, sid), d.get("date", ""),
            d.get("status", ""), d.get("notes", ""),
        ])
    return _make_csv_response(rows, headers, f"attendance_export_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv")


@router.get("/export/clubs")
async def export_clubs(user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    filt = _team_filter(user)
    docs = await db.clubs.find(filt).sort("name", 1).to_list(length=1000)
    headers = ["Name", "Type", "Status", "Description", "Advisor", "Meeting Schedule", "Location", "Max Members"]
    rows = []
    for d in docs:
        rows.append([
            d.get("name", ""), d.get("club_type", ""), d.get("status", "active"),
            d.get("description", ""), d.get("advisor_name", ""),
            d.get("meeting_schedule", ""), d.get("location", ""),
            d.get("max_members", ""),
        ])
    return _make_csv_response(rows, headers, f"clubs_export_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv")


# ═══════════════════════════════════════════════════════════════════════════════
# IMPORT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/import/students")
async def import_students(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    return await _import_csv(db, file, "students", user, [
        "first_name", "last_name", "email", "student_id", "grade_level", "gender",
        "date_of_birth", "sport", "position", "status",
    ])


@router.post("/import/faculty")
async def import_faculty(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    from database import db
    _require_staff(user)
    return await _import_csv(db, file, "faculty", user, [
        "first_name", "last_name", "email", "employee_id", "department",
        "position", "phone", "status", "hire_date",
    ])


async def _import_csv(db, file: UploadFile, collection: str, user: dict, expected_fields: list):
    contents = await file.read()
    text = contents.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    # Normalize headers to lowercase/underscore
    norm_map = {}
    if rows:
        for h in reader.fieldnames or []:
            norm = h.strip().lower().replace(" ", "_")
            norm_map[h] = norm

    imported = 0
    skipped = 0
    errors = []

    coll = db[collection]
    team_id = user.get("team_id", "")
    now = datetime.now(timezone.utc).isoformat()

    for i, row in enumerate(rows):
        doc = {"team_id": team_id, "created_at": now, "updated_at": now}
        for orig_key, val in row.items():
            norm_key = norm_map.get(orig_key, orig_key.strip().lower().replace(" ", "_"))
            doc[norm_key] = val.strip() if val else ""

        # Validate required fields
        name_field = doc.get("first_name") or doc.get("name")
        if not name_field:
            errors.append({"row": i + 2, "error": "Missing name/first_name"})
            skipped += 1
            continue

        # Check duplicate by email if present
        email = doc.get("email", "").lower()
        if email:
            existing = await coll.find_one({"email": email, "team_id": team_id})
            if existing:
                errors.append({"row": i + 2, "error": f"Duplicate email: {email}"})
                skipped += 1
                continue

        await coll.insert_one(doc)
        imported += 1

    return {
        "success": True,
        "imported": imported,
        "skipped": skipped,
        "total_rows": len(rows),
        "errors": errors[:20],  # Limit error details
    }
