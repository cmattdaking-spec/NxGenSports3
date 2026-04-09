import re
import json
import bcrypt
import jwt
import httpx
import asyncio
import resend
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from fastapi import HTTPException, Request
from typing import Dict

from config import (
    JWT_SECRET, JWT_ALGORITHM, EMERGENT_LLM_KEY, LLM_ENDPOINTS,
    APP_URL, RESEND_API_KEY, SENDER_EMAIL,
    MAX_LOGIN_ATTEMPTS, LOCKOUT_MINUTES,
)

resend.api_key = RESEND_API_KEY

# ─── Collection Name Helpers ──────────────────────────────────────────────────
_COLLECTION_OVERRIDES: Dict[str, str] = {
    "Invite": "invites",
}


def entity_to_collection(entity_name: str) -> str:
    if entity_name in _COLLECTION_OVERRIDES:
        return _COLLECTION_OVERRIDES[entity_name]
    s = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', entity_name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s).lower()


# ─── Serialization ────────────────────────────────────────────────────────────
def _serialize_value(v):
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


# ─── Password ────────────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ─── JWT ──────────────────────────────────────────────────────────────────────
def create_token(user_id: str, email: str, expires_minutes: int = 10080) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    from database import db
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


# ─── URL Helper ───────────────────────────────────────────────────────────────
def public_base_url(request: Request) -> str:
    proto = request.headers.get("X-Forwarded-Proto") or request.url.scheme
    host = (request.headers.get("X-Forwarded-Host")
            or request.headers.get("Host", ""))
    if host:
        return f"{proto}://{host}"
    return APP_URL


# ─── Rate Limiting ────────────────────────────────────────────────────────────
async def check_rate_limit(identifier: str):
    from database import db
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
    from database import db
    await db.login_attempts.insert_one({
        "identifier": identifier,
        "success": success,
        "attempted_at": datetime.now(timezone.utc),
    })
    if success:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=LOCKOUT_MINUTES)
        await db.login_attempts.delete_many({
            "identifier": identifier,
            "success": False,
            "attempted_at": {"$gte": cutoff},
        })


# ─── Email ────────────────────────────────────────────────────────────────────
async def send_email(to_email: str, subject: str, html: str):
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
    if not EMERGENT_LLM_KEY:
        return {}
    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
    }
    if schema:
        payload["response_format"] = {"type": "json_object"}
    async with httpx.AsyncClient() as c:
        for url in LLM_ENDPOINTS:
            try:
                r = await c.post(
                    url,
                    headers={"Authorization": f"Bearer {EMERGENT_LLM_KEY}"},
                    json=payload,
                    timeout=60.0,
                )
                if r.status_code == 404:
                    continue
                r.raise_for_status()
                content = r.json()["choices"][0]["message"]["content"]
                return json.loads(content) if schema else {"text": content}
            except Exception:
                continue
    return {}
