# NxGenSports PRD

## Problem Statement
Build the NxGenSports app from the Base44 repository with a standalone FastAPI + MongoDB backend, replacing the Base44 SDK dependency. Expand into a comprehensive School Management System with student records, faculty, athletics, and more.

## Architecture
- **Frontend**: React + Vite (at /app, served from /app/frontend wrapper)
- **Backend**: FastAPI (Python) with modular routers at /app/backend/
- **Database**: MongoDB (motor async driver)
- **Auth**: JWT Bearer token (PyJWT + bcrypt)

## Backend Module Structure (Refactored 2026-04-09)
```
/app/backend/
├── server.py          # Slim entry point (~45 lines)
├── config.py          # All environment variables and constants
├── database.py        # MongoDB connection, indexes, admin seed
├── utils.py           # Shared helpers (auth, JWT, serialization, email, LLM)
├── ws_manager.py      # WebSocket ConnectionManager
├── routers/
│   ├── auth.py        # Auth endpoints (login, register, accept-invite, me, password reset, etc.)
│   ├── entities.py    # Generic entity CRUD with team-based RLS
│   ├── functions.py   # Business logic (sendInvite, getTeamUsers, listAllSchools, etc.)
│   ├── messages.py    # WebSocket, presence, push notification endpoints
│   ├── upload.py      # File upload
│   ├── llm.py         # LLM proxy, health check
│   └── students.py    # Student Records module (CRUD, grades, attendance, assignments, discipline, transcript)
├── requirements.txt
└── tests/
```

## Core Requirements
1. Multi-sport athletic intelligence platform + school management
2. Role-based access (super_admin, admin/head_coach, staff, player, parent)
3. School-level data isolation (team_id based RLS)
4. Invite flow: admin invites users → acceptance → visible in proper lists
5. All 28+ pages functional via API client replacing Base44 SDK
6. Student Records: grades, attendance, assignments, discipline, transcripts

## What's Been Implemented

### Phase 1: Base44 Migration (Complete)
- JWT auth, Generic entity CRUD, Resend email invites, Password reset, Rate limiting
- File upload, LLM proxy, WebSocket messaging with presence, Push notifications (PWA)
- All 28 original pages functional, Mobile-optimized layout

### Phase 2: Refactoring + Student Records (Complete - 2026-04-09)
- **Backend Refactoring**: Split monolithic server.py (1100+ lines) into modular routers
- **Student Records Module**: Full CRUD for students with sub-records
  - Student profiles (name, grade level, guardian info, enrollment status)
  - Grades with auto GPA recalculation (supports all letter grades A+ through F)
  - Attendance tracking (present, absent, tardy, excused) with bulk recording
  - Assignments (pending, submitted, graded, late, missing)
  - Discipline records (warning, detention, suspension, expulsion)
  - Unofficial transcript generation (grouped by semester with semester/cumulative GPA)
  - Student stats aggregation (GPA, attendance rate, assignment completion, discipline count)
- **Frontend**: StudentRecords page with list view (search/filter), detail view with tabbed interface

## Key DB Schema
- `users`: auth accounts with team_id isolation
- `schools`: school profiles with team_id
- `invites`: invite records with tokens
- `students`: student profiles (team_id, grade_level, gpa, guardian info, enrollment)
- `grades`: individual course grades (student_id, course, semester, letter grade, credits)
- `attendance_records`: daily attendance (student_id, date, status)
- `student_assignments`: assignment tracking (student_id, title, course, status)
- `discipline_records`: discipline incidents (student_id, type, description, resolved)
- `conversations`, `messages`: real-time messaging
- `push_subscriptions`: PWA push notification subscriptions

## Key API Endpoints
- Auth: POST /api/auth/login, /register, GET /me, PATCH /me, POST /change-password, /forgot-password, /reset-password
- Entities: GET/POST/PATCH/DELETE /api/entities/{name}
- Functions: POST /api/functions/{name} (getTeamUsers, sendInvite, listAllSchools, etc.)
- Students: GET/POST /api/students/, GET/PATCH/DELETE /api/students/{id}
- Student Records: GET/POST/DELETE /api/students/{id}/grades, /attendance, /assignments, /discipline
- Student Transcript: GET /api/students/{id}/transcript
- Student Stats: GET /api/students/{id}/stats
- Bulk Attendance: POST /api/students/attendance/bulk
- WebSocket: WS /api/ws/messages/{token}
- Presence: GET /api/presence/{team_id}
- Push: GET /api/push/vapid-public-key, POST /api/push/subscribe

## Prioritized Backlog

### P0 - In Progress
- Student Records Module (DONE)

### P1 - Next Up
- Faculty & Staff management module (classrooms, schedules, subjects)
- Enhanced Parent Portal (progress reports, meeting scheduling)

### P2 - Future
- Clubs & Committees module (membership, events)
- School Admin reporting module (announcements, calendar, documents)
- Dashboard analytics summary (engagement metrics)
- Two-factor auth, Data export/import

## 3rd Party Integrations
- Resend (transactional emails) — requires user API Key
- PyWebPush (push notifications) — VAPID keys in env
- OpenAI GPT-4o-mini (via Emergent LLM Key) — for AI features

## Test Credentials
- Super Admin: admin@nxgensports.com / Admin123!
- See /app/memory/test_credentials.md for additional accounts
