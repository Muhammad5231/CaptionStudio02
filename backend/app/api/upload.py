import os
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.models import UserModel, ProjectModel, MediaAssetModel, CaptionTrackModel, UsageRecordModel
from app.services.ffmpeg.wrapper import ffmpeg_wrapper
from app.services.subtitle_parser.parser import subtitle_parser
from app.services.storage.storage_service import storage_service, validate_media_file_signature
from app.api.deps import get_current_user_optional, get_user_project

router = APIRouter(prefix="/projects", tags=["upload"])

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".m4v"}
ALLOWED_SUBTITLE_EXTENSIONS = {".srt", ".vtt", ".ass", ".txt"}

@router.post("/{project_id}/upload")
async def upload_video(
    project_id: str,
    file: UploadFile = File(...),
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    if current_user:
        project = get_user_project(project_id, current_user, db)
    else:
        project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format {ext}. Please upload an MP4, MOV, or WebM file."
        )

    # 1. Hardened validation: Magic-byte inspection
    mime_type = validate_media_file_signature(file.file, ext)

    # 2. Save file via StorageService (handles chunking & max size enforcement)
    safe_target_filename = f"{project_id}_{Path(file.filename or 'video.mp4').name}"
    storage_key, file_path, size_bytes, checksum = storage_service.save_file(
        file_stream=file.file,
        filename=safe_target_filename,
        subfolder="uploads"
    )

    # 3. Probe metadata via FFmpeg
    meta = ffmpeg_wrapper.probe_video(file_path)

    # 4. Generate thumbnail
    thumb_name = f"{project_id}_thumb.jpg"
    thumb_path = settings.THUMBNAIL_DIR / thumb_name
    ffmpeg_wrapper.generate_thumbnail(file_path, str(thumb_path), timestamp=min(1.0, meta["duration"] / 2))

    # 5. Register MediaAssetModel
    media_asset = MediaAssetModel(
        id=str(uuid.uuid4()),
        user_id=current_user.id if current_user else None,
        project_id=project.id,
        original_name=file.filename or "uploaded_video.mp4",
        storage_key=storage_key,
        storage_provider="local",
        mime_type=mime_type,
        size_bytes=size_bytes,
        duration=meta["duration"],
        width=meta["width"],
        height=meta["height"],
        fps=meta["fps"],
        checksum=checksum
    )
    db.add(media_asset)

    # 6. Update Project
    project.video_filename = file.filename
    project.video_path = file_path
    project.video_url = storage_service.get_public_url(storage_key)
    project.thumbnail_url = f"/api/media/thumbnails/{thumb_name}"
    project.duration = meta["duration"]
    project.width = meta["width"]
    project.height = meta["height"]
    project.fps = meta["fps"]
    project.status = "ready"

    # 7. Record storage usage metric
    if current_user:
        usage = UsageRecordModel(
            user_id=current_user.id,
            metric="storage_bytes",
            quantity=float(size_bytes),
            details={"project_id": project.id, "filename": file.filename}
        )
        db.add(usage)

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

async def _process_subtitle_upload(project_id: str, file: UploadFile, current_user: Optional[UserModel], db: Session):
    if current_user:
        project = get_user_project(project_id, current_user, db)
    else:
        project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_SUBTITLE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format {ext}. Please upload an SRT, VTT, or ASS file."
        )

    try:
        content_bytes = await file.read()
        content_str = content_bytes.decode("utf-8", errors="ignore")
        parsed_segments = subtitle_parser.parse(file.filename, content_str)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not parse subtitle file: {str(e)}"
        )

    if not parsed_segments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid subtitles found in the uploaded file."
        )

    subtitle_duration = 0.0
    if parsed_segments:
        subtitle_duration = max(seg.get("end", 0.0) for seg in parsed_segments)
        subtitle_duration = round(subtitle_duration + 0.5, 2)

    project.captions = parsed_segments

    # Create / replace initial default CaptionTrack
    track_id = str(uuid.uuid4())
    track = CaptionTrackModel(
        id=track_id,
        project_id=project.id,
        language="auto",
        label=f"Imported ({ext.replace('.', '').upper()})",
        source="import",
        is_default=True,
        segments=parsed_segments
    )
    db.add(track)
    project.active_track_id = track_id

    if not project.video_path or (project.duration or 0) < subtitle_duration:
        project.duration = max(project.duration or 0.0, subtitle_duration)

    cfg = dict(project.style_config or {})
    if not project.video_path or project.video_filename == "sample_demo.mp4":
        if "canvas_background_type" not in cfg:
            cfg["canvas_background_type"] = "color"
            cfg.setdefault("canvas_background_color", "#00FF00")
            project.style_config = cfg

    db.commit()
    db.refresh(project)

    return {
        "message": f"Imported {len(parsed_segments)} caption segments",
        "captions": parsed_segments,
        "track_id": track_id,
        "duration": project.duration,
        "format": ext.replace(".", "").upper(),
        "segment_count": len(parsed_segments)
    }

@router.post("/{project_id}/subtitles")
async def upload_subtitles(
    project_id: str,
    file: UploadFile = File(...),
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    return await _process_subtitle_upload(project_id, file, current_user, db)

@router.post("/{project_id}/subtitles/import")
async def import_subtitles(
    project_id: str,
    file: UploadFile = File(...),
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    return await _process_subtitle_upload(project_id, file, current_user, db)
