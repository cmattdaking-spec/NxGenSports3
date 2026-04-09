"""
Iteration 12: Testing Analytics and Digest features
- GET /api/admin/analytics - engagement analytics data
- GET /api/admin/digest/settings - get digest configuration
- PATCH /api/admin/digest/settings - save digest settings
- POST /api/admin/digest/send - manually trigger digest email
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication for testing"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for super admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nxgensports.com",
            "password": "Admin123!"
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


class TestAnalyticsEndpoint(TestAuth):
    """Test GET /api/admin/analytics endpoint"""
    
    def test_analytics_requires_auth(self):
        """Analytics endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code == 401, "Should return 401 without auth"
    
    def test_analytics_returns_data(self, auth_headers):
        """Analytics endpoint should return engagement data"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics", headers=auth_headers)
        assert response.status_code == 200, f"Analytics failed: {response.text}"
        data = response.json()
        
        # Verify all expected fields are present
        expected_fields = [
            "login_activity",
            "message_activity",
            "attendance_rate",
            "attendance_total",
            "attendance_present",
            "assignment_completion_rate",
            "assignments_total",
            "assignments_submitted",
            "meetings_total",
            "meetings_this_week",
            "meeting_status_distribution",
            "new_users_this_week",
            "new_users_this_month",
            "announcements_this_week",
            "messages_this_week",
            "messages_this_month",
            "conversations_total",
            "discipline_incidents_this_month"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"Analytics data received with {len(data)} fields")
    
    def test_analytics_login_activity_structure(self, auth_headers):
        """Login activity should be a list with date and logins"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        login_activity = data.get("login_activity", [])
        assert isinstance(login_activity, list), "login_activity should be a list"
        
        if len(login_activity) > 0:
            item = login_activity[0]
            assert "date" in item, "login_activity item should have 'date'"
            assert "logins" in item, "login_activity item should have 'logins'"
            print(f"Login activity has {len(login_activity)} entries")
        else:
            print("No login activity data (empty list)")
    
    def test_analytics_message_activity_structure(self, auth_headers):
        """Message activity should be a list with date and messages"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        message_activity = data.get("message_activity", [])
        assert isinstance(message_activity, list), "message_activity should be a list"
        
        if len(message_activity) > 0:
            item = message_activity[0]
            assert "date" in item, "message_activity item should have 'date'"
            assert "messages" in item, "message_activity item should have 'messages'"
            print(f"Message activity has {len(message_activity)} entries")
        else:
            print("No message activity data (empty list)")
    
    def test_analytics_meeting_status_distribution(self, auth_headers):
        """Meeting status distribution should be a list with status and count"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        meeting_dist = data.get("meeting_status_distribution", [])
        assert isinstance(meeting_dist, list), "meeting_status_distribution should be a list"
        
        if len(meeting_dist) > 0:
            item = meeting_dist[0]
            assert "status" in item, "meeting_status_distribution item should have 'status'"
            assert "count" in item, "meeting_status_distribution item should have 'count'"
            print(f"Meeting status distribution: {meeting_dist}")
        else:
            print("No meeting status distribution data")
    
    def test_analytics_rates_are_numbers(self, auth_headers):
        """Attendance and assignment rates should be numeric"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        attendance_rate = data.get("attendance_rate")
        assignment_rate = data.get("assignment_completion_rate")
        
        assert isinstance(attendance_rate, (int, float)), "attendance_rate should be numeric"
        assert isinstance(assignment_rate, (int, float)), "assignment_completion_rate should be numeric"
        assert 0 <= attendance_rate <= 100, "attendance_rate should be 0-100"
        assert 0 <= assignment_rate <= 100, "assignment_completion_rate should be 0-100"
        
        print(f"Attendance rate: {attendance_rate}%, Assignment rate: {assignment_rate}%")


class TestDigestSettingsEndpoint(TestAuth):
    """Test GET/PATCH /api/admin/digest/settings endpoints"""
    
    def test_digest_settings_requires_auth(self):
        """Digest settings endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/digest/settings")
        assert response.status_code == 401, "Should return 401 without auth"
    
    def test_get_digest_settings(self, auth_headers):
        """Should return digest settings with default values"""
        response = requests.get(f"{BASE_URL}/api/admin/digest/settings", headers=auth_headers)
        assert response.status_code == 200, f"Get settings failed: {response.text}"
        data = response.json()
        
        # Verify expected fields
        assert "enabled" in data, "Missing 'enabled' field"
        assert "day" in data, "Missing 'day' field"
        assert "hour" in data, "Missing 'hour' field"
        assert "audience" in data, "Missing 'audience' field"
        
        print(f"Digest settings: enabled={data['enabled']}, day={data['day']}, hour={data['hour']}, audience={data['audience']}")
    
    def test_update_digest_settings_enable(self, auth_headers):
        """Should be able to enable digest and set day/hour/audience"""
        payload = {
            "enabled": True,
            "day": "wednesday",
            "hour": 10,
            "audience": "staff"
        }
        response = requests.patch(f"{BASE_URL}/api/admin/digest/settings", 
                                  headers=auth_headers, json=payload)
        assert response.status_code == 200, f"Update settings failed: {response.text}"
        data = response.json()
        
        assert data["enabled"] == True, "enabled should be True"
        assert data["day"] == "wednesday", "day should be wednesday"
        assert data["hour"] == 10, "hour should be 10"
        assert data["audience"] == "staff", "audience should be staff"
        
        print(f"Updated digest settings: {data}")
    
    def test_update_digest_settings_disable(self, auth_headers):
        """Should be able to disable digest"""
        payload = {
            "enabled": False,
            "day": "monday",
            "hour": 8,
            "audience": "all"
        }
        response = requests.patch(f"{BASE_URL}/api/admin/digest/settings", 
                                  headers=auth_headers, json=payload)
        assert response.status_code == 200, f"Update settings failed: {response.text}"
        data = response.json()
        
        assert data["enabled"] == False, "enabled should be False"
        assert data["day"] == "monday", "day should be monday"
        assert data["hour"] == 8, "hour should be 8"
        assert data["audience"] == "all", "audience should be all"
        
        print(f"Disabled digest settings: {data}")
    
    def test_digest_settings_persist(self, auth_headers):
        """Settings should persist after update"""
        # First update
        payload = {"enabled": True, "day": "friday", "hour": 14, "audience": "staff"}
        requests.patch(f"{BASE_URL}/api/admin/digest/settings", 
                       headers=auth_headers, json=payload)
        
        # Then get to verify persistence
        response = requests.get(f"{BASE_URL}/api/admin/digest/settings", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["enabled"] == True, "enabled should persist"
        assert data["day"] == "friday", "day should persist"
        assert data["hour"] == 14, "hour should persist"
        assert data["audience"] == "staff", "audience should persist"
        
        print("Digest settings persisted correctly")


class TestDigestSendEndpoint(TestAuth):
    """Test POST /api/admin/digest/send endpoint"""
    
    def test_digest_send_requires_auth(self):
        """Digest send endpoint should require authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/digest/send")
        assert response.status_code == 401, "Should return 401 without auth"
    
    def test_digest_send_now(self, auth_headers):
        """Should be able to manually trigger digest send"""
        response = requests.post(f"{BASE_URL}/api/admin/digest/send", headers=auth_headers)
        assert response.status_code == 200, f"Send digest failed: {response.text}"
        data = response.json()
        
        assert "success" in data, "Response should have 'success' field"
        assert data["success"] == True, "success should be True"
        assert "recipients" in data, "Response should have 'recipients' field"
        assert isinstance(data["recipients"], int), "recipients should be an integer"
        
        print(f"Digest sent to {data['recipients']} recipient(s)")


class TestDigestSettingsValidation(TestAuth):
    """Test digest settings validation"""
    
    def test_digest_settings_valid_days(self, auth_headers):
        """Should accept all valid day values"""
        valid_days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        
        for day in valid_days:
            payload = {"day": day}
            response = requests.patch(f"{BASE_URL}/api/admin/digest/settings", 
                                      headers=auth_headers, json=payload)
            assert response.status_code == 200, f"Failed for day={day}: {response.text}"
        
        print(f"All {len(valid_days)} day values accepted")
    
    def test_digest_settings_valid_hours(self, auth_headers):
        """Should accept hour values 0-23"""
        for hour in [0, 8, 12, 18, 23]:
            payload = {"hour": hour}
            response = requests.patch(f"{BASE_URL}/api/admin/digest/settings", 
                                      headers=auth_headers, json=payload)
            assert response.status_code == 200, f"Failed for hour={hour}: {response.text}"
        
        print("Hour values 0-23 accepted")
    
    def test_digest_settings_valid_audiences(self, auth_headers):
        """Should accept valid audience values"""
        valid_audiences = ["staff", "all"]
        
        for audience in valid_audiences:
            payload = {"audience": audience}
            response = requests.patch(f"{BASE_URL}/api/admin/digest/settings", 
                                      headers=auth_headers, json=payload)
            assert response.status_code == 200, f"Failed for audience={audience}: {response.text}"
        
        print(f"All {len(valid_audiences)} audience values accepted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
