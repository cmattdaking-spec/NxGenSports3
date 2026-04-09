"""
Iteration 7: Faculty & Staff Module Tests
Tests for Faculty CRUD, Departments, Subjects, Classrooms, Schedules, and Stats
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@nxgensports.com"
ADMIN_PASSWORD = "Admin123!"


class TestAuth:
    """Authentication tests - verify auth still works"""
    
    def test_login_success(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        print(f"✓ Login successful, user role: {data['user'].get('role')}")
    
    def test_auth_me(self, auth_token):
        """Test GET /api/auth/me"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200, f"Auth me failed: {response.text}"
        data = response.json()
        assert data.get("email") == ADMIN_EMAIL
        print(f"✓ Auth me works, email: {data.get('email')}")


class TestFacultyStats:
    """Faculty stats endpoint tests"""
    
    def test_get_faculty_stats(self, auth_token):
        """Test GET /api/faculty/stats"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/faculty/stats", headers=headers)
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        assert "total_faculty" in data
        assert "active_faculty" in data
        assert "departments" in data
        assert "subjects" in data
        assert "classrooms" in data
        assert "schedule_entries" in data
        print(f"✓ Faculty stats: {data}")


class TestFacultyCRUD:
    """Faculty CRUD operations"""
    
    def test_list_faculty(self, auth_token):
        """Test GET /api/faculty/"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/faculty/", headers=headers)
        assert response.status_code == 200, f"List faculty failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List faculty: {len(data)} members")
    
    def test_create_faculty(self, auth_token):
        """Test POST /api/faculty/"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {
            "first_name": "TEST_John",
            "last_name": "TEST_Doe",
            "email": "test_john_doe@school.test",
            "phone": "555-1234",
            "position": "Teacher",
            "department": "Mathematics",
            "employee_id": "TEST_EMP999",
            "status": "active",
            "qualifications": "PhD Mathematics",
            "subjects": ["Calculus", "Statistics"],
            "bio": "Test faculty member"
        }
        response = requests.post(f"{BASE_URL}/api/faculty/", headers=headers, json=payload)
        assert response.status_code == 200, f"Create faculty failed: {response.text}"
        data = response.json()
        assert data.get("first_name") == "TEST_John"
        assert data.get("last_name") == "TEST_Doe"
        assert data.get("full_name") == "TEST_John TEST_Doe"
        assert data.get("email") == "test_john_doe@school.test"
        assert data.get("employee_id") == "TEST_EMP999"
        assert "id" in data
        print(f"✓ Created faculty: {data.get('full_name')} (ID: {data.get('id')})")
        return data.get("id")
    
    def test_get_faculty_member(self, auth_token, created_faculty_id):
        """Test GET /api/faculty/member/{id}"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/faculty/member/{created_faculty_id}", headers=headers)
        assert response.status_code == 200, f"Get faculty failed: {response.text}"
        data = response.json()
        assert data.get("id") == created_faculty_id
        assert data.get("first_name") == "TEST_John"
        print(f"✓ Get faculty member: {data.get('full_name')}")
    
    def test_update_faculty(self, auth_token, created_faculty_id):
        """Test PATCH /api/faculty/member/{id}"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {
            "first_name": "TEST_Jane",
            "position": "Department Head",
            "qualifications": "PhD Mathematics, EdD"
        }
        response = requests.patch(f"{BASE_URL}/api/faculty/member/{created_faculty_id}", headers=headers, json=payload)
        assert response.status_code == 200, f"Update faculty failed: {response.text}"
        data = response.json()
        assert data.get("first_name") == "TEST_Jane"
        assert data.get("full_name") == "TEST_Jane TEST_Doe"
        assert data.get("position") == "Department Head"
        print(f"✓ Updated faculty: {data.get('full_name')}, position: {data.get('position')}")
        
        # Verify with GET
        response = requests.get(f"{BASE_URL}/api/faculty/member/{created_faculty_id}", headers=headers)
        assert response.status_code == 200
        fetched = response.json()
        assert fetched.get("first_name") == "TEST_Jane"
        assert fetched.get("position") == "Department Head"
        print(f"✓ Verified update persisted")
    
    def test_delete_faculty(self, auth_token, created_faculty_id):
        """Test DELETE /api/faculty/member/{id}"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.delete(f"{BASE_URL}/api/faculty/member/{created_faculty_id}", headers=headers)
        assert response.status_code == 200, f"Delete faculty failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Deleted faculty ID: {created_faculty_id}")
        
        # Verify deletion with GET (should 404)
        response = requests.get(f"{BASE_URL}/api/faculty/member/{created_faculty_id}", headers=headers)
        assert response.status_code == 404, "Faculty should be deleted"
        print(f"✓ Verified faculty deleted (404)")


