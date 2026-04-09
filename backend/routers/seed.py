"""
Seed a complete test school with admin, faculty, students, grades,
attendance, clubs, announcements, calendar events, documents,
parents, meetings, and discipline records.
"""
import bcrypt
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from fastapi import APIRouter, Depends
from utils import get_current_user

router = APIRouter(prefix="/api/seed", tags=["seed"])

TEAM_ID = "lincoln_high_school"
SCHOOL_CODE = "LHS"
SCHOOL_NAME = "Lincoln High School"
PASSWORD = "Test1234!"
NOW = datetime.now(timezone.utc).isoformat()


def _hash(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def _date(days_offset: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days_offset)).strftime("%Y-%m-%d")


def _ts(days_offset: int = 0) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days_offset)).isoformat()


@router.post("/test-school")
async def seed_test_school(user: dict = Depends(get_current_user)):
    from database import db
    if user.get("role") != "super_admin":
        return {"error": "Super admin only"}

    # Check if already seeded
    existing = await db.users.find_one({"email": "principal@lincoln.edu"})
    if existing:
        return {"message": "Test school already seeded. Use existing credentials.", "already_seeded": True}

    results = {}

    # ══════════════════════════════════════════════════════════════════════════
    # 1. SCHOOL
    # ══════════════════════════════════════════════════════════════════════════
    await db.schools.insert_one({
        "school_name": SCHOOL_NAME,
        "school_code": SCHOOL_CODE,
        "team_id": TEAM_ID,
        "address": "1200 Lincoln Ave, Springfield, IL 62701",
        "phone": "(217) 555-0100",
        "created_at": NOW,
    })
    results["school"] = SCHOOL_NAME

    # ══════════════════════════════════════════════════════════════════════════
    # 2. USERS (Admin, Faculty accounts, Players, Parents)
    # ══════════════════════════════════════════════════════════════════════════
    pw_hash = _hash(PASSWORD)

    # School Admin / Head Coach
    admin_result = await db.users.insert_one({
        "email": "principal@lincoln.edu",
        "password_hash": pw_hash,
        "full_name": "James Richardson",
        "first_name": "James",
        "last_name": "Richardson",
        "role": "admin",
        "coaching_role": "head_coach",
        "user_type": "coach",
        "team_id": TEAM_ID,
        "school_id": TEAM_ID,
        "school_name": SCHOOL_NAME,
        "school_code": SCHOOL_CODE,
        "assigned_sports": ["Football", "Basketball"],
        "profile_verified": True,
        "created_at": _ts(-60),
    })
    admin_id = str(admin_result.inserted_id)

    # Athletic Director
    ad_result = await db.users.insert_one({
        "email": "athletics@lincoln.edu",
        "password_hash": pw_hash,
        "full_name": "Maria Santos",
        "first_name": "Maria",
        "last_name": "Santos",
        "role": "admin",
        "coaching_role": "athletic_director",
        "user_type": "coach",
        "team_id": TEAM_ID,
        "school_id": TEAM_ID,
        "school_name": SCHOOL_NAME,
        "school_code": SCHOOL_CODE,
        "assigned_sports": ["All Sports"],
        "profile_verified": True,
        "created_at": _ts(-55),
    })

    # Assistant Coach
    await db.users.insert_one({
        "email": "coach.williams@lincoln.edu",
        "password_hash": pw_hash,
        "full_name": "Derek Williams",
        "first_name": "Derek",
        "last_name": "Williams",
        "role": "user",
        "coaching_role": "assistant_coach",
        "user_type": "coach",
        "team_id": TEAM_ID,
        "school_id": TEAM_ID,
        "school_name": SCHOOL_NAME,
        "school_code": SCHOOL_CODE,
        "assigned_sports": ["Football"],
        "profile_verified": True,
        "created_at": _ts(-50),
    })

    # Player accounts
    player_data = [
        ("marcus.j@lincoln.edu", "Marcus", "Johnson", "PL001"),
        ("aisha.t@lincoln.edu", "Aisha", "Thompson", "PL002"),
        ("tyler.c@lincoln.edu", "Tyler", "Chen", "PL003"),
    ]
    player_user_ids = []
    for email, first, last, pid in player_data:
        r = await db.users.insert_one({
            "email": email,
            "password_hash": pw_hash,
            "full_name": f"{first} {last}",
            "first_name": first,
            "last_name": last,
            "role": "user",
            "user_type": "player",
            "player_id": pid,
            "team_id": TEAM_ID,
            "school_id": TEAM_ID,
            "school_name": SCHOOL_NAME,
            "profile_verified": True,
            "created_at": _ts(-40),
        })
        player_user_ids.append(str(r.inserted_id))

    # Parent accounts
    parent_data = [
        ("d.johnson@email.com", "David", "Johnson"),
        ("l.thompson@email.com", "Lisa", "Thompson"),
    ]
    parent_user_ids = []
    for email, first, last in parent_data:
        r = await db.users.insert_one({
            "email": email,
            "password_hash": pw_hash,
            "full_name": f"{first} {last}",
            "first_name": first,
            "last_name": last,
            "role": "user",
            "user_type": "parent",
            "team_id": TEAM_ID,
            "school_id": TEAM_ID,
            "school_name": SCHOOL_NAME,
            "profile_verified": True,
            "created_at": _ts(-30),
        })
        parent_user_ids.append(str(r.inserted_id))

    results["users"] = {
        "admin": "principal@lincoln.edu",
        "athletic_director": "athletics@lincoln.edu",
        "coach": "coach.williams@lincoln.edu",
        "school_admin": "office@lincoln.edu",
        "teachers": ["s.mitchell@lincoln.edu", "r.park@lincoln.edu"],
        "players": [p[0] for p in player_data],
        "parents": [p[0] for p in parent_data],
        "password_for_all": PASSWORD,
    }

    # School Admin (office administrator, non-coaching)
    await db.users.insert_one({
        "email": "office@lincoln.edu",
        "password_hash": pw_hash,
        "full_name": "Karen White",
        "first_name": "Karen",
        "last_name": "White",
        "role": "admin",
        "coaching_role": "school_admin",
        "user_type": "school_admin",
        "team_id": TEAM_ID,
        "school_id": TEAM_ID,
        "school_name": SCHOOL_NAME,
        "school_code": SCHOOL_CODE,
        "assigned_sports": [],
        "profile_verified": True,
        "created_at": _ts(-45),
    })

    # Teacher accounts (linked to faculty by email)
    teacher_accounts = [
        ("s.mitchell@lincoln.edu", "Sarah", "Mitchell", "Mathematics"),
        ("r.park@lincoln.edu", "Robert", "Park", "Science"),
    ]
    for email, first, last, dept in teacher_accounts:
        await db.users.insert_one({
            "email": email,
            "password_hash": pw_hash,
            "full_name": f"{first} {last}",
            "first_name": first,
            "last_name": last,
            "role": "user",
            "coaching_role": "teacher",
            "user_type": "teacher",
            "department": dept,
            "team_id": TEAM_ID,
            "school_id": TEAM_ID,
            "school_name": SCHOOL_NAME,
            "school_code": SCHOOL_CODE,
            "assigned_sports": [],
            "profile_verified": True,
            "created_at": _ts(-42),
        })

    # ══════════════════════════════════════════════════════════════════════════
    # 3. FACULTY
    # ══════════════════════════════════════════════════════════════════════════
    faculty_records = [
        {"first_name": "Sarah", "last_name": "Mitchell", "email": "s.mitchell@lincoln.edu",
         "employee_id": "EMP001", "department": "Mathematics", "position": "Department Head",
         "phone": "(217) 555-0201", "status": "active", "hire_date": "2018-08-15",
         "certifications": ["Mathematics 6-12", "AP Calculus"]},
        {"first_name": "Robert", "last_name": "Park", "email": "r.park@lincoln.edu",
         "employee_id": "EMP002", "department": "Science", "position": "Teacher",
         "phone": "(217) 555-0202", "status": "active", "hire_date": "2019-08-15",
         "certifications": ["Biology 6-12", "Chemistry 6-12"]},
        {"first_name": "Jennifer", "last_name": "Cruz", "email": "j.cruz@lincoln.edu",
         "employee_id": "EMP003", "department": "English", "position": "Teacher",
         "phone": "(217) 555-0203", "status": "active", "hire_date": "2020-01-10",
         "certifications": ["English Language Arts 6-12"]},
        {"first_name": "Michael", "last_name": "Brown", "email": "m.brown@lincoln.edu",
         "employee_id": "EMP004", "department": "History", "position": "Teacher",
         "phone": "(217) 555-0204", "status": "active", "hire_date": "2017-08-15",
         "certifications": ["Social Studies 6-12", "AP US History"]},
        {"first_name": "Lisa", "last_name": "Nguyen", "email": "l.nguyen@lincoln.edu",
         "employee_id": "EMP005", "department": "Physical Education", "position": "Teacher / Coach",
         "phone": "(217) 555-0205", "status": "active", "hire_date": "2021-08-15",
         "certifications": ["Physical Education K-12", "Health Education"]},
    ]
    faculty_ids = []
    for f in faculty_records:
        f["team_id"] = TEAM_ID
        f["school_id"] = TEAM_ID
        f["created_at"] = NOW
        f["updated_at"] = NOW
        r = await db.faculty.insert_one(f)
        faculty_ids.append(str(r.inserted_id))
    results["faculty"] = len(faculty_records)

    # ══════════════════════════════════════════════════════════════════════════
    # 4. STUDENTS
    # ══════════════════════════════════════════════════════════════════════════
    students_data = [
        {"first_name": "Marcus", "last_name": "Johnson", "email": "marcus.j@lincoln.edu",
         "student_id": "STU2001", "grade_level": "11", "gender": "Male",
         "date_of_birth": "2009-03-15", "sport": "Football", "position": "Quarterback",
         "emergency_contact_name": "David Johnson", "emergency_contact_phone": "(217) 555-1001"},
        {"first_name": "Aisha", "last_name": "Thompson", "email": "aisha.t@lincoln.edu",
         "student_id": "STU2002", "grade_level": "11", "gender": "Female",
         "date_of_birth": "2009-07-22", "sport": "Basketball", "position": "Point Guard",
         "emergency_contact_name": "Lisa Thompson", "emergency_contact_phone": "(217) 555-1002"},
        {"first_name": "Tyler", "last_name": "Chen", "email": "tyler.c@lincoln.edu",
         "student_id": "STU2003", "grade_level": "10", "gender": "Male",
         "date_of_birth": "2010-01-08", "sport": "Football", "position": "Wide Receiver",
         "emergency_contact_name": "Wei Chen", "emergency_contact_phone": "(217) 555-1003"},
        {"first_name": "Sofia", "last_name": "Rivera", "email": "sofia.r@lincoln.edu",
         "student_id": "STU2004", "grade_level": "12", "gender": "Female",
         "date_of_birth": "2008-11-30", "sport": "Track & Field", "position": "Sprinter",
         "emergency_contact_name": "Carlos Rivera", "emergency_contact_phone": "(217) 555-1004"},
        {"first_name": "Jaylen", "last_name": "Davis", "email": "jaylen.d@lincoln.edu",
         "student_id": "STU2005", "grade_level": "9", "gender": "Male",
         "date_of_birth": "2011-05-18", "sport": "Basketball", "position": "Shooting Guard",
         "emergency_contact_name": "Angela Davis", "emergency_contact_phone": "(217) 555-1005"},
        {"first_name": "Emma", "last_name": "Wilson", "email": "emma.w@lincoln.edu",
         "student_id": "STU2006", "grade_level": "10", "gender": "Female",
         "date_of_birth": "2010-09-25", "sport": "Soccer", "position": "Midfielder",
         "emergency_contact_name": "Patricia Wilson", "emergency_contact_phone": "(217) 555-1006"},
        {"first_name": "Darius", "last_name": "Mitchell", "email": "darius.m@lincoln.edu",
         "student_id": "STU2007", "grade_level": "12", "gender": "Male",
         "date_of_birth": "2008-02-14", "sport": "Football", "position": "Running Back",
         "emergency_contact_name": "Sarah Mitchell", "emergency_contact_phone": "(217) 555-1007"},
        {"first_name": "Olivia", "last_name": "Park", "email": "olivia.p@lincoln.edu",
         "student_id": "STU2008", "grade_level": "9", "gender": "Female",
         "date_of_birth": "2011-12-03", "sport": "Volleyball", "position": "Setter",
         "emergency_contact_name": "Robert Park", "emergency_contact_phone": "(217) 555-1008"},
    ]
    student_ids = []
    for s in students_data:
        s["team_id"] = TEAM_ID
        s["school_id"] = TEAM_ID
        s["status"] = "active"
        s["created_at"] = NOW
        s["updated_at"] = NOW
        r = await db.students.insert_one(s)
        student_ids.append(str(r.inserted_id))
    results["students"] = len(students_data)

    # ══════════════════════════════════════════════════════════════════════════
    # 5. GRADES (per student, multiple subjects)
    # ══════════════════════════════════════════════════════════════════════════
    subjects = ["Mathematics", "Biology", "English", "US History", "Physical Education"]
    assignments_per_subject = [
        ("Quiz 1", 88, 100), ("Homework 3", 92, 100), ("Midterm Exam", 78, 100),
        ("Lab Report", 95, 100), ("Final Project", 85, 100),
    ]
    grade_count = 0
    for i, sid in enumerate(student_ids):
        # Vary scores per student
        offset = (i - 3) * 3  # Some students do better, some worse
        for subj in subjects:
            for aname, base_score, max_score in assignments_per_subject:
                score = min(100, max(40, base_score + offset + (hash(subj + aname + sid) % 15) - 7))
                pct = round(score / max_score * 100, 1)
                await db.grades.insert_one({
                    "student_id": sid,
                    "team_id": TEAM_ID,
                    "subject": subj,
                    "assignment_name": aname,
                    "score": score,
                    "max_score": max_score,
                    "percentage": pct,
                    "letter_grade": _letter_from_pct(pct),
                    "term": "Spring 2026",
                    "date": _date(-30 + grade_count % 30),
                    "created_at": NOW,
                })
                grade_count += 1
    results["grades"] = grade_count

    # ══════════════════════════════════════════════════════════════════════════
    # 6. ATTENDANCE (last 30 school days)
    # ══════════════════════════════════════════════════════════════════════════
    att_count = 0
    import random
    random.seed(42)
    for sid in student_ids:
        for day in range(30):
            date_str = _date(-day)
            weekday = (datetime.now(timezone.utc) - timedelta(days=day)).weekday()
            if weekday >= 5:
                continue  # Skip weekends
            r = random.random()
            status = "present" if r < 0.85 else ("absent" if r < 0.92 else ("late" if r < 0.97 else "excused"))
            await db.attendance_records.insert_one({
                "student_id": sid,
                "team_id": TEAM_ID,
                "date": date_str,
                "status": status,
                "notes": "" if status == "present" else "Seed data",
                "created_at": NOW,
            })
            att_count += 1
    results["attendance_records"] = att_count

    # ══════════════════════════════════════════════════════════════════════════
    # 7. ASSIGNMENTS
    # ══════════════════════════════════════════════════════════════════════════
    assignment_data = [
        ("Math Problem Set 4", "Mathematics", "pending", _date(3)),
        ("Biology Lab: Photosynthesis", "Biology", "submitted", _date(-2)),
        ("English Essay: The Great Gatsby", "English", "graded", _date(-7)),
        ("History Research Paper", "US History", "pending", _date(5)),
        ("PE Fitness Log Week 8", "Physical Education", "submitted", _date(-1)),
    ]
    assign_count = 0
    for sid in student_ids:
        for title, subj, status, due in assignment_data:
            await db.student_assignments.insert_one({
                "student_id": sid,
                "team_id": TEAM_ID,
                "title": title,
                "subject": subj,
                "status": status,
                "due_date": due,
                "score": random.randint(70, 100) if status == "graded" else None,
                "max_score": 100,
                "created_at": NOW,
            })
            assign_count += 1
    results["assignments"] = assign_count

    # ══════════════════════════════════════════════════════════════════════════
    # 8. DISCIPLINE RECORDS
    # ══════════════════════════════════════════════════════════════════════════
    discipline_data = [
        (student_ids[0], "warning", "Disruptive behavior in class", "Verbal warning issued", _date(-15)),
        (student_ids[2], "detention", "Late to class 3 times", "After-school detention assigned", _date(-10)),
        (student_ids[4], "warning", "Uniform violation", "Verbal warning", _date(-5)),
    ]
    for sid, dtype, desc, action, date in discipline_data:
        await db.discipline_records.insert_one({
            "student_id": sid,
            "team_id": TEAM_ID,
            "incident_type": dtype,
            "description": desc,
            "action_taken": action,
            "date": date,
            "reported_by": "James Richardson",
            "created_at": NOW,
        })
    results["discipline_records"] = len(discipline_data)

    # ══════════════════════════════════════════════════════════════════════════
    # 9. CLUBS
    # ══════════════════════════════════════════════════════════════════════════
    clubs_data = [
        {"name": "National Honor Society", "club_type": "committee", "description": "Academic excellence and community service",
         "advisor_name": "Sarah Mitchell", "status": "active", "meeting_schedule": "1st and 3rd Tuesday, 3:30 PM",
         "location": "Room 204", "max_members": 50},
        {"name": "Varsity Football", "club_type": "club", "description": "Lincoln Lions Football Program",
         "advisor_name": "James Richardson", "status": "active", "meeting_schedule": "Mon-Fri 3:30-5:30 PM",
         "location": "Athletic Field", "max_members": 60},
        {"name": "Drama Club", "club_type": "club", "description": "Theater arts and performance",
         "advisor_name": "Jennifer Cruz", "status": "active", "meeting_schedule": "Wednesdays 3:30 PM",
         "location": "Auditorium", "max_members": 40},
        {"name": "STEM Club", "club_type": "club", "description": "Science, Technology, Engineering, and Mathematics exploration",
         "advisor_name": "Robert Park", "status": "active", "meeting_schedule": "Thursdays 3:30 PM",
         "location": "Science Lab B", "max_members": 30},
    ]
    club_ids = []
    for c in clubs_data:
        c["team_id"] = TEAM_ID
        c["school_id"] = TEAM_ID
        c["created_at"] = NOW
        c["updated_at"] = NOW
        r = await db.clubs.insert_one(c)
        club_ids.append(str(r.inserted_id))

    # Add club memberships
    memberships = [
        (club_ids[0], student_ids[1], "Aisha Thompson", "president"),
        (club_ids[0], student_ids[3], "Sofia Rivera", "member"),
        (club_ids[0], student_ids[5], "Emma Wilson", "member"),
        (club_ids[1], student_ids[0], "Marcus Johnson", "captain"),
        (club_ids[1], student_ids[2], "Tyler Chen", "member"),
        (club_ids[1], student_ids[6], "Darius Mitchell", "member"),
        (club_ids[2], student_ids[7], "Olivia Park", "member"),
        (club_ids[2], student_ids[3], "Sofia Rivera", "member"),
        (club_ids[3], student_ids[2], "Tyler Chen", "president"),
        (club_ids[3], student_ids[5], "Emma Wilson", "member"),
    ]
    for cid, sid, name, role in memberships:
        await db.club_memberships.insert_one({
            "club_id": cid, "student_id": sid, "student_name": name,
            "role": role, "team_id": TEAM_ID, "joined_at": NOW, "status": "active",
        })

    # Club events
    club_events = [
        (club_ids[0], "NHS Induction Ceremony", _date(14), "6:00 PM", "Auditorium"),
        (club_ids[1], "Homecoming Game vs. Jefferson", _date(7), "7:00 PM", "Stadium"),
        (club_ids[1], "Football Banquet", _date(21), "6:30 PM", "Cafeteria"),
        (club_ids[2], "Spring Play: Hamlet", _date(28), "7:00 PM", "Auditorium"),
        (club_ids[3], "Regional Science Fair", _date(10), "9:00 AM", "Convention Center"),
    ]
    for cid, title, date, time, loc in club_events:
        await db.club_events.insert_one({
            "club_id": cid, "title": title, "event_date": date, "event_time": time,
            "location": loc, "team_id": TEAM_ID, "created_at": NOW,
        })
    results["clubs"] = len(clubs_data)

    # ══════════════════════════════════════════════════════════════════════════
    # 10. ANNOUNCEMENTS
    # ══════════════════════════════════════════════════════════════════════════
    announcements = [
        {"title": "Spring Semester Begins", "content": "Welcome back, Lions! Spring semester classes begin this Monday. Please check your updated schedules in the student portal.", "priority": "high", "audience": "all"},
        {"title": "Varsity Football: Playoff Bound!", "content": "Congratulations to our Lincoln Lions Football team for clinching a playoff spot! First round game is next Friday at home.", "priority": "urgent", "audience": "all"},
        {"title": "Faculty Professional Development Day", "content": "Reminder: No classes on Friday. All faculty must attend the PD session in the auditorium at 8:00 AM.", "priority": "medium", "audience": "staff"},
        {"title": "Parent-Teacher Conferences", "content": "Spring parent-teacher conferences will be held March 15-16. Sign up through the parent portal to schedule your meetings.", "priority": "high", "audience": "parents"},
        {"title": "AP Exam Registration Deadline", "content": "Students planning to take AP exams must register by March 1st. See your counselor for details.", "priority": "medium", "audience": "students"},
    ]
    for a in announcements:
        a["team_id"] = TEAM_ID
        a["school_id"] = TEAM_ID
        a["status"] = "published"
        a["email_broadcast"] = False
        a["created_by"] = "James Richardson"
        a["created_by_id"] = admin_id
        a["created_at"] = _ts(-5 + announcements.index(a))
        a["updated_at"] = a["created_at"]
        await db.announcements.insert_one(a)
    results["announcements"] = len(announcements)

    # ══════════════════════════════════════════════════════════════════════════
    # 11. SCHOOL CALENDAR EVENTS
    # ══════════════════════════════════════════════════════════════════════════
    events = [
        {"title": "Homecoming Game", "event_date": _date(7), "event_time": "19:00", "event_type": "sports", "location": "Lincoln Stadium", "description": "Lincoln Lions vs. Jefferson Eagles"},
        {"title": "Spring Break", "event_date": _date(30), "end_date": _date(37), "event_type": "holiday", "all_day": True, "description": "No classes"},
        {"title": "AP Calculus Exam", "event_date": _date(45), "event_time": "08:00", "event_type": "exam", "location": "Room 301", "description": "AP Calculus AB/BC Exam"},
        {"title": "Faculty Meeting", "event_date": _date(3), "event_time": "15:30", "event_type": "meeting", "location": "Conference Room A", "description": "Monthly faculty meeting"},
        {"title": "Science Fair", "event_date": _date(10), "event_time": "09:00", "event_type": "academic", "location": "Gymnasium", "description": "Annual science fair presentations"},
        {"title": "Graduation Ceremony", "event_date": _date(60), "event_time": "10:00", "event_type": "academic", "location": "Lincoln Stadium", "description": "Class of 2026 Commencement"},
        {"title": "Spring Concert", "event_date": _date(20), "event_time": "19:00", "event_type": "academic", "location": "Auditorium", "description": "Band and Choir spring performance"},
    ]
    for e in events:
        e["team_id"] = TEAM_ID
        e["school_id"] = TEAM_ID
        e.setdefault("end_date", "")
        e.setdefault("end_time", "")
        e.setdefault("all_day", False)
        e.setdefault("description", "")
        e["created_by"] = "James Richardson"
        e["created_at"] = NOW
        e["updated_at"] = NOW
        await db.school_events.insert_one(e)
    results["calendar_events"] = len(events)

    # ══════════════════════════════════════════════════════════════════════════
    # 12. DOCUMENTS
    # ══════════════════════════════════════════════════════════════════════════
    documents = [
        {"title": "Student Handbook 2025-2026", "category": "handbook", "doc_type": "link",
         "link_url": "https://example.com/lincoln-handbook.pdf", "description": "Official student handbook with policies and procedures"},
        {"title": "Athletic Eligibility Policy", "category": "policy", "doc_type": "link",
         "link_url": "https://example.com/athletic-policy.pdf", "description": "Academic and conduct requirements for athletic participation"},
        {"title": "Course Registration Form", "category": "form", "doc_type": "link",
         "link_url": "https://example.com/course-registration.pdf", "description": "Form for next semester course selection"},
        {"title": "Emergency Contact Update Form", "category": "form", "doc_type": "link",
         "link_url": "https://example.com/emergency-form.pdf", "description": "Update emergency contact information"},
    ]
    for d in documents:
        d["team_id"] = TEAM_ID
        d["school_id"] = TEAM_ID
        d["file_url"] = ""
        d["file_name"] = ""
        d["uploaded_by"] = "James Richardson"
        d["created_at"] = NOW
        d["updated_at"] = NOW
        await db.school_documents.insert_one(d)
    results["documents"] = len(documents)

    # ══════════════════════════════════════════════════════════════════════════
    # 13. PARENT-STUDENT LINKS
    # ══════════════════════════════════════════════════════════════════════════
    await db.parent_student_links.insert_one({
        "parent_id": parent_user_ids[0],
        "student_id": student_ids[0],
        "student_name": "Marcus Johnson",
        "parent_name": "David Johnson",
        "team_id": TEAM_ID,
        "created_at": NOW,
    })
    await db.parent_student_links.insert_one({
        "parent_id": parent_user_ids[1],
        "student_id": student_ids[1],
        "student_name": "Aisha Thompson",
        "parent_name": "Lisa Thompson",
        "team_id": TEAM_ID,
        "created_at": NOW,
    })

    # ══════════════════════════════════════════════════════════════════════════
    # 14. MEETINGS
    # ══════════════════════════════════════════════════════════════════════════
    await db.meetings.insert_one({
        "parent_id": parent_user_ids[0],
        "parent_name": "David Johnson",
        "faculty_id": faculty_ids[0],
        "faculty_name": "Sarah Mitchell",
        "student_name": "Marcus Johnson",
        "subject": "Discuss math performance and upcoming AP class",
        "date": _date(5),
        "time": "14:00",
        "status": "confirmed",
        "team_id": TEAM_ID,
        "created_at": NOW,
    })
    await db.meetings.insert_one({
        "parent_id": parent_user_ids[1],
        "parent_name": "Lisa Thompson",
        "faculty_id": faculty_ids[2],
        "faculty_name": "Jennifer Cruz",
        "student_name": "Aisha Thompson",
        "subject": "English honors placement discussion",
        "date": _date(8),
        "time": "10:30",
        "status": "pending",
        "team_id": TEAM_ID,
        "created_at": NOW,
    })
    results["meetings"] = 2
    results["parent_links"] = 2

    # ══════════════════════════════════════════════════════════════════════════
    # 15. CLASS SCHEDULES
    # ══════════════════════════════════════════════════════════════════════════
    schedules = [
        {"faculty_id": faculty_ids[0], "faculty_name": "Sarah Mitchell", "subject_name": "AP Calculus", "subject": "AP Calculus", "day_of_week": "Monday", "start_time": "08:00", "end_time": "09:00", "classroom": "301", "grade_level": "12"},
        {"faculty_id": faculty_ids[0], "faculty_name": "Sarah Mitchell", "subject_name": "Algebra II", "subject": "Algebra II", "day_of_week": "Monday", "start_time": "09:15", "end_time": "10:15", "classroom": "301", "grade_level": "10"},
        {"faculty_id": faculty_ids[0], "faculty_name": "Sarah Mitchell", "subject_name": "Mathematics", "subject": "Mathematics", "day_of_week": "Wednesday", "start_time": "08:00", "end_time": "09:00", "classroom": "301", "grade_level": "11"},
        {"faculty_id": faculty_ids[1], "faculty_name": "Robert Park", "subject_name": "Biology Honors", "subject": "Biology Honors", "day_of_week": "Tuesday", "start_time": "08:00", "end_time": "09:30", "classroom": "Lab A", "grade_level": "11"},
        {"faculty_id": faculty_ids[1], "faculty_name": "Robert Park", "subject_name": "Biology", "subject": "Biology", "day_of_week": "Thursday", "start_time": "10:00", "end_time": "11:00", "classroom": "Lab A", "grade_level": "10"},
        {"faculty_id": faculty_ids[2], "faculty_name": "Jennifer Cruz", "subject_name": "English 11", "subject": "English 11", "day_of_week": "Wednesday", "start_time": "10:30", "end_time": "11:30", "classroom": "205", "grade_level": "11"},
        {"faculty_id": faculty_ids[3], "faculty_name": "Michael Brown", "subject_name": "AP US History", "subject": "AP US History", "day_of_week": "Thursday", "start_time": "13:00", "end_time": "14:30", "classroom": "108", "grade_level": "12"},
        {"faculty_id": faculty_ids[4], "faculty_name": "Lisa Nguyen", "subject_name": "Physical Education", "subject": "Physical Education", "day_of_week": "Friday", "start_time": "11:00", "end_time": "12:00", "classroom": "Gymnasium", "grade_level": "All"},
    ]
    for s in schedules:
        s["team_id"] = TEAM_ID
        s["created_at"] = NOW
        await db.class_schedules.insert_one(s)
    results["class_schedules"] = len(schedules)

    return {
        "success": True,
        "message": f"Test school '{SCHOOL_NAME}' seeded successfully!",
        "data": results,
        "login_credentials": {
            "school_admin_coach": {"email": "principal@lincoln.edu", "password": PASSWORD, "role": "Admin / Head Coach"},
            "school_admin_office": {"email": "office@lincoln.edu", "password": PASSWORD, "role": "School Admin (Academic)"},
            "athletic_director": {"email": "athletics@lincoln.edu", "password": PASSWORD, "role": "Athletic Director"},
            "assistant_coach": {"email": "coach.williams@lincoln.edu", "password": PASSWORD, "role": "Assistant Coach"},
            "teacher_math": {"email": "s.mitchell@lincoln.edu", "password": PASSWORD, "role": "Teacher (Math)"},
            "teacher_science": {"email": "r.park@lincoln.edu", "password": PASSWORD, "role": "Teacher (Science)"},
            "student_player": {"email": "marcus.j@lincoln.edu", "password": PASSWORD, "role": "Student / Player"},
            "parent": {"email": "d.johnson@email.com", "password": PASSWORD, "role": "Parent"},
        },
    }


def _letter_from_pct(pct):
    if pct >= 93: return "A"
    if pct >= 90: return "A-"
    if pct >= 87: return "B+"
    if pct >= 83: return "B"
    if pct >= 80: return "B-"
    if pct >= 77: return "C+"
    if pct >= 73: return "C"
    if pct >= 70: return "C-"
    if pct >= 67: return "D+"
    if pct >= 60: return "D"
    return "F"
