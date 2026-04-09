import io
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from utils import get_current_user

router = APIRouter(prefix="/api/reports", tags=["report_cards"])

CYAN = HexColor("#00CDD7")
DARK_BG = HexColor("#121212")
LIGHT_TEXT = HexColor("#E8E8E8")
GRAY_TEXT = HexColor("#9CA3AF")
BORDER_GRAY = HexColor("#374151")
WHITE = HexColor("#FFFFFF")
GREEN = HexColor("#10B981")
RED = HexColor("#EF4444")
AMBER = HexColor("#F59E0B")


def _gpa_color(gpa):
    if gpa is None:
        return GRAY_TEXT
    if gpa >= 3.5:
        return GREEN
    if gpa >= 2.5:
        return AMBER
    return RED


def _letter_grade(pct):
    if pct is None:
        return "N/A"
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
    if pct >= 60:
        return "D"
    return "F"


async def _build_report_card_pdf(db, student_id: str, team_filter: dict) -> bytes:
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip() or "Student"
    grade_level = student.get("grade_level", "")
    student_sid = student.get("student_id", "")

    # Fetch grades
    grades = await db.grades.find({"student_id": student_id}).sort("subject", 1).to_list(length=500)

    # Group grades by subject
    subjects = {}
    for g in grades:
        subj = g.get("subject", "General")
        if subj not in subjects:
            subjects[subj] = []
        subjects[subj].append(g)

    # Compute per-subject averages
    subject_summaries = []
    for subj, grade_list in subjects.items():
        scores = [g for g in grade_list if g.get("percentage") is not None]
        if scores:
            avg = sum(g["percentage"] for g in scores) / len(scores)
        else:
            avg = None
        subject_summaries.append({
            "subject": subj,
            "assignments": len(grade_list),
            "average": round(avg, 1) if avg is not None else None,
            "letter": _letter_grade(avg),
        })

    # Overall GPA (simple 4.0 scale from percentages)
    all_avgs = [s["average"] for s in subject_summaries if s["average"] is not None]
    if all_avgs:
        raw = sum(all_avgs) / len(all_avgs)
        gpa = round(min(4.0, raw / 25.0), 2)
    else:
        gpa = None

    # Attendance
    att_total = await db.attendance_records.count_documents({"student_id": student_id})
    att_present = await db.attendance_records.count_documents({"student_id": student_id, "status": "present"})
    att_absent = await db.attendance_records.count_documents({"student_id": student_id, "status": "absent"})
    att_late = await db.attendance_records.count_documents({"student_id": student_id, "status": "late"})
    att_rate = round((att_present / att_total * 100), 1) if att_total > 0 else 0

    # Discipline
    discipline = await db.discipline_records.find({"student_id": student_id}).sort("date", -1).to_list(length=20)

    # ── BUILD PDF ──
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=0.5 * inch, bottomMargin=0.5 * inch,
                            leftMargin=0.75 * inch, rightMargin=0.75 * inch)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("ReportTitle", parent=styles["Heading1"], fontSize=18, textColor=CYAN,
                                 alignment=TA_CENTER, spaceAfter=4)
    subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"], fontSize=10, textColor=GRAY_TEXT,
                                    alignment=TA_CENTER, spaceAfter=12)
    section_style = ParagraphStyle("Section", parent=styles["Heading2"], fontSize=13, textColor=CYAN,
                                   spaceBefore=16, spaceAfter=8, borderWidth=0)
    normal_style = ParagraphStyle("NormalCustom", parent=styles["Normal"], fontSize=10, textColor=HexColor("#333333"))
    small_style = ParagraphStyle("Small", parent=styles["Normal"], fontSize=8, textColor=GRAY_TEXT)  # noqa: F841

    elements = []

    # Header
    elements.append(Paragraph("NxGenSports", title_style))
    elements.append(Paragraph("Official Student Report Card", subtitle_style))
    elements.append(Spacer(1, 4))

    # Student info
    info_data = [
        ["Student Name:", student_name, "Grade:", grade_level or "N/A"],
        ["Student ID:", student_sid or "N/A", "GPA:", f"{gpa:.2f}" if gpa is not None else "N/A"],
        ["Report Date:", datetime.now(timezone.utc).strftime("%B %d, %Y"), "Attendance:", f"{att_rate}%"],
    ]
    info_table = Table(info_data, colWidths=[1.2 * inch, 2.3 * inch, 1.0 * inch, 2.0 * inch])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), GRAY_TEXT),
        ("TEXTCOLOR", (2, 0), (2, -1), GRAY_TEXT),
        ("TEXTCOLOR", (1, 0), (1, -1), HexColor("#1a1a1a")),
        ("TEXTCOLOR", (3, 0), (3, -1), HexColor("#1a1a1a")),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
        ("FONTNAME", (3, 0), (3, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 12))

    # ── Grades Table ──
    elements.append(Paragraph("Academic Performance", section_style))
    if subject_summaries:
        grade_data = [["Subject", "Assignments", "Average %", "Letter Grade"]]
        for s in subject_summaries:
            grade_data.append([
                s["subject"],
                str(s["assignments"]),
                f"{s['average']}%" if s["average"] is not None else "N/A",
                s["letter"],
            ])
        grade_table = Table(grade_data, colWidths=[2.5 * inch, 1.2 * inch, 1.2 * inch, 1.5 * inch])
        grade_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), CYAN),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#F9FAFB"), WHITE]),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(grade_table)
    else:
        elements.append(Paragraph("No grade records available.", normal_style))

    # ── Attendance Summary ──
    elements.append(Paragraph("Attendance Summary", section_style))
    att_data = [
        ["Total Days", "Present", "Absent", "Late", "Rate"],
        [str(att_total), str(att_present), str(att_absent), str(att_late), f"{att_rate}%"],
    ]
    att_table = Table(att_data, colWidths=[1.3 * inch] * 5)
    att_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), CYAN),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(att_table)

    # ── Discipline Records ──
    if discipline:
        elements.append(Paragraph("Discipline Records", section_style))
        disc_data = [["Date", "Type", "Description", "Action"]]
        for d in discipline[:10]:
            disc_data.append([
                d.get("date", ""), d.get("incident_type", ""),
                d.get("description", "")[:60], d.get("action_taken", ""),
            ])
        disc_table = Table(disc_data, colWidths=[1.0 * inch, 1.2 * inch, 2.5 * inch, 1.7 * inch])
        disc_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#EF4444")),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#FEF2F2"), WHITE]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(disc_table)

    # ── Footer ──
    elements.append(Spacer(1, 24))
    footer_style = ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, textColor=GRAY_TEXT, alignment=TA_CENTER)
    elements.append(Paragraph(f"Generated by NxGenSports on {datetime.now(timezone.utc).strftime('%B %d, %Y at %H:%M UTC')}", footer_style))
    elements.append(Paragraph("This is an official document. For questions, contact the school administration.", footer_style))

    doc.build(elements)
    buf.seek(0)
    return buf.getvalue()


@router.get("/report-card/{student_id}")
async def generate_report_card(student_id: str, user: dict = Depends(get_current_user)):
    from database import db
    pdf_bytes = await _build_report_card_pdf(db, student_id, {})
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    name = f"{student.get('last_name', 'Student')}_{student.get('first_name', '')}" if student else "student"
    filename = f"report_card_{name}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/report-cards/batch")
async def batch_report_cards(
    grade_level: str = Query(default="", description="Filter by grade level"),
    user: dict = Depends(get_current_user),
):
    from database import db
    filt = {}
    if user.get("role") != "super_admin" and user.get("team_id"):
        filt["team_id"] = user["team_id"]
    if grade_level:
        filt["grade_level"] = grade_level

    students = await db.students.find(filt).sort("last_name", 1).to_list(length=200)
    if not students:
        raise HTTPException(status_code=404, detail="No students found")

    # For batch, we generate a ZIP-like approach: just return a list of available students
    # The frontend will trigger individual downloads
    return {
        "students": [
            {
                "id": str(s["_id"]),
                "name": f"{s.get('first_name', '')} {s.get('last_name', '')}".strip(),
                "grade_level": s.get("grade_level", ""),
            }
            for s in students
        ],
        "total": len(students),
    }
