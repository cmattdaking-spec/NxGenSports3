import secrets
import asyncio
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, Depends

from utils import (
    hash_password, verify_password, create_token, get_current_user,
    serialize_doc, public_base_url,
    check_rate_limit, record_login_attempt,
    send_email, reset_password_email_html,
)
from config import JWT_SECRET, JWT_ALGORITHM
import jwt as pyjwt

router = APIRouter(prefix="/api/auth", tags=["auth"])

_ADMIN_COACHING_ROLES = frozenset({
    "head_coach", "athletic_director", "associate_head_coach",
    "offensive_coordinator", "defensive_coordinator",
    "special_teams_coordinator", "strength_conditioning_coordinator",
})


def _platform_role(coaching_role: str) -> str:
    return "admin" if coaching_role in _ADMIN_COACHING_ROLES else "user"


def _build_profile_from_invite(invite: dict) -> dict:
    coaching_role = invite.get("coaching_role", "")
    invite_type = invite.get("invite_type", "staff")
    update = {
        "team_id":            invite.get("team_id"),
        "school_id":          invite.get("school_id"),
        "school_name":        invite.get("school_name", ""),
        "school_code":        invite.get("school_code", ""),
        "coaching_role":      coaching_role,
        "assigned_sports":    invite.get("assigned_sports", []),
        "assigned_positions": invite.get("assigned_positions", []),
        "assigned_phases":    invite.get("assigned_phases", []),
        "role":               _platform_role(coaching_role),
        "profile_verified":   False,
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
            update["linked_player_id"] = invite["child_player_id"]
            update["linked_player_ids"] = [invite["child_player_id"]]
    elif invite_type == "teacher":
        update["user_type"] = "teacher"
        update["role"] = "user"
        update["coaching_role"] = "teacher"
        if invite.get("department"):
            update["department"] = invite["department"]
        if invite.get("subjects"):
            update["subjects"] = invite["subjects"]
    elif invite_type == "school_admin":
        update["user_type"] = "school_admin"
        update["role"] = "admin"
        update["coaching_role"] = "school_admin"
    return update


@router.post("/login")
async def login(request: Request, body: dict):
    from database import db
    email = body.get("email", "").lower().strip()
    password = body.get("password", "")
    identifier = email

    await check_rate_limit(identifier)

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(password, user.get("password_hash", "")):
        await record_login_attempt(identifier, False)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await record_login_attempt(identifier, True)
    user_id = str(user["_id"])

    # If 2FA is enabled, return a temporary token requiring TOTP verification
    if user.get("two_factor_enabled"):
        temp_payload = {
            "sub": user_id,
            "email": email,
            "type": "2fa_pending",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        }
        temp_token = pyjwt.encode(temp_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return {"access_token": temp_token, "token_type": "bearer_2fa", "requires_2fa": True}

    token = create_token(user_id, email)
    user["_id"] = user_id
    user.pop("password_hash", None)
    return {"access_token": token, "token_type": "bearer", "user": serialize_doc(user)}


@router.post("/register")
async def register(body: dict):
    from database import db
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


@router.post("/accept-invite")
async def accept_invite(body: dict):
    from database import db
    invite_token = body.get("invite_token", "")
    password = body.get("password", "")
    if not invite_token or not password:
        raise HTTPException(status_code=400, detail="invite_token and password required")

    invite = await db.invites.find_one({"invite_token": invite_token, "status": "pending"})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite token")

    email = invite.get("email", "").lower()
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
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    await db.invites.update_one({"_id": invite["_id"]}, {"$set": {"status": "accepted"}})
    user_doc["_id"] = user_id
    user_doc.pop("password_hash", None)
    return {"access_token": create_token(user_id, email), "token_type": "bearer", "user": serialize_doc(user_doc)}


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user


@router.patch("/me")
async def update_me(body: dict, user: dict = Depends(get_current_user)):
    from database import db
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


@router.post("/logout")
async def logout():
    return {"success": True}


@router.get("/invite/{invite_token}")
async def get_invite(invite_token: str):
    from database import db
    invite = await db.invites.find_one({"invite_token": invite_token, "status": "pending"})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite")
    return serialize_doc(invite)


@router.post("/change-password")
async def change_password(body: dict, user: dict = Depends(get_current_user)):
    from database import db
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


@router.post("/forgot-password")
async def forgot_password(request: Request, body: dict):
    from database import db
    email = body.get("email", "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    user = await db.users.find_one({"email": email})
    if not user:
        return {"success": True, "message": "If this email exists, a reset link was sent."}

    await db.password_reset_tokens.delete_many({"email": email})

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.password_reset_tokens.insert_one({
        "token": token,
        "email": email,
        "expires_at": expires_at,
        "used": False,
    })

    reset_url = f"{public_base_url(request)}/ResetPassword?token={token}"
    print(f"[RESET] {email} — {reset_url}")

    asyncio.create_task(send_email(
        to_email=email,
        subject="Reset your NxGenSports password",
        html=reset_password_email_html(reset_url),
    ))
    return {"success": True, "message": "If this email exists, a reset link was sent."}


@router.post("/reset-password")
async def reset_password(body: dict):
    from database import db
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


# ═══════════════════════════════════════════════════════════════════════════════
# TWO-FACTOR AUTHENTICATION
# ═══════════════════════════════════════════════════════════════════════════════

def _generate_qr_base64(secret: str, email: str) -> str:
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=email, issuer_name="NxGenSports")
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=4)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode()


def _generate_backup_codes(count: int = 8) -> list:
    return [secrets.token_hex(4).upper() for _ in range(count)]


@router.get("/2fa/status")
async def twofa_status(user: dict = Depends(get_current_user)):
    return {"two_factor_enabled": user.get("two_factor_enabled", False)}


@router.post("/2fa/setup")
async def twofa_setup(user: dict = Depends(get_current_user)):
    from database import db
    if user.get("two_factor_enabled"):
        raise HTTPException(status_code=400, detail="2FA is already enabled")

    secret = pyotp.random_base32()
    email = user.get("email", "")
    qr_b64 = _generate_qr_base64(secret, email)

    user_id = user.get("id") or user.get("_id")
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"pending_totp_secret": secret}}
    )

    return {
        "qr_code": f"data:image/png;base64,{qr_b64}",
        "manual_key": secret,
    }


