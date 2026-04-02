from dotenv import load_dotenv
load_dotenv()

import os
import re
import json
import uuid
import base64
import secrets
import asyncio
import bcrypt
import jwt
import httpx
import resend
from datetime import datetime, timezone, timedelta
from typing import Dict, Set
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Request, Depends, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pywebpush import webpush, WebPushException

# ─── Config ──────────────────────────────────────────────────────────────────
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@nxgensports.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin123!")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
INTEGRATION_PROXY_URL = os.environ.get("INTEGRATION_PROXY_URL", "https://integrations.emergentagent.com")

# Candidate LLM endpoints tried in order — first 200 wins.
_LLM_ENDPOINTS = [
    f"{INTEGRATION_PROXY_URL}/v1/chat/completions",
    "https://api.openai.com/v1/chat/completions",
]
APP_URL = os.environ.get("APP_URL", "http://localhost:3000")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "noreply@nxgen-sports.com")
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_PEM_B64 = os.environ.get("VAPID_PRIVATE_PEM_B64", "")
VAPID_CONTACT = os.environ.get("VAPID_CONTACT", f"mailto:{ADMIN_EMAIL}")

def _vapid_private_pem() -> str:
    if not VAPID_PRIVATE_PEM_B64:
        return ""
    return base64.b64decode(VAPID_PRIVATE_PEM_B64).decode()

resend.api_key = RESEND_API_KEY

ALLOWED_ORIGINS = [APP_URL, "http://localhost:3000", "http://0.0.0.0:3000"]

# ─── Rate limit constants ─────────────────────────────────────────────────────
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

# ─── WebSocket connection manager ─────────────────────────────────────────────
class ConnectionManager:
    """
    Tracks active WebSocket connections and per-team user presence.
    team_id → {ws, ...}
    team_id → {user_id, ...}   (presence)
    ws      → (team_id, user_id)
    """
    def __init__(self):
        self._connections: Dict[str, Set[WebSocket]] = {}
        self._presence:    Dict[str, Set[str]]       = {}   # team_id → online user_ids
        self._ws_meta:     Dict[int, tuple]           = {}   # id(ws) → (team_id, user_id)

    async def connect(self, ws: WebSocket, team_id: str, user_id: str):
        await ws.accept()
        self._connections.setdefault(team_id, set()).add(ws)
        self._presence.setdefault(team_id, set()).add(user_id)
        self._ws_meta[id(ws)] = (team_id, user_id)

        # Tell the new client who is currently online
        await ws.send_json({
            "type": "presence_init",
            "online_users": list(self._presence[team_id]),
        })
        # Announce this user to everyone else on the team
        await self.broadcast(team_id, {"type": "user_online", "user_id": user_id}, exclude=ws)

    def disconnect(self, ws: WebSocket):
        meta = self._ws_meta.pop(id(ws), None)
        if not meta:
            return None, None
        team_id, user_id = meta
        self._connections.get(team_id, set()).discard(ws)

        # Only mark offline if no other connections from this user remain
        still_here = any(
            self._ws_meta.get(id(w), (None,))[1] == user_id
            for w in self._connections.get(team_id, set())
        )
        if not still_here:
            self._presence.get(team_id, set()).discard(user_id)
            return team_id, user_id   # caller should broadcast user_offline
        return team_id, None

    def online_users(self, team_id: str) -> list:
        return list(self._presence.get(team_id, set()))

    async def broadcast(self, team_id: str, payload: dict, exclude: WebSocket = None):
        dead = set()
        for ws in list(self._connections.get(team_id, [])):
            if ws is exclude:
                continue
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self._connections[team_id].discard(ws)
            self._ws_meta.pop(id(ws), None)

ws_manager = ConnectionManager()

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "/app/static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory="/app/static"), name="static")

# ─── MongoDB ─────────────────────────────────────────────────────────────────
client = None
db = None

@app.on_event("startup")
async def startup():
    global client, db
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    await db.users.create_index("email", unique=True)
    await db.invites.create_index("invite_token")
    await db.invites.create_index([("email", 1), ("status", 1)])
    await db.invites.create_index([("team_id", 1), ("status", 1)])
    await db.password_reset_tokens.create_index("token")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index([("identifier", 1), ("attempted_at", -1)])
    await db.push_subscriptions.create_index([("user_id", 1)], unique=False)
    await seed_admin()
    print("NxGenSports backend started")

@app.on_event("shutdown")
async def shutdown():
    client.close()

# ─── Helpers ─────────────────────────────────────────────────────────────────
# Override map: entity names whose collection differs from the auto snake_case rule
_COLLECTION_OVERRIDES: Dict[str, str] = {
    "Invite": "invites",   # sendInvite writes to db.invites; keep in sync
}

def entity_to_collection(entity_name: str) -> str:
    if entity_name in _COLLECTION_OVERRIDES:
        return _COLLECTION_OVERRIDES[entity_name]
    s = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', entity_name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s).lower()

