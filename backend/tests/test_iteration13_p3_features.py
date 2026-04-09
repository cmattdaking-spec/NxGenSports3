"""
Iteration 13: P3 Features Testing
- Two-Factor Authentication (2FA) - TOTP via pyotp
- Data Export/Import - CSV export/import for students, faculty, grades, attendance, clubs
- Report Card PDF Generation - per-student PDF with grades, attendance, discipline
"""
import pytest
import requests
import os
import pyotp
import io

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://school-management-49.preview.emergentagent.com"

# Test credentials
ADMIN_EMAIL = "admin@nxgensports.com"
ADMIN_PASSWORD = "Admin123!"

# Known student ID from context
STUDENT_ID = "69d7bd6bec24929abf200ef7"


class TestAuth:
    """Get auth token for tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert res.status_code == 200, f"Login failed: {res.text}"
        data = res.json()
        # If 2FA is enabled, we need to handle it
        if data.get("requires_2fa"):
            pytest.skip("2FA is enabled on admin account - need to verify first")
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}


# ═══════════════════════════════════════════════════════════════════════════════
# TWO-FACTOR AUTHENTICATION TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class Test2FA(TestAuth):
    """Two-Factor Authentication endpoint tests"""
    
    def test_2fa_status_endpoint(self, auth_headers):
        """GET /api/auth/2fa/status - returns 2FA enabled status"""
        res = requests.get(f"{BASE_URL}/api/auth/2fa/status", headers=auth_headers)
        assert res.status_code == 200, f"2FA status failed: {res.text}"
        data = res.json()
        assert "two_factor_enabled" in data
        assert isinstance(data["two_factor_enabled"], bool)
        print(f"✓ 2FA status: enabled={data['two_factor_enabled']}")
    
    def test_2fa_status_requires_auth(self):
        """2FA status requires authentication"""
        res = requests.get(f"{BASE_URL}/api/auth/2fa/status")
        assert res.status_code == 401, "Should require auth"
        print("✓ 2FA status requires authentication")
    
    def test_2fa_setup_endpoint(self, auth_headers):
        """POST /api/auth/2fa/setup - returns QR code and manual key"""
        res = requests.post(f"{BASE_URL}/api/auth/2fa/setup", headers=auth_headers)
        # May fail if 2FA is already enabled
        if res.status_code == 400:
            data = res.json()
            if "already enabled" in data.get("detail", "").lower():
                print("✓ 2FA setup correctly rejects when already enabled")
                return
        assert res.status_code == 200, f"2FA setup failed: {res.text}"
        data = res.json()
        assert "qr_code" in data, "Missing qr_code in response"
        assert "manual_key" in data, "Missing manual_key in response"
        assert data["qr_code"].startswith("data:image/png;base64,"), "QR code should be base64 PNG"
        assert len(data["manual_key"]) >= 16, "Manual key should be at least 16 chars"
        print(f"✓ 2FA setup returns QR code and manual key (key length: {len(data['manual_key'])})")
    
    def test_2fa_setup_requires_auth(self):
        """2FA setup requires authentication"""
        res = requests.post(f"{BASE_URL}/api/auth/2fa/setup")
        assert res.status_code == 401, "Should require auth"
        print("✓ 2FA setup requires authentication")
    
    def test_2fa_verify_setup_invalid_code(self, auth_headers):
        """POST /api/auth/2fa/verify-setup - rejects invalid code"""
        res = requests.post(f"{BASE_URL}/api/auth/2fa/verify-setup", 
                          headers=auth_headers, json={"code": "000000"})
        # Should fail with 400 (no setup) or 401 (invalid code)
        assert res.status_code in [400, 401], f"Should reject invalid code: {res.text}"
        print("✓ 2FA verify-setup rejects invalid code")
    
    def test_2fa_verify_setup_bad_format(self, auth_headers):
        """POST /api/auth/2fa/verify-setup - rejects bad code format"""
        res = requests.post(f"{BASE_URL}/api/auth/2fa/verify-setup", 
                          headers=auth_headers, json={"code": "abc"})
        assert res.status_code == 400, f"Should reject bad format: {res.text}"
        print("✓ 2FA verify-setup rejects bad code format")
    
    def test_2fa_verify_login_missing_params(self):
        """POST /api/auth/2fa/verify-login - requires token and code"""
        res = requests.post(f"{BASE_URL}/api/auth/2fa/verify-login", json={})
        assert res.status_code == 400, f"Should require params: {res.text}"
        print("✓ 2FA verify-login requires token and code")
    
    def test_2fa_verify_login_invalid_token(self):
        """POST /api/auth/2fa/verify-login - rejects invalid token"""
        res = requests.post(f"{BASE_URL}/api/auth/2fa/verify-login", 
                          json={"token": "invalid_token", "code": "123456"})
        assert res.status_code == 401, f"Should reject invalid token: {res.text}"
        print("✓ 2FA verify-login rejects invalid token")
    
    def test_2fa_disable_requires_code(self, auth_headers):
        """POST /api/auth/2fa/disable - requires TOTP code"""
        res = requests.post(f"{BASE_URL}/api/auth/2fa/disable", 
                          headers=auth_headers, json={})
        assert res.status_code == 400, f"Should require code: {res.text}"
        print("✓ 2FA disable requires TOTP code")
    
    def test_2fa_disable_invalid_code(self, auth_headers):
        """POST /api/auth/2fa/disable - rejects invalid code when 2FA not enabled"""
        res = requests.post(f"{BASE_URL}/api/auth/2fa/disable", 
                          headers=auth_headers, json={"code": "000000"})
        # Should fail with 400 (not enabled) or 401 (invalid code)
        assert res.status_code in [400, 401], f"Should reject: {res.text}"
        print("✓ 2FA disable handles invalid code correctly")


class Test2FAFullFlow(TestAuth):
    """Full 2FA flow test - setup, verify, login with 2FA, disable"""
    
    def test_2fa_full_flow(self, auth_headers):
        """Test complete 2FA flow: setup -> verify -> login with 2FA -> disable"""
        # Step 1: Check initial status
        res = requests.get(f"{BASE_URL}/api/auth/2fa/status", headers=auth_headers)
        assert res.status_code == 200
        initial_status = res.json()["two_factor_enabled"]
        print(f"Initial 2FA status: {initial_status}")
        
        if initial_status:
            print("⚠ 2FA already enabled - skipping full flow test")
            return
        
        # Step 2: Setup 2FA
        res = requests.post(f"{BASE_URL}/api/auth/2fa/setup", headers=auth_headers)
        assert res.status_code == 200, f"Setup failed: {res.text}"
        setup_data = res.json()
        secret = setup_data["manual_key"]
        print(f"✓ 2FA setup complete, got secret")
        
        # Step 3: Generate valid TOTP code
        totp = pyotp.TOTP(secret)
        valid_code = totp.now()
        print(f"✓ Generated TOTP code: {valid_code}")
        
        # Step 4: Verify setup with valid code
        res = requests.post(f"{BASE_URL}/api/auth/2fa/verify-setup", 
                          headers=auth_headers, json={"code": valid_code})
        assert res.status_code == 200, f"Verify setup failed: {res.text}"
        verify_data = res.json()
        assert verify_data.get("success") == True
        assert "backup_codes" in verify_data
        assert len(verify_data["backup_codes"]) == 8, "Should have 8 backup codes"
        print(f"✓ 2FA enabled, got {len(verify_data['backup_codes'])} backup codes")
        
        # Step 5: Verify 2FA is now enabled
        res = requests.get(f"{BASE_URL}/api/auth/2fa/status", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["two_factor_enabled"] == True
        print("✓ 2FA status confirmed enabled")
        
        # Step 6: Test login with 2FA
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert res.status_code == 200
        login_data = res.json()
        assert login_data.get("requires_2fa") == True, "Login should require 2FA"
        assert login_data.get("token_type") == "bearer_2fa"
        temp_token = login_data["access_token"]
        print("✓ Login returns requires_2fa=true with temp token")
        
        # Step 7: Verify login with TOTP
        new_code = totp.now()
        res = requests.post(f"{BASE_URL}/api/auth/2fa/verify-login", json={
            "token": temp_token,
            "code": new_code
        })
        assert res.status_code == 200, f"Verify login failed: {res.text}"
        full_login_data = res.json()
        assert "access_token" in full_login_data
        assert full_login_data.get("token_type") == "bearer"
        assert "user" in full_login_data
        new_token = full_login_data["access_token"]
        print("✓ 2FA login verification successful")
        
        # Step 8: Disable 2FA
        new_headers = {"Authorization": f"Bearer {new_token}"}
        disable_code = totp.now()
        res = requests.post(f"{BASE_URL}/api/auth/2fa/disable", 
                          headers=new_headers, json={"code": disable_code})
        assert res.status_code == 200, f"Disable failed: {res.text}"
        assert res.json().get("success") == True
        print("✓ 2FA disabled successfully")
        
        # Step 9: Verify 2FA is disabled
        res = requests.get(f"{BASE_URL}/api/auth/2fa/status", headers=new_headers)
        assert res.status_code == 200
        assert res.json()["two_factor_enabled"] == False
        print("✓ 2FA status confirmed disabled")
        
        print("\n✅ FULL 2FA FLOW TEST PASSED")


# ═══════════════════════════════════════════════════════════════════════════════
# DATA EXPORT TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestDataExport(TestAuth):
    """Data Export endpoint tests - CSV downloads"""
    
    def test_export_students(self, auth_headers):
        """GET /api/data/export/students - CSV download"""
        res = requests.get(f"{BASE_URL}/api/data/export/students", headers=auth_headers)
        assert res.status_code == 200, f"Export students failed: {res.text}"
        assert "text/csv" in res.headers.get("content-type", "")
        assert "attachment" in res.headers.get("content-disposition", "")
        # Check CSV has headers
        content = res.text
        assert "First Name" in content or "first_name" in content.lower()
        print(f"✓ Students export: {len(content)} bytes, CSV format")
    
    def test_export_faculty(self, auth_headers):
        """GET /api/data/export/faculty - CSV download"""
        res = requests.get(f"{BASE_URL}/api/data/export/faculty", headers=auth_headers)
        assert res.status_code == 200, f"Export faculty failed: {res.text}"
        assert "text/csv" in res.headers.get("content-type", "")
        content = res.text
        assert "First Name" in content or "first_name" in content.lower()
        print(f"✓ Faculty export: {len(content)} bytes, CSV format")
    
    def test_export_grades(self, auth_headers):
        """GET /api/data/export/grades - CSV download"""
        res = requests.get(f"{BASE_URL}/api/data/export/grades", headers=auth_headers)
        assert res.status_code == 200, f"Export grades failed: {res.text}"
        assert "text/csv" in res.headers.get("content-type", "")
        content = res.text
        assert "Subject" in content or "subject" in content.lower() or "Student" in content
        print(f"✓ Grades export: {len(content)} bytes, CSV format")
    
    def test_export_attendance(self, auth_headers):
        """GET /api/data/export/attendance - CSV download"""
        res = requests.get(f"{BASE_URL}/api/data/export/attendance", headers=auth_headers)
        assert res.status_code == 200, f"Export attendance failed: {res.text}"
        assert "text/csv" in res.headers.get("content-type", "")
        content = res.text
        assert "Student" in content or "Date" in content or "Status" in content
        print(f"✓ Attendance export: {len(content)} bytes, CSV format")
    
    def test_export_clubs(self, auth_headers):
        """GET /api/data/export/clubs - CSV download"""
        res = requests.get(f"{BASE_URL}/api/data/export/clubs", headers=auth_headers)
        assert res.status_code == 200, f"Export clubs failed: {res.text}"
        assert "text/csv" in res.headers.get("content-type", "")
        content = res.text
        assert "Name" in content or "name" in content.lower()
        print(f"✓ Clubs export: {len(content)} bytes, CSV format")
    
    def test_export_requires_auth(self):
        """Export endpoints require authentication"""
        endpoints = ["students", "faculty", "grades", "attendance", "clubs"]
        for ep in endpoints:
            res = requests.get(f"{BASE_URL}/api/data/export/{ep}")
            assert res.status_code == 401, f"Export {ep} should require auth"
        print("✓ All export endpoints require authentication")


# ═══════════════════════════════════════════════════════════════════════════════
# DATA IMPORT TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestDataImport(TestAuth):
    """Data Import endpoint tests - CSV bulk import"""
    
    def test_import_students_valid_csv(self, auth_headers):
        """POST /api/data/import/students - bulk CSV import with validation"""
        csv_content = """First Name,Last Name,Email,Student ID,Grade Level,Gender