class TestDepartments:
    """Department CRUD operations"""
    
    def test_list_departments(self, auth_token):
        """Test GET /api/faculty/departments"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/faculty/departments", headers=headers)
        assert response.status_code == 200, f"List departments failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List departments: {len(data)} departments")
    
    def test_create_department(self, auth_token):
        """Test POST /api/faculty/departments"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {
            "name": "TEST_Science",
            "head_name": "Dr. Test Head",
            "description": "Test science department"
        }
        response = requests.post(f"{BASE_URL}/api/faculty/departments", headers=headers, json=payload)
        assert response.status_code == 200, f"Create department failed: {response.text}"
        data = response.json()
        assert data.get("name") == "TEST_Science"
        assert data.get("head_name") == "Dr. Test Head"
        assert "id" in data
        print(f"✓ Created department: {data.get('name')} (ID: {data.get('id')})")
        return data.get("id")
    
    def test_delete_department(self, auth_token, created_department_id):
        """Test DELETE /api/faculty/departments/{id}"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.delete(f"{BASE_URL}/api/faculty/departments/{created_department_id}", headers=headers)
        assert response.status_code == 200, f"Delete department failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Deleted department ID: {created_department_id}")


class TestSubjects:
    """Subject CRUD operations"""
    
    def test_list_subjects(self, auth_token):
        """Test GET /api/faculty/subjects"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/faculty/subjects", headers=headers)
        assert response.status_code == 200, f"List subjects failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List subjects: {len(data)} subjects")
    
    def test_create_subject(self, auth_token):
        """Test POST /api/faculty/subjects"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {
            "name": "TEST_Physics",
            "code": "TEST_PHY101",
            "department": "Science",
            "grade_levels": ["9", "10"],
            "credit_hours": 3,
            "description": "Test physics course"
        }
        response = requests.post(f"{BASE_URL}/api/faculty/subjects", headers=headers, json=payload)
        assert response.status_code == 200, f"Create subject failed: {response.text}"
        data = response.json()
        assert data.get("name") == "TEST_Physics"
        assert data.get("code") == "TEST_PHY101"
        assert "id" in data
        print(f"✓ Created subject: {data.get('name')} (ID: {data.get('id')})")
        return data.get("id")
    
    def test_delete_subject(self, auth_token, created_subject_id):
        """Test DELETE /api/faculty/subjects/{id}"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.delete(f"{BASE_URL}/api/faculty/subjects/{created_subject_id}", headers=headers)
        assert response.status_code == 200, f"Delete subject failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Deleted subject ID: {created_subject_id}")


class TestClassrooms:
    """Classroom CRUD operations"""
    
    def test_list_classrooms(self, auth_token):
        """Test GET /api/faculty/classrooms"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/faculty/classrooms", headers=headers)
        assert response.status_code == 200, f"List classrooms failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List classrooms: {len(data)} classrooms")
    
    def test_create_classroom(self, auth_token):
        """Test POST /api/faculty/classrooms"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {
            "room_number": "TEST_201",
            "building": "Test Building",
            "capacity": 30,
            "room_type": "lab",
            "equipment": ["projector", "whiteboard"]
        }
        response = requests.post(f"{BASE_URL}/api/faculty/classrooms", headers=headers, json=payload)
        assert response.status_code == 200, f"Create classroom failed: {response.text}"
        data = response.json()
        assert data.get("room_number") == "TEST_201"
        assert data.get("building") == "Test Building"
        assert data.get("capacity") == 30
        assert "id" in data
        print(f"✓ Created classroom: Room {data.get('room_number')} (ID: {data.get('id')})")
        return data.get("id")
    
    def test_delete_classroom(self, auth_token, created_classroom_id):
        """Test DELETE /api/faculty/classrooms/{id}"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.delete(f"{BASE_URL}/api/faculty/classrooms/{created_classroom_id}", headers=headers)
        assert response.status_code == 200, f"Delete classroom failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Deleted classroom ID: {created_classroom_id}")


class TestFacultySchedule:
    """Faculty schedule operations"""
    
    def test_schedule_crud(self, auth_token):
        """Test full schedule CRUD flow"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First create a faculty member
        faculty_payload = {
            "first_name": "TEST_Schedule",
            "last_name": "TEST_Teacher",
            "position": "Teacher",
            "status": "active"
        }
        response = requests.post(f"{BASE_URL}/api/faculty/", headers=headers, json=faculty_payload)
        assert response.status_code == 200, f"Create faculty failed: {response.text}"
        faculty_id = response.json().get("id")
        print(f"✓ Created test faculty for schedule: {faculty_id}")
        
        try:
            # List schedule (should be empty)
            response = requests.get(f"{BASE_URL}/api/faculty/member/{faculty_id}/schedule", headers=headers)
            assert response.status_code == 200
            assert response.json() == []
            print(f"✓ Initial schedule is empty")
            
            # Add schedule entry
            schedule_payload = {
                "subject_name": "TEST_Algebra",
                "classroom": "Room 101",
                "period": "1",
                "day_of_week": "Monday",
                "start_time": "08:00",
                "end_time": "08:50",
                "grade_level": "9",
                "notes": "Test schedule entry"
            }
            response = requests.post(f"{BASE_URL}/api/faculty/member/{faculty_id}/schedule", headers=headers, json=schedule_payload)
            assert response.status_code == 200, f"Add schedule failed: {response.text}"
            schedule_data = response.json()
            assert schedule_data.get("subject_name") == "TEST_Algebra"
            assert schedule_data.get("day_of_week") == "Monday"
            assert schedule_data.get("period") == "1"
            schedule_id = schedule_data.get("id")
            print(f"✓ Added schedule entry: {schedule_data.get('subject_name')} on {schedule_data.get('day_of_week')}")
            
            # Verify schedule entry exists
            response = requests.get(f"{BASE_URL}/api/faculty/member/{faculty_id}/schedule", headers=headers)
            assert response.status_code == 200
            schedule_list = response.json()
            assert len(schedule_list) == 1
            assert schedule_list[0].get("subject_name") == "TEST_Algebra"
            print(f"✓ Verified schedule entry persisted")
            
            # Delete schedule entry
            response = requests.delete(f"{BASE_URL}/api/faculty/member/{faculty_id}/schedule/{schedule_id}", headers=headers)
            assert response.status_code == 200
            assert response.json().get("success") == True
            print(f"✓ Deleted schedule entry")
            
            # Verify deletion
            response = requests.get(f"{BASE_URL}/api/faculty/member/{faculty_id}/schedule", headers=headers)
            assert response.status_code == 200
            assert response.json() == []
            print(f"✓ Verified schedule entry deleted")
            
        finally:
            # Cleanup: delete test faculty
            requests.delete(f"{BASE_URL}/api/faculty/member/{faculty_id}", headers=headers)
            print(f"✓ Cleaned up test faculty")


