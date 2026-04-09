# NxGenSports PRD

## Problem Statement
Build NxGenSports school management app with standalone FastAPI + MongoDB backend. Comprehensive modules for students, faculty, parents, athletics, and more.

## Architecture
- **Frontend**: React + Vite | **Backend**: FastAPI + MongoDB (motor) | **Auth**: JWT (PyJWT + bcrypt)

## Backend Module Structure
```
/app/backend/
├── server.py, config.py, database.py, utils.py, ws_manager.py
├── routers/
│   ├── auth.py, entities.py, functions.py, messages.py
│   ├── upload.py, llm.py, students.py, faculty.py, parents.py
└── tests/
```

## Implemented Features

### Phase 1: Base44 Migration (Complete)
- JWT auth, Entity CRUD, Resend invites, Password reset, Rate limiting, WebSocket messaging, Push notifications (PWA), 28+ pages, Mobile-optimized

### Phase 2: Student Records (Complete - 2026-04-09)
- Student CRUD, Grades (auto GPA), Attendance, Assignments, Discipline, Transcripts, Stats, Bulk attendance

### Phase 3: Faculty & Staff (Complete - 2026-04-09)
- Faculty CRUD, Departments, Subjects, Classrooms, Class Schedules, Stats
- Master Schedule Calendar (visual weekly timetable grid)
- Faculty-Student Linkage (via faculty_id on grades, linked students view)

### Phase 4: Parent Portal (Complete - 2026-04-09)
- **Parent-Student Linking**: Link via student ID code, list/unlink linked children
- **Progress Reports**: Comprehensive view with grades by semester (with semester GPA), cumulative GPA, attendance rate with visual color-coded dots, recent assignments, discipline records
- **Meeting Scheduling**: Request meetings with faculty, confirm/complete/cancel status workflow, faculty dropdown with departments
- **Available Faculty**: Active faculty list for meeting scheduling
- Frontend: ParentPortal.jsx with "My Children" tab (student cards → progress reports), "Meetings" tab (scheduler + list), Link Student dialog

## Key API Endpoints
### Parents (/api/parents)
- GET /my-students, POST /link-student, DELETE /unlink-student/{id}
- GET /progress/{student_id} (comprehensive report)
- GET/POST /meetings, PATCH/DELETE /meetings/{id}
- GET /available-faculty

### Students (/api/students)
- GET/POST /, GET/PATCH/DELETE /{id}
- GET/POST/DELETE /{id}/grades, /attendance, /assignments, /discipline
- GET /{id}/transcript, /{id}/stats, POST /attendance/bulk

### Faculty (/api/faculty)
- GET/POST /, GET /stats, GET/PATCH/DELETE /member/{id}
- GET/POST /departments, /subjects, /classrooms (+ DELETE)
- GET/POST /member/{id}/schedule, GET /schedule/all, GET /member/{id}/students

### Auth, Entities, Functions, Messages, Upload, LLM, Health, Presence, Push
(See previous PRD versions)

## Key DB Collections
- `users`, `schools`, `invites` — Auth/org
- `students`, `grades`, `attendance_records`, `student_assignments`, `discipline_records` — Students
- `faculty`, `departments`, `subjects`, `classrooms`, `class_schedules` — Faculty
- `parent_student_links`, `meetings` — Parent Portal
- `conversations`, `messages`, `push_subscriptions` — Messaging/PWA

## Prioritized Backlog

### P2 - Future
- Clubs & Committees module (membership, events)
- School Admin reporting (announcements, calendar, documents)
- Dashboard analytics summary
- Two-factor auth, Data export/import

## 3rd Party Integrations
- Resend (emails), PyWebPush (push), OpenAI GPT-4o-mini (Emergent LLM Key)

## Test Credentials
- Super Admin: admin@nxgensports.com / Admin123!
