import uuid
import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import ProjectModel, CaptionTrackModel, MediaAssetModel
from app.schemas.schemas import ProjectCreate, ProjectUpdate
from app.services.styling.presets import get_style_preset

def utc_now():
    return datetime.now(timezone.utc)

class ProjectService:
    @staticmethod
    def get_all(db: Session, user_id: Optional[str] = None) -> List[ProjectModel]:
        query = db.query(ProjectModel).filter(ProjectModel.is_deleted == False)
        if user_id:
            query = query.filter(ProjectModel.user_id == user_id)
        return query.order_by(ProjectModel.updated_at.desc()).all()

    @staticmethod
    def get_by_id(db: Session, project_id: str, user_id: Optional[str] = None) -> Optional[ProjectModel]:
        query = db.query(ProjectModel).filter(
            ProjectModel.id == project_id,
            ProjectModel.is_deleted == False
        )
        if user_id:
            query = query.filter(ProjectModel.user_id == user_id)
        return query.first()

    @staticmethod
    def create(db: Session, data: ProjectCreate, user_id: Optional[str] = None) -> ProjectModel:
        preset_name = data.style_preset or "Modern"
        style_config = get_style_preset(preset_name)
        
        project = ProjectModel(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=data.name or "Untitled Video",
            aspect_ratio=data.aspect_ratio or "9:16",
            style_preset=preset_name,
            style_config=style_config,
            captions=[],
            status="ready",
            created_at=utc_now(),
            updated_at=utc_now()
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def update(db: Session, project_id: str, data: ProjectUpdate, user_id: Optional[str] = None) -> Optional[ProjectModel]:
        project = ProjectService.get_by_id(db, project_id, user_id)
        if not project:
            return None

        if data.name is not None:
            project.name = data.name.strip()
        if data.style_preset is not None:
            project.style_preset = data.style_preset
        if data.aspect_ratio is not None:
            project.aspect_ratio = data.aspect_ratio
        if data.style_config is not None:
            current_config = dict(project.style_config or {})
            current_config.update(data.style_config)
            project.style_config = current_config
        if data.captions is not None:
            project.captions = data.captions
            # Sync active track if present
            if project.active_track_id:
                track = db.query(CaptionTrackModel).filter(
                    CaptionTrackModel.id == project.active_track_id,
                    CaptionTrackModel.project_id == project.id
                ).first()
                if track:
                    track.segments = data.captions
                    track.updated_at = utc_now()
        if data.active_track_id is not None:
            project.active_track_id = data.active_track_id

        project.updated_at = utc_now()
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def duplicate(db: Session, project_id: str, user_id: Optional[str] = None) -> Optional[ProjectModel]:
        orig = ProjectService.get_by_id(db, project_id, user_id)
        if not orig:
            return None

        new_project_id = str(uuid.uuid4())
        
        # Safely copy video file if exists to prevent shared mutable state
        new_video_path = None
        new_video_url = None
        if orig.video_path and Path(orig.video_path).exists():
            orig_path = Path(orig.video_path)
            new_filename = f"{new_project_id[:8]}_{orig_path.name}"
            new_dest = orig_path.parent / new_filename
            try:
                shutil.copy2(orig_path, new_dest)
                new_video_path = str(new_dest)
                new_video_url = f"/api/media/uploads/{new_filename}"
            except Exception:
                new_video_path = orig.video_path
                new_video_url = orig.video_url

        new_project = ProjectModel(
            id=new_project_id,
            user_id=orig.user_id,
            name=f"{orig.name} (Copy)",
            aspect_ratio=orig.aspect_ratio,
            video_filename=orig.video_filename,
            video_path=new_video_path,
            video_url=new_video_url,
            thumbnail_url=orig.thumbnail_url,
            duration=orig.duration,
            width=orig.width,
            height=orig.height,
            fps=orig.fps,
            style_preset=orig.style_preset,
            style_config=dict(orig.style_config or {}),
            captions=list(orig.captions or []),
            status="ready",
            created_at=utc_now(),
            updated_at=utc_now()
        )
        db.add(new_project)
        db.flush()

        # Copy existing caption tracks
        orig_tracks = db.query(CaptionTrackModel).filter(CaptionTrackModel.project_id == orig.id).all()
        for t in orig_tracks:
            new_track = CaptionTrackModel(
                id=str(uuid.uuid4()),
                project_id=new_project.id,
                language=t.language,
                label=t.label,
                source=t.source,
                is_default=t.is_default,
                segments=list(t.segments or []),
                created_at=utc_now(),
                updated_at=utc_now()
            )
            db.add(new_track)
            if t.id == orig.active_track_id:
                new_project.active_track_id = new_track.id

        db.commit()
        db.refresh(new_project)
        return new_project

    @staticmethod
    def delete(db: Session, project_id: str, user_id: Optional[str] = None) -> bool:
        project = ProjectService.get_by_id(db, project_id, user_id)
        if not project:
            return False
        
        # Soft delete
        project.is_deleted = True
        project.updated_at = utc_now()
        db.commit()
        return True

project_service = ProjectService()
