# NxGenSports PRD

## Problem Statement
Build the NxGenSports app from the Base44 repository with a standalone FastAPI + MongoDB backend, replacing the Base44 SDK dependency. Clean up the invite flow so users and schools can be invited and are visible in their proper locations.

## Architecture
- **Frontend**: React + Vite (at /app, served from /app/frontend wrapper)
- **Backend**: FastAPI (Python) at /app/backend/server.py
- **Database**: MongoDB (motor async driver)
- **Auth**: JWT Bearer token (PyJWT + bcrypt)

## Core Requirements (Static)
1. Multi-sport athletic intelligence platform
2. Role-based access (super_admin, admin/head_coach, staff, player, parent)
3. School-level data isolation (team_id based)
4. Invite flow: admin invites users → pending invites → acceptance → visible in proper lists
5. All 28+ pages functional via new API client replacing Base44 SDK

## What's Been Implemented (2026-04-02)

### Backend (FastAPI + MongoDB)
- JWT auth (login, register, logout, me, accept-invite)
- Generic entity CRUD with team-based RLS
- Functions: sendInvite, getTeamUsers, listAllSchools, updateTeamUser, createParentUser, joinSchoolByCode, listMasterTeams
- LLM proxy (Emergent LLM key)
- Admin seed on startup (admin@nxgensports.com / Admin123!)
- **Resend email integration** — invite emails + password reset emails (noreply@nxgen-sports.com)
- **Password reset flow** — forgot-password + reset-password endpoints with 1hr token TTL
- **Rate limiting** — 5 failed login attempts by email = 15min lockout (HTTP 429)
- **File upload** — POST /api/upload → stores in /app/static/uploads/, returns file_url
- **Static file serving** — /static/* served by FastAPI

### Frontend
- New API client (apiClient.js) replacing Base44 SDK
  - Same interface: base44.auth.*, base44.entities.*, base44.functions.invoke()
  - JWT Bearer token stored in localStorage
  - **UploadFile** implemented via POST /api/upload
  - 401 redirect excludes /Login and /ResetPassword
- Updated Login page: email/password login, **Forgot password? link**, invite acceptance, parent signup
- **ForgotPasswordForm** — submits email → Resend sends reset link
- **ResetPassword page** (/ResetPassword?token=xxx) — public route, set new password
- Updated AuthContext: simple JWT-based auth check
- Simplified EnrollmentCheck (enrollment at account creation)
- Fixed vite.config.js (removed @base44/vite-plugin, added path aliases + proxy)
- Frontend package.json wrapper to run Vite from /app/frontend

### Invite Flow Fix
- sendInvite creates invite record with unique invite_token + sends Resend email
- Invite URL: /Login?invite_token=<token>
- InviteAcceptForm pre-fills user data from invite
- After acceptance: user gets team_id assigned → appears in getTeamUsers
- Schools immediately visible in listAllSchools after creation
- PendingInvites shows invites with status="pending" filtered by team_id

### Bug Fixes Applied
- ParentPortal: removed base44.asServiceRole reference
- CORS: configured explicit allowed origins
- Vite: allowedHosts set to true
- ResetPassword: public route added to App.jsx; apiClient.js 401-redirect exclusion added

## Testing Results
- Iteration 1: Backend 100% (18/18), Frontend 95%
- Iteration 2: Backend 100% (29/29), Frontend 100% (all 28 pages)
- Iteration 5: Backend 100% (7/7), Frontend 100% (live presence indicator — green dot in NxMessages)

## Completed Features (All 4 Next Action Items)
1. **Resend email** — invite + password reset emails via noreply@nxgen-sports.com (domain needs Resend verification)
2. **Password reset** — /ResetPassword?token=xxx public route, Forgot password? on login, 1hr token expiry
3. **Rate limiting** — 5 bad logins by email = 15min lockout (HTTP 429)
4. **28-page sweep** — UploadFile wired, InvokeLLM works, asServiceRole fixed, all pages load

## Completed Enhancement (Onboarding Wizard)
- 5-step modal: Welcome → Add Player → Schedule Game → Create Play → Done
- Shown to eligible coaches after ProfileVerify completes (profile_verified=true + no onboarding_completed)
- Each step creates real data (Player, Opponent, Play entities)
- Skip buttons on each step; "Skip setup" on welcome exits immediately
- Sets onboarding_completed=true when finished
- Not shown to super_admin, players, or parents

## Other Improvements
- NxMessages: replaced broken subscribe() with setInterval polling (4s messages, 10s convos)
- Settings: Change Password fully wired with error handling
- ProfileVerify: full page reload after completion so Layout re-initialises and wizard triggers
- Resend domain banner in Super Admin view

## Prioritized Backlog

### P0 - Critical
- Email sending for invites (currently logs to console)
- Password reset flow
- Data migration from Base44 (if needed)

### P1 - Important  
- All 28 pages full testing
- PlayerPortal and ParentPortal complete functionality
- FilmRoom, Playbook, Game Plan features
- Messages/channels

### P2 - Nice to Have
- Two-factor auth
- Export/import data
- Advanced analytics

## Next Tasks
1. Test all pages and fix any remaining Base44 SDK usage
2. Add email sending (Resend integration)
3. Add password reset flow
4. Full regression test of all 28 pages
