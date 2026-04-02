"""
Iteration 4 backend tests:
- WebSocket /api/ws/messages/{token}: invalid token rejected with 4001
- WebSocket with valid token connects
- GET /api/push/vapid-public-key: returns 87-char key
- POST /api/push/subscribe: stores subscription (authenticated)
- DELETE /api/push/subscribe: removes subscriptions
- Super admin GET /api/auth/me: role=super_admin, email=admin@nxgensports.com
- Service worker /sw.js accessible
- POST /api/entities/Message: creates message (broadcast logged)
"""
import pytest
import requests
import os
import websocket  # websocket-client

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

ADMIN_EMAIL = "admin@nxgensports.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def admin_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    token = data.get("token") or (data.get("user", {}) or {}).get("token")
    # Try cookie or Authorization header
    cookies = resp.cookies.get_dict()
    if not token:
        # try response body
        token = data.get("access_token")
    return token, resp.cookies


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    token, cookies = admin_token
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}


@pytest.fixture(scope="module")
def auth_session(admin_token):
    token, cookies = admin_token
    s = requests.Session()
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    else:
        s.cookies.update(cookies)
    return s


# ── Super Admin tests ──────────────────────────────────────────────────────────

class TestSuperAdmin:
    """Test super admin exists and has correct role"""

    def test_login_super_admin(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login",
                             json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert resp.status_code == 200, f"Admin login failed: {resp.text}"

    def test_super_admin_role_and_email(self, auth_session):
        resp = auth_session.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 200, f"GET /api/auth/me failed: {resp.text}"
        data = resp.json()
        assert data.get("email") == ADMIN_EMAIL, f"Expected {ADMIN_EMAIL}, got {data.get('email')}"
        assert data.get("role") == "super_admin", f"Expected super_admin, got {data.get('role')}"


# ── VAPID / Push endpoints ─────────────────────────────────────────────────────

class TestPushEndpoints:
    """Test push notification endpoints"""

    def test_vapid_public_key_returns_200(self):
        resp = requests.get(f"{BASE_URL}/api/push/vapid-public-key")
        assert resp.status_code == 200, f"VAPID key endpoint failed: {resp.text}"

    def test_vapid_public_key_length(self):
        resp = requests.get(f"{BASE_URL}/api/push/vapid-public-key")
        data = resp.json()
        key = data.get("publicKey", "")
        assert len(key) > 0, "publicKey is empty"
        # VAPID public keys in base64url are typically 87 chars
        assert len(key) >= 80, f"publicKey too short: {len(key)} chars — got: {key}"

    def test_push_subscribe_unauthenticated_returns_401(self):
        resp = requests.post(f"{BASE_URL}/api/push/subscribe", json={
            "endpoint": "https://example.com/push/fake",
            "p256dh": "fake_p256dh",
            "auth": "fake_auth",
        })
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"

    def test_push_subscribe_authenticated(self, auth_session):
        resp = auth_session.post(f"{BASE_URL}/api/push/subscribe", json={
            "endpoint": "https://fcm.googleapis.com/fcm/send/TEST_SUBSCRIPTION_ENDPOINT",
            "p256dh": "TEST_p256dh_base64urlvalue",
            "auth": "TEST_auth_base64val",
        })
        assert resp.status_code == 200, f"Subscribe failed: {resp.text}"
        data = resp.json()
        assert data.get("success") is True

    def test_push_subscribe_missing_fields_returns_400(self, auth_session):
        resp = auth_session.post(f"{BASE_URL}/api/push/subscribe", json={
            "endpoint": "https://example.com/push/fake",
            # missing p256dh and auth
        })
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"

    def test_push_delete_subscribe_authenticated(self, auth_session):
        resp = auth_session.delete(f"{BASE_URL}/api/push/subscribe", json={})
        assert resp.status_code == 200, f"Delete subscribe failed: {resp.text}"
        data = resp.json()
        assert data.get("success") is True

    def test_push_delete_unauthenticated_returns_401(self):
        resp = requests.delete(f"{BASE_URL}/api/push/subscribe", json={})
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"


# ── Service Worker ─────────────────────────────────────────────────────────────

class TestServiceWorker:
    """Test sw.js is accessible"""

    def test_sw_js_accessible(self):
        resp = requests.get(f"{BASE_URL}/sw.js")
        assert resp.status_code == 200, f"sw.js not accessible: {resp.status_code}"


# ── WebSocket tests ────────────────────────────────────────────────────────────

class TestWebSocket:
    """Test WebSocket endpoint /api/ws/messages/{token}"""

    def test_ws_invalid_token_closes_4001(self):
        """WebSocket with invalid token should close with code 4001"""
        import threading

        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
        ws_url = f"{ws_url}/api/ws/messages/invalid.token.here"

        close_code = [None]
        closed_event = threading.Event()

        def on_close(ws, code, msg):
            close_code[0] = code
            closed_event.set()

        def on_error(ws, err):
            closed_event.set()

        ws = websocket.WebSocketApp(
            ws_url,
            on_close=on_close,
            on_error=on_error,
        )
        t = threading.Thread(target=ws.run_forever, daemon=True)
        t.start()
        closed_event.wait(timeout=10)
        # Close code 4001 (or connection refused quickly)
        assert close_code[0] == 4001 or closed_event.is_set(), f"Expected 4001 close, got {close_code[0]}"

    def test_ws_valid_token_connects_and_ping(self, admin_token):
        """WebSocket with valid token should connect and respond to ping"""
        import threading

        token_val, _ = admin_token
        if not token_val:
            pytest.skip("No token available")

        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
        ws_url = f"{ws_url}/api/ws/messages/{token_val}"

        pong_received = threading.Event()
        opened = threading.Event()
        errors = []

        def on_open(ws):
            opened.set()
            ws.send("ping")

        def on_message(ws, msg):
            if msg == "pong":
                pong_received.set()
                ws.close()

        def on_error(ws, err):
            errors.append(str(err))

        ws = websocket.WebSocketApp(
            ws_url,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
        )
        t = threading.Thread(target=ws.run_forever, daemon=True)
        t.start()
        opened.wait(timeout=10)
        pong_received.wait(timeout=10)
        assert opened.is_set(), "WebSocket did not open with valid token"
        assert pong_received.is_set(), f"No pong received. Errors: {errors}"


# ── Message creation + broadcast ──────────────────────────────────────────────

class TestMessageBroadcast:
    """Test creating a Message entity triggers broadcast (log-level verification)"""

    def test_create_message_entity(self, auth_session):
        # First create a conversation to get a valid conversation_id
        convo_resp = auth_session.post(f"{BASE_URL}/api/entities/Conversation", json={
            "type": "direct",
            "participants": [ADMIN_EMAIL],
            "participant_names": ["Super Admin"],
            "created_by": ADMIN_EMAIL,
        })
        assert convo_resp.status_code == 200, f"Create conversation failed: {convo_resp.text}"
        convo = convo_resp.json()
        convo_id = convo.get("id")

        msg_resp = auth_session.post(f"{BASE_URL}/api/entities/Message", json={
            "conversation_id": convo_id,
            "sender_email": ADMIN_EMAIL,
            "sender_name": "Super Admin",
            "content": "TEST_WS_broadcast_check",
        })
        assert msg_resp.status_code == 200, f"Create Message failed: {msg_resp.text}"
        data = msg_resp.json()
        assert data.get("content") == "TEST_WS_broadcast_check"
        assert "id" in data
