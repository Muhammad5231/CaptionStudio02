import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import UserModel, ProjectModel, CaptionTrackModel, UsageRecordModel
from app.schemas.schemas import CaptionTrackResponse
from app.services.translation.translator import translation_service
from app.api.deps import get_current_user_optional, get_user_project

router = APIRouter(prefix="/projects", tags=["translate", "tracks"])

class TranslateRequest(BaseModel):
    target_language: str = "hi"  # hi, es, fr, de, gu, hinglish, en, etc.
    source_language: Optional[str] = "auto"
    track_name: Optional[str] = None

LANGUAGE_LABELS = {
    "hi": "Hindi (हिन्दी)",
    "es": "Spanish (Español)",
    "fr": "French (Français)",
    "de": "German (Deutsch)",
    "gu": "Gujarati (ગુજરાતી)",
    "en": "English",
    "hinglish": "Hinglish"
}

@router.get("/{project_id}/tracks", response_model=List[CaptionTrackResponse])
def list_caption_tracks(
    project_id: str,
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    if current_user:
        get_user_project(project_id, current_user, db)

    tracks = db.query(CaptionTrackModel).filter(
        CaptionTrackModel.project_id == project_id
    ).order_by(CaptionTrackModel.created_at.asc()).all()
    return tracks

@router.post("/{project_id}/tracks/{track_id}/activate")
def activate_caption_track(
    project_id: str,
    track_id: str,
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    if current_user:
        project = get_user_project(project_id, current_user, db)
    else:
        project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    track = db.query(CaptionTrackModel).filter(
        CaptionTrackModel.id == track_id,
        CaptionTrackModel.project_id == project.id
    ).first()
    if not track:
        raise HTTPException(status_code=404, detail="Caption track not found")

    # Set as active track and synchronize current captions
    project.active_track_id = track.id
    project.captions = list(track.segments or [])
    db.commit()

    return {
        "message": f"Activated track '{track.label}'",
        "active_track_id": track.id,
        "captions": project.captions
    }

@router.post("/{project_id}/translate")
async def translate_project_captions(
    project_id: str,
    req: TranslateRequest,
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Non-destructive translation:
    Preserves original captions and saves translation as a new named CaptionTrack.
    """
    if current_user:
        project = get_user_project(project_id, current_user, db)
    else:
        project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    if not project.captions:
        raise HTTPException(status_code=400, detail="No captions exist to translate in this project.")

    # 1. Ensure an Original track exists so the source is never lost
    existing_tracks = db.query(CaptionTrackModel).filter(CaptionTrackModel.project_id == project.id).all()
    if not existing_tracks:
        orig_track = CaptionTrackModel(
            id=str(uuid.uuid4()),
            project_id=project.id,
            language="en",
            label="Original Captions",
            source="transcription",
            is_default=True,
            segments=list(project.captions or [])
        )
        db.add(orig_track)
        project.active_track_id = orig_track.id
        db.flush()

    try:
        # 2. Translate segments
        translated_captions = await translation_service.translate_segments(
            segments=project.captions,
            source_lang=req.source_language or "auto",
            target_lang=req.target_language
        )

        label = req.track_name or LANGUAGE_LABELS.get(req.target_language, req.target_language.upper())
        new_track_id = str(uuid.uuid4())

        # 3. Create new CaptionTrackModel (Non-destructive)
        new_track = CaptionTrackModel(
            id=new_track_id,
            project_id=project.id,
            language=req.target_language,
            label=label,
            source="translation",
            is_default=False,
            segments=translated_captions
        )
        db.add(new_track)

        # 4. Set new track as active
        project.active_track_id = new_track_id
        project.captions = translated_captions

        # 5. Record usage metric
        if current_user:
            char_count = sum(len(s.get("text", "")) for s in project.captions)
            usage = UsageRecordModel(
                user_id=current_user.id,
                metric="translation_characters",
                quantity=float(char_count),
                details={"project_id": project.id, "target_lang": req.target_language}
            )
            db.add(usage)

        db.commit()
        db.refresh(project)

        return {
            "message": f"Captions translated to {label} and saved as a new track",
            "target_language": req.target_language,
            "track_id": new_track_id,
            "track_label": label,
            "captions": translated_captions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")
