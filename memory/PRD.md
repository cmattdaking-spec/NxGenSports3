# NxGenSports PRD

## Problem Statement
Build the NxGenSports app from the Base44 repository with a standalone FastAPI + MongoDB backend. Expand into a comprehensive School Management System.

## Architecture
- **Frontend**: React + Vite | **Backend**: FastAPI + MongoDB (motor) | **Auth**: JWT (PyJWT + bcrypt)

## Backend Module Structure
```
/app/backend/
├── server.py, config.py, database.py, utils.py, ws_manager.py
├── routers/
│   ├── auth.py, entities.py, functions.py, messages.py
│   ├── upload.py, llm.py, students.py, faculty.py
└── tests/
```

## What's Been Implemented

### Phase 1: Base44 Migration (Complete)
- JWT auth, Entity CRUD, Resend invites, Password reset, Rate limiting, WebSocket messaging, Push notifications (PWA), 28+ pages, Mobile-optimized

### Phase 2: Refactoring + Student Records (Complete - 2026-04-09)
- Backend modular routers, Student CRUD, Grades (auto GPA), Attendance, Assignments, Discipline, Transcripts, Stats

### Phase 3: Faculty & Staff Module (Complete - 2026-04-09)
- Faculty CRUD, Departments, Subjects, Classrooms, Class Schedules, Stats

### Phase 4: Enhancements (Complete - 2026-04-09)
- **Master Schedule Calendar**: Visual weekly timetable grid (Period x Day) with color-coded cells per faculty, faculty legend badges, room/time info in cells. Accessible via "Schedule" tab on Faculty & Staff page.
- **Faculty-Student Linkage**: 
  - Backend: `GET /api/faculty/member/{id}/students` resolves students via `faculty_id` or `teacher_name` in grades
  - Backend: `POST /api/students/{id}/grades` now accepts optional `faculty_id` for direct teacher linkage
  - Frontend: Faculty detail shows "Linked Students" section with student names, grade levels, GPA, and courses with grades
  - Frontend: GradeForm in Student Records has faculty dropdown selector that auto-fills teacher_name

## Key DB Collections
- `users`, `schools`, `invites` — Auth/org
- `students`, `grades` (now with `faculty_id`), `attendance_records`, `student_assignments`, `discipline_records` — Student Records
- `faculty`, `departments`, `subjects`, `classrooms`, `class_schedules` — Faculty & Staff
- `conversations`, `messages`, `push_subscriptions` — Messaging/PWA

## Prioritized Backlog

### P1 - Next Up
- Enhanced Parent Portal (progress reports, meeting scheduling)

### P2 - Future
- Clubs & Committees module
- School Admin reporting (announcements, calendar, documents)
- Dashboard analytics summary
- Two-factor auth, Data export/import

## 3rd Party Integrations
- Resend (emails), PyWebPush (push), OpenAI GPT-4o-mini (Emergent LLM Key)

## Test Credentials
- Super Admin: admin@nxgensports.com / Admin123!
