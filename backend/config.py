from dotenv import load_dotenv
load_dotenv()

import os
import base64

# ─── Core ─────────────────────────────────────────────────────────────────────
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@nxgensports.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin123!")

# ─── LLM ──────────────────────────────────────────────────────────────────────
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
INTEGRATION_PROXY_URL = os.environ.get("INTEGRATION_PROXY_URL", "https://integrations.emergentagent.com")
LLM_ENDPOINTS = [
    f"{INTEGRATION_PROXY_URL}/v1/chat/completions",
    "https://api.openai.com/v1/chat/completions",
]

# ─── URLs & CORS ──────────────────────────────────────────────────────────────
APP_URL = os.environ.get("APP_URL", "http://localhost:3000")
ALLOWED_ORIGINS = ["*"]

# ─── Email (Resend) ──────────────────────────────────────────────────────────
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "noreply@nxgen-sports.com")

# ─── VAPID (Push Notifications) ──────────────────────────────────────────────
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_PEM_B64 = os.environ.get("VAPID_PRIVATE_PEM_B64", "")
VAPID_CONTACT = os.environ.get("VAPID_CONTACT", f"mailto:{ADMIN_EMAIL}")

def vapid_private_pem() -> str:
    if not VAPID_PRIVATE_PEM_B64:
        return ""
    return base64.b64decode(VAPID_PRIVATE_PEM_B64).decode()

# ─── Rate Limiting ────────────────────────────────────────────────────────────
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

# ─── Upload ───────────────────────────────────────────────────────────────────
UPLOAD_DIR = "/app/static/uploads"
