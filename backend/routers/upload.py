import os
import uuid
from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File

from config import UPLOAD_DIR
from utils import get_current_user, public_base_url

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
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

    file_url = f"{public_base_url(request)}/static/uploads/{filename}"
    return {"file_url": file_url, "filename": filename}
