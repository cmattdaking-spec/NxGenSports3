# NxGenSports PRD — School Management System

## Original Problem Statement
Migrate a React app using the Base44 SDK to a standalone FastAPI + MongoDB backend, clean up the invite flow, make the app production-ready, and turn the app into a "total school management app" (grades, attendance, faculty, parents, clubs, etc.).

## Architecture
- **Backend:** FastAPI, Python 3, MongoDB (Motor Async), PyWebPush, Resend, WebSockets, `apscheduler`, `pyotp`, `reportlab`
- **Frontend:** React, Vite, Tailwind CSS, Shadcn UI
- **Auth:** JWT, Row-Level Security via `team_id`, 2FA via TOTP
- **User Types:** super_admin, admin (head_coach/AD/school_admin), user (coach/teacher/player/parent)

## Completed Features

### P0 — Core Platform (DONE)
- JWT Auth + Password Reset + Rate Limiting
- School/Team CRUD, Invite Flow via Resend
- Student Records, Faculty & Staff, Parent Portal, Clubs & Committees
- Real-time WebSockets for NxMessages with Presence tracking

### P1 — Advanced Features (DONE)
- School Admin Reporting (Announcements, Calendar, Documents)
- Dashboard Analytics & Weekly Digest Email
- Push Notifications and PWA support

### P2 — Extended Features (DONE)
- Two-Factor Authentication (2FA) via TOTP
- Data Export (CSV) & Import
- Report Card PDF Generation

### P3 — Role-Based Access Control (DONE — Feb 2026)
- **6 distinct role-based views** with separate navigation and dashboards:
  - **School Admin**: Academic-only view (Students, Faculty, Clubs, Admin Reporting, Data Export, Report Cards, User Management) — NO sports features
  - **Teacher**: Class-focused view (TeacherDashboard with class schedule, my students, grades, attendance) — teachers see only their assigned students by subject/department
  - **Coach**: Full sports navigation (NxLab, Game Plans, Roster, S&C, Recruiting, Analytics, etc.)
  - **Athletic Director**: AD Portal with cross-sport overview
  - **Player**: Player-focused navigation (Announcements, Schedule, Game Plan, NxPlay, etc.)
  - **Parent**: Parent portal with child tracking
- Updated invite flow with 5 role types: Coach/Staff, Teacher, School Admin, Player, Parent
- Teacher invites include Department field, no sports required
- Login redirects to role-appropriate dashboard
- Backend route protection per user_type

### Test Data (DONE)
- Lincoln High School seeded with 8 students, 5 faculty, 4 clubs, grades, attendance
- Test accounts for all 6 role types (see test_credentials.md)

## Key User Types & Navigation

| User Type     | Dashboard               | Navigation                                             |
|---------------|-------------------------|--------------------------------------------------------|
| super_admin   | Teams Management        | UserManagement only                                    |
| school_admin  | SchoolAdminDashboard    | Students, Faculty, Clubs, Admin, Users, NxMessages     |
| teacher       | TeacherDashboard        | My Students, Announcements, Schedule, Eligibility, NxMessages |
| coach/staff   | Dashboard               | Full sports nav (NxLab, Roster, S&C, etc.)             |
| athletic_dir  | ADPortal                | Cross-sport overview + full sports nav                 |
| player        | NxAnnouncement          | Announcements, Schedule, Game Plan, NxPlay, etc.       |
| parent        | ParentPortal            | Portal, Announcements, Roster, Eligibility, etc.       |

## Backlog / Future Tasks
- P4: Student/parent mobile dashboard (daily schedules, upcoming assignments, recent grades)
- P5: Class assignment management for teachers (add/remove students from classes)
- P6: Grade book feature for teachers (bulk grade entry, grade history)
