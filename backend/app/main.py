from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import Base, engine
from app.api.projects import router as projects_router
from app.api.upload import router as upload_router
from app.api.transcription import router as transcription_router
from app.api.templates import router as templates_router
from app.api.export import router as export_router
from app.api.demo import router as demo_router

from contextlib import asynccontextmanager
import threading
from app.services.transcription.whisper_provider import whisper_provider

# Initialize database tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-warm whisper model in background thread on startup
    threading.Thread(target=whisper_provider.preload_model, daemon=True).start()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Professional AI Caption Generator Web App",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Friendly exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"An unexpected error occurred: {str(exc)}"}
    )

# Static media routes for uploads, renders, thumbnails
app.mount("/api/media/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")
app.mount("/api/media/renders", StaticFiles(directory=str(settings.RENDER_DIR)), name="renders")
app.mount("/api/media/thumbnails", StaticFiles(directory=str(settings.THUMBNAIL_DIR)), name="thumbnails")

# Register routers
app.include_router(projects_router, prefix=settings.API_V1_STR)
app.include_router(upload_router, prefix=settings.API_V1_STR)
app.include_router(transcription_router, prefix=settings.API_V1_STR)
app.include_router(templates_router, prefix=settings.API_V1_STR)
app.include_router(export_router, prefix=settings.API_V1_STR)
app.include_router(demo_router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CaptionStudio Backend",
        "ffmpeg_available": bool(settings.FFMPEG_PATH),
        "ffmpeg_path": settings.FFMPEG_PATH
    }

# Mount frontend production build if available
frontend_dist = settings.BASE_DIR.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
