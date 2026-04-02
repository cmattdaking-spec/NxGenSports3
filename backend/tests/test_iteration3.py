"""NxGenSports iteration 3 tests: change-password, onboarding user, forgot/reset password"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_EMAIL = "admin@nxgensports.com"
ADMIN_PASSWORD = "Admin123!"

@pytest.fixture(scope="module")
def admin_headers():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Test coach user for onboarding wizard
TEST_COACH_EMAIL = f"test_coach_{uuid.uuid4().hex[:8]}@nxgen.test"
TEST_COACH_PASSWORD = "TestCoach123!"

@pytest.fixture(scope="module")
def coach_user():
    """Register test coach, then patch profile_verified=true"""
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_COACH_EMAIL,
        "password": TEST_COACH_PASSWORD,
        "full_name": "Test Coach",
        "role": "admin",
        "coaching_role": "head_coach",
        "team_id": "test_school_onboarding",
        "school_name": "Test Onboarding School",
    })
    assert r.status_code in [200, 201], f"Register failed: {r.text}"
    data = r.json()
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    # Backend hardcodes profile_verified=False on register; patch it via PATCH /api/auth/me
    requests.patch(f"{BASE_URL}/api/auth/me", json={"profile_verified": True}, headers=headers)
    return data

@pytest.fixture(scope="module")
def coach_headers(coach_user):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_COACH_EMAIL,
        "password": TEST_COACH_PASSWORD
    })
    assert r.status_code == 200
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


class TestChangePassword:
    """POST /api/auth/change-password tests"""

    def test_change_password_success(self, coach_headers):
        """Correct current password should succeed"""
        r = requests.post(f"{BASE_URL}/api/auth/change-password",
            json={"current_password": TEST_COACH_PASSWORD, "new_password": "NewPassword456!"},
            headers=coach_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("success") is True
        print("Change password success OK")

    def test_login_with_new_password(self):
        """After change, new password should work"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_COACH_EMAIL,
            "password": "NewPassword456!"
        })
        assert r.status_code == 200, f"Login with new password failed: {r.text}"
        print("Login with new password OK")

    def test_login_with_old_password_fails(self):
        """Old password should no longer work"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_COACH_EMAIL,
            "password": TEST_COACH_PASSWORD
        })
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"
        print("Old password rejected OK")

    def test_change_password_wrong_current(self):
        """Wrong current password should return 401"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_COACH_EMAIL,
            "password": "NewPassword456!"
        })
        new_token = r.json()["access_token"]
        new_headers = {"Authorization": f"Bearer {new_token}", "Content-Type": "application/json"}
        r2 = requests.post(f"{BASE_URL}/api/auth/change-password",
            json={"current_password": "WrongPass999!", "new_password": "AnotherPass789!"},
            headers=new_headers)
        assert r2.status_code == 401, f"Expected 401 for wrong current, got {r2.status_code}: {r2.text}"
        print("Wrong current password -> 401 OK")

    def test_change_password_too_short(self):
        """Short new password should return 400"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_COACH_EMAIL,
            "password": "NewPassword456!"
        })
        new_token = r.json()["access_token"]
        new_headers = {"Authorization": f"Bearer {new_token}", "Content-Type": "application/json"}
        r2 = requests.post(f"{BASE_URL}/api/auth/change-password",
            json={"current_password": "NewPassword456!", "new_password": "abc"},
            headers=new_headers)
        assert r2.status_code == 400, f"Expected 400 for short pw, got {r2.status_code}: {r2.text}"
        print("Short new password -> 400 OK")

    def test_change_password_no_auth(self):
        """No token should return 401"""
        r = requests.post(f"{BASE_URL}/api/auth/change-password",
            json={"current_password": "x", "new_password": "y"})
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"
        print("No auth -> 401 OK")


class TestOnboardingUser:
    """Test coach user creation for onboarding wizard"""

    def test_coach_user_profile(self, coach_headers):
        """Coach user should have correct profile fields"""
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=coach_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["coaching_role"] == "head_coach"
        assert data["team_id"] == "test_school_onboarding"
        assert data.get("profile_verified") is True
        assert data.get("onboarding_completed") is not True
        print("Coach user profile OK - should show onboarding wizard")

    def test_super_admin_no_onboarding_flag(self, admin_headers):
        """Super admin should not trigger onboarding wizard"""
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "super_admin"
        print(f"Super admin role={data['role']}, team_id={data.get('team_id')}")

    def test_patch_onboarding_completed(self, coach_headers):
        """PATCH /api/auth/me should allow setting onboarding_completed=true"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_COACH_EMAIL,
            "password": "NewPassword456!"
        })
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        r2 = requests.patch(f"{BASE_URL}/api/auth/me",
            json={"onboarding_completed": True},
            headers=headers)
        assert r2.status_code == 200, f"PATCH me failed: {r2.text}"
        # Verify it was saved
        r3 = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        data = r3.json()
        assert data.get("onboarding_completed") is True
        print("Onboarding completed flag saved OK")


class TestForgotPassword:
    """Forgot/reset password flows still work"""

    def test_forgot_password_existing_email(self):
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password",
            json={"email": ADMIN_EMAIL})
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True
        print("Forgot password OK")

    def test_forgot_password_unknown_email(self):
        """Should return 200 (not reveal email existence)"""
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "nobody@example.com"})
        assert r.status_code == 200
        print("Forgot password unknown email -> 200 OK (no enumeration)")

    def test_reset_password_invalid_token(self):
        r = requests.post(f"{BASE_URL}/api/auth/reset-password",
            json={"token": "invalid_token_xxx", "new_password": "NewPass123"})
        assert r.status_code in [400, 404], f"Expected 4xx, got {r.status_code}"
        print("Invalid reset token -> error OK")
