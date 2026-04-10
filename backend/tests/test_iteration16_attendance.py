"""
Iteration 16: Bulk Attendance Feature Tests
Tests for:
- GET /api/teachers/attendance - Get students and attendance records for a date
- POST /api/teachers/attendance/bulk - Create/update attendance records in bulk
- RBAC: Non-teachers should get 403
- Regression: Teacher dashboard, gradebook, school admin views still work
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEACHER_MATH = {"email": "s.mitchell@lincoln.edu", "password": "Test1234!"}
TEACHER_SCIENCE = {"email": "r.park@lincoln.edu", "password": "Test1234!"}
COACH = {"email": "coach.williams@lincoln.edu", "password": "Test1234!"}
PLAYER = {"email": "marcus.j@lincoln.edu", "password": "Test1234!"}
SCHOOL_ADMIN = {"email": "office@lincoln.edu", "password": "Test1234!"}


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def teacher_token(api_client):
    """Get authentication token for Math teacher"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=TEACHER_MATH)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Teacher authentication failed")


@pytest.fixture(scope="module")
def science_teacher_token(api_client):
    """Get authentication token for Science teacher"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=TEACHER_SCIENCE)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Science teacher authentication failed")


@pytest.fixture(scope="module")
def coach_token(api_client):
    """Get authentication token for Coach"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=COACH)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Coach authentication failed")


@pytest.fixture(scope="module")
def player_token(api_client):
    """Get authentication token for Player"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=PLAYER)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Player authentication failed")


@pytest.fixture(scope="module")
def school_admin_token(api_client):
    """Get authentication token for School Admin"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=SCHOOL_ADMIN)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("School Admin authentication failed")


