"""
Iteration 8: Faculty-Student Linkage & Master Schedule Calendar Tests
- GET /api/faculty/schedule/all - Master schedule with enriched faculty_name
- GET /api/faculty/member/{id}/students - Faculty-student linkage via grades
- POST /api/students/{id}/grades - Grade creation with optional faculty_id
- Regression: Auth, Faculty CRUD, Student grades CRUD
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@nxgensports.com"
ADMIN_PASSWORD = "Admin123!"


class TestAuth:
    """Regression: Auth endpoints still work"""
    
    def test_login_success(self):
        """POST /api/auth/login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == ADMIN_EMAIL
    
    def test_auth_me(self):
        """GET /api/auth/me returns current user"""
        # Login first
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_res.json().get("access_token")
        
        # Get current user
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200, f"Auth me failed: {response.text}"
        data = response.json()
        assert data["email"] == ADMIN_EMAIL


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for authenticated requests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Login failed: {response.text}")
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestMasterSchedule:
    """Master Schedule Calendar API tests"""
    
    def test_get_master_schedule(self, auth_headers):
        """GET /api/faculty/schedule/all returns all schedule entries"""
        response = requests.get(f"{BASE_URL}/api/faculty/schedule/all", headers=auth_headers)
        assert response.status_code == 200, f"Master schedule failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_master_schedule_has_faculty_name(self, auth_headers):
        """Master schedule entries should have enriched faculty_name"""
        response = requests.get(f"{BASE_URL}/api/faculty/schedule/all", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # If there are entries, check they have faculty_name field
        if len(data) > 0:
            entry = data[0]
            assert "faculty_name" in entry, "Schedule entry should have faculty_name field"
            assert "subject_name" in entry, "Schedule entry should have subject_name"
            assert "day_of_week" in entry, "Schedule entry should have day_of_week"
            assert "period" in entry, "Schedule entry should have period"
            assert "classroom" in entry, "Schedule entry should have classroom"
    
    def test_master_schedule_structure(self, auth_headers):
        """Verify master schedule entry structure"""
        response = requests.get(f"{BASE_URL}/api/faculty/schedule/all", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            entry = data[0]
            # Required fields
            required_fields = ["id", "faculty_id", "subject_name", "day_of_week", "period", "faculty_name"]
            for field in required_fields:
                assert field in entry, f"Missing field: {field}"


class TestFacultyStudentLinkage:
    """Faculty-Student Linkage API tests"""
    
    def test_get_faculty_students_endpoint_exists(self, auth_headers):
        """GET /api/faculty/member/{id}/students endpoint exists"""
        # First get a faculty member
        faculty_res = requests.get(f"{BASE_URL}/api/faculty/", headers=auth_headers)
        assert faculty_res.status_code == 200
        faculty_list = faculty_res.json()
        
        if len(faculty_list) > 0:
            faculty_id = faculty_list[0]["id"]
            response = requests.get(f"{BASE_URL}/api/faculty/member/{faculty_id}/students", headers=auth_headers)
            assert response.status_code == 200, f"Faculty students endpoint failed: {response.text}"
            data = response.json()
            assert isinstance(data, list), "Response should be a list"
    
    def test_faculty_students_response_structure(self, auth_headers):
        """Verify faculty students response structure"""
        # Get faculty list
        faculty_res = requests.get(f"{BASE_URL}/api/faculty/", headers=auth_headers)
        faculty_list = faculty_res.json()
        
        if len(faculty_list) > 0:
            faculty_id = faculty_list[0]["id"]
            response = requests.get(f"{BASE_URL}/api/faculty/member/{faculty_id}/students", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            
            # If there are linked students, verify structure
            if len(data) > 0:
                student = data[0]
                expected_fields = ["student_id", "full_name", "grade_level", "courses"]
                for field in expected_fields:
                    assert field in student, f"Missing field in linked student: {field}"
                
                # Verify courses structure
                if len(student.get("courses", [])) > 0:
                    course = student["courses"][0]
                    assert "course_name" in course, "Course should have course_name"
                    assert "grade_letter" in course, "Course should have grade_letter"
    
    def test_faculty_not_found(self, auth_headers):
        """GET /api/faculty/member/{invalid_id}/students returns 404"""
        response = requests.get(f"{BASE_URL}/api/faculty/member/000000000000000000000000/students", headers=auth_headers)
        assert response.status_code == 404, "Should return 404 for non-existent faculty"


class TestGradeWithFacultyId:
    """Grade creation with faculty_id field tests"""
    
    def test_create_grade_with_faculty_id(self, auth_headers):
        """POST /api/students/{id}/grades accepts faculty_id"""
        # Get a student
        students_res = requests.get(f"{BASE_URL}/api/students/", headers=auth_headers)
        assert students_res.status_code == 200
        students = students_res.json()
        
        if len(students) == 0:
            pytest.skip("No students to test with")
        
        student_id = students[0]["id"]
        
        # Get a faculty member
        faculty_res = requests.get(f"{BASE_URL}/api/faculty/", headers=auth_headers)
        faculty_list = faculty_res.json()
        faculty_id = faculty_list[0]["id"] if len(faculty_list) > 0 else None
        
        # Create grade with faculty_id
        grade_data = {
            "course_name": "TEST_Iteration8_Course",
            "course_code": "TEST8",
            "teacher_name": "Test Teacher",
            "faculty_id": faculty_id,
            "semester": "Spring 2026",
            "grade_letter": "A",
            "grade_percent": 95,
            "credit_hours": 3
        }
        
        response = requests.post(f"{BASE_URL}/api/students/{student_id}/grades", 
                                json=grade_data, headers=auth_headers)
        assert response.status_code == 200, f"Create grade failed: {response.text}"
        data = response.json()
        
        # Verify faculty_id is stored
        assert data.get("faculty_id") == faculty_id, "faculty_id should be stored"
        assert data.get("course_name") == "TEST_Iteration8_Course"
        
        # Cleanup - delete the test grade
        grade_id = data["id"]
        del_res = requests.delete(f"{BASE_URL}/api/students/{student_id}/grades/{grade_id}", headers=auth_headers)
        assert del_res.status_code == 200
    
    def test_create_grade_without_faculty_id(self, auth_headers):
        """POST /api/students/{id}/grades works without faculty_id (backward compatible)"""
        # Get a student
        students_res = requests.get(f"{BASE_URL}/api/students/", headers=auth_headers)
        students = students_res.json()
        
        if len(students) == 0:
            pytest.skip("No students to test with")
        
        student_id = students[0]["id"]
        
        # Create grade without faculty_id
        grade_data = {
            "course_name": "TEST_NoFaculty_Course",
            "semester": "Spring 2026",
            "grade_letter": "B+",
            "credit_hours": 2
        }
        
        response = requests.post(f"{BASE_URL}/api/students/{student_id}/grades", 
                                json=grade_data, headers=auth_headers)
        assert response.status_code == 200, f"Create grade without faculty_id failed: {response.text}"
        data = response.json()
        
        # faculty_id should be None or not present
        assert data.get("faculty_id") is None, "faculty_id should be None when not provided"
        
        # Cleanup
        grade_id = data["id"]
        requests.delete(f"{BASE_URL}/api/students/{student_id}/grades/{grade_id}", headers=auth_headers)


class TestFacultyLinkageIntegration:
    """Integration test: Create grade with faculty_id, verify linkage appears"""
    
    def test_faculty_student_linkage_via_grade(self, auth_headers):
        """Creating a grade with faculty_id should link student to faculty"""
        # Get a student
        students_res = requests.get(f"{BASE_URL}/api/students/", headers=auth_headers)
        students = students_res.json()
        if len(students) == 0:
            pytest.skip("No students to test with")
        student = students[0]
        student_id = student["id"]
        
        # Get a faculty member
        faculty_res = requests.get(f"{BASE_URL}/api/faculty/", headers=auth_headers)
        faculty_list = faculty_res.json()
        if len(faculty_list) == 0:
            pytest.skip("No faculty to test with")
        faculty = faculty_list[0]
        faculty_id = faculty["id"]
        
        # Create grade with faculty_id
        grade_data = {
            "course_name": "TEST_Linkage_Course",
            "faculty_id": faculty_id,
            "semester": "Spring 2026",
            "grade_letter": "A-",
            "credit_hours": 3
        }
        
        create_res = requests.post(f"{BASE_URL}/api/students/{student_id}/grades", 
                                  json=grade_data, headers=auth_headers)
        assert create_res.status_code == 200
        grade_id = create_res.json()["id"]
        
        # Verify student appears in faculty's linked students
        linkage_res = requests.get(f"{BASE_URL}/api/faculty/member/{faculty_id}/students", headers=auth_headers)
        assert linkage_res.status_code == 200
        linked_students = linkage_res.json()
        
        # Find our student in the linked list
        found = False
        for ls in linked_students:
            if ls["student_id"] == student_id:
                found = True
                # Verify course appears
                course_found = any(c["course_name"] == "TEST_Linkage_Course" for c in ls.get("courses", []))
                assert course_found, "Course should appear in linked student's courses"
                break
        
        assert found, f"Student {student_id} should appear in faculty's linked students"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/students/{student_id}/grades/{grade_id}", headers=auth_headers)


class TestRegressionFacultyCRUD:
    """Regression: Faculty CRUD still works"""
    
    def test_list_faculty(self, auth_headers):
        """GET /api/faculty/ returns faculty list"""
        response = requests.get(f"{BASE_URL}/api/faculty/", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_faculty_stats(self, auth_headers):
        """GET /api/faculty/stats returns stats"""
        response = requests.get(f"{BASE_URL}/api/faculty/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_faculty" in data
        assert "active_faculty" in data
    
    def test_create_update_delete_faculty(self, auth_headers):
        """Faculty CRUD cycle works"""
        # Create
        create_data = {
            "first_name": "TEST_Iter8",
            "last_name": "Faculty",
            "email": "test_iter8@test.com",
            "position": "Teacher",
            "status": "active"
        }
        create_res = requests.post(f"{BASE_URL}/api/faculty/", json=create_data, headers=auth_headers)
        assert create_res.status_code == 200, f"Create faculty failed: {create_res.text}"
        faculty = create_res.json()
        faculty_id = faculty["id"]
        assert faculty["full_name"] == "TEST_Iter8 Faculty"
        
        # Update
        update_res = requests.patch(f"{BASE_URL}/api/faculty/member/{faculty_id}", 
                                   json={"position": "Department Head"}, headers=auth_headers)
        assert update_res.status_code == 200
        assert update_res.json()["position"] == "Department Head"
        
        # Delete
        del_res = requests.delete(f"{BASE_URL}/api/faculty/member/{faculty_id}", headers=auth_headers)
        assert del_res.status_code == 200


class TestRegressionStudentGrades:
    """Regression: Student grades CRUD still works"""
    
    def test_list_students(self, auth_headers):
        """GET /api/students/ returns student list"""
        response = requests.get(f"{BASE_URL}/api/students/", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_student_grades_crud(self, auth_headers):
        """Student grades CRUD cycle works"""
        # Get a student
        students_res = requests.get(f"{BASE_URL}/api/students/", headers=auth_headers)
        students = students_res.json()
        if len(students) == 0:
            pytest.skip("No students to test with")
        student_id = students[0]["id"]
        
        # Create grade
        grade_data = {
            "course_name": "TEST_Regression_Course",
            "semester": "Fall 2025",
            "grade_letter": "B",
            "credit_hours": 3
        }
        create_res = requests.post(f"{BASE_URL}/api/students/{student_id}/grades", 
                                  json=grade_data, headers=auth_headers)
        assert create_res.status_code == 200
        grade = create_res.json()
        grade_id = grade["id"]
        
        # List grades
        list_res = requests.get(f"{BASE_URL}/api/students/{student_id}/grades", headers=auth_headers)
        assert list_res.status_code == 200
        grades = list_res.json()
        assert any(g["id"] == grade_id for g in grades), "Created grade should appear in list"
        
        # Delete grade
        del_res = requests.delete(f"{BASE_URL}/api/students/{student_id}/grades/{grade_id}", headers=auth_headers)
        assert del_res.status_code == 200


class TestFacultyScheduleCRUD:
    """Regression: Faculty schedule CRUD still works"""
    
    def test_faculty_schedule_crud(self, auth_headers):
        """Faculty schedule CRUD cycle works"""
        # Get a faculty member
        faculty_res = requests.get(f"{BASE_URL}/api/faculty/", headers=auth_headers)
        faculty_list = faculty_res.json()
        if len(faculty_list) == 0:
            pytest.skip("No faculty to test with")
        faculty_id = faculty_list[0]["id"]
        
        # Create schedule entry
        schedule_data = {
            "subject_name": "TEST_Schedule_Subject",
            "classroom": "TEST101",
            "period": "5",
            "day_of_week": "Wednesday",
            "start_time": "13:00",
            "end_time": "13:50"
        }
        create_res = requests.post(f"{BASE_URL}/api/faculty/member/{faculty_id}/schedule", 
                                  json=schedule_data, headers=auth_headers)
        assert create_res.status_code == 200, f"Create schedule failed: {create_res.text}"
        entry = create_res.json()
        entry_id = entry["id"]
        
        # List schedule
        list_res = requests.get(f"{BASE_URL}/api/faculty/member/{faculty_id}/schedule", headers=auth_headers)
        assert list_res.status_code == 200
        
        # Verify in master schedule
        master_res = requests.get(f"{BASE_URL}/api/faculty/schedule/all", headers=auth_headers)
        assert master_res.status_code == 200
        master_entries = master_res.json()
        found = any(e["id"] == entry_id for e in master_entries)
        assert found, "Schedule entry should appear in master schedule"
        
        # Delete schedule entry
        del_res = requests.delete(f"{BASE_URL}/api/faculty/member/{faculty_id}/schedule/{entry_id}", headers=auth_headers)
        assert del_res.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
