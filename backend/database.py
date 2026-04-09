from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGO_URL, DB_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
from datetime import datetime, timezone

client = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.invites.create_index("invite_token")
    await db.invites.create_index([("email", 1), ("status", 1)])
    await db.invites.create_index([("team_id", 1), ("status", 1)])
    await db.password_reset_tokens.create_index("token")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index([("identifier", 1), ("attempted_at", -1)])
    await db.push_subscriptions.create_index([("user_id", 1)], unique=False)
    await _seed_admin()
    print("NxGenSports backend started")


async def close_db():
    if client:
        client.close()


async def _seed_admin():
    import bcrypt
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "email": ADMIN_EMAIL,
            "password_hash": bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode(),
            "full_name": "Super Admin",
            "first_name": "Super",
            "last_name": "Admin",
            "role": "super_admin",
            "coaching_role": "admin",
            "profile_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not bcrypt.checkpw(ADMIN_PASSWORD.encode(), existing.get("password_hash", "").encode()):
        await db.users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"password_hash": bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()}}
        )
