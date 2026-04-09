from fastapi import APIRouter, Depends

from utils import get_current_user, invoke_llm

router = APIRouter(prefix="/api", tags=["llm"])


@router.post("/integrations/llm")
async def llm_proxy(body: dict, user: dict = Depends(get_current_user)):
    result = await invoke_llm(body.get("prompt", ""), body.get("response_json_schema"))
    return result


@router.get("/health")
async def health():
    return {"status": "ok"}