def _serialize_value(v):
    """Serialize a single MongoDB value to a JSON-safe type."""
    if isinstance(v, dict):
        return serialize_doc(v)
    if isinstance(v, list):
        return [_serialize_value(item) for item in v]
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, datetime):
        return v.isoformat()
    return v

def serialize_doc(doc: dict) -> dict:
    if not doc:
        return None
    result = {}
    for k, v in doc.items():
        if k == "_id":
            result["id"] = str(v)
        else:
            result[k] = _serialize_value(v)
    return result

def parse_sort(sort_str: str):
    if not sort_str:
        return ("created_at", -1)
    if sort_str.startswith('-'):
        return (sort_str[1:], -1)
    return (sort_str, 1)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(user_id: str, email: str, expires_minutes: int = 10080) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def seed_admin():
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "full_name": "Super Admin",
            "first_name": "Super",
            "last_name": "Admin",
            "role": "super_admin",
            "coaching_role": "admin",
            "profile_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(ADMIN_PASSWORD, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}}
        )

# ─── Rate Limiting ────────────────────────────────────────────────────────────
async def check_rate_limit(identifier: str):
    """Check if identifier is locked out. Raises 429 if so."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=LOCKOUT_MINUTES)
    count = await db.login_attempts.count_documents({
        "identifier": identifier,
        "success": False,
        "attempted_at": {"$gte": cutoff},
    })
    if count >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. Try again in {LOCKOUT_MINUTES} minutes."
        )

async def record_login_attempt(identifier: str, success: bool):
    await db.login_attempts.insert_one({
        "identifier": identifier,
        "success": success,
        "attempted_at": datetime.now(timezone.utc),
    })
    if success:
        # Clear failed attempts on successful login
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=LOCKOUT_MINUTES)
        await db.login_attempts.delete_many({
            "identifier": identifier,
            "success": False,
            "attempted_at": {"$gte": cutoff},
        })

# ─── Email Helpers ────────────────────────────────────────────────────────────
async def send_email(to_email: str, subject: str, html: str):
    """Send email via Resend (non-blocking)."""
    if not RESEND_API_KEY:
        print(f"[EMAIL] No Resend key — would send to {to_email}: {subject}")
        return
    try:
        params = {
            "from": f"NxGenSports <{SENDER_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html,
        }
        await asyncio.to_thread(resend.Emails.send, params)
        print(f"[EMAIL] Sent to {to_email}: {subject}")
    except Exception as e:
        print(f"[EMAIL] Failed to send to {to_email}: {e}")

def invite_email_html(invite: dict, invite_url: str) -> str:
    name = invite.get("poc_name") or f"{invite.get('first_name', '')} {invite.get('last_name', '')}".strip() or "there"
    school = invite.get("school_name", "your school")
    role = (invite.get("coaching_role") or "").replace("_", " ").title()
    invite_type = invite.get("invite_type", "staff")
    role_line = f"<p style='color:#9ca3af;font-size:14px;margin:0 0 8px'>Role: <strong style='color:#e8e8e8'>{role}</strong></p>" if role and invite_type == "staff" else ""

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:40px 20px">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">
    <tr><td>
      <div style="background:#111111;border:1px solid #1f2937;border-radius:16px;padding:40px">
        <h1 style="color:#ffffff;font-size:22px;font-weight:900;margin:0 0 4px">
          Nx<span style="color:#00f2ff">GenSports</span>
        </h1>
        <p style="color:#6b7280;font-size:13px;margin:0 0 32px">NxGeneration Multi-Sports Systems</p>

        <p style="color:#e8e8e8;font-size:16px;font-weight:700;margin:0 0 12px">Hi {name},</p>
        <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 20px">
          You've been invited to join <strong style="color:#e8e8e8">{school}</strong> on NxGenSports.
        </p>
        {role_line}
        <p style="color:#9ca3af;font-size:14px;margin:0 0 28px">
          Click the button below to set up your account and get started.
        </p>

        <table cellpadding="0" cellspacing="0" style="margin:0 0 28px">
          <tr>
            <td style="background:linear-gradient(135deg,#00f2ff,#1a4bbd);border-radius:10px;padding:1px">
              <a href="{invite_url}" style="display:inline-block;background:linear-gradient(135deg,#00f2ff,#1a4bbd);color:#0a0a0a;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px">
                Accept Invite &amp; Set Up Account
              </a>
            </td>
          </tr>
        </table>

        <p style="color:#6b7280;font-size:12px;margin:0 0 4px">Or copy this link:</p>
        <p style="color:#00f2ff;font-size:12px;word-break:break-all;margin:0 0 28px">{invite_url}</p>

        <hr style="border:none;border-top:1px solid #1f2937;margin:0 0 20px">
        <p style="color:#4b5563;font-size:12px;margin:0">
          This invite was sent by {invite.get('invited_by', 'your administrator')}. 
          If you weren't expecting this, you can ignore this email.
        </p>
      </div>
    </td></tr>
  </table>
</body>
</html>
"""

