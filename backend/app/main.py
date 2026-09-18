import os
import time
import logging
from pathlib import Path
from contextlib import asynccontextmanager
import threading

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_db
from app.services.transcription.whisper_provider import whisper_provider

# Routers
from app.api.auth import router as auth_router
from app.api.projects import router as projects_router
from app.api.upload import router as upload_router
from app.api.transcription import router as transcription_router
from app.api.templates import router as templates_router
from app.api.export import router as export_router
from app.api.demo import router as demo_router
from app.api.translate import router as translate_router
from app.api.usage import router as usage_router
from app.api.admin import router as admin_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("captionstudio")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize DB tables & seed admin user
    init_db()
    # 2. Pre-warm whisper model in background thread
    threading.Thread(target=whisper_provider.preload_model, daemon=True).start()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="CaptionStudio02 — Enterprise-grade AI Video Captioning & Multilingual SaaS Engine",
    lifespan=lifespan
)

# Secure CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Structured request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response

# Global friendly exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Please try again later."}
    )

# Static media routes for uploads, renders, thumbnails
app.mount("/api/media/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")
app.mount("/api/media/renders", StaticFiles(directory=str(settings.RENDER_DIR)), name="renders")
app.mount("/api/media/thumbnails", StaticFiles(directory=str(settings.THUMBNAIL_DIR)), name="thumbnails")

# Register routers under /api/v1 (Canonical SaaS REST API)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(projects_router, prefix=settings.API_V1_STR)
app.include_router(upload_router, prefix=settings.API_V1_STR)
app.include_router(transcription_router, prefix=settings.API_V1_STR)
app.include_router(templates_router, prefix=settings.API_V1_STR)
app.include_router(export_router, prefix=settings.API_V1_STR)
app.include_router(demo_router, prefix=settings.API_V1_STR)
app.include_router(translate_router, prefix=settings.API_V1_STR)
app.include_router(usage_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)

# Backward compatibility: also map /api prefix to support existing tests & integrations seamlessly
if settings.API_V1_STR != "/api":
    app.include_router(auth_router, prefix="/api")
    app.include_router(projects_router, prefix="/api")
    app.include_router(upload_router, prefix="/api")
    app.include_router(transcription_router, prefix="/api")
    app.include_router(templates_router, prefix="/api")
    app.include_router(export_router, prefix="/api")
    app.include_router(demo_router, prefix="/api")
    app.include_router(translate_router, prefix="/api")
    app.include_router(usage_router, prefix="/api")
    app.include_router(admin_router, prefix="/api")

@app.get("/api/health")
@app.get("/health")
@app.get("/ready")
def health_check():
    return {
        "status": "healthy",
        "service": "CaptionStudio Backend",
        "version": "2.0.0",
        "ffmpeg_available": bool(settings.FFMPEG_PATH),
        "ffmpeg_path": settings.FFMPEG_PATH,
        "environment": settings.APP_ENV
    }

# Mount frontend production build if available
frontend_dist = settings.BASE_DIR.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