@router.post("/2fa/verify-setup")
async def twofa_verify_setup(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    code = body.get("code", "")
    if not code or len(code) != 6 or not code.isdigit():
        raise HTTPException(status_code=400, detail="Invalid code format (6 digits required)")

    user_id = user.get("id") or user.get("_id")
    db_user = await db.users.find_one({"_id": ObjectId(user_id)})

    pending_secret = db_user.get("pending_totp_secret")
    if not pending_secret:
        raise HTTPException(status_code=400, detail="2FA setup not initiated. Call /2fa/setup first.")

    totp = pyotp.TOTP(pending_secret)
    if not totp.verify(code, valid_window=1):
        raise HTTPException(status_code=401, detail="Invalid code. Please try again.")

    # Generate backup codes
    backup_codes = _generate_backup_codes()
    hashed_codes = [hash_password(c) for c in backup_codes]

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "totp_secret": pending_secret,
                "two_factor_enabled": True,
                "backup_codes": hashed_codes,
            },
            "$unset": {"pending_totp_secret": ""},
        }
    )

    return {
        "success": True,
        "backup_codes": backup_codes,
        "message": "2FA enabled. Save your backup codes securely — they cannot be shown again.",
    }


@router.post("/2fa/verify-login")
async def twofa_verify_login(body: dict):
    from database import db
    temp_token = body.get("token", "")
    code = body.get("code", "")

    if not temp_token or not code:
        raise HTTPException(status_code=400, detail="token and code are required")

    try:
        payload = pyjwt.decode(temp_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "2fa_pending":
            raise HTTPException(status_code=401, detail="Invalid 2FA token")
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="2FA token expired. Please login again.")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload["sub"]
    email = payload["email"]

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user or not user.get("two_factor_enabled") or not user.get("totp_secret"):
        raise HTTPException(status_code=401, detail="Invalid 2FA state")

    # Try TOTP code first
    totp = pyotp.TOTP(user["totp_secret"])
    code_valid = totp.verify(code, valid_window=1)

    # Try backup code if TOTP fails
    if not code_valid and user.get("backup_codes"):
        for i, hashed_code in enumerate(user["backup_codes"]):
            if verify_password(code, hashed_code):
                code_valid = True
                # Remove used backup code
                await db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$pull": {"backup_codes": hashed_code}}
                )
                break

    if not code_valid:
        raise HTTPException(status_code=401, detail="Invalid 2FA code")

    # Issue full access token
    full_token = create_token(user_id, email)
    user["_id"] = user_id
    user.pop("password_hash", None)
    user.pop("totp_secret", None)
    user.pop("backup_codes", None)
    user.pop("pending_totp_secret", None)
    return {"access_token": full_token, "token_type": "bearer", "user": serialize_doc(user)}


@router.post("/2fa/disable")
async def twofa_disable(body: dict, user: dict = Depends(get_current_user)):
    from database import db
    code = body.get("code", "")
    if not code:
        raise HTTPException(status_code=400, detail="TOTP code required to disable 2FA")

    user_id = user.get("id") or user.get("_id")
    db_user = await db.users.find_one({"_id": ObjectId(user_id)})

    if not db_user.get("two_factor_enabled"):
        raise HTTPException(status_code=400, detail="2FA is not enabled")

    totp = pyotp.TOTP(db_user["totp_secret"])
    if not totp.verify(code, valid_window=1):
        raise HTTPException(status_code=401, detail="Invalid TOTP code")

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {"two_factor_enabled": False},
            "$unset": {"totp_secret": "", "backup_codes": "", "pending_totp_secret": ""},
        }
    )
    return {"success": True, "message": "2FA disabled successfully"}