def reset_password_email_html(reset_url: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:40px 20px">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">
    <tr><td>
      <div style="background:#111111;border:1px solid #1f2937;border-radius:16px;padding:40px">
        <h1 style="color:#ffffff;font-size:22px;font-weight:900;margin:0 0 4px">
          Nx<span style="color:#00f2ff">GenSports</span>
        </h1>
        <p style="color:#6b7280;font-size:13px;margin:0 0 32px">NxGeneration Multi-Sports Systems</p>

        <p style="color:#e8e8e8;font-size:16px;font-weight:700;margin:0 0 12px">Reset your password</p>
        <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 28px">
          We received a request to reset your NxGenSports password. Click the button below to choose a new one.
          This link expires in 1 hour.
        </p>

        <table cellpadding="0" cellspacing="0" style="margin:0 0 28px">
          <tr>
            <td style="background:linear-gradient(135deg,#00f2ff,#1a4bbd);border-radius:10px;padding:1px">
              <a href="{reset_url}" style="display:inline-block;background:linear-gradient(135deg,#00f2ff,#1a4bbd);color:#0a0a0a;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px">
                Reset Password
              </a>
            </td>
          </tr>
        </table>

        <p style="color:#6b7280;font-size:12px;margin:0 0 4px">Or copy this link:</p>
        <p style="color:#00f2ff;font-size:12px;word-break:break-all;margin:0 0 28px">{reset_url}</p>

        <hr style="border:none;border-top:1px solid #1f2937;margin:0 0 20px">
        <p style="color:#4b5563;font-size:12px;margin:0">
          If you didn't request a password reset, ignore this email — your password won't change.
        </p>
      </div>
    </td></tr>
  </table>
</body>
</html>
"""

# ─── LLM Helper ──────────────────────────────────────────────────────────────
async def invoke_llm(prompt: str, schema: dict = None) -> dict:
    """Call the LLM. Tries Emergent proxy first, falls back to OpenAI directly."""
    if not EMERGENT_LLM_KEY:
        return {}
    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
    }
    if schema:
        payload["response_format"] = {"type": "json_object"}
    async with httpx.AsyncClient() as c:
        for url in _LLM_ENDPOINTS:
            try:
                r = await c.post(
                    url,
                    headers={"Authorization": f"Bearer {EMERGENT_LLM_KEY}"},
                    json=payload,
                    timeout=60.0,
                )
                if r.status_code == 404:
                    continue          # try next endpoint
                r.raise_for_status()
                content = r.json()["choices"][0]["message"]["content"]
                return json.loads(content) if schema else {"text": content}
            except Exception:
                continue             # try next endpoint
    return {}

# ─── Auth Routes ─────────────────────────────────────────────────────────────
@app.post("/api/auth/login")
async def login(request: Request, body: dict):
    email = body.get("email", "").lower().strip()
    password = body.get("password", "")
    client_ip = request.client.host if request.client else "unknown"
    identifier = email  # Key on email only (not IP) — ingress can use multiple IPs

    # Rate limit check
    await check_rate_limit(identifier)

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(password, user.get("password_hash", "")):
        await record_login_attempt(identifier, False)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await record_login_attempt(identifier, True)
    user_id = str(user["_id"])
    token = create_token(user_id, email)
    user["_id"] = user_id
    user.pop("password_hash", None)
    return {"access_token": token, "token_type": "bearer", "user": serialize_doc(user)}

@app.post("/api/auth/register")
async def register(body: dict):
    email = body.get("email", "").lower().strip()
    password = body.get("password", "")
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user_doc = {
        "email": email,
        "password_hash": hash_password(password),
        "full_name": body.get("full_name", ""),
        "first_name": body.get("first_name", ""),
        "last_name": body.get("last_name", ""),
        "role": body.get("role", "user"),
        "coaching_role": body.get("coaching_role", ""),
        "user_type": body.get("user_type", "coach"),
        "team_id": body.get("team_id"),
        "school_id": body.get("school_id"),
        "school_name": body.get("school_name", ""),
        "school_code": body.get("school_code", ""),
        "assigned_sports": body.get("assigned_sports", []),
        "assigned_positions": body.get("assigned_positions", []),
        "assigned_phases": body.get("assigned_phases", []),
        "profile_verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    token = create_token(user_id, email)
    user_doc["_id"] = user_id
    user_doc.pop("password_hash", None)
    return {"access_token": token, "token_type": "bearer", "user": serialize_doc(user_doc)}

_ADMIN_COACHING_ROLES = frozenset({
    "head_coach", "athletic_director", "associate_head_coach",
    "offensive_coordinator", "defensive_coordinator",
    "special_teams_coordinator", "strength_conditioning_coordinator",
})

def _platform_role(coaching_role: str) -> str:
    """Return 'admin' for elevated coaching roles, otherwise 'user'."""
    return "admin" if coaching_role in _ADMIN_COACHING_ROLES else "user"

def _build_profile_from_invite(invite: dict) -> dict:
    """Build a user profile-update dict from an accepted invite."""
    coaching_role = invite.get("coaching_role", "")
    invite_type   = invite.get("invite_type", "staff")
    update = {
        "team_id":           invite.get("team_id"),
        "school_id":         invite.get("school_id"),
        "school_name":       invite.get("school_name", ""),
        "school_code":       invite.get("school_code", ""),
        "coaching_role":     coaching_role,
        "assigned_sports":   invite.get("assigned_sports", []),
        "assigned_positions":invite.get("assigned_positions", []),
        "assigned_phases":   invite.get("assigned_phases", []),
        "role":              _platform_role(coaching_role),
        "profile_verified":  False,
    }
    if invite.get("first_name"):
        update["first_name"] = invite["first_name"]
    if invite.get("last_name"):
        update["last_name"] = invite["last_name"]
    if invite.get("poc_name"):
        update["full_name"] = invite["poc_name"]
    if invite_type == "player":
        update["user_type"] = "player"
        if invite.get("player_id"):
            update["player_id"] = invite["player_id"]
    elif invite_type == "parent":
        update["user_type"] = "parent"
        if invite.get("child_player_id"):
            update["linked_player_id"]  = invite["child_player_id"]
            update["linked_player_ids"] = [invite["child_player_id"]]
    return update

@app.post("/api/auth/accept-invite")
async def accept_invite(body: dict):
    invite_token = body.get("invite_token", "")
    password     = body.get("password", "")
    if not invite_token or not password:
        raise HTTPException(status_code=400, detail="invite_token and password required")

    invite = await db.invites.find_one({"invite_token": invite_token, "status": "pending"})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite token")

    email          = invite.get("email", "").lower()
    profile_update = _build_profile_from_invite(invite)

    existing = await db.users.find_one({"email": email})
    if existing:
        await db.users.update_one({"email": email}, {"$set": profile_update})
        await db.invites.update_one({"_id": invite["_id"]}, {"$set": {"status": "accepted"}})
        user = await db.users.find_one({"email": email})
        user_id = str(user["_id"])
        user["_id"] = user_id
        user.pop("password_hash", None)
        return {"access_token": create_token(user_id, email), "token_type": "bearer", "user": serialize_doc(user)}

    user_doc = {"email": email, "password_hash": hash_password(password),
                **profile_update, "created_at": datetime.now(timezone.utc).isoformat()}
    result  = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    await db.invites.update_one({"_id": invite["_id"]}, {"$set": {"status": "accepted"}})
    user_doc["_id"] = user_id
    user_doc.pop("password_hash", None)
    return {"access_token": create_token(user_id, email), "token_type": "bearer", "user": serialize_doc(user_doc)}

@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@app.patch("/api/auth/me")
async def update_me(body: dict, user: dict = Depends(get_current_user)):
    user_id = user.get("id") or user.get("_id")
    body.pop("id", None)
    body.pop("_id", None)
    body.pop("password_hash", None)
    body.pop("email", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": body})
    updated = await db.users.find_one({"_id": ObjectId(user_id)})
    updated.pop("password_hash", None)
    return serialize_doc(updated)

@app.post("/api/auth/logout")
async def logout():
    return {"success": True}

@app.get("/api/auth/invite/{invite_token}")
async def get_invite(invite_token: str):
    invite = await db.invites.find_one({"invite_token": invite_token, "status": "pending"})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite")
    return serialize_doc(invite)

@app.post("/api/auth/change-password")
async def change_password(body: dict, user: dict = Depends(get_current_user)):
    current_password = body.get("current_password", "")
    new_password = body.get("new_password", "")
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="current_password and new_password required")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user_id = user.get("id") or user.get("_id")
    db_user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not db_user or not verify_password(current_password, db_user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"password_hash": hash_password(new_password)}})
    return {"success": True}

# ─── Password Reset ───────────────────────────────────────────────────────────
@app.post("/api/auth/forgot-password")
async def forgot_password(body: dict):
    email = body.get("email", "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    user = await db.users.find_one({"email": email})
    # Always return success to prevent email enumeration
    if not user:
        return {"success": True, "message": "If this email exists, a reset link was sent."}

    # Expire existing tokens
    await db.password_reset_tokens.delete_many({"email": email})

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.password_reset_tokens.insert_one({
        "token": token,
        "email": email,
        "expires_at": expires_at,
        "used": False,
    })

    reset_url = f"{APP_URL}/ResetPassword?token={token}"
    print(f"[RESET] {email} — {reset_url}")

    asyncio.create_task(send_email(
        to_email=email,
        subject="Reset your NxGenSports password",
        html=reset_password_email_html(reset_url),
    ))
    return {"success": True, "message": "If this email exists, a reset link was sent."}

@app.post("/api/auth/reset-password")
async def reset_password(body: dict):
    token = body.get("token", "")
    new_password = body.get("password", "")
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="token and password required")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    record = await db.password_reset_tokens.find_one({"token": token, "used": False})
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if record["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")

    await db.users.update_one(
        {"email": record["email"]},
        {"$set": {"password_hash": hash_password(new_password)}}
    )
    await db.password_reset_tokens.update_one({"token": token}, {"$set": {"used": True}})
    return {"success": True, "message": "Password updated successfully"}

# ─── File Upload ──────────────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = os.path.splitext(file.filename or "")[1].lower() or ".bin"
    allowed = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".mov", ".avi",
               ".pdf", ".doc", ".docx", ".txt", ".csv", ".json"}
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="File type not allowed")

    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    file_url = f"{APP_URL}/static/uploads/{filename}"
    return {"file_url": file_url, "filename": filename}

# ─── Entity CRUD ─────────────────────────────────────────────────────────────
@app.get("/api/entities/{entity_name}")
async def list_entity(entity_name: str, request: Request, user: dict = Depends(get_current_user)):
    collection = db[entity_to_collection(entity_name)]
    params = dict(request.query_params)
    sort_str = params.get("sort", "-created_at")
    limit = int(params.get("limit", 500))
    skip = int(params.get("skip", 0))
    sort_field, sort_dir = parse_sort(sort_str)

    mongo_filter = {}
    if user.get("role") != "super_admin" and user.get("team_id"):
        mongo_filter["team_id"] = user["team_id"]

    cursor = collection.find(mongo_filter).sort(sort_field, sort_dir).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [serialize_doc(d) for d in docs]

@app.post("/api/entities/{entity_name}/filter")
async def filter_entity(entity_name: str, body: dict, user: dict = Depends(get_current_user)):
    collection = db[entity_to_collection(entity_name)]
    query = body.get("query", {})
    sort_str = body.get("sort", "-created_at")
    limit = int(body.get("limit", 500))
    sort_field, sort_dir = parse_sort(sort_str)

    if user.get("role") != "super_admin":
        if "team_id" not in query and "email" not in query and user.get("team_id"):
            query["team_id"] = user["team_id"]

    cursor = collection.find(query).sort(sort_field, sort_dir).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [serialize_doc(d) for d in docs]

@app.get("/api/entities/{entity_name}/{doc_id}")
async def get_entity(entity_name: str, doc_id: str, user: dict = Depends(get_current_user)):
    collection = db[entity_to_collection(entity_name)]
    doc = None
    try:
        doc = await collection.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return serialize_doc(doc)

@app.post("/api/entities/{entity_name}")
async def create_entity(entity_name: str, body: dict, user: dict = Depends(get_current_user)):
    collection = db[entity_to_collection(entity_name)]
    body.pop("id", None)
    body.pop("_id", None)
    now = datetime.now(timezone.utc).isoformat()
    if "created_at" not in body:
        body["created_at"] = now
    if "created_date" not in body:
        body["created_date"] = now
    result = await collection.insert_one(body)
    doc = await collection.find_one({"_id": result.inserted_id})
    serialized = serialize_doc(doc)

    # ── Real-time: broadcast new messages via WebSocket + push ────────────────
    if entity_name == "Message":
        team_id = body.get("team_id") or user.get("team_id", "")
        user_id = user.get("id") or user.get("_id", "")
        ws_payload = {"type": "new_message", "data": serialized}
        asyncio.create_task(ws_manager.broadcast(team_id, ws_payload))

        # Push notification to other team members
        sender_name = user.get("full_name") or user.get("email", "Someone")
        content_preview = (body.get("content", "") or "")[:80]
        push_payload = {
            "type": "new_message",
            "title": f"NxMessage from {sender_name}",
            "body": content_preview,
            "icon": "/logo192.png",
            "conversation_id": body.get("conversation_id"),
        }
        asyncio.create_task(broadcast_push(team_id, str(user_id), push_payload))

    # ── Real-time: broadcast new/updated conversations ────────────────────────
    elif entity_name == "Conversation":
        team_id = body.get("team_id") or user.get("team_id", "")
        asyncio.create_task(ws_manager.broadcast(team_id, {"type": "new_conversation", "data": serialized}))

    return serialized

@app.patch("/api/entities/{entity_name}/{doc_id}")
async def update_entity(entity_name: str, doc_id: str, body: dict, user: dict = Depends(get_current_user)):
    collection = db[entity_to_collection(entity_name)]
    body.pop("id", None)
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    doc = None
    try:
        await collection.update_one({"_id": ObjectId(doc_id)}, {"$set": body})
        doc = await collection.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    return serialize_doc(doc)

@app.delete("/api/entities/{entity_name}/{doc_id}")
async def delete_entity(entity_name: str, doc_id: str, user: dict = Depends(get_current_user)):
    collection = db[entity_to_collection(entity_name)]
    try:
        await collection.delete_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    return {"success": True}

# ─── Functions ───────────────────────────────────────────────────────────────
# ── Invite helpers ────────────────────────────────────────────────────────────
def _check_invite_permission(user: dict) -> None:
    """Raise 403 if user is not permitted to send invites."""
    allowed = {"admin", "super_admin", "head_coach", "athletic_director"}
    effective_role = user.get("coaching_role") or user.get("role", "")
    if user.get("role") not in allowed and effective_role not in allowed:
        raise HTTPException(status_code=403, detail="Forbidden")

async def _resolve_school_context(invite_type, team_id, school_id, school_name, school_code):
    """For school_setup invites, fill in missing school info from DB."""
    if invite_type != "school_setup" or not team_id or school_id:
        return school_id, school_name, school_code
    existing = await db.school.find_one({"team_id": team_id})
    if existing:
        school_id   = str(existing["_id"])
        school_name = school_name or existing.get("school_name", "")
        school_code = school_code or existing.get("school_code", "")
    return school_id, school_name, school_code

def _resolve_coaching_role(invite_type: str, raw_role: str) -> str:
    return {"player": "player", "parent": "parent"}.get(invite_type, raw_role)

def _generate_player_id(last_name: str) -> str:
    chars   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    initial = (last_name[0] if last_name else "X").upper()
    rand    = "".join(secrets.choice(chars) for _ in range(3))
    return initial + rand

def _build_invite_record(email, team_id, school_id, school_name, school_code,
                         coaching_role, assigned_sports, invite_type, first_name,
                         last_name, player_id, invite_token, invited_by, body):
    record = {
        "email": email, "team_id": team_id, "school_id": school_id,
        "school_name": school_name, "school_code": school_code,
        "coaching_role": coaching_role, "assigned_sports": assigned_sports,
        "assigned_positions": body.get("assigned_positions", []),
        "assigned_phases":    body.get("assigned_phases", []),
        "status": "pending", "invited_by": invited_by, "invite_type": invite_type,
        "first_name": first_name, "last_name": last_name,
        "poc_name": f"{first_name} {last_name}",
        "child_player_id": body.get("child_player_id"),
        "player_id": player_id, "invite_token": invite_token,
        "created_at":   datetime.now(timezone.utc).isoformat(),
        "created_date": datetime.now(timezone.utc).isoformat(),
    }
    if invite_type == "school_setup":
        for field in ("poc_phone", "mascot", "subscribed_sports",
                      "subscription_term", "location_city", "location_state"):
            if body.get(field) is not None:
                record[field] = body[field]
    return record

async def _sync_existing_user_to_invite(email, team_id, school_id, school_name,
                                         school_code, coaching_role, assigned_sports):
    """If a user account already exists for this email, update it to reflect the invite."""
    existing = await db.users.find_one({"email": email})
    if not existing:
        return
    await db.users.update_one({"email": email}, {"$set": {
        "team_id": team_id, "school_id": school_id, "school_name": school_name,
        "school_code": school_code, "coaching_role": coaching_role,
        "assigned_sports": assigned_sports,
        "role": _platform_role(coaching_role),
        "profile_verified": False,
    }})

@app.post("/api/functions/getTeamUsers")
async def fn_get_team_users(body: dict = None, user: dict = Depends(get_current_user)):
    if user.get("role") == "super_admin":
        all_users = await db.users.find({"role": {"$ne": "super_admin"}}).to_list(length=2000)
        return [serialize_doc(u) for u in all_users]
    team_id = user.get("team_id")
    if not team_id:
        return []
    team_users = await db.users.find({
        "team_id": team_id, "role": {"$ne": "super_admin"}
    }).to_list(length=500)
    return [serialize_doc(u) for u in team_users]

@app.post("/api/functions/listAllSchools")
async def fn_list_all_schools(body: dict = None, user: dict = Depends(get_current_user)):
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    schools = await db.school.find({}).sort("created_at", -1).to_list(length=500)
    return {"schools": [serialize_doc(s) for s in schools]}

@app.post("/api/functions/sendInvite")
async def fn_send_invite(body: dict, user: dict = Depends(get_current_user)):
    _check_invite_permission(user)

    email      = body.get("email", "").strip().lower()
    first_name = body.get("first_name", "").strip()
    last_name  = body.get("last_name", "").strip()
    if not email or not first_name or not last_name:
        raise HTTPException(status_code=400, detail="email, first_name, last_name are required")

    invite_type  = body.get("invite_type", "staff")
    team_id      = body.get("team_id") or user.get("team_id", "")
    school_id    = body.get("school_id") or user.get("school_id")
    school_name  = body.get("school_name") or user.get("school_name", "")
    school_code  = body.get("school_code") or user.get("school_code", "")
    assigned_sports = body.get("assigned_sports", user.get("assigned_sports", ["football"]))

    school_id, school_name, school_code = await _resolve_school_context(
        invite_type, team_id, school_id, school_name, school_code
    )
    coaching_role = _resolve_coaching_role(invite_type, body.get("coaching_role", "position_coach"))
    player_id     = _generate_player_id(last_name) if invite_type == "player" else None
    invite_token  = secrets.token_urlsafe(32)

    invite_data = _build_invite_record(
        email, team_id, school_id, school_name, school_code,
        coaching_role, assigned_sports, invite_type, first_name, last_name,
        player_id, invite_token, user.get("email", ""), body,
    )

    await db.invites.update_many(
        {"email": email, "team_id": team_id, "status": "pending"},
        {"$set": {"status": "expired"}}
    )
    await db.invites.insert_one(invite_data)
    await _sync_existing_user_to_invite(
        email, team_id, school_id, school_name, school_code, coaching_role, assigned_sports
    )

    invite_url = f"{APP_URL}/Login?invite_token={invite_token}"
    asyncio.create_task(send_email(
        to_email=email,
        subject=f"You've been invited to {school_name or 'NxGenSports'}",
        html=invite_email_html(invite_data, invite_url),
    ))
    print(f"[INVITE] {email} → {invite_url}")
    return {"success": True, "player_id": player_id, "invite_token": invite_token, "invite_url": invite_url}

@app.post("/api/functions/updateTeamUser")
async def fn_update_team_user(body: dict, user: dict = Depends(get_current_user)):
    allowed_roles = ["admin", "super_admin", "head_coach", "athletic_director"]
    effective_role = user.get("coaching_role") or user.get("role")
    if user.get("role") not in allowed_roles and effective_role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Forbidden")

    user_id = body.get("userId")
    data = body.get("data", {})
    if not user_id:
        raise HTTPException(status_code=400, detail="userId required")

    try:
        target = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid userId")
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("role") == "super_admin":
        if target.get("role") == "super_admin":
            raise HTTPException(status_code=403, detail="Cannot modify super admin")
    elif target.get("team_id") != user.get("team_id"):
        raise HTTPException(status_code=403, detail="User not on your team")

    data.pop("id", None)
    data.pop("_id", None)
    data.pop("password_hash", None)
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": data})
    return {"success": True}

@app.post("/api/functions/createParentUser")
async def fn_create_parent_user(body: dict):
    first_name = body.get("first_name", "")
    last_name = body.get("last_name", "")
    school_id = body.get("school_id")
    assigned_sports = body.get("assigned_sports", [])
    if not first_name or not last_name or not school_id or not assigned_sports:
        raise HTTPException(status_code=400, detail="Missing required fields")

    try:
        school = await db.school.find_one({"_id": ObjectId(school_id)})
    except Exception:
        school = None

    user_doc = {
        "full_name": f"{first_name} {last_name}",
        "first_name": first_name, "last_name": last_name,
        "school_id": school_id,
        "team_id": school.get("team_id") if school else None,
        "assigned_sports": assigned_sports,
        "role": "user", "coaching_role": "parent", "user_type": "parent",
        "profile_verified": False, "status": "pending_approval",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if body.get("email"):
        user_doc["email"] = body["email"].lower()
    if body.get("child_player_id"):
        user_doc["child_ids"] = [body["child_player_id"]]

    result = await db.users.insert_one(user_doc)
    return {"success": True, "userId": str(result.inserted_id)}

@app.post("/api/functions/joinSchoolByCode")
async def fn_join_school_by_code(body: dict, user: dict = Depends(get_current_user)):
    school_code = body.get("school_code", "").strip().upper()
    if not school_code:
        raise HTTPException(status_code=400, detail="school_code required")
    school = await db.school.find_one({"school_code": school_code})
    if not school:
        raise HTTPException(status_code=404, detail="School not found. Check your school code.")
    if school.get("status") and school["status"] != "active":
        raise HTTPException(status_code=403, detail="This school account is not currently active.")

    user_id = user.get("id") or user.get("_id")
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {
        "team_id": school["team_id"],
        "school_id": str(school["_id"]),
        "school_name": school.get("school_name", ""),
        "school_code": school.get("school_code", ""),
    }})
    return {
        "success": True,
        "school": {
            "team_id": school["team_id"], "school_id": str(school["_id"]),
            "school_name": school.get("school_name", ""),
            "school_code": school.get("school_code", ""),
            "subscribed_sports": school.get("subscribed_sports", []),
        }
    }

@app.post("/api/functions/listMasterTeams")
async def fn_list_master_teams(body: dict = None, user: dict = Depends(get_current_user)):
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    schools = await db.school.find({}).sort("created_at", -1).to_list(length=500)
    return {"teams": [{
        "id": str(s["_id"]), "team_id": s.get("team_id", ""),
        "school_name": s.get("school_name", ""),
        "assigned_admin_name": s.get("poc_name", ""),
        "assigned_admin_email": s.get("poc_email", ""),
        "assigned_admin_role": s.get("poc_role", "head_coach"),
        "subscription_status": s.get("status", "active"),
        "subscription_term": s.get("subscription_term", "annual"),
        "subscription_start": s.get("subscription_start"),
        "subscription_end": s.get("subscription_end"),
    } for s in schools]}

@app.post("/api/functions/{function_name}")
async def generic_function(function_name: str, body: dict = None, user: dict = Depends(get_current_user)):
    return {"success": True, "data": None, "function": function_name}

# ─── LLM Proxy ───────────────────────────────────────────────────────────────
@app.post("/api/integrations/llm")
async def llm_proxy(body: dict, user: dict = Depends(get_current_user)):
    result = await invoke_llm(body.get("prompt", ""), body.get("response_json_schema"))
    return result

@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.get("/api/presence/{team_id}")
async def get_presence(team_id: str, user: dict = Depends(get_current_user)):
    return {"online_users": ws_manager.online_users(team_id)}

# ─── WebSocket ────────────────────────────────────────────────────────────────
async def _ws_authenticate(token: str):
    """Verify JWT token and return (team_id, user_id) or None if invalid."""
    try:
        payload  = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_doc = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user_doc:
            return None
        team_id = user_doc.get("team_id") or str(user_doc["_id"])
        user_id = str(user_doc["_id"])
        return team_id, user_id
    except Exception:
        return None

async def _ws_disconnect_and_broadcast(websocket: WebSocket) -> None:
    """Disconnect websocket and broadcast user_offline if the user is fully gone."""
    gone_team, gone_uid = ws_manager.disconnect(websocket)
    if gone_team and gone_uid:
        await ws_manager.broadcast(gone_team, {"type": "user_offline", "user_id": gone_uid})

@app.websocket("/api/ws/messages/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """Authenticated WebSocket for real-time messaging and presence."""
    auth = await _ws_authenticate(token)
    if auth is None:
        await websocket.close(code=4001)
        return

    team_id, user_id = auth
    await ws_manager.connect(websocket, team_id, user_id)
    try:
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except (WebSocketDisconnect, Exception):
        await _ws_disconnect_and_broadcast(websocket)

# ─── Push Notification Helpers ────────────────────────────────────────────────
async def _send_push(subscription_doc: dict, payload: dict):
    """Send a Web Push notification to a single subscription."""
    pem = _vapid_private_pem()
    if not pem or not VAPID_PUBLIC_KEY:
        return
    try:
        sub_info = {
            "endpoint": subscription_doc["endpoint"],
            "keys": {
                "p256dh": subscription_doc["p256dh"],
                "auth": subscription_doc["auth"],
            },
        }
        await asyncio.to_thread(
            webpush,
            subscription_info=sub_info,
            data=json.dumps(payload),
            vapid_private_key=pem,
            vapid_claims={"sub": VAPID_CONTACT},
        )
    except WebPushException as e:
        if e.response and e.response.status_code in (404, 410):
            # Subscription expired — remove it
            await db.push_subscriptions.delete_one({"_id": subscription_doc["_id"]})
    except Exception as e:
        print(f"[PUSH] Error: {e}")

async def broadcast_push(team_id: str, user_id: str, payload: dict):
    """Send push notification to all team members except the sender."""
    if not _vapid_private_pem():
        return
    subs = await db.push_subscriptions.find({
        "team_id": team_id,
        "user_id": {"$ne": user_id},
    }).to_list(length=500)
    for sub in subs:
        asyncio.create_task(_send_push(sub, payload))

# ─── Push Subscription Endpoints ─────────────────────────────────────────────
@app.get("/api/push/vapid-public-key")
async def get_vapid_public_key():
    return {"publicKey": VAPID_PUBLIC_KEY}

@app.post("/api/push/subscribe")
async def push_subscribe(body: dict, user: dict = Depends(get_current_user)):
    endpoint = body.get("endpoint")
    p256dh   = body.get("p256dh")
    auth     = body.get("auth")
    if not endpoint or not p256dh or not auth:
        raise HTTPException(status_code=400, detail="endpoint, p256dh, auth required")

    user_id = user.get("id") or user.get("_id")
    team_id = user.get("team_id", "")

    await db.push_subscriptions.update_one(
        {"user_id": user_id, "endpoint": endpoint},
        {"$set": {
            "user_id": user_id,
            "team_id": team_id,
            "endpoint": endpoint,
            "p256dh": p256dh,
            "auth": auth,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"success": True}

@app.delete("/api/push/subscribe")
async def push_unsubscribe(body: dict, user: dict = Depends(get_current_user)):
    user_id = user.get("id") or user.get("_id")
    await db.push_subscriptions.delete_many({"user_id": user_id})
    return {"success": True}
