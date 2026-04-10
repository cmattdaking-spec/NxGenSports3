"""
Iteration 17: Student Portal (My Academics) Tests
Tests the /api/students/my-portal endpoint and related functionality.
Features: GPA, grades, subject averages, attendance, schedule, discipline
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
STUDENT_EMAIL = "marcus.j@lincoln.edu"
STUDENT_PASSWORD = "Test1234!"
COACH_EMAIL = "coach.williams@lincoln.edu"
COACH_PASSWORD = "Test1234!"
TEACHER_EMAIL = "s.mitchell@lincoln.edu"
TEACHER_PASSWORD = "Test1234!"


@pytest.fixture(scope="module")
def student_token():
    """Get student (Marcus Johnson) auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": STUDENT_EMAIL,
        "password": STUDENT_PASSWORD
    })
    assert response.status_code == 200, f"Student login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def coach_token():
    """Get coach auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": COACH_EMAIL,
        "password": COACH_PASSWORD
    })
    assert response.status_code == 200, f"Coach login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def teacher_token():
    """Get teacher auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEACHER_EMAIL,
        "password": TEACHER_PASSWORD
    })
    assert response.status_code == 200, f"Teacher login failed: {response.text}"
    return response.json()["access_token"]


class TestStudentPortalEndpoint:
    """Tests for GET /api/students/my-portal endpoint"""

    def test_student_portal_returns_200(self, student_token):
        """Student can access their portal"""
        response = requests.get(
            f"{BASE_URL}/api/students/my-portal",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_student_portal_returns_student_data(self, student_token):
        """Portal returns student profile data"""
        response = requests.get(
            f"{BASE_URL}/api/students/my-portal",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        data = response.json()
        
        assert "student" in data
        student = data["student"]
        assert student is not None, "Student record should exist"
        assert student.get("full_name") == "Marcus Johnson"
        assert student.get("email") == "marcus.j@lincoln.edu"
        assert student.get("grade_level") == "11"

    def test_student_portal_returns_gpa(self, student_token):
        """Portal returns calculated GPA"""
        response = requests.get(
            f"{BASE_URL}/api/students/my-portal",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        data = response.json()
        
        assert "gpa" in data
        gpa = data["gpa"]
        assert gpa is not None, "GPA should be calculated"
        assert isinstance(gpa, (int, float))
        # Expected GPA is around 2.47 based on grades
        assert 2.0 <= gpa <= 3.0, f"GPA {gpa} should be between 2.0 and 3.0"

    def test_student_portal_returns_grades(self, student_token):
        """Portal returns grades list"""
        response = requests.get(
            f"{BASE_URL}/api/students/my-portal",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        data = response.json()
        
        assert "grades" in data
        grades = data["grades"]
        assert isinstance(grades, list)
        assert len(grades) >= 20, f"Expected at least 20 grades, got {len(grades)}"
        
        # Check grade structure
        if grades:
            grade = grades[0]
            assert "subject" in grade or "course_name" in grade
            assert "letter_grade" in grade or "grade_letter" in grade

    def test_student_portal_returns_subject_averages(self, student_token):
        """Portal returns subject averages"""
        response = requests.get(
            f"{BASE_URL}/api/students/my-portal",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        data = response.json()
        
        assert "subject_averages" in data
        subject_avgs = data["subject_averages"]
        assert isinstance(subject_avgs, list)
        assert len(subject_avgs) >= 4, f"Expected at least 4 subjects, got {len(subject_avgs)}"
        
        # Check structure
        if subject_avgs:
            avg = subject_avgs[0]
            assert "subject" in avg
            assert "average" in avg
            assert "count" in avg

    def test_student_portal_returns_attendance_summary(self, student_token):
        """Portal returns attendance summary"""
        response = requests.get(
            f"{BASE_URL}/api/students/my-portal",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        data = response.json()
        
        assert "attendance_summary" in data
        att_summary = data["attendance_summary"]
        assert isinstance(att_summary, dict)
        
        # Check required fields
        assert "total" in att_summary
        assert "present" in att_summary
        assert "absent" in att_summary
        assert "late" in att_summary
        assert "excused" in att_summary
        assert "rate" in att_summary
        
        # Verify rate calculation
        rate = att_summary["rate"]
        assert 90 <= rate <= 100, f"Attendance rate {rate}% should be high"

    def test_student_portal_returns_attendance_recent(self, student_token):
        """Portal returns recent attendance records"""
        response = requests.get(
            f"{BASE_URL}/api/students/my-portal",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        data = response.json()
        
        assert "attendance_recent" in data
        att_recent = data["attendance_recent"]
        assert isinstance(att_recent, list)
        assert len(att_recent) >= 10, f"Expected at least 10 recent records, got {len(att_recent)}"
        
        # Check structure
        if att_recent:
            record = att_recent[0]
            assert "date" in record
            assert "status" in record

    def test_student_portal_returns_schedule(self, student_token):
        """Portal returns class schedule"""
        response = requests.get(
            f"{BASE_URL}/api/students/my-portal",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        data = response.json()
        
        assert "schedule" in data
        schedule = data["schedule"]
        assert isinstance(schedule, list)
        assert len(schedule) >= 5, f"Expected at least 5 classes, got {len(schedule)}"
        
        # Check structure
        if schedule:
            cls = schedule[0]
            assert "subject_name" in cls or "subject" in cls
            assert "start_time" in cls
            assert "end_time" in cls

    def test_student_portal_returns_discipline(self, student_token):
        """Portal returns discipline records"""
        response = requests.get(
            f"{BASE_URL}/api/students/my-portal",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        data = response.json()
        
        assert "discipline" in data
        discipline = data["discipline"]
        assert isinstance(discipline, list)
        assert len(discipline) >= 1, f"Expected at least 1 discipline record, got {len(discipline)}"
        
        # Check structure
        if discipline:
            record = discipline[0]
            assert "description" in record or "incident_type" in record


class TestStudentPortalNonStudentAccess:
    """Tests for non-student users accessing /api/students/my-portal"""

    def test_coach_gets_empty_portal(self, coach_token):
        """Coach without student record gets empty data"""
        response = requests.get(
            f"{BASE_URL}/api/students/my-portal",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Coach has no student record, should return null/empty
        assert data.get("student") is None
        assert data.get("grades") == []
        assert data.get("gpa") is None

    def test_teacher_gets_empty_portal(self, teacher_token):
        """Teacher without student record gets empty data"""
        response = requests.get(
            f"{BASE_URL}/api/students/my-portal",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Teacher has no student record, should return null/empty
        assert data.get("student") is None
        assert data.get("grades") == []

    def test_unauthenticated_gets_401(self):
        """Unauthenticated request returns 401"""
        response = requests.get(f"{BASE_URL}/api/students/my-portal")
        assert response.status_code == 401


class TestStudentPortalDataIntegrity:
    """Tests for data integrity and calculations"""

    def test_gpa_calculation_accuracy(self, student_token):
        """GPA is calculated correctly from grades"""
        response = requests.get(
            f"{BASE_URL}/api/students/my-portal",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        data = response.json()
        
        gpa = data["gpa"]
        grades = data["grades"]
        
        # Manually calculate GPA
        gpa_map = {"A+": 4.0, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, 
                   "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "D-": 0.7, "F": 0.0}
        
        gpa_values = []
        for g in grades:
            letter = g.get("letter_grade") or g.get("grade_letter", "")
            if letter in gpa_map:
                gpa_values.append(gpa_map[letter])
        
        if gpa_values:
            expected_gpa = round(sum(gpa_values) / len(gpa_values), 2)
            assert abs(gpa - expected_gpa) < 0.1, f"GPA {gpa} should be close to calculated {expected_gpa}"

    def test_attendance_rate_calculation(self, student_token):
        """Attendance rate is calculated correctly"""
        response = requests.get(
            f"{BASE_URL}/api/students/my-portal",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        data = response.json()
        
        att_summary = data["attendance_summary"]
        total = att_summary["total"]
        present = att_summary["present"]
        rate = att_summary["rate"]
        
        if total > 0:
            expected_rate = round(present / total * 100, 1)
            assert abs(rate - expected_rate) < 0.2, f"Rate {rate}% should be close to {expected_rate}%"

    def test_subject_averages_match_grades(self, student_token):
        """Subject averages are calculated from grades"""
        response = requests.get(
            f"{BASE_URL}/api/students/my-portal",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        data = response.json()
        
        grades = data["grades"]
        subject_avgs = data["subject_averages"]
        
        # Count grades per subject
        subject_counts = {}
        for g in grades:
            subj = g.get("subject") or g.get("course_name", "Unknown")
            subject_counts[subj] = subject_counts.get(subj, 0) + 1
        
        # Verify counts match
        for avg in subject_avgs:
            subj = avg["subject"]
            count = avg["count"]
            assert subj in subject_counts, f"Subject {subj} should be in grades"
            assert count == subject_counts[subj], f"Count mismatch for {subj}"


class TestRegressionTeacherDashboard:
    """Regression tests for teacher dashboard (from iteration 15-16)"""

    def test_teacher_dashboard_still_works(self, teacher_token):
        """Teacher dashboard endpoint still works"""
        response = requests.get(
            f"{BASE_URL}/api/teachers/my-dashboard",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # API returns 'faculty' for teacher info
        assert "faculty" in data or "teacher" in data
        assert "classes" in data or "stats" in data

    def test_teacher_gradebook_still_works(self, teacher_token):
        """Teacher gradebook endpoint still works"""
        response = requests.get(
            f"{BASE_URL}/api/teachers/gradebook",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "students" in data
        assert "grades" in data

    def test_teacher_attendance_still_works(self, teacher_token):
        """Teacher attendance endpoint still works"""
        response = requests.get(
            f"{BASE_URL}/api/teachers/attendance",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "students" in data


class TestRegressionSchoolAdmin:
    """Regression tests for school admin (from iteration 14)"""

    def test_school_admin_stats_still_works(self):
        """School admin stats endpoint still works"""
        # Login as school admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "office@lincoln.edu",
            "password": "Test1234!"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_students" in data or "students" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
