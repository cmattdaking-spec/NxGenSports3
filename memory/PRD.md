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

### Frontend
- New API client (apiClient.js) replacing Base44 SDK
  - Same interface: base44.auth.*, base44.entities.*, base44.functions.invoke()
  - JWT Bearer token stored in localStorage
- Updated Login page: email/password login, invite acceptance, parent signup
- Updated AuthContext: simple JWT-based auth check
- Simplified EnrollmentCheck (enrollment at account creation)
- Fixed vite.config.js (removed @base44/vite-plugin, added path aliases + proxy)
- Frontend package.json wrapper to run Vite from /app/frontend

### Invite Flow Fix
- sendInvite creates invite record with unique invite_token
- Invite URL: /Login?invite_token=<token> (logged to backend console)
- InviteAcceptForm pre-fills user data from invite
- After acceptance: user gets team_id assigned → appears in getTeamUsers
- Schools immediately visible in listAllSchools after creation
- PendingInvites shows invites with status="pending" filtered by team_id

### Bug Fixes Applied
- ParentPortal: removed base44.asServiceRole reference (replaced with base44.entities.Player.get)
- CORS: configured explicit allowed origins instead of wildcard
- Vite: allowedHosts set to true for Emergent preview environment

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