class TestAttendanceEndpoints:
    """Tests for the bulk attendance feature"""

    def test_get_attendance_returns_students_and_records(self, api_client, teacher_token):
        """GET /api/teachers/attendance returns students and any existing records for today"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = api_client.get(
            f"{BASE_URL}/api/teachers/attendance?date={today}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "date" in data, "Response should contain 'date' field"
        assert "students" in data, "Response should contain 'students' field"
        assert "records" in data, "Response should contain 'records' field"
        
        # Verify date matches
        assert data["date"] == today, f"Expected date {today}, got {data['date']}"
        
        # Verify students is a list
        assert isinstance(data["students"], list), "students should be a list"
        
        # Verify records is a dict (keyed by student_id)
        assert isinstance(data["records"], dict), "records should be a dict"
        
        print(f"✓ GET /api/teachers/attendance returned {len(data['students'])} students")

    def test_get_attendance_returns_8_students_for_math_teacher(self, api_client, teacher_token):
        """Math teacher should see 8 students"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = api_client.get(
            f"{BASE_URL}/api/teachers/attendance?date={today}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Math teacher should have 8 students
        assert len(data["students"]) == 8, f"Expected 8 students, got {len(data['students'])}"
        
        # Verify student data structure
        for student in data["students"]:
            assert "id" in student, "Student should have 'id'"
            assert "full_name" in student or ("first_name" in student and "last_name" in student), \
                "Student should have name fields"
        
        student_names = [s.get('full_name') or f"{s.get('first_name', '')} {s.get('last_name', '')}" for s in data['students']]
        print(f"✓ Math teacher sees 8 students: {student_names}")

    def test_get_attendance_with_different_date(self, api_client, teacher_token):
        """GET /api/teachers/attendance works with different dates"""
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        response = api_client.get(
            f"{BASE_URL}/api/teachers/attendance?date={yesterday}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["date"] == yesterday
        print(f"✓ GET /api/teachers/attendance works with date={yesterday}")

    def test_get_attendance_defaults_to_today(self, api_client, teacher_token):
        """GET /api/teachers/attendance defaults to today if no date provided"""
        response = api_client.get(
            f"{BASE_URL}/api/teachers/attendance",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        today = datetime.now().strftime("%Y-%m-%d")
        assert data["date"] == today, f"Expected default date {today}, got {data['date']}"
        print(f"✓ GET /api/teachers/attendance defaults to today ({today})")

    def test_bulk_attendance_creates_records(self, api_client, teacher_token):
        """POST /api/teachers/attendance/bulk creates attendance records"""
        # First get students
        today = datetime.now().strftime("%Y-%m-%d")
        get_response = api_client.get(
            f"{BASE_URL}/api/teachers/attendance?date={today}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert get_response.status_code == 200
        students = get_response.json()["students"]
        
        # Create bulk attendance entries
        entries = []
        for i, student in enumerate(students):
            # Vary statuses for testing
            if i % 4 == 0:
                status = "present"
            elif i % 4 == 1:
                status = "absent"
            elif i % 4 == 2:
                status = "late"
            else:
                status = "excused"
            entries.append({"student_id": student["id"], "status": status})
        
        # Submit bulk attendance
        response = api_client.post(
            f"{BASE_URL}/api/teachers/attendance/bulk",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"date": today, "entries": entries}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response
        assert data.get("success") == True, "Response should indicate success"
        assert "created" in data or "updated" in data, "Response should have created/updated counts"
        assert data.get("date") == today, f"Response date should be {today}"
        
        total_processed = data.get("created", 0) + data.get("updated", 0)
        assert total_processed == len(students), f"Expected {len(students)} records processed, got {total_processed}"
        
        print(f"✓ POST /api/teachers/attendance/bulk: created={data.get('created', 0)}, updated={data.get('updated', 0)}")

    def test_bulk_attendance_upsert_behavior(self, api_client, teacher_token):
        """POST /api/teachers/attendance/bulk updates existing records (upsert)"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Get students
        get_response = api_client.get(
            f"{BASE_URL}/api/teachers/attendance?date={today}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        students = get_response.json()["students"]
        
        # First submission - all present
        entries_present = [{"student_id": s["id"], "status": "present"} for s in students]
        response1 = api_client.post(
            f"{BASE_URL}/api/teachers/attendance/bulk",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"date": today, "entries": entries_present}
        )
        assert response1.status_code == 200
        
        # Second submission - all absent (should update, not create duplicates)
        entries_absent = [{"student_id": s["id"], "status": "absent"} for s in students]
        response2 = api_client.post(
            f"{BASE_URL}/api/teachers/attendance/bulk",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"date": today, "entries": entries_absent}
        )
        assert response2.status_code == 200
        data2 = response2.json()
        
        # All should be updates, not creates
        assert data2.get("updated", 0) == len(students), \
            f"Expected {len(students)} updates, got {data2.get('updated', 0)}"
        assert data2.get("created", 0) == 0, \
            f"Expected 0 creates (upsert), got {data2.get('created', 0)}"
        
        # Verify the records were actually updated
        verify_response = api_client.get(
            f"{BASE_URL}/api/teachers/attendance?date={today}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        records = verify_response.json()["records"]
        
        for student in students:
            record = records.get(student["id"])
            assert record is not None, f"Record should exist for student {student['id']}"
            assert record.get("status") == "absent", \
                f"Status should be 'absent' after update, got {record.get('status')}"
        
        print(f"✓ Upsert behavior verified: {data2.get('updated', 0)} records updated")

    def test_bulk_attendance_requires_entries(self, api_client, teacher_token):
        """POST /api/teachers/attendance/bulk requires entries list"""
        response = api_client.post(
            f"{BASE_URL}/api/teachers/attendance/bulk",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"date": datetime.now().strftime("%Y-%m-%d"), "entries": []}
        )
        
        assert response.status_code == 400, f"Expected 400 for empty entries, got {response.status_code}"
        print("✓ POST /api/teachers/attendance/bulk rejects empty entries")

    def test_bulk_attendance_defaults_to_today(self, api_client, teacher_token):
        """POST /api/teachers/attendance/bulk defaults to today if no date"""
        # Get students
        get_response = api_client.get(
            f"{BASE_URL}/api/teachers/attendance",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        students = get_response.json()["students"]
        
        # Submit without date
        entries = [{"student_id": students[0]["id"], "status": "present"}]
        response = api_client.post(
            f"{BASE_URL}/api/teachers/attendance/bulk",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"entries": entries}  # No date field
        )
        
        assert response.status_code == 200
        data = response.json()
        today = datetime.now().strftime("%Y-%m-%d")
        assert data.get("date") == today, f"Expected default date {today}, got {data.get('date')}"
        print(f"✓ POST /api/teachers/attendance/bulk defaults to today ({today})")


class TestAttendanceRBAC:
    """RBAC tests - non-teachers should get 403"""

    def test_coach_cannot_access_attendance(self, api_client, coach_token):
        """Coach should get 403 when accessing attendance endpoint"""
        response = api_client.get(
            f"{BASE_URL}/api/teachers/attendance",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403 for coach, got {response.status_code}"
        print("✓ Coach gets 403 from GET /api/teachers/attendance")

    def test_coach_cannot_submit_bulk_attendance(self, api_client, coach_token):
        """Coach should get 403 when submitting bulk attendance"""
        response = api_client.post(
            f"{BASE_URL}/api/teachers/attendance/bulk",
            headers={"Authorization": f"Bearer {coach_token}"},
            json={"entries": [{"student_id": "test", "status": "present"}]}
        )
        
        assert response.status_code == 403, f"Expected 403 for coach, got {response.status_code}"
        print("✓ Coach gets 403 from POST /api/teachers/attendance/bulk")

    def test_player_cannot_access_attendance(self, api_client, player_token):
        """Player should get 403 when accessing attendance endpoint"""
        response = api_client.get(
            f"{BASE_URL}/api/teachers/attendance",
            headers={"Authorization": f"Bearer {player_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403 for player, got {response.status_code}"
        print("✓ Player gets 403 from GET /api/teachers/attendance")

    def test_player_cannot_submit_bulk_attendance(self, api_client, player_token):
        """Player should get 403 when submitting bulk attendance"""
        response = api_client.post(
            f"{BASE_URL}/api/teachers/attendance/bulk",
            headers={"Authorization": f"Bearer {player_token}"},
            json={"entries": [{"student_id": "test", "status": "present"}]}
        )
        
        assert response.status_code == 403, f"Expected 403 for player, got {response.status_code}"
        print("✓ Player gets 403 from POST /api/teachers/attendance/bulk")

    def test_unauthenticated_cannot_access_attendance(self, api_client):
        """Unauthenticated request should get 401"""
        response = api_client.get(f"{BASE_URL}/api/teachers/attendance")
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
        print("✓ Unauthenticated gets 401 from GET /api/teachers/attendance")


class TestRegressionTeacherFeatures:
    """Regression tests - existing teacher features should still work"""

    def test_teacher_dashboard_still_works(self, api_client, teacher_token):
        """GET /api/teachers/my-dashboard should still work"""
        response = api_client.get(
            f"{BASE_URL}/api/teachers/my-dashboard",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify expected fields
        assert "faculty" in data, "Dashboard should have faculty info"
        assert "student_count" in data, "Dashboard should have student_count"
        assert "recent_grades" in data, "Dashboard should have recent_grades"
        
        print(f"✓ Teacher dashboard works: {data.get('student_count')} students")

    def test_teacher_students_still_works(self, api_client, teacher_token):
        """GET /api/teachers/my-students should still work"""
        response = api_client.get(
            f"{BASE_URL}/api/teachers/my-students",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "my-students should return a list"
        assert len(data) == 8, f"Expected 8 students, got {len(data)}"
        
        print(f"✓ Teacher my-students works: {len(data)} students")

    def test_teacher_gradebook_still_works(self, api_client, teacher_token):
        """GET /api/teachers/gradebook should still work"""
        response = api_client.get(
            f"{BASE_URL}/api/teachers/gradebook",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "students" in data, "Gradebook should have students"
        assert "grades" in data, "Gradebook should have grades"
        assert "subjects" in data, "Gradebook should have subjects"
        
        print(f"✓ Teacher gradebook works: {len(data['students'])} students, {len(data['grades'])} grades")


class TestRegressionSchoolAdmin:
    """Regression tests - school admin features should still work"""

    def test_school_admin_stats_still_works(self, api_client, school_admin_token):
        """GET /api/admin/stats should still work for school admin"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {school_admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify expected fields
        assert "total_students" in data or "students" in data, "Stats should have student count"
        
        print(f"✓ School admin stats endpoint works")


class TestAttendanceStatusVariations:
    """Test all attendance status options"""

    def test_all_status_options_work(self, api_client, teacher_token):
        """All status options (present, absent, late, excused) should work"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Get students
        get_response = api_client.get(
            f"{BASE_URL}/api/teachers/attendance?date={today}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        students = get_response.json()["students"]
        
        # Test each status
        statuses = ["present", "absent", "late", "excused"]
        for i, status in enumerate(statuses):
            if i < len(students):
                entries = [{"student_id": students[i]["id"], "status": status}]
                response = api_client.post(
                    f"{BASE_URL}/api/teachers/attendance/bulk",
                    headers={"Authorization": f"Bearer {teacher_token}"},
                    json={"date": today, "entries": entries}
                )
                assert response.status_code == 200, f"Status '{status}' failed: {response.text}"
        
        # Verify all statuses were saved
        verify_response = api_client.get(
            f"{BASE_URL}/api/teachers/attendance?date={today}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        records = verify_response.json()["records"]
        
        for i, status in enumerate(statuses):
            if i < len(students):
                record = records.get(students[i]["id"])
                assert record is not None, f"Record for status '{status}' not found"
                assert record.get("status") == status, \
                    f"Expected status '{status}', got '{record.get('status')}'"
        
        print(f"✓ All status options work: {statuses}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
