"""
Iteration 9: Parent Portal Tests
- Parent-Student Linking (link, duplicate check, list, unlink)
- Progress Report (student data, grades by semester, attendance, assignments, discipline)
- Available Faculty (list active faculty)
- Meetings CRUD (create, list, update status, delete)
- Regression: Auth login and existing endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication regression tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nxgensports.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nxgensports.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@nxgensports.com"
        print("✓ Login success test passed")
    
    def test_auth_me(self, auth_token):
        """Test GET /api/auth/me returns current user"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@nxgensports.com"
        print("✓ Auth me test passed")


class TestParentStudentLinking:
    """Parent-Student linking tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nxgensports.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_get_my_students(self, headers):
        """Test GET /api/parents/my-students returns linked students"""
        response = requests.get(f"{BASE_URL}/api/parents/my-students", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get my students passed - {len(data)} students linked")
        return data
    
    def test_link_student_by_code(self, headers):
        """Test POST /api/parents/link-student with student_code"""
        # First, try to link student with code STU001
        response = requests.post(f"{BASE_URL}/api/parents/link-student", 
            headers=headers,
            json={"student_code": "STU001"}
        )
        # Either 200 (success) or 409 (already linked) is acceptable
        assert response.status_code in [200, 409], f"Unexpected status: {response.status_code}, {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "student" in data
            print(f"✓ Link student by code passed - linked {data['student'].get('full_name')}")
        else:
            data = response.json()
            assert "already linked" in data.get("detail", "").lower()
            print("✓ Link student by code passed - student already linked (409)")
    
    def test_link_student_duplicate_returns_409(self, headers):
        """Test POST /api/parents/link-student duplicate returns 409"""
        # Try to link the same student again
        response = requests.post(f"{BASE_URL}/api/parents/link-student",
            headers=headers,
            json={"student_code": "STU001"}
        )
        assert response.status_code == 409, f"Expected 409, got {response.status_code}"
        data = response.json()
        assert "already linked" in data.get("detail", "").lower()
        print("✓ Duplicate link returns 409 test passed")
    
    def test_link_student_invalid_code_returns_404(self, headers):
        """Test POST /api/parents/link-student with invalid code returns 404"""
        response = requests.post(f"{BASE_URL}/api/parents/link-student",
            headers=headers,
            json={"student_code": "INVALID_CODE_XYZ"}
        )
        assert response.status_code == 404
        data = response.json()
        # Check for various "not found" messages
        detail = data.get("detail", "").lower()
        assert "no student found" in detail or "not found" in detail
        print("✓ Invalid student code returns 404 test passed")
    
    def test_link_student_missing_params_returns_400(self, headers):
        """Test POST /api/parents/link-student without params returns 400"""
        response = requests.post(f"{BASE_URL}/api/parents/link-student",
            headers=headers,
            json={}
        )
        assert response.status_code == 400
        print("✓ Missing params returns 400 test passed")


class TestProgressReport:
    """Progress report tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nxgensports.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def student_id(self, headers):
        """Get a linked student ID for testing"""
        response = requests.get(f"{BASE_URL}/api/parents/my-students", headers=headers)
        students = response.json()
        if students:
            return students[0]["id"]
        # Fallback: get from students endpoint
        response = requests.get(f"{BASE_URL}/api/students", headers=headers)
        students = response.json()
        if students:
            return students[0]["id"]
        pytest.skip("No students available for testing")
    
    def test_progress_report_returns_student_data(self, headers, student_id):
        """Test GET /api/parents/progress/{student_id} returns student data"""
        response = requests.get(f"{BASE_URL}/api/parents/progress/{student_id}", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify student data
        assert "student" in data
        assert "full_name" in data["student"]
        print(f"✓ Progress report student data passed - {data['student'].get('full_name')}")
    
    def test_progress_report_returns_semesters(self, headers, student_id):
        """Test progress report includes semesters with grades"""
        response = requests.get(f"{BASE_URL}/api/parents/progress/{student_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "semesters" in data
        assert isinstance(data["semesters"], list)
        print(f"✓ Progress report semesters passed - {len(data['semesters'])} semesters")
        
        # If semesters exist, verify structure
        if data["semesters"]:
            sem = data["semesters"][0]
            assert "semester" in sem
            assert "grades" in sem
            assert "semester_gpa" in sem
            print(f"  - First semester: {sem['semester']}, GPA: {sem.get('semester_gpa')}")
    
    def test_progress_report_returns_attendance(self, headers, student_id):
        """Test progress report includes attendance stats"""
        response = requests.get(f"{BASE_URL}/api/parents/progress/{student_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "attendance" in data
        att = data["attendance"]
        assert "total" in att
        assert "present" in att
        assert "absent" in att
        assert "tardy" in att
        assert "excused" in att
        assert "rate" in att
        assert "recent" in att
        print(f"✓ Progress report attendance passed - rate: {att.get('rate')}%, total: {att.get('total')}")
    
    def test_progress_report_returns_assignments(self, headers, student_id):
        """Test progress report includes assignments stats"""
        response = requests.get(f"{BASE_URL}/api/parents/progress/{student_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "assignments" in data
        asgn = data["assignments"]
        assert "total" in asgn
        assert "completed" in asgn
        assert "missing" in asgn
        assert "recent" in asgn
        print(f"✓ Progress report assignments passed - {asgn.get('completed')}/{asgn.get('total')} completed")
    
    def test_progress_report_returns_discipline(self, headers, student_id):
        """Test progress report includes discipline stats"""
        response = requests.get(f"{BASE_URL}/api/parents/progress/{student_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "discipline" in data
        disc = data["discipline"]
        assert "total" in disc
        assert "unresolved" in disc
        assert "recent" in disc
        print(f"✓ Progress report discipline passed - {disc.get('total')} records, {disc.get('unresolved')} unresolved")
    
    def test_progress_report_invalid_student_returns_404(self, headers):
        """Test progress report with invalid student ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/parents/progress/000000000000000000000000", headers=headers)
        assert response.status_code == 404
        print("✓ Invalid student ID returns 404 test passed")


class TestAvailableFaculty:
    """Available faculty tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nxgensports.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_available_faculty_returns_list(self, headers):
        """Test GET /api/parents/available-faculty returns faculty list"""
        response = requests.get(f"{BASE_URL}/api/parents/available-faculty", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Available faculty list passed - {len(data)} faculty members")
    
    def test_available_faculty_has_required_fields(self, headers):
        """Test faculty list includes required fields"""
        response = requests.get(f"{BASE_URL}/api/parents/available-faculty", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        if data:
            faculty = data[0]
            assert "id" in faculty
            assert "full_name" in faculty
            assert "position" in faculty
            assert "department" in faculty
            print(f"✓ Faculty fields passed - first: {faculty.get('full_name')}, {faculty.get('position')}")
        else:
            print("✓ Faculty fields passed - no faculty to verify (empty list)")


class TestMeetingsCRUD:
    """Meetings CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nxgensports.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def faculty_id(self, headers):
        """Get a faculty ID for testing"""
        response = requests.get(f"{BASE_URL}/api/parents/available-faculty", headers=headers)
        faculty = response.json()
        if faculty:
            return faculty[0]["id"]
        pytest.skip("No faculty available for testing")
    
    @pytest.fixture(scope="class")
    def student_id(self, headers):
        """Get a student ID for testing"""
        response = requests.get(f"{BASE_URL}/api/parents/my-students", headers=headers)
        students = response.json()
        if students:
            return students[0]["id"]
        return None  # Optional field
    
    def test_list_meetings(self, headers):
        """Test GET /api/parents/meetings returns meetings list"""
        response = requests.get(f"{BASE_URL}/api/parents/meetings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List meetings passed - {len(data)} meetings")
    
    def test_create_meeting(self, headers, faculty_id, student_id):
        """Test POST /api/parents/meetings creates meeting"""
        payload = {
            "faculty_id": faculty_id,
            "student_id": student_id,
            "meeting_date": "2026-03-01",
            "meeting_time": "14:00",
            "subject": "TEST_Academic Progress Review",
            "notes": "TEST meeting for iteration 9"
        }
        response = requests.post(f"{BASE_URL}/api/parents/meetings", headers=headers, json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data.get("status") == "requested"
        assert data.get("meeting_date") == "2026-03-01"
        assert "faculty_name" in data  # Should be enriched
        print(f"✓ Create meeting passed - ID: {data['id']}, faculty: {data.get('faculty_name')}")
        return data["id"]
    
    def test_create_meeting_missing_fields_returns_400(self, headers):
        """Test POST /api/parents/meetings without required fields returns 400"""
        response = requests.post(f"{BASE_URL}/api/parents/meetings", headers=headers, json={
            "subject": "Test"
        })
        assert response.status_code == 400
        print("✓ Create meeting missing fields returns 400 test passed")
    
    def test_update_meeting_status(self, headers, faculty_id, student_id):
        """Test PATCH /api/parents/meetings/{id} updates status"""
        # First create a meeting
        create_response = requests.post(f"{BASE_URL}/api/parents/meetings", headers=headers, json={
            "faculty_id": faculty_id,
            "meeting_date": "2026-03-02",
            "subject": "TEST_Status Update Test"
        })
        assert create_response.status_code == 200
        meeting_id = create_response.json()["id"]
        
        # Update status to confirmed
        update_response = requests.patch(f"{BASE_URL}/api/parents/meetings/{meeting_id}", 
            headers=headers,
            json={"status": "confirmed"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data.get("status") == "confirmed"
        print(f"✓ Update meeting status to confirmed passed")
        
        # Update status to completed
        update_response = requests.patch(f"{BASE_URL}/api/parents/meetings/{meeting_id}",
            headers=headers,
            json={"status": "completed"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data.get("status") == "completed"
        print(f"✓ Update meeting status to completed passed")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/parents/meetings/{meeting_id}", headers=headers)
    
    def test_delete_meeting(self, headers, faculty_id):
        """Test DELETE /api/parents/meetings/{id} deletes meeting"""
        # Create a meeting to delete
        create_response = requests.post(f"{BASE_URL}/api/parents/meetings", headers=headers, json={
            "faculty_id": faculty_id,
            "meeting_date": "2026-03-03",
            "subject": "TEST_Delete Test"
        })
        assert create_response.status_code == 200
        meeting_id = create_response.json()["id"]
        
        # Delete the meeting
        delete_response = requests.delete(f"{BASE_URL}/api/parents/meetings/{meeting_id}", headers=headers)
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert data.get("success") == True
        print(f"✓ Delete meeting passed")
        
        # Verify it's deleted by checking list
        list_response = requests.get(f"{BASE_URL}/api/parents/meetings", headers=headers)
        meetings = list_response.json()
        meeting_ids = [m["id"] for m in meetings]
        assert meeting_id not in meeting_ids
        print(f"✓ Meeting deletion verified")


class TestRegressionStudentsFaculty:
    """Regression tests for existing Student and Faculty endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nxgensports.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_students_list(self, headers):
        """Test GET /api/students/ still works"""
        response = requests.get(f"{BASE_URL}/api/students/", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Students list regression passed - {len(data)} students")
    
    def test_faculty_list(self, headers):
        """Test GET /api/faculty/ still works"""
        response = requests.get(f"{BASE_URL}/api/faculty/", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Faculty list regression passed - {len(data)} faculty")
    
    def test_faculty_stats(self, headers):
        """Test GET /api/faculty/stats still works"""
        response = requests.get(f"{BASE_URL}/api/faculty/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Stats may have different field names
        assert "total_faculty" in data or "active_faculty" in data
        print(f"✓ Faculty stats regression passed - {data}")


class TestCleanup:
    """Cleanup test data created during testing"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nxgensports.com",
            "password": "Admin123!"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_cleanup_test_meetings(self, headers):
        """Clean up TEST_ prefixed meetings"""
        response = requests.get(f"{BASE_URL}/api/parents/meetings", headers=headers)
        meetings = response.json()
        
        deleted = 0
        for meeting in meetings:
            if meeting.get("subject", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/parents/meetings/{meeting['id']}", headers=headers)
                deleted += 1
        
        print(f"✓ Cleanup completed - deleted {deleted} test meetings")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
