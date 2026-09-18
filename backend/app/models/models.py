from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Column, String, Float, Integer, BigInteger, Text, DateTime, JSON, Boolean, ForeignKey
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, default="Creator")
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="user", nullable=False)  # "user", "admin"
    status = Column(String(50), default="active", nullable=False)  # "active", "suspended"
    avatar = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    last_login = Column(DateTime, nullable=True)

    # Relationships
    projects = relationship("ProjectModel", back_populates="user", cascade="all, delete-orphan")
    media_assets = relationship("MediaAssetModel", back_populates="user", cascade="all, delete-orphan")
    export_jobs = relationship("ExportJobModel", back_populates="user", cascade="all, delete-orphan")
    usage_records = relationship("UsageRecordModel", back_populates="user", cascade="all, delete-orphan")
    subscription = relationship("SubscriptionModel", back_populates="user", uselist=False, cascade="all, delete-orphan")

class ProjectModel(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(255), nullable=False, default="Untitled Project")
    aspect_ratio = Column(String(20), default="9:16")
    
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
    captions = Column(JSON, default=list)  # Active caption segments with word timings
    active_track_id = Column(String(36), nullable=True)
    status = Column(String(50), default="ready")
    is_deleted = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    user = relationship("UserModel", back_populates="projects")
    media_assets = relationship("MediaAssetModel", back_populates="project", cascade="all, delete-orphan")
    tracks = relationship("CaptionTrackModel", back_populates="project", cascade="all, delete-orphan")
    export_jobs = relationship("ExportJobModel", back_populates="project", cascade="all, delete-orphan")

class MediaAssetModel(Base):
    __tablename__ = "media_assets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    original_name = Column(String(255), nullable=False)
    storage_key = Column(String(512), nullable=False)
    storage_provider = Column(String(50), default="local")
    mime_type = Column(String(100), default="video/mp4")
    size_bytes = Column(BigInteger, default=0)
    duration = Column(Float, default=0.0)
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    fps = Column(Float, default=30.0)
    codec = Column(String(50), nullable=True)
    checksum = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    user = relationship("UserModel", back_populates="media_assets")
    project = relationship("ProjectModel", back_populates="media_assets")

class CaptionTrackModel(Base):
    __tablename__ = "caption_tracks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    language = Column(String(20), default="en", nullable=False)
    label = Column(String(100), default="Original Track")
    source = Column(String(50), default="transcription")  # transcription, translation, import
    is_default = Column(Boolean, default=False)
    segments = Column(JSON, default=list)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    project = relationship("ProjectModel", back_populates="tracks")

class ExportJobModel(Base):
    __tablename__ = "export_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    track_id = Column(String(36), nullable=True)
    
    status = Column(String(50), default="queued")  # queued, processing, completed, failed, cancelled
    progress = Column(Integer, default=0)
    current_stage = Column(String(100), default="Queued")
    output_filename = Column(String(255), nullable=True)
    output_path = Column(String(1024), nullable=True)
    output_url = Column(String(1024), nullable=True)
    error = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    cancel_requested = Column(Boolean, default=False)
    
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    user = relationship("UserModel", back_populates="export_jobs")
    project = relationship("ProjectModel", back_populates="export_jobs")

class UsageRecordModel(Base):
    __tablename__ = "usage_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    metric = Column(String(50), nullable=False)  # transcription_seconds, translation_characters, render_seconds, storage_bytes, export_count
    quantity = Column(Float, default=0.0)
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    user = relationship("UserModel", back_populates="usage_records")

class SubscriptionModel(Base):
    __tablename__ = "subscriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    plan_id = Column(String(50), default="free", nullable=False)  # free, pro, enterprise
    status = Column(String(50), default="active", nullable=False)
    provider = Column(String(50), default="system")
    current_period_start = Column(DateTime, default=utc_now)
    current_period_end = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("UserModel", back_populates="subscription")

class AdminAuditLogModel(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    admin_id = Column(String(36), index=True, nullable=False)
    action = Column(String(100), nullable=False)
    target_user_id = Column(String(36), nullable=True)
    target_resource = Column(String(255), nullable=True)
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utc_now)

class TemplateModel(Base):
    __tablename__ = "templates"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    description = Column(String(255), default="")
    preview_text = Column(String(100), default="SAMPLE CAPTION")
    style_config = Column(JSON, default=dict)