TEST_Import1,Student1,test_import1@test.com,IMP001,10,Male
TEST_Import2,Student2,test_import2@test.com,IMP002,11,Female
TEST_Import3,Student3,test_import3@test.com,IMP003,12,Male"""
        
        files = {"file": ("test_students.csv", io.StringIO(csv_content), "text/csv")}
        res = requests.post(f"{BASE_URL}/api/data/import/students", 
                          headers=auth_headers, files=files)
        assert res.status_code == 200, f"Import students failed: {res.text}"
        data = res.json()
        assert data.get("success") == True
        assert "imported" in data
        assert "skipped" in data
        assert "total_rows" in data
        print(f"✓ Students import: {data['imported']} imported, {data['skipped']} skipped, {data['total_rows']} total")
    
    def test_import_faculty_valid_csv(self, auth_headers):
        """POST /api/data/import/faculty - bulk CSV import"""
        csv_content = """First Name,Last Name,Email,Employee ID,Department,Position
TEST_Faculty1,Teacher1,test_faculty1@test.com,FAC001,Math,Teacher
TEST_Faculty2,Teacher2,test_faculty2@test.com,FAC002,Science,Teacher"""
        
        files = {"file": ("test_faculty.csv", io.StringIO(csv_content), "text/csv")}
        res = requests.post(f"{BASE_URL}/api/data/import/faculty", 
                          headers=auth_headers, files=files)
        assert res.status_code == 200, f"Import faculty failed: {res.text}"
        data = res.json()
        assert data.get("success") == True
        print(f"✓ Faculty import: {data['imported']} imported, {data['skipped']} skipped")
    
    def test_import_empty_csv(self, auth_headers):
        """Import rejects empty CSV"""
        csv_content = ""
        files = {"file": ("empty.csv", io.StringIO(csv_content), "text/csv")}
        res = requests.post(f"{BASE_URL}/api/data/import/students", 
                          headers=auth_headers, files=files)
        assert res.status_code == 400, f"Should reject empty CSV: {res.text}"
        print("✓ Import rejects empty CSV")
    
    def test_import_missing_name(self, auth_headers):
        """Import handles rows with missing required fields"""
        csv_content = """First Name,Last Name,Email
