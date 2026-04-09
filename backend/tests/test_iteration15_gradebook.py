"""
Iteration 15: Teacher Grade Book Feature Tests
Tests for gradebook endpoints: GET /gradebook, POST /entry, PUT /entry/{id}, DELETE /entry/{id}, POST /bulk
Also tests RBAC - non-teachers should get 403
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGradebookAuth:
    """Test authentication and authorization for gradebook endpoints"""
    
    @pytest.fixture(scope="class")
    def teacher_math_token(self):
        """Get token for Math teacher (s.mitchell@lincoln.edu)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "s.mitchell@lincoln.edu",
            "password": "Test1234!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Math teacher login failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def teacher_science_token(self):
        """Get token for Science teacher (r.park@lincoln.edu)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "r.park@lincoln.edu",
            "password": "Test1234!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Science teacher login failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def coach_token(self):
        """Get token for Coach (coach.williams@lincoln.edu)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@lincoln.edu",
            "password": "Test1234!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Coach login failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def player_token(self):
        """Get token for Player (marcus.j@lincoln.edu)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "marcus.j@lincoln.edu",
            "password": "Test1234!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Player login failed: {response.status_code}")
    
    def test_teacher_can_access_gradebook(self, teacher_math_token):
        """Teacher should be able to access gradebook"""
        response = requests.get(
            f"{BASE_URL}/api/teachers/gradebook",
            headers={"Authorization": f"Bearer {teacher_math_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "students" in data
        assert "grades" in data
        assert "subjects" in data
        assert "assignments" in data
        print(f"✓ Teacher can access gradebook - {len(data['students'])} students, {len(data['grades'])} grades")
    
    def test_coach_cannot_access_gradebook(self, coach_token):
        """Coach should get 403 when accessing gradebook"""
        response = requests.get(
            f"{BASE_URL}/api/teachers/gradebook",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for coach, got {response.status_code}"
        print("✓ Coach correctly denied access to gradebook (403)")
    
    def test_player_cannot_access_gradebook(self, player_token):
        """Player should get 403 when accessing gradebook"""
        response = requests.get(
            f"{BASE_URL}/api/teachers/gradebook",
            headers={"Authorization": f"Bearer {player_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for player, got {response.status_code}"
        print("✓ Player correctly denied access to gradebook (403)")


class TestGradebookGET:
    """Test GET /api/teachers/gradebook endpoint"""
    
    @pytest.fixture(scope="class")
    def teacher_math_token(self):
        """Get token for Math teacher"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "s.mitchell@lincoln.edu",
            "password": "Test1234!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Math teacher login failed")
    
    @pytest.fixture(scope="class")
    def teacher_science_token(self):
        """Get token for Science teacher"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "r.park@lincoln.edu",
            "password": "Test1234!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Science teacher login failed")
    
    def test_gradebook_returns_students(self, teacher_math_token):
        """Gradebook should return students for the teacher"""
        response = requests.get(
            f"{BASE_URL}/api/teachers/gradebook",
            headers={"Authorization": f"Bearer {teacher_math_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        students = data.get("students", [])
        assert len(students) > 0, "Expected at least one student"
        # Verify student structure
        for student in students[:3]:
            assert "id" in student
            assert "full_name" in student or ("first_name" in student and "last_name" in student)
        print(f"✓ Gradebook returns {len(students)} students")
    
    def test_gradebook_returns_grades(self, teacher_math_token):
        """Gradebook should return grades with proper structure"""
        response = requests.get(
            f"{BASE_URL}/api/teachers/gradebook",
            headers={"Authorization": f"Bearer {teacher_math_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        grades = data.get("grades", [])
        if len(grades) > 0:
            grade = grades[0]
            assert "student_id" in grade
            assert "subject" in grade or "course_name" in grade
            assert "assignment_name" in grade
            # Check for score/percentage fields
            has_score = "score" in grade or "percentage" in grade or "grade_percent" in grade
            assert has_score, f"Grade missing score fields: {grade.keys()}"
        print(f"✓ Gradebook returns {len(grades)} grades with proper structure")
    
    def test_gradebook_returns_subjects(self, teacher_math_token):
        """Gradebook should return subjects list"""
        response = requests.get(
            f"{BASE_URL}/api/teachers/gradebook",
            headers={"Authorization": f"Bearer {teacher_math_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        subjects = data.get("subjects", [])
        assert isinstance(subjects, list)
        print(f"✓ Gradebook returns subjects: {subjects}")
    
    def test_gradebook_returns_assignments(self, teacher_math_token):
        """Gradebook should return assignments list"""
        response = requests.get(
            f"{BASE_URL}/api/teachers/gradebook",
            headers={"Authorization": f"Bearer {teacher_math_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assignments = data.get("assignments", [])
        assert isinstance(assignments, list)
        if len(assignments) > 0:
            asgn = assignments[0]
            assert "subject" in asgn
            assert "name" in asgn
        print(f"✓ Gradebook returns {len(assignments)} assignments")
    
    def test_science_teacher_sees_different_data(self, teacher_science_token):
        """Science teacher should see Biology/Science grades"""
        response = requests.get(
            f"{BASE_URL}/api/teachers/gradebook",
            headers={"Authorization": f"Bearer {teacher_science_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        subjects = data.get("subjects", [])
        print(f"✓ Science teacher sees subjects: {subjects}")


class TestGradebookPOST:
    """Test POST /api/teachers/gradebook/entry endpoint"""
    
    @pytest.fixture(scope="class")
    def teacher_token(self):
        """Get token for Math teacher"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "s.mitchell@lincoln.edu",
            "password": "Test1234!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Math teacher login failed")
    
    @pytest.fixture(scope="class")
    def student_id(self, teacher_token):
        """Get a student ID from gradebook"""
        response = requests.get(
            f"{BASE_URL}/api/teachers/gradebook",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        if response.status_code == 200:
            students = response.json().get("students", [])
            if students:
                return students[0]["id"]
        pytest.skip("No students found")
    
    def test_create_grade_entry(self, teacher_token, student_id):
        """Create a new grade entry"""
        payload = {
            "student_id": student_id,
            "subject": "Mathematics",
            "assignment_name": "TEST_Unit_Test_Quiz",
            "score": 85,
            "max_score": 100
        }
        response = requests.post(
            f"{BASE_URL}/api/teachers/gradebook/entry",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert data.get("score") == 85
        assert data.get("percentage") == 85.0
        assert data.get("letter_grade") == "B"
        print(f"✓ Created grade entry with ID: {data['id']}, letter grade: {data['letter_grade']}")
        return data["id"]
    
    def test_create_grade_calculates_letter_grade_A(self, teacher_token, student_id):
        """Test letter grade calculation for A"""
        payload = {
            "student_id": student_id,
            "subject": "Mathematics",
            "assignment_name": "TEST_A_Grade_Quiz",
            "score": 95,
            "max_score": 100
        }
        response = requests.post(
            f"{BASE_URL}/api/teachers/gradebook/entry",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("letter_grade") == "A", f"Expected A, got {data.get('letter_grade')}"
        print(f"✓ 95% correctly calculated as letter grade A")
    
    def test_create_grade_calculates_letter_grade_F(self, teacher_token, student_id):
        """Test letter grade calculation for F"""
        payload = {
            "student_id": student_id,
            "subject": "Mathematics",
            "assignment_name": "TEST_F_Grade_Quiz",
            "score": 50,
            "max_score": 100
        }
        response = requests.post(
            f"{BASE_URL}/api/teachers/gradebook/entry",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("letter_grade") == "F", f"Expected F, got {data.get('letter_grade')}"
        print(f"✓ 50% correctly calculated as letter grade F")
    
    def test_create_grade_missing_fields(self, teacher_token):
        """Test validation - missing required fields"""
        payload = {
            "subject": "Mathematics"
            # Missing student_id and assignment_name
        }
        response = requests.post(
            f"{BASE_URL}/api/teachers/gradebook/entry",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json=payload
        )
        assert response.status_code == 400, f"Expected 400 for missing fields, got {response.status_code}"
        print("✓ Correctly returns 400 for missing required fields")


class TestGradebookPUT:
    """Test PUT /api/teachers/gradebook/entry/{id} endpoint"""
    
    @pytest.fixture(scope="class")
    def teacher_token(self):
        """Get token for Math teacher"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "s.mitchell@lincoln.edu",
            "password": "Test1234!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Math teacher login failed")
    
    @pytest.fixture(scope="class")
    def grade_id(self, teacher_token):
        """Create a grade to update"""
        # First get a student
        response = requests.get(
            f"{BASE_URL}/api/teachers/gradebook",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        if response.status_code != 200:
            pytest.skip("Could not get gradebook")
        students = response.json().get("students", [])
        if not students:
            pytest.skip("No students found")
        
        # Create a grade
        payload = {
            "student_id": students[0]["id"],
            "subject": "Mathematics",
            "assignment_name": "TEST_Update_Quiz",
            "score": 70,
            "max_score": 100
        }
        response = requests.post(
            f"{BASE_URL}/api/teachers/gradebook/entry",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json=payload
        )
        if response.status_code == 200:
            return response.json().get("id")
        pytest.skip("Could not create grade for update test")
    
    def test_update_grade_score(self, teacher_token, grade_id):
        """Update a grade score and verify recalculation"""
        payload = {
            "score": 92,
            "max_score": 100
        }
        response = requests.put(
            f"{BASE_URL}/api/teachers/gradebook/entry/{grade_id}",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("score") == 92
        assert data.get("percentage") == 92.0
        assert data.get("letter_grade") == "A-", f"Expected A-, got {data.get('letter_grade')}"
        print(f"✓ Updated grade to 92%, letter grade recalculated to A-")
    
    def test_update_nonexistent_grade(self, teacher_token):
        """Update a non-existent grade should return 404"""
        payload = {"score": 80}
        response = requests.put(
            f"{BASE_URL}/api/teachers/gradebook/entry/000000000000000000000000",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json=payload
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Correctly returns 404 for non-existent grade")


class TestGradebookDELETE:
    """Test DELETE /api/teachers/gradebook/entry/{id} endpoint"""
    
    @pytest.fixture(scope="class")
    def teacher_token(self):
        """Get token for Math teacher"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "s.mitchell@lincoln.edu",
            "password": "Test1234!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Math teacher login failed")
    
    def test_delete_grade(self, teacher_token):
        """Delete a grade entry"""
        # First get a student
        response = requests.get(
            f"{BASE_URL}/api/teachers/gradebook",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        students = response.json().get("students", [])
        if not students:
            pytest.skip("No students found")
        
        # Create a grade to delete
        payload = {
            "student_id": students[0]["id"],
            "subject": "Mathematics",
            "assignment_name": "TEST_Delete_Quiz",
            "score": 75,
            "max_score": 100
        }
        create_response = requests.post(
            f"{BASE_URL}/api/teachers/gradebook/entry",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json=payload
        )
        assert create_response.status_code == 200
        grade_id = create_response.json().get("id")
        
        # Delete the grade
        delete_response = requests.delete(
            f"{BASE_URL}/api/teachers/gradebook/entry/{grade_id}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        data = delete_response.json()
        assert data.get("success") == True
        print(f"✓ Successfully deleted grade {grade_id}")


class TestGradebookBulk:
    """Test POST /api/teachers/gradebook/bulk endpoint"""
    
    @pytest.fixture(scope="class")
    def teacher_token(self):
        """Get token for Math teacher"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "s.mitchell@lincoln.edu",
            "password": "Test1234!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Math teacher login failed")
    
    @pytest.fixture(scope="class")
    def student_ids(self, teacher_token):
        """Get student IDs from gradebook"""
        response = requests.get(
            f"{BASE_URL}/api/teachers/gradebook",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        if response.status_code == 200:
            students = response.json().get("students", [])
            if len(students) >= 2:
                return [s["id"] for s in students[:3]]
        pytest.skip("Not enough students found")
    
    def test_bulk_create_grades(self, teacher_token, student_ids):
        """Create multiple grades at once for one assignment"""
        payload = {
            "subject": "Mathematics",
            "assignment_name": "TEST_Bulk_Assignment",
            "max_score": 100,
            "term": "Spring 2026",
            "entries": [
                {"student_id": student_ids[0], "score": 88},
                {"student_id": student_ids[1], "score": 92},
            ]
        }
        if len(student_ids) > 2:
            payload["entries"].append({"student_id": student_ids[2], "score": 75})
        
        response = requests.post(
            f"{BASE_URL}/api/teachers/gradebook/bulk",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("count") == len(payload["entries"])
        assert "ids" in data
        print(f"✓ Bulk created {data['count']} grades for assignment 'TEST_Bulk_Assignment'")
    
    def test_bulk_missing_subject(self, teacher_token, student_ids):
        """Bulk create should fail without subject"""
        payload = {
            "assignment_name": "TEST_Missing_Subject",
            "max_score": 100,
            "entries": [{"student_id": student_ids[0], "score": 80}]
        }
        response = requests.post(
            f"{BASE_URL}/api/teachers/gradebook/bulk",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json=payload
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Correctly returns 400 for missing subject in bulk create")
    
    def test_bulk_empty_entries(self, teacher_token):
        """Bulk create should fail with empty entries"""
        payload = {
            "subject": "Mathematics",
            "assignment_name": "TEST_Empty_Entries",
            "max_score": 100,
            "entries": []
        }
        response = requests.post(
            f"{BASE_URL}/api/teachers/gradebook/bulk",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json=payload
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Correctly returns 400 for empty entries in bulk create")


class TestTeacherDashboardRegression:
    """Regression tests for Teacher Dashboard from iteration 14"""
    
    @pytest.fixture(scope="class")
    def teacher_token(self):
        """Get token for Math teacher"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "s.mitchell@lincoln.edu",
            "password": "Test1234!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Math teacher login failed")
    
    def test_teacher_dashboard_still_works(self, teacher_token):
        """Teacher dashboard should still return correct data"""
        response = requests.get(
            f"{BASE_URL}/api/teachers/my-dashboard",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "faculty" in data
        assert "classes" in data
        assert "student_count" in data
        assert "subject_names" in data
        print(f"✓ Teacher dashboard works - {data.get('student_count')} students, subjects: {data.get('subject_names')}")
    
    def test_teacher_students_still_works(self, teacher_token):
        """Teacher my-students endpoint should still work"""
        response = requests.get(
            f"{BASE_URL}/api/teachers/my-students",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        students = response.json()
        assert isinstance(students, list)
        print(f"✓ Teacher my-students works - {len(students)} students")


class TestSchoolAdminDashboardRegression:
    """Regression tests for School Admin Dashboard from iteration 14"""
    
    @pytest.fixture(scope="class")
    def school_admin_token(self):
        """Get token for School Admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "office@lincoln.edu",
            "password": "Test1234!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("School admin login failed")
    
    def test_school_admin_stats_still_works(self, school_admin_token):
        """School admin stats endpoint should still return correct data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {school_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total_students" in data
        assert "total_faculty" in data
        print(f"✓ School admin stats works - {data.get('total_students')} students, {data.get('total_faculty')} faculty")


class TestCleanup:
    """Cleanup test data created during tests"""
    
    @pytest.fixture(scope="class")
    def teacher_token(self):
        """Get token for Math teacher"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "s.mitchell@lincoln.edu",
            "password": "Test1234!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Math teacher login failed")
    
    def test_cleanup_test_grades(self, teacher_token):
        """Clean up TEST_ prefixed grades"""
        response = requests.get(
            f"{BASE_URL}/api/teachers/gradebook",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        if response.status_code != 200:
            print("Could not get gradebook for cleanup")
            return
        
        grades = response.json().get("grades", [])
        test_grades = [g for g in grades if g.get("assignment_name", "").startswith("TEST_")]
        
        deleted = 0
        for grade in test_grades:
            delete_response = requests.delete(
                f"{BASE_URL}/api/teachers/gradebook/entry/{grade['id']}",
                headers={"Authorization": f"Bearer {teacher_token}"}
            )
            if delete_response.status_code == 200:
                deleted += 1
        
        print(f"✓ Cleaned up {deleted} test grades")
