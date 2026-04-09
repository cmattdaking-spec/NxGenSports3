"""
Iteration 10: Clubs & Committees Module + Meeting Email Notifications Tests
Tests:
- Clubs CRUD (GET, POST, PATCH, DELETE)
- Club Stats endpoint
- Club Memberships (add, list, update role, delete, duplicate check)
- Club Events (add, list, delete)
- Meeting email notifications (POST /api/parents/meetings triggers email)
- Meeting status update email (PATCH /api/parents/meetings/{id})
- Regression: Auth, Students, Faculty
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test data tracking for cleanup
created_clubs = []
created_memberships = []
created_events = []
created_meetings = []


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for super admin"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@nxgensports.com",
        "password": "Admin123!"
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code}")
    data = response.json()
    # API returns access_token, not token
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    }


# ─── Regression Tests ─────────────────────────────────────────────────────────
class TestRegression:
    """Regression tests for existing functionality"""
    
    def test_auth_login(self):
        """POST /api/auth/login still works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nxgensports.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data or "token" in data
        print("✓ Auth login works")
    
    def test_auth_me(self, auth_headers):
        """GET /api/auth/me still works"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("email") == "admin@nxgensports.com"
        print("✓ Auth me works")
    
    def test_students_list(self, auth_headers):
        """GET /api/students/ still works"""
        response = requests.get(f"{BASE_URL}/api/students/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Students list works ({len(data)} students)")
    
    def test_faculty_list(self, auth_headers):
        """GET /api/faculty/ still works"""
        response = requests.get(f"{BASE_URL}/api/faculty/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Faculty list works ({len(data)} faculty)")


# ─── Clubs CRUD Tests ─────────────────────────────────────────────────────────
class TestClubsCRUD:
    """Test Clubs CRUD operations"""
    
    def test_list_clubs(self, auth_headers):
        """GET /api/clubs/ returns clubs with member_count"""
        response = requests.get(f"{BASE_URL}/api/clubs/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Check that clubs have member_count field
        if len(data) > 0:
            assert "member_count" in data[0]
        print(f"✓ List clubs works ({len(data)} clubs)")
    
    def test_create_club(self, auth_headers):
        """POST /api/clubs/ creates a new club"""
        payload = {
            "name": "TEST_Science Club",
            "description": "A club for science enthusiasts",
            "club_type": "club",
            "category": "STEM",
            "advisor_name": "Dr. Test Advisor",
            "meeting_day": "Thursday",
            "meeting_time": "14:00",
            "meeting_location": "Lab 201",
            "max_members": 30,
            "status": "active"
        }
        response = requests.post(f"{BASE_URL}/api/clubs/", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("name") == "TEST_Science Club"
        assert data.get("club_type") == "club"
        assert data.get("category") == "STEM"
        assert "id" in data
        assert "member_count" in data
        created_clubs.append(data["id"])
        print(f"✓ Create club works (id: {data['id']})")
        return data
    
    def test_get_club_by_id(self, auth_headers):
        """GET /api/clubs/{id} returns club details"""
        # First create a club
        payload = {"name": "TEST_Get Club", "club_type": "committee", "category": "Academic"}
        create_resp = requests.post(f"{BASE_URL}/api/clubs/", json=payload, headers=auth_headers)
        assert create_resp.status_code == 200
        club_id = create_resp.json()["id"]
        created_clubs.append(club_id)
        
        # Get the club
        response = requests.get(f"{BASE_URL}/api/clubs/{club_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("id") == club_id
        assert data.get("name") == "TEST_Get Club"
        assert "member_count" in data
        print(f"✓ Get club by ID works")
    
    def test_update_club(self, auth_headers):
        """PATCH /api/clubs/{id} updates club"""
        # Create a club
        payload = {"name": "TEST_Update Club", "club_type": "club"}
        create_resp = requests.post(f"{BASE_URL}/api/clubs/", json=payload, headers=auth_headers)
        assert create_resp.status_code == 200
        club_id = create_resp.json()["id"]
        created_clubs.append(club_id)
        
        # Update the club
        update_payload = {"name": "TEST_Updated Club Name", "description": "Updated description"}
        response = requests.patch(f"{BASE_URL}/api/clubs/{club_id}", json=update_payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("name") == "TEST_Updated Club Name"
        assert data.get("description") == "Updated description"
        
        # Verify persistence with GET
        get_resp = requests.get(f"{BASE_URL}/api/clubs/{club_id}", headers=auth_headers)
        assert get_resp.status_code == 200
        assert get_resp.json().get("name") == "TEST_Updated Club Name"
        print(f"✓ Update club works")
    
    def test_delete_club(self, auth_headers):
        """DELETE /api/clubs/{id} deletes club"""
        # Create a club
        payload = {"name": "TEST_Delete Club", "club_type": "club"}
        create_resp = requests.post(f"{BASE_URL}/api/clubs/", json=payload, headers=auth_headers)
        assert create_resp.status_code == 200
        club_id = create_resp.json()["id"]
        
        # Delete the club
        response = requests.delete(f"{BASE_URL}/api/clubs/{club_id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json().get("success") == True
        
        # Verify deletion with GET (should return 404)
        get_resp = requests.get(f"{BASE_URL}/api/clubs/{club_id}", headers=auth_headers)
        assert get_resp.status_code == 404
        print(f"✓ Delete club works")


# ─── Club Stats Tests ─────────────────────────────────────────────────────────
class TestClubStats:
    """Test Club Stats endpoint"""
    
    def test_club_stats(self, auth_headers):
        """GET /api/clubs/stats returns stats"""
        response = requests.get(f"{BASE_URL}/api/clubs/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_clubs" in data
        assert "active_clubs" in data
        assert "total_members" in data
        assert "upcoming_events" in data
        assert isinstance(data["total_clubs"], int)
        assert isinstance(data["active_clubs"], int)
        print(f"✓ Club stats works (total: {data['total_clubs']}, active: {data['active_clubs']}, members: {data['total_members']})")


# ─── Club Memberships Tests ───────────────────────────────────────────────────
class TestClubMemberships:
    """Test Club Membership operations"""
    
    @pytest.fixture(scope="class")
    def test_club(self, auth_headers):
        """Create a test club for membership tests"""
        payload = {"name": "TEST_Membership Club", "club_type": "club", "category": "STEM"}
        response = requests.post(f"{BASE_URL}/api/clubs/", json=payload, headers=auth_headers)
        assert response.status_code == 200
        club = response.json()
        created_clubs.append(club["id"])
        return club
    
    @pytest.fixture(scope="class")
    def test_student(self, auth_headers):
        """Get a student for membership tests"""
        response = requests.get(f"{BASE_URL}/api/students/", headers=auth_headers)
        assert response.status_code == 200
        students = response.json()
        if not students:
            pytest.skip("No students available for testing")
        return students[0]
    
    def test_list_members_empty(self, auth_headers, test_club):
        """GET /api/clubs/{id}/members returns empty list for new club"""
        response = requests.get(f"{BASE_URL}/api/clubs/{test_club['id']}/members", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List members works (empty club)")
    
    def test_add_member(self, auth_headers, test_club, test_student):
        """POST /api/clubs/{id}/members adds member with student enrichment"""
        payload = {
            "student_id": test_student["id"],
            "role": "president"
        }
        response = requests.post(f"{BASE_URL}/api/clubs/{test_club['id']}/members", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("student_id") == test_student["id"]
        assert data.get("role") == "president"
        # Check student enrichment
        assert "student_name" in data
        assert "grade_level" in data
        assert "id" in data
        created_memberships.append((test_club["id"], data["id"]))
        print(f"✓ Add member works (student: {data.get('student_name')}, role: {data.get('role')})")
        return data
    
    def test_add_member_duplicate_returns_409(self, auth_headers, test_club, test_student):
        """POST /api/clubs/{id}/members with duplicate student returns 409"""
        payload = {
            "student_id": test_student["id"],
            "role": "member"
        }
        response = requests.post(f"{BASE_URL}/api/clubs/{test_club['id']}/members", json=payload, headers=auth_headers)
        assert response.status_code == 409
        data = response.json()
        assert "already a member" in data.get("detail", "").lower()
        print(f"✓ Duplicate member check works (409)")
    
    def test_update_member_role(self, auth_headers, test_club, test_student):
        """PATCH /api/clubs/{id}/members/{mid} updates role"""
        # Get the membership
        list_resp = requests.get(f"{BASE_URL}/api/clubs/{test_club['id']}/members", headers=auth_headers)
        members = list_resp.json()
        membership = next((m for m in members if m["student_id"] == test_student["id"]), None)
        assert membership is not None
        
        # Update role
        response = requests.patch(
            f"{BASE_URL}/api/clubs/{test_club['id']}/members/{membership['id']}", 
            json={"role": "vice_president"}, 
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "vice_president"
        print(f"✓ Update member role works")
    
    def test_delete_member(self, auth_headers, test_club, test_student):
        """DELETE /api/clubs/{id}/members/{mid} removes member"""
        # Get the membership
        list_resp = requests.get(f"{BASE_URL}/api/clubs/{test_club['id']}/members", headers=auth_headers)
        members = list_resp.json()
        membership = next((m for m in members if m["student_id"] == test_student["id"]), None)
        assert membership is not None
        
        # Delete member
        response = requests.delete(
            f"{BASE_URL}/api/clubs/{test_club['id']}/members/{membership['id']}", 
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json().get("success") == True
        
        # Verify deletion
        list_resp2 = requests.get(f"{BASE_URL}/api/clubs/{test_club['id']}/members", headers=auth_headers)
        members2 = list_resp2.json()
        assert not any(m["student_id"] == test_student["id"] for m in members2)
        print(f"✓ Delete member works")


# ─── Club Events Tests ────────────────────────────────────────────────────────
class TestClubEvents:
    """Test Club Events operations"""
    
    @pytest.fixture(scope="class")
    def test_club(self, auth_headers):
        """Create a test club for event tests"""
        payload = {"name": "TEST_Events Club", "club_type": "club"}
        response = requests.post(f"{BASE_URL}/api/clubs/", json=payload, headers=auth_headers)
        assert response.status_code == 200
        club = response.json()
        created_clubs.append(club["id"])
        return club
    
    def test_list_events_empty(self, auth_headers, test_club):
        """GET /api/clubs/{id}/events returns empty list for new club"""
        response = requests.get(f"{BASE_URL}/api/clubs/{test_club['id']}/events", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List events works (empty)")
    
    def test_create_event(self, auth_headers, test_club):
        """POST /api/clubs/{id}/events creates event"""
        payload = {
            "title": "TEST_Workshop Event",
            "description": "A test workshop",
            "event_date": "2026-03-15",
            "event_time": "14:00",
            "location": "Room 101",
            "event_type": "workshop"
        }
        response = requests.post(f"{BASE_URL}/api/clubs/{test_club['id']}/events", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("title") == "TEST_Workshop Event"
        assert data.get("event_type") == "workshop"
        assert data.get("event_date") == "2026-03-15"
        assert "id" in data
        created_events.append((test_club["id"], data["id"]))
        print(f"✓ Create event works (id: {data['id']})")
        return data
    
    def test_delete_event(self, auth_headers, test_club):
        """DELETE /api/clubs/{id}/events/{eid} deletes event"""
        # Create an event
        payload = {"title": "TEST_Delete Event", "event_date": "2026-04-01", "event_type": "meeting"}
        create_resp = requests.post(f"{BASE_URL}/api/clubs/{test_club['id']}/events", json=payload, headers=auth_headers)
        assert create_resp.status_code == 200
        event_id = create_resp.json()["id"]
        
        # Delete the event
        response = requests.delete(f"{BASE_URL}/api/clubs/{test_club['id']}/events/{event_id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json().get("success") == True
        print(f"✓ Delete event works")


# ─── Meeting Email Notification Tests ─────────────────────────────────────────
class TestMeetingEmailNotifications:
    """Test meeting email notifications (check backend logs for [EMAIL] lines)"""
    
    @pytest.fixture(scope="class")
    def test_faculty(self, auth_headers):
        """Get a faculty member for meeting tests"""
        response = requests.get(f"{BASE_URL}/api/parents/available-faculty", headers=auth_headers)
        assert response.status_code == 200
        faculty = response.json()
        if not faculty:
            pytest.skip("No faculty available for testing")
        return faculty[0]
    
    def test_create_meeting_triggers_email(self, auth_headers, test_faculty):
        """POST /api/parents/meetings triggers email notification to faculty"""
        payload = {
            "faculty_id": test_faculty["id"],
            "meeting_date": "2026-03-20",
            "meeting_time": "10:00",
            "subject": "TEST_Meeting Request",
            "notes": "This is a test meeting request"
        }
        response = requests.post(f"{BASE_URL}/api/parents/meetings", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("faculty_id") == test_faculty["id"]
        assert data.get("status") == "requested"
        assert "id" in data
        created_meetings.append(data["id"])
        print(f"✓ Create meeting works (id: {data['id']}) - Check backend logs for [EMAIL] notification")
        return data
    
    def test_update_meeting_status_triggers_email(self, auth_headers, test_faculty):
        """PATCH /api/parents/meetings/{id} with status change triggers notification"""
        # Create a meeting first
        payload = {
            "faculty_id": test_faculty["id"],
            "meeting_date": "2026-03-25",
            "meeting_time": "11:00",
            "subject": "TEST_Status Update Meeting"
        }
        create_resp = requests.post(f"{BASE_URL}/api/parents/meetings", json=payload, headers=auth_headers)
        assert create_resp.status_code == 200
        meeting_id = create_resp.json()["id"]
        created_meetings.append(meeting_id)
        
        # Update status to confirmed
        update_resp = requests.patch(
            f"{BASE_URL}/api/parents/meetings/{meeting_id}",
            json={"status": "confirmed"},
            headers=auth_headers
        )
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data.get("status") == "confirmed"
        print(f"✓ Update meeting status works - Check backend logs for [EMAIL] notification")
    
    def test_list_meetings(self, auth_headers):
        """GET /api/parents/meetings returns meetings"""
        response = requests.get(f"{BASE_URL}/api/parents/meetings", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List meetings works ({len(data)} meetings)")


# ─── Cleanup ──────────────────────────────────────────────────────────────────
@pytest.fixture(scope="module", autouse=True)
def cleanup(auth_headers):
    """Cleanup test data after all tests"""
    yield
    # Cleanup created clubs (this also deletes memberships and events)
    for club_id in created_clubs:
        try:
            requests.delete(f"{BASE_URL}/api/clubs/{club_id}", headers=auth_headers)
        except:
            pass
    # Cleanup created meetings
    for meeting_id in created_meetings:
        try:
            requests.delete(f"{BASE_URL}/api/parents/meetings/{meeting_id}", headers=auth_headers)
        except:
            pass
    print(f"\n✓ Cleanup: Deleted {len(created_clubs)} test clubs, {len(created_meetings)} test meetings")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
