import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import ProjectModel
from app.schemas.schemas import ProjectCreate, ProjectUpdate
from app.services.styling.presets import get_style_preset

class ProjectService:
    @staticmethod
    def get_all(db: Session) -> List[ProjectModel]:
        return db.query(ProjectModel).order_by(ProjectModel.updated_at.desc()).all()

    @staticmethod
    def get_by_id(db: Session, project_id: str) -> Optional[ProjectModel]:
        return db.query(ProjectModel).filter(ProjectModel.id == project_id).first()

    @staticmethod
    def create(db: Session, data: ProjectCreate) -> ProjectModel:
        preset_name = data.style_preset or "Modern"
        style_config = get_style_preset(preset_name)
        
        project = ProjectModel(
            id=str(uuid.uuid4()),
            name=data.name or "Untitled Video",
            style_preset=preset_name,
            style_config=style_config,
            captions=[],
            status="ready",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def update(db: Session, project_id: str, data: ProjectUpdate) -> Optional[ProjectModel]:
        project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not project:
            return None

        if data.name is not None:
            project.name = data.name
        if data.style_preset is not None:
            project.style_preset = data.style_preset
        if data.style_config is not None:
            # Merge with existing config
            current_config = dict(project.style_config or {})
            current_config.update(data.style_config)
            project.style_config = current_config
        if data.captions is not None:
            project.captions = data.captions

        project.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def duplicate(db: Session, project_id: str) -> Optional[ProjectModel]:
        orig = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not orig:
            return None

        new_project = ProjectModel(
            id=str(uuid.uuid4()),
            name=f"{orig.name} (Copy)",
            video_filename=orig.video_filename,
            video_path=orig.video_path,
            video_url=orig.video_url,
            thumbnail_url=orig.thumbnail_url,
            duration=orig.duration,
            width=orig.width,
            height=orig.height,
            fps=orig.fps,
            style_preset=orig.style_preset,
            style_config=orig.style_config,
            captions=orig.captions,
            status="ready",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(new_project)
        db.commit()
        db.refresh(new_project)
        return new_project

    @staticmethod
    def delete(db: Session, project_id: str) -> bool:
        project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not project:
            return False
        db.delete(project)
        db.commit()
        return True

project_service = ProjectService()

