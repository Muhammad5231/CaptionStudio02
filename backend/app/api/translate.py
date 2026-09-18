from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import ProjectModel
from app.services.translation.translator import translation_service

router = APIRouter(prefix="/projects", tags=["translate"])

class TranslateRequest(BaseModel):
    target_language: str = "hi"  # hi, gu, hinglish, en
    source_language: Optional[str] = "auto"

@router.post("/{project_id}/translate")
async def translate_project_captions(
    project_id: str,
    req: TranslateRequest,
    db: Session = Depends(get_db)
):
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.captions:
        raise HTTPException(status_code=400, detail="No captions exist to translate in this project.")

    try:
        translated_captions = await translation_service.translate_segments(
            segments=project.captions,
            source_lang=req.source_language or "auto",
            target_lang=req.target_language
        )

        project.captions = translated_captions
        db.commit()
        db.refresh(project)

        return {
            "message": f"Captions translated to {req.target_language}",
            "target_language": req.target_language,
            "captions": translated_captions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")
