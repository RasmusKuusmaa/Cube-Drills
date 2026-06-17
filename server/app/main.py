from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .database import ensure_schema
from .routers import auth, routine, sessions, solves


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_schema()
    yield


app = FastAPI(title="Cube Drills API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Let routes raise structured bodies (dict detail) that match the
    original Laravel responses, e.g. {"error": "Invalid credentials"}."""
    content = exc.detail if isinstance(exc.detail, dict) else {"detail": exc.detail}
    return JSONResponse(status_code=exc.status_code, content=content, headers=exc.headers)


# All routes live under /api to match the existing client baseURL.
app.include_router(auth.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(solves.router, prefix="/api")
app.include_router(routine.router, prefix="/api")


@app.get("/")
def root():
    return {"status": "ok", "service": "cube-drills-api"}
