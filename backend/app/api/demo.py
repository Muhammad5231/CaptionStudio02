import uuid
import shutil
from pathlib import Path
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.models import ProjectModel
from app.services.styling.presets import get_style_preset

router = APIRouter(prefix="/demo", tags=["demo"])

SAMPLE_CAPTIONS = [
    {
        "id": "seg-1",
        "start": 0.4,
        "end": 2.2,
        "text": "You don't need motivation",
        "words": [
            {"text": "You", "start": 0.4, "end": 0.7, "confidence": 0.98},
            {"text": "don't", "start": 0.7, "end": 1.1, "confidence": 0.99},
            {"text": "need", "start": 1.1, "end": 1.5, "confidence": 0.97},
            {"text": "motivation", "start": 1.5, "end": 2.2, "confidence": 0.99}
        ]
    },
    {
        "id": "seg-2",
        "start": 2.3,
        "end": 4.6,
        "text": "Every day to keep going",
        "words": [
            {"text": "Every", "start": 2.3, "end": 2.7, "confidence": 0.99},
            {"text": "day", "start": 2.7, "end": 3.1, "confidence": 0.98},
            {"text": "to", "start": 3.1, "end": 3.5, "confidence": 0.96},
            {"text": "keep", "start": 3.5, "end": 4.0, "confidence": 0.99},
            {"text": "going", "start": 4.0, "end": 4.6, "confidence": 0.99}
        ]
    }
]

@router.post("/create-sample")
def create_sample_project(db: Session = Depends(get_db)):
    # Ensure sample video exists in uploads
    sample_src = settings.SAMPLE_DIR / "sample_demo.mp4"
    proj_id = str(uuid.uuid4())
    upload_filename = f"{proj_id}_sample_demo.mp4"
    upload_dst = settings.UPLOAD_DIR / upload_filename

    if sample_src.exists():
        shutil.copy2(sample_src, upload_dst)
    
    preset = get_style_preset("Viral")
    
    project = ProjectModel(
        id=proj_id,
        name="Motivational Quote Demo",
        video_filename="sample_demo.mp4",
        video_path=str(upload_dst),
        video_url=f"/api/media/uploads/{upload_filename}",
        thumbnail_url=None,
        duration=5.0,
        width=1280,
        height=720,
        fps=30.0,
        style_preset="Viral",
        style_config=preset,
        captions=SAMPLE_CAPTIONS,
        status="ready",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    return project

