# NxGenSports PRD

## Problem Statement
Build NxGenSports school management app with standalone FastAPI + MongoDB backend. Comprehensive modules for students, faculty, parents, clubs, athletics, school admin reporting, engagement analytics, weekly digest emails, 2FA, data export/import, and report card PDF generation.

## Architecture
- **Frontend**: React + Vite | **Backend**: FastAPI + MongoDB (motor) | **Auth**: JWT (PyJWT + bcrypt) + optional TOTP 2FA

## Backend Routers
```
/app/backend/routers/
├── auth.py, entities.py, functions.py, messages.py
├── upload.py, llm.py, students.py, faculty.py
├── parents.py, clubs.py, admin_reports.py
├── data_export.py, report_cards.py, seed.py
```

## Implemented Features (All Complete)

### Phase 1: Base44 Migration - JWT auth, Entity CRUD, Resend invites, Password reset, WebSocket messaging, PWA
### Phase 2: Student Records - CRUD, Grades (auto GPA), Attendance, Assignments, Discipline, Transcripts
### Phase 3: Faculty & Staff - CRUD, Departments, Subjects, Classrooms, Schedules, Master Schedule
### Phase 4: Parent Portal - Parent-student linking, Progress reports, Meeting scheduling with email
### Phase 5: Clubs & Committees - CRUD, Membership, Events, Stats
### Phase 6: School Admin Reporting - Announcements (CRUD + email broadcast), Calendar, Document Center (upload + links), Enrollment Stats, Engagement Analytics, Weekly Digest Email
### Phase 7: P3 Features
- **2FA**: TOTP-based via pyotp, QR code setup, backup codes, login challenge flow
- **Data Export/Import**: CSV export (students, faculty, grades, attendance, clubs), CSV import (students, faculty) with validation
- **Report Card PDF**: Per-student PDF with grades, attendance, discipline via reportlab
### Test School Seed
- Lincoln High School seeded with admin, faculty, students, grades, attendance, clubs, announcements, events, documents, parents, meetings, schedules

## Key DB Collections
announcements, school_events, school_documents, digest_settings, clubs, club_memberships, club_events, parent_student_links, meetings, students, grades, attendance_records, student_assignments, discipline_records, faculty, departments, subjects, classrooms, class_schedules, users, schools, invites, conversations, messages, push_subscriptions, login_attempts

## Prioritized Backlog
All features complete. No remaining backlog items.

## Test Credentials
- Super Admin: admin@nxgensports.com / Admin123!
- School Admin: principal@lincoln.edu / Test1234!
- See /app/memory/test_credentials.md for full list
