"""NxGenSports backend API tests - auth, entities, invite flow, functions"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

ADMIN_EMAIL    = os.environ.get("ADMIN_EMAIL", "admin@nxgensports.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin123!")


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ── Auth tests ────────────────────────────────────────────────────────────────
class TestAuth:
    def test_health(self):
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        print("Health OK")

    def test_login_success(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["user"]["role"] == "super_admin"
        print("Login OK")

    def test_login_wrong_password(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401
        print("Wrong password -> 401 OK")

    def test_get_me(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "super_admin"
        print("GET /api/auth/me OK")

    def test_get_me_no_token(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401
        print("No token -> 401 OK")


# ── School CRUD tests ──────────────────────────────────────────────────────────
class TestSchool:
    school_id = None

    def test_create_school(self, admin_headers):
        payload = {
            "school_name": "TEST_School Alpha",
            "poc_name": "John Doe",
            "poc_email": "johndoe@test.edu",
            "subscribed_sports": ["football"],
            "team_id": "team_test_alpha",
            "school_code": "TALPHA",
            "status": "active",
        }
        r = requests.post(f"{BASE_URL}/api/entities/School", json=payload, headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["school_name"] == "TEST_School Alpha"
        assert "id" in data
        TestSchool.school_id = data["id"]
        print(f"Create school OK, id={TestSchool.school_id}")

    def test_list_all_schools_function(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/functions/listAllSchools", json={}, headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "schools" in data
        assert isinstance(data["schools"], list)
        print(f"listAllSchools OK, count={len(data['schools'])}")

    def test_filter_school(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/entities/School/filter",
                          json={"query": {"school_name": "TEST_School Alpha"}},
                          headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        names = [s["school_name"] for s in data]
        assert "TEST_School Alpha" in names
        print("Filter school OK")

    def test_get_school_by_id(self, admin_headers):
        if not TestSchool.school_id:
            pytest.skip("School not created")
        r = requests.get(f"{BASE_URL}/api/entities/School/{TestSchool.school_id}", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == TestSchool.school_id
        print("GET school by ID OK")

    def test_delete_school(self, admin_headers):
        if not TestSchool.school_id:
            pytest.skip("School not created")
        r = requests.delete(f"{BASE_URL}/api/entities/School/{TestSchool.school_id}", headers=admin_headers)
        assert r.status_code == 200
        # Verify deletion
        r2 = requests.get(f"{BASE_URL}/api/entities/School/{TestSchool.school_id}", headers=admin_headers)
        assert r2.status_code == 404
        print("Delete school OK")


# ── Invite flow tests ──────────────────────────────────────────────────────────
class TestInviteFlow:
    invite_token = None

    def test_send_invite(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/functions/sendInvite", json={
            "email": "testcoach@test.edu",
            "first_name": "Test",
            "last_name": "Coach",
            "invite_type": "staff",
            "coaching_role": "position_coach",
            "team_id": "team_test_001",
        }, headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["success"] == True
        assert "invite_token" in data
        TestInviteFlow.invite_token = data["invite_token"]
        print(f"sendInvite OK, token={TestInviteFlow.invite_token[:12]}...")

    def test_get_invite_by_token(self):
        if not TestInviteFlow.invite_token:
            pytest.skip("Invite not created")
        r = requests.get(f"{BASE_URL}/api/auth/invite/{TestInviteFlow.invite_token}")
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == "testcoach@test.edu"
        assert data["status"] == "pending"
        print("GET invite by token OK")

    def test_accept_invite(self):
        if not TestInviteFlow.invite_token:
            pytest.skip("Invite not created")
        r = requests.post(f"{BASE_URL}/api/auth/accept-invite", json={
            "invite_token": TestInviteFlow.invite_token,
            "password": "TestPass123!",
            "full_name": "Test Coach",
        })
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["user"]["email"] == "testcoach@test.edu"
        assert data["user"]["team_id"] == "team_test_001"
        print("Accept invite OK")

    def test_invite_token_used(self):
        """Accepted invite should no longer be pending."""
        if not TestInviteFlow.invite_token:
            pytest.skip("Invite not created")
        r = requests.get(f"{BASE_URL}/api/auth/invite/{TestInviteFlow.invite_token}")
        assert r.status_code == 404
        print("Used invite returns 404 OK")

    def test_get_team_users(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/functions/getTeamUsers", json={}, headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        emails = [u["email"] for u in data]
        assert "testcoach@test.edu" in emails
        print(f"getTeamUsers OK, found invited user")

    def test_cleanup_invited_user(self, admin_headers):
        """Cleanup test user created in accept-invite test."""
        r = requests.post(f"{BASE_URL}/api/functions/getTeamUsers", json={}, headers=admin_headers)
        users = r.json()
        for u in users:
            if u.get("email") == "testcoach@test.edu":
                uid = u["id"]
                requests.delete(f"{BASE_URL}/api/entities/User/{uid}", headers=admin_headers)
                print(f"Cleaned up user {uid}")
                break


# ── Master Teams / List teams ──────────────────────────────────────────────────
class TestFunctions:
    def test_list_master_teams(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/functions/listMasterTeams", json={}, headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "teams" in data
        print(f"listMasterTeams OK, count={len(data['teams'])}")

    def test_send_invite_missing_fields(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/functions/sendInvite",
                          json={"email": "x@x.com"},
                          headers=admin_headers)
        assert r.status_code == 400
        print("Missing fields returns 400 OK")


# ── Rate Limiting tests ────────────────────────────────────────────────────────
class TestRateLimiting:
    """Test login rate limiting - 5 failed attempts trigger 429"""

    def test_rate_limit_triggers_429(self):
        """Make 5 failed attempts then verify 6th is 429."""
        test_email = f"ratelimit_test_{uuid.uuid4().hex[:8]}@test.com"
        # Make 5 failed attempts
        for i in range(5):
            r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": test_email, "password": "wrongpass"})
            assert r.status_code == 401, f"Expected 401 on attempt {i+1}, got {r.status_code}"
        # 6th attempt should be 429
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": test_email, "password": "wrongpass"})
        assert r.status_code == 429, f"Expected 429 on 6th attempt, got {r.status_code}: {r.text}"
        print("Rate limiting 429 OK")

    def test_rate_limit_correct_password_still_429_when_locked(self):
        """Locked account with correct password still blocked (rate limit is pre-auth)."""
        test_email = f"ratelimit2_{uuid.uuid4().hex[:8]}@test.com"
        # Make 5 failed attempts
        for i in range(5):
            requests.post(f"{BASE_URL}/api/auth/login", json={"email": test_email, "password": "wrongpass"})
        # Same email but would be correct - still rate limited before checking password
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": test_email, "password": "anypass"})
        assert r.status_code == 429
        print("Rate limit blocks even with different password OK")


# ── Password Reset tests ───────────────────────────────────────────────────────
class TestPasswordReset:
    """Test forgot-password and reset-password flows"""
    reset_token = None

    def test_forgot_password_valid_email(self):
        """Should return success regardless of email existence."""
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": ADMIN_EMAIL})
        assert r.status_code == 200
        data = r.json()
        assert data["success"] == True
        assert "message" in data
        print("forgot-password valid email OK")

    def test_forgot_password_nonexistent_email(self):
        """Should return success (prevent enumeration)."""
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": "nobody@nowhere.com"})
        assert r.status_code == 200
        data = r.json()
        assert data["success"] == True
        print("forgot-password nonexistent email (anti-enumeration) OK")

    def test_forgot_password_missing_email(self):
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={})
        assert r.status_code == 400
        print("forgot-password missing email returns 400 OK")

    def test_reset_password_invalid_token(self):
        r = requests.post(f"{BASE_URL}/api/auth/reset-password", json={"token": "invalid_token_xyz", "password": "NewPass123!"})
        assert r.status_code == 400
        print("reset-password invalid token returns 400 OK")

    def test_reset_password_short_password(self):
        r = requests.post(f"{BASE_URL}/api/auth/reset-password", json={"token": "any_token", "password": "short"})
        assert r.status_code == 400
        print("reset-password short password returns 400 OK")

    def test_reset_password_missing_fields(self):
        r = requests.post(f"{BASE_URL}/api/auth/reset-password", json={})
        assert r.status_code == 400
        print("reset-password missing fields returns 400 OK")


# ── File Upload tests ──────────────────────────────────────────────────────────
class TestFileUpload:
    def test_upload_image(self, admin_headers):
        """Upload a PNG file and verify file_url is returned."""
        import io
        # Minimal 1x1 PNG
        png_data = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
            b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00'
            b'\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        )
        headers = {k: v for k, v in admin_headers.items() if k != "Content-Type"}
        r = requests.post(
            f"{BASE_URL}/api/upload",
            files={"file": ("test.png", io.BytesIO(png_data), "image/png")},
            headers=headers,
        )
        assert r.status_code == 200, f"Upload failed: {r.text}"
        data = r.json()
        assert "file_url" in data
        assert "filename" in data
        assert data["filename"].endswith(".png")
        print(f"File upload OK: {data['file_url']}")

    def test_upload_disallowed_file_type(self, admin_headers):
        import io
        headers = {k: v for k, v in admin_headers.items() if k != "Content-Type"}
        r = requests.post(
            f"{BASE_URL}/api/upload",
            files={"file": ("test.exe", io.BytesIO(b"fake exe"), "application/octet-stream")},
            headers=headers,
        )
        assert r.status_code == 400
        print("Disallowed file type returns 400 OK")

    def test_upload_requires_auth(self):
        import io
        r = requests.post(f"{BASE_URL}/api/upload", files={"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")})
        assert r.status_code == 401
        print("Upload without auth returns 401 OK")
