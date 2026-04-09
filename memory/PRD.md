# NxGenSports PRD

## Problem Statement
Build NxGenSports school management app with standalone FastAPI + MongoDB backend. Comprehensive modules for students, faculty, parents, clubs, athletics, and more.

## Architecture
- **Frontend**: React + Vite | **Backend**: FastAPI + MongoDB (motor) | **Auth**: JWT (PyJWT + bcrypt)

## Backend Routers
```
/app/backend/routers/
├── auth.py, entities.py, functions.py, messages.py
├── upload.py, llm.py, students.py, faculty.py, parents.py, clubs.py
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
- Meetings email: Faculty gets notified on new request, both parties notified on status changes (confirmed/cancelled/completed)

### Phase 5: Clubs & Committees (Complete - 2026-04-09)
- Club/committee CRUD (name, description, type, category, advisor, meeting schedule, max members)
- Membership management (add/remove students, role assignment: president, VP, secretary, treasurer, officer, member)
- Event management (title, date, time, location, type: meeting/workshop/competition/fundraiser/social)
- Club stats (total clubs, active, total members, upcoming events)
- Upcoming events endpoint with club name enrichment
- Frontend: 2-column card grid with search/filter by type & category, detail view with Members/Events tabs

## Key API Endpoints
### Clubs (/api/clubs)
- GET/POST /, GET /stats, GET/PATCH/DELETE /{id}
- GET/POST /members, PATCH/DELETE /members/{mid}
- GET/POST /events, DELETE /events/{eid}
- GET /events/upcoming

### Parents (/api/parents)
- GET /my-students, POST /link-student, DELETE /unlink-student/{id}
- GET /progress/{student_id}
- GET/POST /meetings, PATCH/DELETE /meetings/{id} (+ email notifications)
- GET /available-faculty

### Students, Faculty, Auth, Entities, Functions, Messages
(See previous versions)

## Key DB Collections
- `clubs`, `club_memberships`, `club_events` — Clubs & Committees
- `parent_student_links`, `meetings` — Parent Portal
- `students`, `grades`, `attendance_records`, `student_assignments`, `discipline_records` — Students
- `faculty`, `departments`, `subjects`, `classrooms`, `class_schedules` — Faculty
- `users`, `schools`, `invites`, `conversations`, `messages`, `push_subscriptions` — Core

## Prioritized Backlog

### P2 - Next
- School Admin reporting (announcements, calendar, documents)
- Dashboard analytics summary

### P3 - Future
- Two-factor auth, Data export/import
- Report card generation / PDF export

## Test Credentials
- Super Admin: admin@nxgensports.com / Admin123!