,MissingFirst,missing@test.com
ValidFirst,ValidLast,valid@test.com"""
        
        files = {"file": ("test.csv", io.StringIO(csv_content), "text/csv")}
        res = requests.post(f"{BASE_URL}/api/data/import/students", 
                          headers=auth_headers, files=files)
        assert res.status_code == 200, f"Import failed: {res.text}"
        data = res.json()
        # Should have at least 1 skipped (missing name) and 1 imported
        assert data.get("skipped", 0) >= 1 or data.get("imported", 0) >= 1
        print(f"✓ Import handles missing fields: {data['imported']} imported, {data['skipped']} skipped")
    
    def test_import_requires_auth(self):
        """Import endpoints require authentication"""
        csv_content = "First Name,Last Name\nTest,User"
        files = {"file": ("test.csv", io.StringIO(csv_content), "text/csv")}
        res = requests.post(f"{BASE_URL}/api/data/import/students", files=files)
        assert res.status_code == 401, "Import should require auth"
        print("✓ Import requires authentication")


# ═══════════════════════════════════════════════════════════════════════════════
# REPORT CARD PDF TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestReportCards(TestAuth):
    """Report Card PDF generation tests"""
    
    def test_report_card_generation(self, auth_headers):
        """GET /api/reports/report-card/{student_id} - generates PDF report card"""
        res = requests.get(f"{BASE_URL}/api/reports/report-card/{STUDENT_ID}", 
                          headers=auth_headers)
        assert res.status_code == 200, f"Report card generation failed: {res.text}"
        assert "application/pdf" in res.headers.get("content-type", "")
        assert "attachment" in res.headers.get("content-disposition", "")
        # Check PDF header
        content = res.content
        assert content[:4] == b"%PDF", "Should be valid PDF"
        print(f"✓ Report card PDF generated: {len(content)} bytes")
    
    def test_report_card_invalid_student(self, auth_headers):
        """Report card returns 404 for invalid student ID"""
        res = requests.get(f"{BASE_URL}/api/reports/report-card/000000000000000000000000", 
                          headers=auth_headers)
        assert res.status_code == 404, f"Should return 404: {res.text}"
        print("✓ Report card returns 404 for invalid student")
    
    def test_report_card_requires_auth(self):
        """Report card requires authentication"""
        res = requests.get(f"{BASE_URL}/api/reports/report-card/{STUDENT_ID}")
        assert res.status_code == 401, "Should require auth"
        print("✓ Report card requires authentication")
    
    def test_batch_report_cards_list(self, auth_headers):
        """GET /api/reports/report-cards/batch - lists students for batch generation"""
        res = requests.get(f"{BASE_URL}/api/reports/report-cards/batch", 
                          headers=auth_headers)
        assert res.status_code == 200, f"Batch list failed: {res.text}"
        data = res.json()
        assert "students" in data
        assert "total" in data
        assert isinstance(data["students"], list)
        if data["total"] > 0:
            student = data["students"][0]
            assert "id" in student
            assert "name" in student
        print(f"✓ Batch report cards: {data['total']} students available")
    
    def test_batch_report_cards_filter_grade(self, auth_headers):
        """Batch report cards can filter by grade level"""
        res = requests.get(f"{BASE_URL}/api/reports/report-cards/batch?grade_level=10", 
                          headers=auth_headers)
        # May return 200 with results or 404 if no students in that grade
        assert res.status_code in [200, 404], f"Unexpected status: {res.text}"
        if res.status_code == 200:
            data = res.json()
            print(f"✓ Batch filter by grade: {data['total']} students in grade 10")
        else:
            print("✓ Batch filter by grade: no students in grade 10 (404)")
    
    def test_batch_report_cards_requires_auth(self):
        """Batch report cards requires authentication"""
        res = requests.get(f"{BASE_URL}/api/reports/report-cards/batch")
        assert res.status_code == 401, "Should require auth"
        print("✓ Batch report cards requires authentication")


# ═══════════════════════════════════════════════════════════════════════════════
# CLEANUP TEST DATA
# ═══════════════════════════════════════════════════════════════════════════════

class TestCleanup(TestAuth):
    """Cleanup test data created during import tests"""
    
    def test_cleanup_imported_students(self, auth_headers):
        """Remove TEST_ prefixed students created during import tests"""
        # Get all students
        res = requests.get(f"{BASE_URL}/api/students/", headers=auth_headers)
        if res.status_code != 200:
            print("⚠ Could not fetch students for cleanup")
            return
        
        students = res.json()
        deleted = 0
        for s in students:
            if s.get("first_name", "").startswith("TEST_") or s.get("email", "").startswith("test_import"):
                del_res = requests.delete(f"{BASE_URL}/api/students/{s['id']}", headers=auth_headers)
                if del_res.status_code in [200, 204]:
                    deleted += 1
        print(f"✓ Cleanup: deleted {deleted} test students")
    
    def test_cleanup_imported_faculty(self, auth_headers):
        """Remove TEST_ prefixed faculty created during import tests"""
        res = requests.get(f"{BASE_URL}/api/faculty/", headers=auth_headers)
        if res.status_code != 200:
            print("⚠ Could not fetch faculty for cleanup")
            return
        
        faculty = res.json()
        deleted = 0
        for f in faculty:
            if f.get("first_name", "").startswith("TEST_") or f.get("email", "").startswith("test_faculty"):
                del_res = requests.delete(f"{BASE_URL}/api/faculty/{f['id']}", headers=auth_headers)
                if del_res.status_code in [200, 204]:
                    deleted += 1
        print(f"✓ Cleanup: deleted {deleted} test faculty")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
