# NxGenSports Test Credentials

## Super Admin Account
- **Email**: admin@nxgensports.com
- **Password**: Admin123!
- **Role**: super_admin
- **Access**: Full system access — Schools, Users, Players, Master Teams

## Auth Endpoints
- Login: POST /api/auth/login
- Register: POST /api/auth/register
- Me: GET /api/auth/me
- Update Me: PATCH /api/auth/me
- Logout: POST /api/auth/logout
- Accept Invite: POST /api/auth/accept-invite
- Get Invite: GET /api/auth/invite/{token}

## Backend URL
- External: https://3d75ab2d-b815-4b14-9357-7971866ab07b.preview.emergentagent.com
- Backend port: 8001 (internal)
- Frontend port: 3000 (internal)

## Notes
- Token stored in localStorage as `nxgen_token`
- Bearer token auth (Authorization: Bearer <token>)
- All API routes prefixed with /api
