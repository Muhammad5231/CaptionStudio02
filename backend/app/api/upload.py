import os
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.models import ProjectModel
from app.services.ffmpeg.wrapper import ffmpeg_wrapper
from app.services.subtitle_parser.parser import subtitle_parser

router = APIRouter(prefix="/projects", tags=["upload"])

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".m4v"}
ALLOWED_SUBTITLE_EXTENSIONS = {".srt", ".vtt", ".ass", ".txt"}

@router.post("/{project_id}/upload")
async def upload_video(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format {ext}. Please upload an MP4, MOV, or WebM file."
        )

    safe_filename = f"{project_id}_{Path(file.filename).name}"
    save_path = settings.UPLOAD_DIR / safe_filename

    # Save uploaded video
    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save video: {str(e)}"
        )

    # Probe metadata
    meta = ffmpeg_wrapper.probe_video(str(save_path))

    # Generate thumbnail
    thumb_name = f"{project_id}_thumb.jpg"
    thumb_path = settings.THUMBNAIL_DIR / thumb_name
    ffmpeg_wrapper.generate_thumbnail(str(save_path), str(thumb_path), timestamp=min(1.0, meta["duration"] / 2))

    # Update project
    project.video_filename = file.filename
    project.video_path = str(save_path)
    project.video_url = f"/api/media/uploads/{safe_filename}"
    project.thumbnail_url = f"/api/media/thumbnails/{thumb_name}"
    project.duration = meta["duration"]
    project.width = meta["width"]
    project.height = meta["height"]
    project.fps = meta["fps"]
    project.status = "ready"

    db.commit()
    db.refresh(project)

    return {
        "message": "Video uploaded successfully",
        "video_url": project.video_url,
        "thumbnail_url": project.thumbnail_url,
        "duration": project.duration,
        "width": project.width,
        "height": project.height,
        "fps": project.fps
    }

async def _process_subtitle_upload(project_id: str, file: UploadFile, db: Session):
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_SUBTITLE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format {ext}. Please upload an SRT, VTT, or ASS file."
        )

    try:
        content_bytes = await file.read()
        content_str = content_bytes.decode("utf-8", errors="ignore")
        parsed_segments = subtitle_parser.parse(file.filename, content_str)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not parse subtitle file: {str(e)}"
        )

    if not parsed_segments:
        raise HTTPException(
            status_code=400,
            detail="No valid subtitles found in the uploaded file."
        )

    project.captions = parsed_segments
    db.commit()
    db.refresh(project)

    return {
        "message": f"Imported {len(parsed_segments)} caption segments",
        "captions": parsed_segments
    }

@router.post("/{project_id}/subtitles")
async def upload_subtitles(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    return await _process_subtitle_upload(project_id, file, db)

@router.post("/{project_id}/subtitles/import")
async def import_subtitles(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    return await _process_subtitle_upload(project_id, file, db)
