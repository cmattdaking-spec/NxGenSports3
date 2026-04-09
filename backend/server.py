from config import ALLOWED_ORIGINS, UPLOAD_DIR
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import connect_db, close_db
from routers.auth import router as auth_router
from routers.entities import router as entities_router
from routers.functions import router as functions_router
from routers.messages import router as messages_router
from routers.upload import router as upload_router
from routers.llm import router as llm_router
from routers.students import router as students_router
from routers.faculty import router as faculty_router
from routers.parents import router as parents_router
from routers.clubs import router as clubs_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory="/app/static"), name="static")

# Include all routers
app.include_router(auth_router)
app.include_router(entities_router)
app.include_router(functions_router)
app.include_router(messages_router)
app.include_router(upload_router)
app.include_router(llm_router)
app.include_router(students_router)
app.include_router(faculty_router)
app.include_router(parents_router)
app.include_router(clubs_router)


@app.on_event("startup")
async def startup():
    await connect_db()


@app.on_event("shutdown")
async def shutdown():
    await close_db()
