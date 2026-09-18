import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import UserModel, ProjectModel, CaptionTrackModel, UsageRecordModel
from app.services.transcription.whisper_provider import whisper_provider
from app.api.deps import get_current_user_optional, get_user_project

router = APIRouter(prefix="/projects", tags=["transcription"])

class TranscribeRequest(BaseModel):
    language: Optional[str] = "auto"

@router.post("/{project_id}/transcribe")
async def transcribe_project(
    project_id: str,
    req: Optional[TranscribeRequest] = None,
    language: Optional[str] = Query(None),
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    if current_user:
        project = get_user_project(project_id, current_user, db)
    else:
        project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    if not project.video_path:
        raise HTTPException(
            status_code=400,
            detail="Please upload a video file first before transcribing."
        )

    project.status = "transcribing"
    db.commit()

    chosen_lang = (req.language if req and req.language else None) or language or "auto"

    try:
        result = await whisper_provider.transcribe(project.video_path, language=chosen_lang)
        segments = result.get("segments", [])

        # If whisper found no speech in silent video, provide friendly initial segment
        if not segments:
            segments = [
                {
                    "id": "seg-1",
                    "start": 0.5,
                    "end": min(3.5, max(1.5, project.duration or 3.0)),
                    "text": "Add your first caption here",
                    "words": [
                        {"text": "Add", "start": 0.5, "end": 1.0, "confidence": 1.0},
                        {"text": "your", "start": 1.0, "end": 1.5, "confidence": 1.0},
                        {"text": "first", "start": 1.5, "end": 2.2, "confidence": 1.0},
                        {"text": "caption", "start": 2.2, "end": 2.9, "confidence": 1.0},
                        {"text": "here", "start": 2.9, "end": 3.4, "confidence": 1.0}
                    ]
                }
            ]

        # Register primary CaptionTrackModel
        track_id = str(uuid.uuid4())
        track = CaptionTrackModel(
            id=track_id,
            project_id=project.id,
            language=chosen_lang,
            label=f"Transcribed ({chosen_lang.upper()})",
            source="transcription",
            is_default=True,
            segments=segments
        )
        db.add(track)

        project.captions = segments
        project.active_track_id = track_id
        project.status = "ready"

        # Record SaaS transcription seconds usage
        if current_user:
            usage = UsageRecordModel(
                user_id=current_user.id,
                metric="transcription_seconds",
                quantity=float(project.duration or 10.0),
                details={"project_id": project.id, "language": chosen_lang}
            )
            db.add(usage)

        db.commit()
        db.refresh(project)

        return {
            "message": "Captions generated successfully",
            "language": chosen_lang,
            "track_id": track_id,
            "segments_count": len(segments),
            "captions": segments
        }
    except Exception as e:
        project.status = "ready"
        db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )
