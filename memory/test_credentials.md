# NxGenSports Test Credentials

## Super Admin Account
- **Email**: admin@nxgensports.com
- **Password**: Admin123!
- **Role**: super_admin
- **Access**: Full system — Schools, Users, Players, Master Teams, Resend notice

## Test Accounts (created by test runners)
- **Wizard test coach**: onboard_wizard_test@nxgen.test / WizardTest123! (onboarding_completed=true)

## Auth Endpoints
- Login: POST /api/auth/login
- Register: POST /api/auth/register
- Me: GET /api/auth/me
- Update Me: PATCH /api/auth/me
- Logout: POST /api/auth/logout
- Accept Invite: POST /api/auth/accept-invite
- Get Invite: GET /api/auth/invite/{token}
- Change Password: POST /api/auth/change-password
- Forgot Password: POST /api/auth/forgot-password
- Reset Password: POST /api/auth/reset-password

## Backend URL
- External: https://3d75ab2d-b815-4b14-9357-7971866ab07b.preview.emergentagent.com
- Backend port: 8001 (internal)
- Frontend port: 3000 (internal)

## Notes
- Token stored in localStorage as `nxgen_token`
- Bearer token auth (Authorization: Bearer <token>)
- All API routes prefixed with /api
- Rate limit: 5 failed logins by email = 15 min lockout
- Resend domain: nxgen-sports.com (must verify at resend.com/domains)