class TestMasterSchedule:
    """Master schedule endpoint tests"""
    
    def test_get_master_schedule(self, auth_token):
        """Test GET /api/faculty/schedule/all"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/faculty/schedule/all", headers=headers)
        assert response.status_code == 200, f"Master schedule failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Master schedule: {len(data)} entries")
        # Check that entries have faculty_name enrichment
        if len(data) > 0:
            assert "faculty_name" in data[0], "Missing faculty_name enrichment"
            print(f"✓ Schedule entries have faculty_name field")


class TestExistingEndpoints:
    """Verify existing endpoints still work"""
    
    def test_students_list(self, auth_token):
        """Test GET /api/students/ still works"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/students/", headers=headers)
        assert response.status_code == 200, f"Students list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Students list works: {len(data)} students")


# ─── Fixtures ─────────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.fail(f"Authentication failed: {response.text}")


@pytest.fixture
def created_faculty_id(auth_token):
    """Create a faculty member for testing and cleanup after"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "first_name": "TEST_John",
        "last_name": "TEST_Doe",
        "email": "test_john_doe@school.test",
        "position": "Teacher",
        "employee_id": "TEST_EMP999",
        "status": "active"
    }
    response = requests.post(f"{BASE_URL}/api/faculty/", headers=headers, json=payload)
    assert response.status_code == 200
    faculty_id = response.json().get("id")
    yield faculty_id
    # Cleanup
    requests.delete(f"{BASE_URL}/api/faculty/member/{faculty_id}", headers=headers)


@pytest.fixture
def created_department_id(auth_token):
    """Create a department for testing and cleanup after"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {"name": "TEST_Science", "head_name": "Dr. Test"}
    response = requests.post(f"{BASE_URL}/api/faculty/departments", headers=headers, json=payload)
    assert response.status_code == 200
    dept_id = response.json().get("id")
    yield dept_id
    # Cleanup
    requests.delete(f"{BASE_URL}/api/faculty/departments/{dept_id}", headers=headers)


@pytest.fixture
def created_subject_id(auth_token):
    """Create a subject for testing and cleanup after"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {"name": "TEST_Physics", "code": "TEST_PHY101"}
    response = requests.post(f"{BASE_URL}/api/faculty/subjects", headers=headers, json=payload)
    assert response.status_code == 200
    subj_id = response.json().get("id")
    yield subj_id
    # Cleanup
    requests.delete(f"{BASE_URL}/api/faculty/subjects/{subj_id}", headers=headers)


@pytest.fixture
def created_classroom_id(auth_token):
    """Create a classroom for testing and cleanup after"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {"room_number": "TEST_201", "building": "Test Building", "capacity": 30}
    response = requests.post(f"{BASE_URL}/api/faculty/classrooms", headers=headers, json=payload)
    assert response.status_code == 200
    room_id = response.json().get("id")
    yield room_id
    # Cleanup
    requests.delete(f"{BASE_URL}/api/faculty/classrooms/{room_id}", headers=headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
