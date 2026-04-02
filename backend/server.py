from dotenv import load_dotenv
load_dotenv()

import os
import re
import json
import secrets
import bcrypt
import jwt
import httpx
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

# ─── Config ──────────────────────────────────────────────────────────────────
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@nxgensports.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin123!")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
INTEGRATION_PROXY_URL = os.environ.get("INTEGRATION_PROXY_URL", "https://integrations.emergentagent.com")
APP_URL = os.environ.get("APP_URL", "http://localhost:3000")

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── MongoDB ─────────────────────────────────────────────────────────────────
client: AsyncIOMotorClient = None
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
    await seed_admin()
    print("NxGenSports backend started")

@app.on_event("shutdown")
async def shutdown():
    client.close()

# ─── Helpers ─────────────────────────────────────────────────────────────────
def entity_to_collection(entity_name: str) -> str:
    """Convert PascalCase entity name to snake_case collection name."""
    s = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', entity_name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s).lower()

def serialize_doc(doc: dict) -> dict:
    if not doc:
        return None
    result = {}
    for k, v in doc.items():
        if k == "_id":
            result["id"] = str(v)
        elif isinstance(v, ObjectId):
            result[k] = str(v)
        elif isinstance(v, datetime):
            result[k] = v.isoformat()
        elif isinstance(v, list):
            result[k] = [serialize_doc(i) if isinstance(i, dict) else (str(i) if isinstance(i, ObjectId) else i) for i in v]
        elif isinstance(v, dict):
            result[k] = serialize_doc(v)
        else:
            result[k] = v
    return result

def parse_sort(sort_str: str):
    if not sort_str:
        return ("created_at", -1)
    if sort_str.startswith('-'):
        return (sort_str[1:], -1)
    return (sort_str, 1)

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()

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
    else:
        if not verify_password(ADMIN_PASSWORD, existing.get("password_hash", "")):
            await db.users.update_one(
                {"email": ADMIN_EMAIL},
                {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}}
            )

# ─── LLM Helper ──────────────────────────────────────────────────────────────
async def invoke_llm(prompt: str, schema: dict = None) -> dict:
    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
    }
    if schema:
        payload["response_format"] = {"type": "json_object"}
    async with httpx.AsyncClient() as c:
        try:
            r = await c.post(
                f"{INTEGRATION_PROXY_URL}/v1/chat/completions",
                headers={"Authorization": f"Bearer {EMERGENT_LLM_KEY}"},
                json=payload,
                timeout=60.0,
            )
            r.raise_for_status()
            content = r.json()["choices"][0]["message"]["content"]
            return json.loads(content) if schema else {"text": content}
        except Exception as e:
            return {}

# ─── Auth Routes ─────────────────────────────────────────────────────────────
@app.post("/api/auth/login")
async def login(body: dict):
    email = body.get("email", "").lower().strip()
    password = body.get("password", "")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
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

