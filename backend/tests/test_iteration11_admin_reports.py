"""
Iteration 11: School Admin Reporting Module Tests
Tests for: Announcements, Calendar, Documents, Stats endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@nxgensports.com"
ADMIN_PASSWORD = "Admin123!"


class TestAdminReportsAuth:
    """Authentication and basic access tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_login_success(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Login successful for {ADMIN_EMAIL}")


class TestAnnouncements:
    """Announcements CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_list_announcements(self, auth_headers):
        """GET /api/admin/announcements - list announcements"""
        response = requests.get(f"{BASE_URL}/api/admin/announcements", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List announcements: {len(data)} items")
    
    def test_create_announcement(self, auth_headers):
        """POST /api/admin/announcements - create announcement"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Announcement_{unique_id}",
            "content": "This is a test announcement content",
            "priority": "high",
            "audience": "all",
            "email_broadcast": False
        }
        response = requests.post(f"{BASE_URL}/api/admin/announcements", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["content"] == payload["content"]
        assert data["priority"] == "high"
        assert data["audience"] == "all"
        assert "id" in data
        print(f"✓ Created announcement: {data['id']}")
        return data["id"]
    
    def test_create_and_get_announcement(self, auth_headers):
        """Create announcement and verify via GET"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Verify_{unique_id}",
            "content": "Verify this announcement persists",
            "priority": "medium",
            "audience": "staff"
        }
        # Create
        create_resp = requests.post(f"{BASE_URL}/api/admin/announcements", json=payload, headers=auth_headers)
        assert create_resp.status_code == 200
        created = create_resp.json()
        ann_id = created["id"]
        
        # Verify via list
        list_resp = requests.get(f"{BASE_URL}/api/admin/announcements", headers=auth_headers)
        assert list_resp.status_code == 200
        announcements = list_resp.json()
        found = next((a for a in announcements if a["id"] == ann_id), None)
        assert found is not None, "Created announcement not found in list"
        assert found["title"] == payload["title"]
        print(f"✓ Announcement persisted and verified: {ann_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/announcements/{ann_id}", headers=auth_headers)
    
    def test_update_announcement(self, auth_headers):
        """PATCH /api/admin/announcements/{id} - update announcement"""
        # Create first
        unique_id = str(uuid.uuid4())[:8]
        create_resp = requests.post(f"{BASE_URL}/api/admin/announcements", json={
            "title": f"TEST_Update_{unique_id}",
            "content": "Original content",
            "priority": "low"
        }, headers=auth_headers)
        assert create_resp.status_code == 200
        ann_id = create_resp.json()["id"]
        
        # Update
        update_payload = {"title": f"TEST_Updated_{unique_id}", "priority": "urgent"}
        update_resp = requests.patch(f"{BASE_URL}/api/admin/announcements/{ann_id}", json=update_payload, headers=auth_headers)
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated["title"] == update_payload["title"]
        assert updated["priority"] == "urgent"
        print(f"✓ Updated announcement: {ann_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/announcements/{ann_id}", headers=auth_headers)
    
    def test_delete_announcement(self, auth_headers):
        """DELETE /api/admin/announcements/{id} - delete announcement"""
        # Create first
        unique_id = str(uuid.uuid4())[:8]
        create_resp = requests.post(f"{BASE_URL}/api/admin/announcements", json={
            "title": f"TEST_Delete_{unique_id}",
            "content": "To be deleted"
        }, headers=auth_headers)
        assert create_resp.status_code == 200
        ann_id = create_resp.json()["id"]
        
        # Delete
        delete_resp = requests.delete(f"{BASE_URL}/api/admin/announcements/{ann_id}", headers=auth_headers)
        assert delete_resp.status_code == 200
        assert delete_resp.json().get("success") == True
        
        # Verify deleted
        list_resp = requests.get(f"{BASE_URL}/api/admin/announcements", headers=auth_headers)
        announcements = list_resp.json()
        found = next((a for a in announcements if a["id"] == ann_id), None)
        assert found is None, "Deleted announcement still exists"
        print(f"✓ Deleted announcement: {ann_id}")


class TestCalendar:
    """Calendar events CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_list_calendar_events(self, auth_headers):
        """GET /api/admin/calendar - list calendar events"""
        response = requests.get(f"{BASE_URL}/api/admin/calendar", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List calendar events: {len(data)} items")
    
    def test_create_calendar_event(self, auth_headers):
        """POST /api/admin/calendar - create calendar event"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Event_{unique_id}",
            "description": "Test event description",
            "event_date": "2026-02-15",
            "event_time": "10:00",
            "location": "Main Hall",
            "event_type": "academic"
        }
        response = requests.post(f"{BASE_URL}/api/admin/calendar", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["event_date"] == "2026-02-15"
        assert data["event_type"] == "academic"
        assert "id" in data
        print(f"✓ Created calendar event: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/calendar/{data['id']}", headers=auth_headers)
    
    def test_create_and_verify_calendar_event(self, auth_headers):
        """Create calendar event and verify persistence"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Verify_Event_{unique_id}",
            "event_date": "2026-03-20",
            "event_time": "14:30",
            "location": "Gym",
            "event_type": "sports"
        }
        # Create
        create_resp = requests.post(f"{BASE_URL}/api/admin/calendar", json=payload, headers=auth_headers)
        assert create_resp.status_code == 200
        event_id = create_resp.json()["id"]
        
        # Verify via list
        list_resp = requests.get(f"{BASE_URL}/api/admin/calendar", headers=auth_headers)
        assert list_resp.status_code == 200
        events = list_resp.json()
        found = next((e for e in events if e["id"] == event_id), None)
        assert found is not None, "Created event not found in list"
        assert found["title"] == payload["title"]
        assert found["event_type"] == "sports"
        print(f"✓ Calendar event persisted: {event_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/calendar/{event_id}", headers=auth_headers)
    
    def test_update_calendar_event(self, auth_headers):
        """PATCH /api/admin/calendar/{id} - update calendar event"""
        unique_id = str(uuid.uuid4())[:8]
        # Create
        create_resp = requests.post(f"{BASE_URL}/api/admin/calendar", json={
            "title": f"TEST_Update_Event_{unique_id}",
            "event_date": "2026-04-01",
            "event_type": "meeting"
        }, headers=auth_headers)
        assert create_resp.status_code == 200
        event_id = create_resp.json()["id"]
        
        # Update
        update_payload = {"title": f"TEST_Updated_Event_{unique_id}", "location": "Conference Room B"}
        update_resp = requests.patch(f"{BASE_URL}/api/admin/calendar/{event_id}", json=update_payload, headers=auth_headers)
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated["title"] == update_payload["title"]
        assert updated["location"] == "Conference Room B"
        print(f"✓ Updated calendar event: {event_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/calendar/{event_id}", headers=auth_headers)
    
    def test_delete_calendar_event(self, auth_headers):
        """DELETE /api/admin/calendar/{id} - delete calendar event"""
        unique_id = str(uuid.uuid4())[:8]
        # Create
        create_resp = requests.post(f"{BASE_URL}/api/admin/calendar", json={
            "title": f"TEST_Delete_Event_{unique_id}",
            "event_date": "2026-05-01"
        }, headers=auth_headers)
        assert create_resp.status_code == 200
        event_id = create_resp.json()["id"]
        
        # Delete
        delete_resp = requests.delete(f"{BASE_URL}/api/admin/calendar/{event_id}", headers=auth_headers)
        assert delete_resp.status_code == 200
        assert delete_resp.json().get("success") == True
        
        # Verify deleted
        list_resp = requests.get(f"{BASE_URL}/api/admin/calendar", headers=auth_headers)
        events = list_resp.json()
        found = next((e for e in events if e["id"] == event_id), None)
        assert found is None, "Deleted event still exists"
        print(f"✓ Deleted calendar event: {event_id}")


class TestDocuments:
    """Documents CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_list_documents(self, auth_headers):
        """GET /api/admin/documents - list documents"""
        response = requests.get(f"{BASE_URL}/api/admin/documents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List documents: {len(data)} items")
    
    def test_create_document_link(self, auth_headers):
        """POST /api/admin/documents - create document link reference"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Doc_Link_{unique_id}",
            "description": "Test document link",
            "category": "policy",
            "doc_type": "link",
            "link_url": "https://example.com/test-document"
        }
        response = requests.post(f"{BASE_URL}/api/admin/documents", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["doc_type"] == "link"
        assert data["link_url"] == payload["link_url"]
        assert data["category"] == "policy"
        assert "id" in data
        print(f"✓ Created document link: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/documents/{data['id']}", headers=auth_headers)
    
    def test_create_and_verify_document(self, auth_headers):
        """Create document and verify persistence"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Verify_Doc_{unique_id}",
            "description": "Verify this document persists",
            "category": "handbook",
            "doc_type": "link",
            "link_url": "https://example.com/handbook"
        }
        # Create
        create_resp = requests.post(f"{BASE_URL}/api/admin/documents", json=payload, headers=auth_headers)
        assert create_resp.status_code == 200
        doc_id = create_resp.json()["id"]
        
        # Verify via list
        list_resp = requests.get(f"{BASE_URL}/api/admin/documents", headers=auth_headers)
        assert list_resp.status_code == 200
        docs = list_resp.json()
        found = next((d for d in docs if d["id"] == doc_id), None)
        assert found is not None, "Created document not found in list"
        assert found["title"] == payload["title"]
        assert found["category"] == "handbook"
        print(f"✓ Document persisted: {doc_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/documents/{doc_id}", headers=auth_headers)
    
    def test_upload_document_file(self, auth_headers):
        """POST /api/admin/documents/upload - upload file document"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create a test file content
        file_content = b"This is a test document content for upload testing."
        files = {
            "file": (f"test_doc_{unique_id}.txt", file_content, "text/plain")
        }
        data = {
            "title": f"TEST_Upload_{unique_id}",
            "description": "Uploaded test file",
            "category": "form"
        }
        
        # Remove Content-Type from headers for multipart upload
        upload_headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(f"{BASE_URL}/api/admin/documents/upload", files=files, data=data, headers=upload_headers)
        assert response.status_code == 200, f"Upload failed: {response.text}"
        result = response.json()
        assert result["doc_type"] == "file"
        assert "file_url" in result
        assert result["file_size"] == len(file_content)
        print(f"✓ Uploaded document file: {result['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/documents/{result['id']}", headers=auth_headers)
    
    def test_delete_document(self, auth_headers):
        """DELETE /api/admin/documents/{id} - delete document"""
        unique_id = str(uuid.uuid4())[:8]
        # Create
        create_resp = requests.post(f"{BASE_URL}/api/admin/documents", json={
            "title": f"TEST_Delete_Doc_{unique_id}",
            "doc_type": "link",
            "link_url": "https://example.com/to-delete"
        }, headers=auth_headers)
        assert create_resp.status_code == 200
        doc_id = create_resp.json()["id"]
        
        # Delete
        delete_resp = requests.delete(f"{BASE_URL}/api/admin/documents/{doc_id}", headers=auth_headers)
        assert delete_resp.status_code == 200
        assert delete_resp.json().get("success") == True
        
        # Verify deleted
        list_resp = requests.get(f"{BASE_URL}/api/admin/documents", headers=auth_headers)
        docs = list_resp.json()
        found = next((d for d in docs if d["id"] == doc_id), None)
        assert found is None, "Deleted document still exists"
        print(f"✓ Deleted document: {doc_id}")


class TestEnrollmentStats:
    """Enrollment stats endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_enrollment_stats(self, auth_headers):
        """GET /api/admin/stats - get enrollment stats"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers)
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        
        # Verify all expected fields exist
        expected_fields = [
            "total_students", "total_faculty", "total_clubs", "active_clubs",
            "total_users", "staff_count", "player_count", "parent_count",
            "total_announcements", "upcoming_events", "total_documents",
            "grade_distribution"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify types
        assert isinstance(data["total_students"], int)
        assert isinstance(data["total_faculty"], int)
        assert isinstance(data["total_clubs"], int)
        assert isinstance(data["grade_distribution"], list)
        
        print(f"✓ Stats retrieved: students={data['total_students']}, faculty={data['total_faculty']}, clubs={data['total_clubs']}")
    
    def test_stats_grade_distribution_format(self, auth_headers):
        """Verify grade distribution format"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        grade_dist = data.get("grade_distribution", [])
        for item in grade_dist:
            assert "grade" in item, "Grade distribution item missing 'grade'"
            assert "count" in item, "Grade distribution item missing 'count'"
            assert isinstance(item["count"], int)
        
        print(f"✓ Grade distribution format valid: {len(grade_dist)} grades")


class TestUnauthorizedAccess:
    """Test unauthorized access is blocked"""
    
    def test_announcements_requires_auth(self):
        """Announcements endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/announcements")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Announcements requires auth")
    
    def test_calendar_requires_auth(self):
        """Calendar endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/calendar")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Calendar requires auth")
    
    def test_documents_requires_auth(self):
        """Documents endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/documents")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Documents requires auth")
    
    def test_stats_requires_auth(self):
        """Stats endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Stats requires auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
