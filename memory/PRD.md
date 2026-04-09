# NxGenSports PRD

## Problem Statement
Build NxGenSports school management app with standalone FastAPI + MongoDB backend. Comprehensive modules for students, faculty, parents, clubs, athletics, school admin reporting, engagement analytics, and weekly digest emails.

## Architecture
- **Frontend**: React + Vite | **Backend**: FastAPI + MongoDB (motor) | **Auth**: JWT (PyJWT + bcrypt)

## Backend Routers
```
/app/backend/routers/
├── auth.py, entities.py, functions.py, messages.py
├── upload.py, llm.py, students.py, faculty.py
├── parents.py, clubs.py, admin_reports.py
```

## Implemented Features

### Phase 1: Base44 Migration (Complete)
- JWT auth, Entity CRUD, Resend invites, Password reset, Rate limiting, WebSocket messaging, Push notifications (PWA), 28+ pages, Mobile-optimized

### Phase 2: Student Records (Complete)
- Student CRUD, Grades (auto GPA), Attendance, Assignments, Discipline, Transcripts, Stats, Bulk attendance

### Phase 3: Faculty & Staff (Complete)
- Faculty CRUD, Departments, Subjects, Classrooms, Class Schedules, Stats
- Master Schedule Calendar, Faculty-Student Linkage

### Phase 4: Parent Portal (Complete)
- Parent-student linking, Progress reports, Meeting scheduling with email notifications

### Phase 5: Clubs & Committees (Complete)
- Club/committee CRUD, Membership management, Event management, Club stats

### Phase 6: School Admin Reporting (Complete - 2026-04-09)
- **Announcements**: CRUD with priority levels, audience targeting, email broadcast via Resend
- **School Calendar**: CRUD with month grid view & list view, event type categorization
- **Document Center**: File upload + link references, category filtering, search
- **Enrollment Stats**: Dashboard with stat cards, user type breakdown, grade distribution chart
- **Engagement Analytics** (P1 - Complete): Login activity chart (30 days), message activity chart, attendance rate, assignment completion rate, meeting status breakdown, weekly/monthly user metrics, discipline tracking
- **Weekly Digest Email** (Enhancement - Complete): Automated weekly email to staff with announcements summary, upcoming events, key stats. Configurable day/hour/audience. Manual "Send Now" trigger. Background scheduler via asyncio.
- Backend: `/api/admin/*` (announcements, calendar, documents, documents/upload, stats, analytics, digest/settings, digest/send)
- Frontend: `SchoolAdminReporting.jsx` with 6-tab interface

## Key API Endpoints
### Admin Reports (/api/admin)
- GET/POST /announcements, PATCH/DELETE /announcements/{id}
- GET/POST /calendar, PATCH/DELETE /calendar/{id}
- GET/POST /documents, POST /documents/upload, DELETE /documents/{id}
- GET /stats
- GET /analytics
- GET/PATCH /digest/settings, POST /digest/send

### Clubs (/api/clubs)
- GET/POST /, GET /stats, GET/PATCH/DELETE /{id}
- GET/POST /members, PATCH/DELETE /members/{mid}
- GET/POST /events, DELETE /events/{eid}, GET /events/upcoming

### Parents (/api/parents)
- GET /my-students, POST /link-student, DELETE /unlink-student/{id}
- GET /progress/{student_id}
- GET/POST /meetings, PATCH/DELETE /meetings/{id}

### Students, Faculty, Auth, Entities, Functions, Messages
(See respective router files)

## Key DB Collections
- `announcements`, `school_events`, `school_documents`, `digest_settings` — School Admin
- `clubs`, `club_memberships`, `club_events` — Clubs & Committees
- `parent_student_links`, `meetings` — Parent Portal
- `students`, `grades`, `attendance_records`, `student_assignments`, `discipline_records` — Students
- `faculty`, `departments`, `subjects`, `classrooms`, `class_schedules` — Faculty
- `users`, `schools`, `invites`, `conversations`, `messages`, `push_subscriptions`, `login_attempts` — Core

## Prioritized Backlog

### P3 - Future
- Two-factor auth
- Data export/import
- Report card generation / PDF export

## Test Credentials
- Super Admin: admin@nxgensports.com / Admin123!