@app.post("/api/auth/accept-invite")
async def accept_invite(body: dict):
    invite_token = body.get("invite_token", "")
    password = body.get("password", "")
    if not invite_token or not password:
        raise HTTPException(status_code=400, detail="invite_token and password required")

    invite = await db.invites.find_one({"invite_token": invite_token, "status": "pending"})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite token")

    email = invite.get("email", "").lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        # Update existing user with invite data
        admin_roles = ["head_coach", "athletic_director", "associate_head_coach",
                       "offensive_coordinator", "defensive_coordinator",
                       "special_teams_coordinator", "strength_conditioning_coordinator"]
        coaching_role = invite.get("coaching_role", "")
        platform_role = "admin" if coaching_role in admin_roles else "user"
        update_data = {
            "team_id": invite.get("team_id"),
            "school_id": invite.get("school_id"),
            "school_name": invite.get("school_name", ""),
            "school_code": invite.get("school_code", ""),
            "coaching_role": coaching_role,
            "assigned_sports": invite.get("assigned_sports", []),
            "assigned_positions": invite.get("assigned_positions", []),
            "assigned_phases": invite.get("assigned_phases", []),
            "role": platform_role,
            "profile_verified": False,
        }
        if invite.get("first_name"):
            update_data["first_name"] = invite["first_name"]
        if invite.get("last_name"):
            update_data["last_name"] = invite["last_name"]
        if invite.get("poc_name"):
            update_data["full_name"] = invite["poc_name"]
        if invite.get("invite_type") == "player":
            update_data["user_type"] = "player"
        if invite.get("invite_type") == "parent":
            update_data["user_type"] = "parent"
        await db.users.update_one({"email": email}, {"$set": update_data})
        await db.invites.update_one({"_id": invite["_id"]}, {"$set": {"status": "accepted"}})
        user = await db.users.find_one({"email": email})
        user_id = str(user["_id"])
        token = create_token(user_id, email)
        user["_id"] = user_id
        user.pop("password_hash", None)
        return {"access_token": token, "token_type": "bearer", "user": serialize_doc(user)}

    # Create new user from invite
    admin_roles = ["head_coach", "athletic_director", "associate_head_coach",
                   "offensive_coordinator", "defensive_coordinator",
                   "special_teams_coordinator", "strength_conditioning_coordinator"]
    coaching_role = invite.get("coaching_role", "")
    platform_role = "admin" if coaching_role in admin_roles else "user"
    invite_type = invite.get("invite_type", "staff")

    user_doc = {
        "email": email,
        "password_hash": hash_password(password),
        "full_name": body.get("full_name") or invite.get("poc_name", ""),
        "first_name": invite.get("first_name", ""),
        "last_name": invite.get("last_name", ""),
        "role": platform_role,
        "coaching_role": coaching_role,
        "user_type": "player" if invite_type == "player" else ("parent" if invite_type == "parent" else "coach"),
        "team_id": invite.get("team_id"),
        "school_id": invite.get("school_id"),
        "school_name": invite.get("school_name", ""),
        "school_code": invite.get("school_code", ""),
        "assigned_sports": invite.get("assigned_sports", []),
        "assigned_positions": invite.get("assigned_positions", []),
        "assigned_phases": invite.get("assigned_phases", []),
        "profile_verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if invite_type == "player" and invite.get("player_id"):
        user_doc["player_id"] = invite["player_id"]
    if invite_type == "parent" and invite.get("child_player_id"):
        user_doc["linked_player_id"] = invite["child_player_id"]
        user_doc["linked_player_ids"] = [invite["child_player_id"]]

    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    await db.invites.update_one({"_id": invite["_id"]}, {"$set": {"status": "accepted"}})

    token = create_token(user_id, email)
    user_doc["_id"] = user_id
    user_doc.pop("password_hash", None)
    return {"access_token": token, "token_type": "bearer", "user": serialize_doc(user_doc)}

@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@app.patch("/api/auth/me")
async def update_me(body: dict, user: dict = Depends(get_current_user)):
    user_id = user["id"] if "id" in user else user["_id"]
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

# ─── Entity CRUD ─────────────────────────────────────────────────────────────
@app.get("/api/entities/{entity_name}")
async def list_entity(entity_name: str, request: Request, user: dict = Depends(get_current_user)):
    collection_name = entity_to_collection(entity_name)
    collection = db[collection_name]
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
    collection_name = entity_to_collection(entity_name)
    collection = db[collection_name]
    query = body.get("query", {})
    sort_str = body.get("sort", "-created_at")
    limit = int(body.get("limit", 500))
    sort_field, sort_dir = parse_sort(sort_str)

    # Apply RLS only if no team_id is already in query and user has team_id
    if user.get("role") != "super_admin":
        if "team_id" not in query and user.get("team_id"):
            # For invite lookups by email, don't add team_id restriction
            if "email" not in query:
                query["team_id"] = user["team_id"]

    cursor = collection.find(query).sort(sort_field, sort_dir).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [serialize_doc(d) for d in docs]

@app.get("/api/entities/{entity_name}/{doc_id}")
async def get_entity(entity_name: str, doc_id: str, user: dict = Depends(get_current_user)):
    collection_name = entity_to_collection(entity_name)
    collection = db[collection_name]
    try:
        doc = await collection.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return serialize_doc(doc)

@app.post("/api/entities/{entity_name}")
async def create_entity(entity_name: str, body: dict, user: dict = Depends(get_current_user)):
    collection_name = entity_to_collection(entity_name)
    collection = db[collection_name]
    body.pop("id", None)
    body.pop("_id", None)
    if "created_at" not in body:
        body["created_at"] = datetime.now(timezone.utc).isoformat()
    if "created_date" not in body:
        body["created_date"] = datetime.now(timezone.utc).isoformat()
    result = await collection.insert_one(body)
    doc = await collection.find_one({"_id": result.inserted_id})
    return serialize_doc(doc)

@app.patch("/api/entities/{entity_name}/{doc_id}")
async def update_entity(entity_name: str, doc_id: str, body: dict, user: dict = Depends(get_current_user)):
    collection_name = entity_to_collection(entity_name)
    collection = db[collection_name]
    body.pop("id", None)
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    try:
        await collection.update_one({"_id": ObjectId(doc_id)}, {"$set": body})
        doc = await collection.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    return serialize_doc(doc)

@app.delete("/api/entities/{entity_name}/{doc_id}")
async def delete_entity(entity_name: str, doc_id: str, user: dict = Depends(get_current_user)):
    collection_name = entity_to_collection(entity_name)
    collection = db[collection_name]
    try:
        await collection.delete_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    return {"success": True}

# ─── Functions ───────────────────────────────────────────────────────────────
@app.post("/api/functions/getTeamUsers")
async def fn_get_team_users(body: dict = None, user: dict = Depends(get_current_user)):
    if user.get("role") == "super_admin":
        # Super admin: get all users except other super admins
        all_users = await db.users.find({"role": {"$ne": "super_admin"}}).to_list(length=2000)
        return [serialize_doc(u) for u in all_users]

    team_id = user.get("team_id")
    if not team_id:
        return []

    team_users = await db.users.find({
        "team_id": team_id,
        "role": {"$ne": "super_admin"}
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
    allowed_roles = ["admin", "super_admin", "head_coach", "athletic_director"]
    effective_role = user.get("coaching_role") or user.get("role")
    if user.get("role") not in allowed_roles and effective_role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Forbidden")

    email = body.get("email", "").strip().lower()
    first_name = body.get("first_name", "").strip()
    last_name = body.get("last_name", "").strip()
    if not email or not first_name or not last_name:
        raise HTTPException(status_code=400, detail="email, first_name, last_name are required")

    invite_type = body.get("invite_type", "staff")
    team_id = body.get("team_id") or user.get("team_id", "")
    school_id = body.get("school_id") or user.get("school_id")
    school_name = body.get("school_name") or user.get("school_name", "")
    school_code = body.get("school_code") or user.get("school_code", "")

    # For school_setup invites, look up school if needed
    if invite_type == "school_setup" and team_id and not school_id:
        existing_school = await db.school.find_one({"team_id": team_id})
        if existing_school:
            school_id = str(existing_school["_id"])
            school_name = school_name or existing_school.get("school_name", "")
            school_code = school_code or existing_school.get("school_code", "")

    coaching_role = body.get("coaching_role", "position_coach")
    if invite_type == "player":
        coaching_role = "player"
    elif invite_type == "parent":
        coaching_role = "parent"

    assigned_sports = body.get("assigned_sports", user.get("assigned_sports", ["football"]))
    invite_token = secrets.token_urlsafe(32)

    # Generate player ID for player invites
    player_id = None
    if invite_type == "player":
        full_name = f"{first_name} {last_name}".strip()
        chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        initial = (last_name[0] if last_name else "X").upper()
        rand = "".join(secrets.choice(chars) for _ in range(3))
        player_id = initial + rand

    invite_data = {
        "email": email,
        "team_id": team_id,
        "school_id": school_id,
        "school_name": school_name,
        "school_code": school_code,
        "coaching_role": coaching_role,
        "assigned_positions": body.get("assigned_positions", []),
        "assigned_phases": body.get("assigned_phases", []),
        "assigned_sports": assigned_sports,
        "status": "pending",
        "invited_by": user.get("email", ""),
        "invite_type": invite_type,
        "first_name": first_name,
        "last_name": last_name,
        "poc_name": f"{first_name} {last_name}",
        "child_player_id": body.get("child_player_id"),
        "player_id": player_id,
        "invite_token": invite_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_date": datetime.now(timezone.utc).isoformat(),
    }

    # School setup extra fields
    if invite_type == "school_setup":
        for field in ["poc_phone", "mascot", "subscribed_sports", "subscription_term", "location_city", "location_state"]:
            if body.get(field) is not None:
                invite_data[field] = body[field]

    # Expire any previous pending invites for same email + team
    await db.invites.update_many(
        {"email": email, "team_id": team_id, "status": "pending"},
        {"$set": {"status": "expired"}}
    )

    result = await db.invites.insert_one(invite_data)

    # Check if user already exists and update their data
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        admin_roles = ["head_coach", "athletic_director", "associate_head_coach",
                       "offensive_coordinator", "defensive_coordinator",
                       "special_teams_coordinator", "strength_conditioning_coordinator"]
        platform_role = "admin" if coaching_role in admin_roles else "user"
        await db.users.update_one({"email": email}, {"$set": {
            "team_id": team_id,
            "school_id": school_id,
            "school_name": school_name,
            "school_code": school_code,
            "coaching_role": coaching_role,
            "assigned_sports": assigned_sports,
            "role": platform_role,
            "profile_verified": False,
        }})

    invite_url = f"{APP_URL}/Login?invite_token={invite_token}"
    print(f"[INVITE] {email} | {invite_type} | Token: {invite_token}")
    print(f"[INVITE URL] {invite_url}")

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

    # Super admin can edit any non-super-admin
    if user.get("role") == "super_admin":
        if target.get("role") == "super_admin":
            raise HTTPException(status_code=403, detail="Cannot modify super admin")
        data.pop("id", None)
        data.pop("_id", None)
        data.pop("password_hash", None)
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": data})
        return {"success": True}

    # Others: must be same team
    if target.get("team_id") != user.get("team_id"):
        raise HTTPException(status_code=403, detail="User not on your team")

    data.pop("id", None)
    data.pop("_id", None)
    data.pop("password_hash", None)
    data.pop("role", None)  # Don't allow role elevation
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

    # Find school to get team_id
    try:
        school = await db.school.find_one({"_id": ObjectId(school_id)})
    except Exception:
        school = None

    user_doc = {
        "full_name": f"{first_name} {last_name}",
        "first_name": first_name,
        "last_name": last_name,
        "school_id": school_id,
        "team_id": school.get("team_id") if school else None,
        "assigned_sports": assigned_sports,
        "role": "user",
        "coaching_role": "parent",
        "user_type": "parent",
        "profile_verified": False,
        "status": "pending_approval",
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
            "team_id": school["team_id"],
            "school_id": str(school["_id"]),
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
    teams = []
    for s in schools:
        teams.append({
            "id": str(s["_id"]),
            "team_id": s.get("team_id", ""),
            "school_name": s.get("school_name", ""),
            "assigned_admin_name": s.get("poc_name", ""),
            "assigned_admin_email": s.get("poc_email", ""),
            "assigned_admin_role": s.get("poc_role", "head_coach"),
            "subscription_status": s.get("status", "active"),
            "subscription_term": s.get("subscription_term", "annual"),
            "subscription_start": s.get("subscription_start"),
            "subscription_end": s.get("subscription_end"),
        })
    return {"teams": teams}

@app.post("/api/functions/{function_name}")
async def generic_function(function_name: str, body: dict = None, user: dict = Depends(get_current_user)):
    return {"success": True, "data": None, "function": function_name}

# ─── LLM Proxy ───────────────────────────────────────────────────────────────
@app.post("/api/integrations/llm")
async def llm_proxy(body: dict, user: dict = Depends(get_current_user)):
    prompt = body.get("prompt", "")
    schema = body.get("response_json_schema")
    result = await invoke_llm(prompt, schema)
    return result

@app.get("/api/health")
async def health():
    return {"status": "ok"}
