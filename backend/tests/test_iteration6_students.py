"""
Iteration 6: Backend Refactoring & Student Records Module Tests
Tests:
- Health endpoint (verifies backend is running after refactoring)
- Auth endpoints (login, register, me, change-password)
- Entity CRUD (basic entity operations)
- Student Records CRUD (create, read, update, delete students)
- Student Grades (add, list, delete, GPA recalculation)
- Student Attendance (add, list, delete)
- Student Assignments (add, list, update, delete)
- Student Discipline (add, list, delete)
- Student Transcript (get transcript with semester grouping)
- Student Stats (get aggregated stats)
- Bulk Attendance (add multiple attendance records at once)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@nxgensports.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def auth_token():
    """Get admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Auth headers for authenticated requests"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ─── Health & Basic Endpoints ─────────────────────────────────────────────────
class TestHealthAndBasics:
    """Test health endpoint and basic backend functionality after refactoring"""
    
    def test_health_endpoint(self):
        """Health endpoint should return ok status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ Health endpoint working")
    
    def test_vapid_public_key(self):
        """VAPID public key endpoint should work"""
        response = requests.get(f"{BASE_URL}/api/push/vapid-public-key")
        assert response.status_code == 200
        data = response.json()
        assert "publicKey" in data  # Note: camelCase key
        print("✓ VAPID public key endpoint working")


# ─── Auth Endpoints ───────────────────────────────────────────────────────────
class TestAuthEndpoints:
    """Test auth endpoints after refactoring to routers/auth.py"""
    
    def test_login_success(self):
        """Login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print("✓ Login success")
    
    def test_login_invalid_credentials(self):
        """Login with invalid credentials should fail"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@email.com", "password": "wrongpass"}
        )
        assert response.status_code == 401
        print("✓ Login invalid credentials rejected")
    
    def test_get_me(self, auth_headers):
        """Get current user profile"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "super_admin"
        print("✓ GET /api/auth/me working")
    
    def test_get_me_unauthorized(self):
        """Get me without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ GET /api/auth/me requires auth")
    
    def test_register_duplicate_email(self):
        """Register with existing email should fail"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": ADMIN_EMAIL, "password": "Test123!"}
        )
        assert response.status_code == 409
        print("✓ Register duplicate email rejected")


