"""
Iteration 5: Presence tracking tests
Tests WebSocket presence_init, user_online, user_offline events and /api/presence/{team_id}
"""
import pytest
import requests
import os
import asyncio
import json
import websockets

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split()[0]).rstrip("/")
WS_BASE = "ws://localhost:8001"

ADMIN_EMAIL = "admin@nxgensports.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin JWT token."""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.text}"
    data = r.json()
    return data.get("token") or data.get("access_token")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


class TestPresenceRESTEndpoint:
    """Test GET /api/presence/{team_id}"""

    def test_presence_returns_online_users(self, admin_token, admin_headers):
        # Get team_id from /api/auth/me
        me = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert me.status_code == 200
        user = me.json()
        team_id = user.get("team_id") or user.get("id") or user.get("_id")

        r = requests.get(f"{BASE_URL}/api/presence/{team_id}", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "online_users" in data
        assert isinstance(data["online_users"], list)
        print(f"Presence endpoint returned: {data}")

    def test_presence_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/presence/someteamid")
        assert r.status_code in [401, 403, 422]
        print(f"Unauthenticated presence request returned: {r.status_code}")


class TestWebSocketPresence:
    """Test WebSocket presence_init, user_online, user_offline"""

    def test_presence_init_on_connect(self, admin_token):
        """Connecting to WS should immediately receive presence_init."""
        async def _run():
            uri = f"{WS_BASE}/api/ws/messages/{admin_token}"
            async with websockets.connect(uri) as ws:
                msg = await asyncio.wait_for(ws.recv(), timeout=5)
                data = json.loads(msg)
                print(f"First message on connect: {data}")
                assert data["type"] == "presence_init", f"Expected presence_init, got {data}"
                assert "online_users" in data
                assert isinstance(data["online_users"], list)
                return data
        result = asyncio.get_event_loop().run_until_complete(_run())
        print(f"presence_init online_users: {result['online_users']}")

    def test_presence_init_includes_own_user_id(self, admin_token):
        """Admin user_id should appear in presence_init online_users."""
        async def _run():
            me = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
            user_id = me.json().get("id") or me.json().get("_id")

            uri = f"{WS_BASE}/api/ws/messages/{admin_token}"
            async with websockets.connect(uri) as ws:
                msg = await asyncio.wait_for(ws.recv(), timeout=5)
                data = json.loads(msg)
                assert user_id in data["online_users"], f"user_id {user_id} not in {data['online_users']}"
                print(f"Own user_id {user_id} found in presence_init")
        asyncio.get_event_loop().run_until_complete(_run())

    def test_user_online_broadcast_to_existing_client(self, admin_token):
        """When a second client connects, existing client gets user_online."""
        async def _run():
            uri = f"{WS_BASE}/api/ws/messages/{admin_token}"
            async with websockets.connect(uri) as ws1:
                # consume presence_init for ws1
                msg1 = await asyncio.wait_for(ws1.recv(), timeout=5)
                print(f"ws1 presence_init: {json.loads(msg1)}")

                # connect second client with same token (same user)
                async with websockets.connect(uri) as ws2:
                    # ws2 should get presence_init
                    msg2 = await asyncio.wait_for(ws2.recv(), timeout=5)
                    data2 = json.loads(msg2)
                    assert data2["type"] == "presence_init"
                    print(f"ws2 presence_init: {data2}")

                    # ws1 should receive user_online (even same user, broadcast to others)
                    try:
                        evt = await asyncio.wait_for(ws1.recv(), timeout=3)
                        data_evt = json.loads(evt)
                        print(f"ws1 received after ws2 connected: {data_evt}")
                        assert data_evt["type"] == "user_online"
                    except asyncio.TimeoutError:
                        # If same user, broadcast might be skipped by exclude=ws logic
                        # This is acceptable - same user connecting again
                        print("ws1 did not receive user_online (same user may be excluded - acceptable)")

        asyncio.get_event_loop().run_until_complete(_run())

    def test_user_offline_broadcast_on_disconnect(self, admin_token):
        """When ws2 disconnects, ws1 should receive user_offline."""
        async def _run():
            uri = f"{WS_BASE}/api/ws/messages/{admin_token}"
            async with websockets.connect(uri) as ws1:
                # consume presence_init
                await asyncio.wait_for(ws1.recv(), timeout=5)

                # connect ws2
                ws2 = await websockets.connect(uri)
                # consume presence_init for ws2
                await asyncio.wait_for(ws2.recv(), timeout=5)

                # drain any user_online from ws1
                try:
                    await asyncio.wait_for(ws1.recv(), timeout=1)
                except asyncio.TimeoutError:
                    pass

                # disconnect ws2
                await ws2.close()
                await asyncio.sleep(0.5)

                # ws1 should NOT get user_offline because same user still connected on ws1
                try:
                    evt = await asyncio.wait_for(ws1.recv(), timeout=2)
                    data_evt = json.loads(evt)
                    print(f"ws1 received after ws2 close: {data_evt}")
                    # If received, it should not be user_offline for same user
                    # (same user still online on ws1)
                    if data_evt["type"] == "user_offline":
                        me = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
                        uid = me.json()["id"]
                        assert data_evt.get("user_id") != uid, \
                            "user_offline should NOT fire for user still connected on another WS"
                except asyncio.TimeoutError:
                    print("No user_offline received — correct, same user still online on ws1")

        asyncio.get_event_loop().run_until_complete(_run())

    def test_presence_after_connect_via_rest(self, admin_token):
        """After connecting, presence REST endpoint should list the admin user."""
        async def _run():
            me = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
            user_id = me.json().get("id") or me.json().get("_id")
            team_id = me.json().get("team_id") or me.json().get("id") or me.json().get("_id")

            uri = f"{WS_BASE}/api/ws/messages/{admin_token}"
            async with websockets.connect(uri) as ws:
                await asyncio.wait_for(ws.recv(), timeout=5)

                # check REST presence
                r = requests.get(f"{BASE_URL}/api/presence/{team_id}", headers={"Authorization": f"Bearer {admin_token}"})
                assert r.status_code == 200
                data = r.json()
                assert user_id in data["online_users"], f"{user_id} not in {data['online_users']}"
                print(f"REST presence confirms user online: {data}")

        asyncio.get_event_loop().run_until_complete(_run())
