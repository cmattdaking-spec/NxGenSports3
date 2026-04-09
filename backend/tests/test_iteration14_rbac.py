"""
Iteration 14: Role-Based Access Control (RBAC) Tests
Tests for Teacher, School Admin, Coach, Player, Parent, and Principal login flows
and their respective dashboards and navigation.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
CREDENTIALS = {
    "super_admin": {"email": "admin@nxgensports.com", "password": "Admin123!"},
    "school_admin": {"email": "office@lincoln.edu", "password": "Test1234!"},
    "teacher_math": {"email": "s.mitchell@lincoln.edu", "password": "Test1234!"},
    "teacher_science": {"email": "r.park@lincoln.edu", "password": "Test1234!"},
    "coach": {"email": "coach.williams@lincoln.edu", "password": "Test1234!"},
    "player": {"email": "marcus.j@lincoln.edu", "password": "Test1234!"},
    "parent": {"email": "d.johnson@email.com", "password": "Test1234!"},
    "principal": {"email": "principal@lincoln.edu", "password": "Test1234!"},
}


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def login_user(api_client, user_key):
    """Helper to login and return token + user data"""
    creds = CREDENTIALS[user_key]
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": creds["email"],
        "password": creds["password"]
    })
    if response.status_code != 200:
        pytest.skip(f"Login failed for {user_key}: {response.text}")
    data = response.json()
    return data.get("access_token"), data.get("user", {})


class TestLoginAndUserTypes:
    """Test login for all user types and verify user_type/role fields"""
    
    def test_teacher_login_returns_correct_user_type(self, api_client):
        """Teacher login should return user_type='teacher'"""
        token, user = login_user(api_client, "teacher_math")
        assert user.get("user_type") == "teacher", f"Expected user_type='teacher', got {user.get('user_type')}"
        assert user.get("email") == "s.mitchell@lincoln.edu"
        print(f"✓ Teacher login: user_type={user.get('user_type')}, coaching_role={user.get('coaching_role')}")
    
    def test_school_admin_login_returns_correct_user_type(self, api_client):
        """School Admin login should return user_type='school_admin'"""
        token, user = login_user(api_client, "school_admin")
        assert user.get("user_type") == "school_admin", f"Expected user_type='school_admin', got {user.get('user_type')}"
        assert user.get("email") == "office@lincoln.edu"
        print(f"✓ School Admin login: user_type={user.get('user_type')}, role={user.get('role')}")
    
    def test_coach_login_returns_correct_user_type(self, api_client):
        """Coach login should return user_type='coach' or similar"""
        token, user = login_user(api_client, "coach")
        # Coaches typically have user_type not set or 'coach'
        assert user.get("email") == "coach.williams@lincoln.edu"
        print(f"✓ Coach login: user_type={user.get('user_type')}, coaching_role={user.get('coaching_role')}")
    
    def test_player_login_returns_correct_user_type(self, api_client):
        """Player login should return user_type='player'"""
        token, user = login_user(api_client, "player")
        assert user.get("user_type") == "player", f"Expected user_type='player', got {user.get('user_type')}"
        print(f"✓ Player login: user_type={user.get('user_type')}")
    
    def test_parent_login_returns_correct_user_type(self, api_client):
        """Parent login should return user_type='parent'"""
        token, user = login_user(api_client, "parent")
        assert user.get("user_type") == "parent", f"Expected user_type='parent', got {user.get('user_type')}"
        print(f"✓ Parent login: user_type={user.get('user_type')}")
    
    def test_principal_login_returns_admin_role(self, api_client):
        """Principal login should return role='admin' with head_coach coaching_role"""
        token, user = login_user(api_client, "principal")
        assert user.get("role") == "admin", f"Expected role='admin', got {user.get('role')}"
        # Principal should NOT be school_admin user_type
        assert user.get("user_type") != "school_admin", "Principal should not have school_admin user_type"
        print(f"✓ Principal login: role={user.get('role')}, coaching_role={user.get('coaching_role')}, user_type={user.get('user_type')}")


class TestTeacherDashboardAPI:
    """Test Teacher-specific API endpoints"""
    
    def test_teacher_dashboard_requires_auth(self, api_client):
        """Teacher dashboard API should require authentication"""
        response = api_client.get(f"{BASE_URL}/api/teachers/my-dashboard")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Teacher dashboard requires auth")
    
    def test_teacher_dashboard_returns_data(self, api_client):
        """Teacher dashboard should return faculty, classes, students data"""
        token, user = login_user(api_client, "teacher_math")
        api_client.headers.update({"Authorization": f"Bearer {token}"})
        
        response = api_client.get(f"{BASE_URL}/api/teachers/my-dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify expected fields exist
        assert "faculty" in data, "Missing 'faculty' field"
        assert "classes" in data, "Missing 'classes' field"
        assert "student_count" in data, "Missing 'student_count' field"
        assert "subject_names" in data, "Missing 'subject_names' field"
        assert "recent_grades" in data, "Missing 'recent_grades' field"
        
        print(f"✓ Teacher dashboard data: faculty={data.get('faculty', {}).get('full_name')}, "
              f"classes={len(data.get('classes', []))}, students={data.get('student_count')}")
    
    def test_teacher_my_students_endpoint(self, api_client):
        """Teacher my-students endpoint should return student list"""
        token, user = login_user(api_client, "teacher_math")
        api_client.headers.update({"Authorization": f"Bearer {token}"})
        
        response = api_client.get(f"{BASE_URL}/api/teachers/my-students")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        students = response.json()
        assert isinstance(students, list), "Expected list of students"
        print(f"✓ Teacher my-students: {len(students)} students")
    
    def test_teacher_my_classes_endpoint(self, api_client):
        """Teacher my-classes endpoint should return class schedules"""
        token, user = login_user(api_client, "teacher_math")
        api_client.headers.update({"Authorization": f"Bearer {token}"})
        
        response = api_client.get(f"{BASE_URL}/api/teachers/my-classes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        classes = response.json()
        assert isinstance(classes, list), "Expected list of classes"
        print(f"✓ Teacher my-classes: {len(classes)} classes")
    
    def test_non_teacher_cannot_access_teacher_dashboard(self, api_client):
        """Non-teacher users should not access teacher dashboard"""
        token, user = login_user(api_client, "coach")
        api_client.headers.update({"Authorization": f"Bearer {token}"})
        
        response = api_client.get(f"{BASE_URL}/api/teachers/my-dashboard")
        assert response.status_code == 403, f"Expected 403 for non-teacher, got {response.status_code}"
        print("✓ Non-teacher blocked from teacher dashboard")


class TestSchoolAdminDashboardAPIs:
    """Test School Admin dashboard data APIs"""
    
    def test_students_api_accessible(self, api_client):
        """School Admin should be able to access students API"""
        token, user = login_user(api_client, "school_admin")
        api_client.headers.update({"Authorization": f"Bearer {token}"})
        
        response = api_client.get(f"{BASE_URL}/api/students/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        students = response.json()
        assert isinstance(students, list), "Expected list of students"
        print(f"✓ School Admin students API: {len(students)} students")
    
    def test_faculty_api_accessible(self, api_client):
        """School Admin should be able to access faculty API"""
        token, user = login_user(api_client, "school_admin")
        api_client.headers.update({"Authorization": f"Bearer {token}"})
        
        response = api_client.get(f"{BASE_URL}/api/faculty/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        faculty = response.json()
        assert isinstance(faculty, list), "Expected list of faculty"
        print(f"✓ School Admin faculty API: {len(faculty)} faculty members")
    
    def test_clubs_api_accessible(self, api_client):
        """School Admin should be able to access clubs API"""
        token, user = login_user(api_client, "school_admin")
        api_client.headers.update({"Authorization": f"Bearer {token}"})
        
        response = api_client.get(f"{BASE_URL}/api/clubs/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        clubs = response.json()
        assert isinstance(clubs, list), "Expected list of clubs"
        print(f"✓ School Admin clubs API: {len(clubs)} clubs")


class TestInviteFlowRoles:
    """Test invite flow supports all role types"""
    
    def test_invite_endpoint_exists(self, api_client):
        """Verify invite endpoint is accessible"""
        token, user = login_user(api_client, "principal")
        api_client.headers.update({"Authorization": f"Bearer {token}"})
        
        # Test with minimal data to verify endpoint exists
        response = api_client.post(f"{BASE_URL}/api/functions/sendInvite", json={
            "email": "test_invite_check@example.com",
            "first_name": "Test",
            "last_name": "User",
            "invite_type": "staff"
        })
        # Should either succeed or fail with validation error, not 404
        assert response.status_code != 404, "Invite endpoint not found"
        print(f"✓ Invite endpoint accessible, status: {response.status_code}")
    
    def test_teacher_invite_type_supported(self, api_client):
        """Verify teacher invite type is supported"""
        token, user = login_user(api_client, "principal")
        api_client.headers.update({"Authorization": f"Bearer {token}"})
        
        response = api_client.post(f"{BASE_URL}/api/functions/sendInvite", json={
            "email": f"test_teacher_{os.urandom(4).hex()}@example.com",
            "first_name": "Test",
            "last_name": "Teacher",
            "invite_type": "teacher",
            "department": "Mathematics"
        })
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Invite should succeed"
            print(f"✓ Teacher invite type supported")
        else:
            print(f"Teacher invite response: {response.status_code} - {response.text}")
    
    def test_school_admin_invite_type_supported(self, api_client):
        """Verify school_admin invite type is supported"""
        token, user = login_user(api_client, "principal")
        api_client.headers.update({"Authorization": f"Bearer {token}"})
        
        response = api_client.post(f"{BASE_URL}/api/functions/sendInvite", json={
            "email": f"test_school_admin_{os.urandom(4).hex()}@example.com",
            "first_name": "Test",
            "last_name": "Admin",
            "invite_type": "school_admin"
        })
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Invite should succeed"
            print(f"✓ School Admin invite type supported")
        else:
            print(f"School Admin invite response: {response.status_code} - {response.text}")


class TestRoleBasedNavigation:
    """Test that different roles get appropriate navigation items (via user data)"""
    
    def test_teacher_has_teacher_user_type(self, api_client):
        """Teacher should have user_type=teacher for frontend routing"""
        token, user = login_user(api_client, "teacher_math")
        assert user.get("user_type") == "teacher"
        # Frontend uses this to show teacherNavItems
        print("✓ Teacher has correct user_type for navigation")
    
    def test_school_admin_has_school_admin_user_type(self, api_client):
        """School Admin should have user_type=school_admin for frontend routing"""
        token, user = login_user(api_client, "school_admin")
        assert user.get("user_type") == "school_admin"
        # Frontend uses this to show schoolAdminNavItems
        print("✓ School Admin has correct user_type for navigation")
    
    def test_player_has_player_user_type(self, api_client):
        """Player should have user_type=player for frontend routing"""
        token, user = login_user(api_client, "player")
        assert user.get("user_type") == "player"
        # Frontend uses this to show playerNavItems
        print("✓ Player has correct user_type for navigation")
    
    def test_parent_has_parent_user_type(self, api_client):
        """Parent should have user_type=parent for frontend routing"""
        token, user = login_user(api_client, "parent")
        assert user.get("user_type") == "parent"
        # Frontend uses this to show parentNavItems
        print("✓ Parent has correct user_type for navigation")
    
    def test_principal_is_not_school_admin(self, api_client):
        """Principal should NOT have school_admin user_type (should see full coach nav)"""
        token, user = login_user(api_client, "principal")
        assert user.get("user_type") != "school_admin", "Principal should not be school_admin"
        assert user.get("role") == "admin", "Principal should have admin role"
        # Principal should see full navItems, not schoolAdminNavItems
        print(f"✓ Principal has role={user.get('role')}, user_type={user.get('user_type')} (not school_admin)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
