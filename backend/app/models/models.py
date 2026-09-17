from datetime import datetime
import uuid
from sqlalchemy import Column, String, Float, Integer, Text, DateTime, JSON
from app.core.database import Base

class ProjectModel(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, default="Untitled Project")
    video_filename = Column(String(255), nullable=True)
    video_path = Column(String(1024), nullable=True)
    video_url = Column(String(1024), nullable=True)
    thumbnail_url = Column(String(1024), nullable=True)
    duration = Column(Float, default=0.0)
    width = Column(Integer, default=1920)
    height = Column(Integer, default=1080)
    fps = Column(Float, default=30.0)
    
    style_preset = Column(String(50), default="Modern")
    style_config = Column(JSON, default=dict)
    captions = Column(JSON, default=list)  # List of segment dicts with words
    status = Column(String(50), default="ready")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ExportJobModel(Base):
    __tablename__ = "export_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), nullable=False)
    status = Column(String(50), default="queued")  # queued, processing, completed, failed
    progress = Column(Integer, default=0)
    current_stage = Column(String(100), default="Queued")
    output_filename = Column(String(255), nullable=True)
    output_path = Column(String(1024), nullable=True)
    output_url = Column(String(1024), nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class TemplateModel(Base):
    __tablename__ = "templates"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    description = Column(String(255), default="")
    preview_text = Column(String(100), default="SAMPLE CAPTION")
    style_config = Column(JSON, default=dict)

