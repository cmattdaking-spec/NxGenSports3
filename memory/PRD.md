# NxGenSports PRD

## Problem Statement
Build the NxGenSports app from the Base44 repository with a standalone FastAPI + MongoDB backend, replacing the Base44 SDK dependency. Expand into a comprehensive School Management System with student records, faculty, athletics, and more.

## Architecture
- **Frontend**: React + Vite (at /app, served from /app/frontend wrapper)
- **Backend**: FastAPI (Python) with modular routers at /app/backend/
- **Database**: MongoDB (motor async driver)
- **Auth**: JWT Bearer token (PyJWT + bcrypt)

## Backend Module Structure
```
/app/backend/
├── server.py          # Slim entry point (~50 lines)
├── config.py          # All environment variables and constants
├── database.py        # MongoDB connection, indexes, admin seed
├── utils.py           # Shared helpers (auth, JWT, serialization, email, LLM)
├── ws_manager.py      # WebSocket ConnectionManager
├── routers/
│   ├── auth.py        # Auth endpoints
│   ├── entities.py    # Generic entity CRUD with team-based RLS
│   ├── functions.py   # Business logic (sendInvite, getTeamUsers, etc.)
│   ├── messages.py    # WebSocket, presence, push notifications
│   ├── upload.py      # File upload
│   ├── llm.py         # LLM proxy, health check
│   ├── students.py    # Student Records module
│   └── faculty.py     # Faculty & Staff module
├── requirements.txt
└── tests/
```

## What's Been Implemented

### Phase 1: Base44 Migration (Complete)
- JWT auth, Generic entity CRUD, Resend email invites, Password reset, Rate limiting
- File upload, LLM proxy, WebSocket messaging with presence, Push notifications (PWA)
- All 28 original pages functional, Mobile-optimized layout

### Phase 2: Refactoring + Student Records (Complete - 2026-04-09)
- Backend Refactoring: Split monolithic server.py into modular routers
- Student Records Module: CRUD, grades (auto GPA), attendance, assignments, discipline, transcripts, stats

### Phase 3: Faculty & Staff Module (Complete - 2026-04-09)
- Faculty CRUD (profiles with position, department, subjects, qualifications, bio)
- Departments CRUD (name, head, description)
- Subjects CRUD (name, code, department, credits)
- Classrooms CRUD (room number, building, capacity, type)
- Class Schedule management (per-faculty: subject, day, period, times, classroom)
- Master schedule (all classes with faculty name enrichment)
- Faculty stats aggregation
- Frontend: FacultyStaff.jsx with Directory tab (list/search/filter), Manage tab (depts/subjects/classrooms), Detail view (profile + schedule grid)

## Key DB Collections
- `users`, `schools`, `invites` — Core auth/org
- `students`, `grades`, `attendance_records`, `student_assignments`, `discipline_records` — Student Records
- `faculty`, `departments`, `subjects`, `classrooms`, `class_schedules` — Faculty & Staff
- `conversations`, `messages` — Real-time messaging
- `push_subscriptions` — PWA push notifications

## Key API Endpoints
### Auth
- POST /api/auth/login, /register, GET /me, PATCH /me, POST /change-password, /forgot-password, /reset-password

### Students (/api/students)
- GET/POST /, GET/PATCH/DELETE /{id}
- GET/POST/DELETE /{id}/grades, /attendance, /assignments, /discipline
- GET /{id}/transcript, /{id}/stats
- POST /attendance/bulk

### Faculty (/api/faculty)
- GET/POST /, GET /stats
- GET/PATCH/DELETE /member/{id}
- GET/POST /departments, DELETE /departments/{id}
- GET/POST /subjects, DELETE /subjects/{id}
- GET/POST /classrooms, DELETE /classrooms/{id}
- GET/POST /member/{id}/schedule, DELETE /member/{id}/schedule/{entry_id}
- GET /schedule/all

### Other
- Entities: GET/POST/PATCH/DELETE /api/entities/{name}
- Functions: POST /api/functions/{name}
- WS /api/ws/messages/{token}
- GET /api/presence/{team_id}, GET /api/push/vapid-public-key, POST /api/push/subscribe

## Prioritized Backlog

### P1 - Next Up
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