# ─── Entity CRUD ──────────────────────────────────────────────────────────────
class TestEntityCRUD:
    """Test entity CRUD endpoints after refactoring to routers/entities.py"""
    
    def test_list_users(self, auth_headers):
        """List users entity"""
        response = requests.get(f"{BASE_URL}/api/entities/User", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List users: {len(data)} users found")
    
    def test_list_teams(self, auth_headers):
        """List teams entity"""
        response = requests.get(f"{BASE_URL}/api/entities/Team", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List teams: {len(data)} teams found")


# ─── Student Records CRUD ─────────────────────────────────────────────────────
class TestStudentCRUD:
    """Test Student Records CRUD operations"""
    
    def test_list_students(self, auth_headers):
        """List all students"""
        response = requests.get(f"{BASE_URL}/api/students/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List students: {len(data)} students found")
    
    def test_create_student(self, auth_headers):
        """Create a new student"""
        student_data = {
            "first_name": "TEST_Jane",
            "last_name": "Doe",
            "student_id": "TEST_STU002",
            "email": "test_jane.doe@school.com",
            "grade_level": "11",
            "gender": "Female",
            "guardian_name": "John Doe",
            "guardian_phone": "555-0102",
            "status": "active"
        }
        response = requests.post(
            f"{BASE_URL}/api/students/",
            headers=auth_headers,
            json=student_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "TEST_Jane"
        assert data["last_name"] == "Doe"
        assert data["full_name"] == "TEST_Jane Doe"
        assert data["student_id"] == "TEST_STU002"
        assert "id" in data
        print(f"✓ Created student: {data['id']}")
        return data["id"]
    
    def test_get_student(self, auth_headers):
        """Get a specific student"""
        # First list to get an existing student
        list_response = requests.get(f"{BASE_URL}/api/students/", headers=auth_headers)
        students = list_response.json()
        if not students:
            pytest.skip("No students to test")
        
        student_id = students[0]["id"]
        response = requests.get(f"{BASE_URL}/api/students/{student_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == student_id
        print(f"✓ Get student: {data['full_name']}")
    
    def test_update_student(self, auth_headers):
        """Update a student"""
        # Create a test student first
        create_response = requests.post(
            f"{BASE_URL}/api/students/",
            headers=auth_headers,
            json={"first_name": "TEST_Update", "last_name": "Student", "student_id": "TEST_UPD001"}
        )
        student_id = create_response.json()["id"]
        
        # Update the student
        update_response = requests.patch(
            f"{BASE_URL}/api/students/{student_id}",
            headers=auth_headers,
            json={"first_name": "TEST_Updated", "grade_level": "12"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["first_name"] == "TEST_Updated"
        assert data["full_name"] == "TEST_Updated Student"
        assert data["grade_level"] == "12"
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/students/{student_id}", headers=auth_headers)
        assert get_response.json()["first_name"] == "TEST_Updated"
        print(f"✓ Updated student: {student_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/students/{student_id}", headers=auth_headers)
    
    def test_delete_student(self, auth_headers):
        """Delete a student"""
        # Create a test student
        create_response = requests.post(
            f"{BASE_URL}/api/students/",
            headers=auth_headers,
            json={"first_name": "TEST_Delete", "last_name": "Me", "student_id": "TEST_DEL001"}
        )
        student_id = create_response.json()["id"]
        
        # Delete the student
        delete_response = requests.delete(f"{BASE_URL}/api/students/{student_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        assert delete_response.json()["success"] == True
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/students/{student_id}", headers=auth_headers)
        assert get_response.status_code == 404
        print(f"✓ Deleted student: {student_id}")


# ─── Student Grades ───────────────────────────────────────────────────────────
class TestStudentGrades:
    """Test Student Grades endpoints with GPA recalculation"""
    
    @pytest.fixture
    def test_student(self, auth_headers):
        """Create a test student for grade tests"""
        response = requests.post(
            f"{BASE_URL}/api/students/",
            headers=auth_headers,
            json={"first_name": "TEST_Grade", "last_name": "Student", "student_id": "TEST_GRD001"}
        )
        student = response.json()
        yield student
        # Cleanup
        requests.delete(f"{BASE_URL}/api/students/{student['id']}", headers=auth_headers)
    
    def test_list_grades(self, auth_headers, test_student):
        """List grades for a student"""
        response = requests.get(
            f"{BASE_URL}/api/students/{test_student['id']}/grades",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ List grades working")
    
    def test_add_grade_and_gpa_calculation(self, auth_headers, test_student):
        """Add a grade and verify GPA is calculated"""
        student_id = test_student["id"]
        
        # Add first grade (A = 4.0)
        grade1 = requests.post(
            f"{BASE_URL}/api/students/{student_id}/grades",
            headers=auth_headers,
            json={
                "course_name": "Math",
                "course_code": "MATH101",
                "semester": "Fall 2025",
                "grade_letter": "A",
                "credit_hours": 3
            }
        )
        assert grade1.status_code == 200
        grade1_data = grade1.json()
        assert grade1_data["course_name"] == "Math"
        assert grade1_data["grade_letter"] == "A"
        
        # Check GPA updated on student
        student_response = requests.get(f"{BASE_URL}/api/students/{student_id}", headers=auth_headers)
        student_data = student_response.json()
        assert student_data["gpa"] == 4.0
        print(f"✓ Added grade A, GPA: {student_data['gpa']}")
        
        # Add second grade (B = 3.0)
        grade2 = requests.post(
            f"{BASE_URL}/api/students/{student_id}/grades",
            headers=auth_headers,
            json={
                "course_name": "English",
                "course_code": "ENG101",
                "semester": "Fall 2025",
                "grade_letter": "B",
                "credit_hours": 3
            }
        )
        assert grade2.status_code == 200
        
        # Check GPA recalculated: (4.0*3 + 3.0*3) / 6 = 3.5
        student_response = requests.get(f"{BASE_URL}/api/students/{student_id}", headers=auth_headers)
        student_data = student_response.json()
        assert student_data["gpa"] == 3.5
        print(f"✓ Added grade B, GPA recalculated: {student_data['gpa']}")
        
        return grade1_data["id"]
    
    def test_delete_grade_recalculates_gpa(self, auth_headers, test_student):
        """Delete a grade and verify GPA is recalculated"""
        student_id = test_student["id"]
        
        # Add two grades
        grade1 = requests.post(
            f"{BASE_URL}/api/students/{student_id}/grades",
            headers=auth_headers,
            json={"course_name": "Science", "grade_letter": "A", "credit_hours": 3, "semester": "Fall 2025"}
        ).json()
        
        grade2 = requests.post(
            f"{BASE_URL}/api/students/{student_id}/grades",
            headers=auth_headers,
            json={"course_name": "History", "grade_letter": "C", "credit_hours": 3, "semester": "Fall 2025"}
        ).json()
        
        # GPA should be (4.0*3 + 2.0*3) / 6 = 3.0
        student = requests.get(f"{BASE_URL}/api/students/{student_id}", headers=auth_headers).json()
        assert student["gpa"] == 3.0
        
        # Delete the C grade
        delete_response = requests.delete(
            f"{BASE_URL}/api/students/{student_id}/grades/{grade2['id']}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        
        # GPA should now be 4.0 (only A grade remains)
        student = requests.get(f"{BASE_URL}/api/students/{student_id}", headers=auth_headers).json()
        assert student["gpa"] == 4.0
        print(f"✓ Deleted grade, GPA recalculated: {student['gpa']}")


# ─── Student Attendance ───────────────────────────────────────────────────────
class TestStudentAttendance:
    """Test Student Attendance endpoints"""
    
    @pytest.fixture
    def test_student(self, auth_headers):
        """Create a test student for attendance tests"""
        response = requests.post(
            f"{BASE_URL}/api/students/",
            headers=auth_headers,
            json={"first_name": "TEST_Attend", "last_name": "Student", "student_id": "TEST_ATT001"}
        )
        student = response.json()
        yield student
        requests.delete(f"{BASE_URL}/api/students/{student['id']}", headers=auth_headers)
    
    def test_add_attendance(self, auth_headers, test_student):
        """Add attendance record"""
        response = requests.post(
            f"{BASE_URL}/api/students/{test_student['id']}/attendance",
            headers=auth_headers,
            json={"date": "2026-01-15", "status": "present", "notes": "On time"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "present"
        assert data["date"] == "2026-01-15"
        print(f"✓ Added attendance record: {data['id']}")
        return data["id"]
    
    def test_list_attendance(self, auth_headers, test_student):
        """List attendance records"""
        # Add a record first
        requests.post(
            f"{BASE_URL}/api/students/{test_student['id']}/attendance",
            headers=auth_headers,
            json={"date": "2026-01-16", "status": "absent"}
        )
        
        response = requests.get(
            f"{BASE_URL}/api/students/{test_student['id']}/attendance",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"✓ Listed {len(data)} attendance records")
    
    def test_delete_attendance(self, auth_headers, test_student):
        """Delete attendance record"""
        # Add a record
        add_response = requests.post(
            f"{BASE_URL}/api/students/{test_student['id']}/attendance",
            headers=auth_headers,
            json={"date": "2026-01-17", "status": "tardy"}
        )
        record_id = add_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/students/{test_student['id']}/attendance/{record_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        print(f"✓ Deleted attendance record: {record_id}")


# ─── Student Assignments ──────────────────────────────────────────────────────
class TestStudentAssignments:
    """Test Student Assignments endpoints"""
    
    @pytest.fixture
    def test_student(self, auth_headers):
        """Create a test student for assignment tests"""
        response = requests.post(
            f"{BASE_URL}/api/students/",
            headers=auth_headers,
            json={"first_name": "TEST_Assign", "last_name": "Student", "student_id": "TEST_ASN001"}
        )
        student = response.json()
        yield student
        requests.delete(f"{BASE_URL}/api/students/{student['id']}", headers=auth_headers)
    
    def test_add_assignment(self, auth_headers, test_student):
        """Add assignment"""
        response = requests.post(
            f"{BASE_URL}/api/students/{test_student['id']}/assignments",
            headers=auth_headers,
            json={
                "title": "Math Homework",
                "course_name": "Math",
                "due_date": "2026-01-20",
                "status": "pending",
                "max_grade": 100
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Math Homework"
        assert data["status"] == "pending"
        print(f"✓ Added assignment: {data['id']}")
        return data["id"]
    
    def test_update_assignment(self, auth_headers, test_student):
        """Update assignment status"""
        # Add assignment
        add_response = requests.post(
            f"{BASE_URL}/api/students/{test_student['id']}/assignments",
            headers=auth_headers,
            json={"title": "Essay", "status": "pending"}
        )
        assignment_id = add_response.json()["id"]
        
        # Update to submitted
        update_response = requests.patch(
            f"{BASE_URL}/api/students/{test_student['id']}/assignments/{assignment_id}",
            headers=auth_headers,
            json={"status": "submitted", "grade": 95}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["status"] == "submitted"
        assert data["grade"] == 95
        print(f"✓ Updated assignment: {assignment_id}")
    
    def test_delete_assignment(self, auth_headers, test_student):
        """Delete assignment"""
        # Add assignment
        add_response = requests.post(
            f"{BASE_URL}/api/students/{test_student['id']}/assignments",
            headers=auth_headers,
            json={"title": "Delete Me"}
        )
        assignment_id = add_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/students/{test_student['id']}/assignments/{assignment_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        print(f"✓ Deleted assignment: {assignment_id}")


# ─── Student Discipline ───────────────────────────────────────────────────────
class TestStudentDiscipline:
    """Test Student Discipline endpoints"""
    
    @pytest.fixture
    def test_student(self, auth_headers):
        """Create a test student for discipline tests"""
        response = requests.post(
            f"{BASE_URL}/api/students/",
            headers=auth_headers,
            json={"first_name": "TEST_Disc", "last_name": "Student", "student_id": "TEST_DSC001"}
        )
        student = response.json()
        yield student
        requests.delete(f"{BASE_URL}/api/students/{student['id']}", headers=auth_headers)
    
    def test_add_discipline(self, auth_headers, test_student):
        """Add discipline record"""
        response = requests.post(
            f"{BASE_URL}/api/students/{test_student['id']}/discipline",
            headers=auth_headers,
            json={
                "incident_date": "2026-01-15",
                "incident_type": "warning",
                "description": "Late to class",
                "action_taken": "Verbal warning"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["incident_type"] == "warning"
        assert data["description"] == "Late to class"
        print(f"✓ Added discipline record: {data['id']}")
    
    def test_list_discipline(self, auth_headers, test_student):
        """List discipline records"""
        # Add a record
        requests.post(
            f"{BASE_URL}/api/students/{test_student['id']}/discipline",
            headers=auth_headers,
            json={"incident_type": "detention", "description": "Test incident"}
        )
        
        response = requests.get(
            f"{BASE_URL}/api/students/{test_student['id']}/discipline",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} discipline records")
    
    def test_delete_discipline(self, auth_headers, test_student):
        """Delete discipline record"""
        # Add record
        add_response = requests.post(
            f"{BASE_URL}/api/students/{test_student['id']}/discipline",
            headers=auth_headers,
            json={"incident_type": "warning", "description": "Delete me"}
        )
        record_id = add_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/students/{test_student['id']}/discipline/{record_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        print(f"✓ Deleted discipline record: {record_id}")


# ─── Student Transcript ───────────────────────────────────────────────────────
class TestStudentTranscript:
    """Test Student Transcript endpoint"""
    
    @pytest.fixture
    def test_student_with_grades(self, auth_headers):
        """Create a test student with grades for transcript"""
        # Create student
        student = requests.post(
            f"{BASE_URL}/api/students/",
            headers=auth_headers,
            json={"first_name": "TEST_Trans", "last_name": "Student", "student_id": "TEST_TRN001"}
        ).json()
        
        # Add grades in different semesters
        requests.post(
            f"{BASE_URL}/api/students/{student['id']}/grades",
            headers=auth_headers,
            json={"course_name": "Math", "grade_letter": "A", "credit_hours": 3, "semester": "Fall 2025"}
        )
        requests.post(
            f"{BASE_URL}/api/students/{student['id']}/grades",
            headers=auth_headers,
            json={"course_name": "English", "grade_letter": "B", "credit_hours": 3, "semester": "Fall 2025"}
        )
        requests.post(
            f"{BASE_URL}/api/students/{student['id']}/grades",
            headers=auth_headers,
            json={"course_name": "Science", "grade_letter": "A-", "credit_hours": 4, "semester": "Spring 2026"}
        )
        
        yield student
        requests.delete(f"{BASE_URL}/api/students/{student['id']}", headers=auth_headers)
    
    def test_get_transcript(self, auth_headers, test_student_with_grades):
        """Get student transcript with semester grouping"""
        response = requests.get(
            f"{BASE_URL}/api/students/{test_student_with_grades['id']}/transcript",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "student" in data
        assert "semesters" in data
        assert "cumulative_gpa" in data
        assert data["student"]["id"] == test_student_with_grades["id"]
        assert len(data["semesters"]) == 2  # Fall 2025 and Spring 2026
        
        # Check semester structure
        for sem in data["semesters"]:
            assert "semester" in sem
            assert "grades" in sem
            assert "semester_gpa" in sem
            assert "total_credits" in sem
        
        print(f"✓ Transcript: {len(data['semesters'])} semesters, cumulative GPA: {data['cumulative_gpa']}")


# ─── Student Stats ────────────────────────────────────────────────────────────
class TestStudentStats:
    """Test Student Stats endpoint"""
    
    @pytest.fixture
    def test_student_with_data(self, auth_headers):
        """Create a test student with various data for stats"""
        # Create student
        student = requests.post(
            f"{BASE_URL}/api/students/",
            headers=auth_headers,
            json={"first_name": "TEST_Stats", "last_name": "Student", "student_id": "TEST_STS001"}
        ).json()
        
        # Add grades
        requests.post(
            f"{BASE_URL}/api/students/{student['id']}/grades",
            headers=auth_headers,
            json={"course_name": "Math", "grade_letter": "A", "credit_hours": 3, "semester": "Fall 2025"}
        )
        
        # Add attendance
        requests.post(
            f"{BASE_URL}/api/students/{student['id']}/attendance",
            headers=auth_headers,
            json={"date": "2026-01-15", "status": "present"}
        )
        requests.post(
            f"{BASE_URL}/api/students/{student['id']}/attendance",
            headers=auth_headers,
            json={"date": "2026-01-16", "status": "absent"}
        )
        
        # Add assignments
        requests.post(
            f"{BASE_URL}/api/students/{student['id']}/assignments",
            headers=auth_headers,
            json={"title": "Homework 1", "status": "graded"}
        )
        requests.post(
            f"{BASE_URL}/api/students/{student['id']}/assignments",
            headers=auth_headers,
            json={"title": "Homework 2", "status": "missing"}
        )
        
        # Add discipline
        requests.post(
            f"{BASE_URL}/api/students/{student['id']}/discipline",
            headers=auth_headers,
            json={"incident_type": "warning", "description": "Test", "resolved": False}
        )
        
        yield student
        requests.delete(f"{BASE_URL}/api/students/{student['id']}", headers=auth_headers)
    
    def test_get_stats(self, auth_headers, test_student_with_data):
        """Get student stats"""
        response = requests.get(
            f"{BASE_URL}/api/students/{test_student_with_data['id']}/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "gpa" in data
        assert "attendance" in data
        assert "assignments" in data
        assert "discipline" in data
        
        # Check attendance stats
        assert data["attendance"]["total"] == 2
        assert data["attendance"]["present"] == 1
        assert data["attendance"]["absent"] == 1
        assert data["attendance"]["rate"] == 50.0
        
        # Check assignment stats
        assert data["assignments"]["total"] == 2
        assert data["assignments"]["completed"] == 1
        assert data["assignments"]["missing"] == 1
        
        # Check discipline stats
        assert data["discipline"]["total"] == 1
        assert data["discipline"]["unresolved"] == 1
        
        print(f"✓ Stats: GPA={data['gpa']}, Attendance={data['attendance']['rate']}%")


# ─── Bulk Attendance ──────────────────────────────────────────────────────────
class TestBulkAttendance:
    """Test Bulk Attendance endpoint"""
    
    @pytest.fixture
    def test_students(self, auth_headers):
        """Create multiple test students for bulk attendance"""
        students = []
        for i in range(3):
            response = requests.post(
                f"{BASE_URL}/api/students/",
                headers=auth_headers,
                json={"first_name": f"TEST_Bulk{i}", "last_name": "Student", "student_id": f"TEST_BLK00{i}"}
            )
            students.append(response.json())
        
        yield students
        
        for student in students:
            requests.delete(f"{BASE_URL}/api/students/{student['id']}", headers=auth_headers)
    
    def test_bulk_attendance(self, auth_headers, test_students):
        """Add bulk attendance records"""
        records = [
            {"student_id": test_students[0]["id"], "status": "present"},
            {"student_id": test_students[1]["id"], "status": "absent"},
            {"student_id": test_students[2]["id"], "status": "tardy"},
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/students/attendance/bulk",
            headers=auth_headers,
            json={"date": "2026-01-20", "records": records}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["count"] == 3
        
        # Verify records were created
        for student in test_students:
            att_response = requests.get(
                f"{BASE_URL}/api/students/{student['id']}/attendance",
                headers=auth_headers
            )
            assert len(att_response.json()) >= 1
        
        print(f"✓ Bulk attendance: {data['count']} records created")


# ─── Cleanup Test Data ────────────────────────────────────────────────────────
class TestCleanup:
    """Cleanup any remaining TEST_ prefixed students"""
    
    def test_cleanup_test_students(self, auth_headers):
        """Remove all TEST_ prefixed students"""
        response = requests.get(f"{BASE_URL}/api/students/", headers=auth_headers)
        students = response.json()
        
        deleted = 0
        for student in students:
            if student.get("first_name", "").startswith("TEST_") or student.get("student_id", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/students/{student['id']}", headers=auth_headers)
                deleted += 1
        
        print(f"✓ Cleanup: Deleted {deleted} test students")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
