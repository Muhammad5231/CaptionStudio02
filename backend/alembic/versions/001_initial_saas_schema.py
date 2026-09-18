"""Initial SaaS schema

Revision ID: 001_initial_saas_schema
Revises: 
Create Date: 2026-09-18 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001_initial_saas_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Users table
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False, server_default="Creator"),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="user"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="active"),
        sa.Column("avatar", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("last_login", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # Projects table
    op.create_table(
        "projects",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False, server_default="Untitled Project"),
        sa.Column("aspect_ratio", sa.String(length=20), server_default="9:16"),
        sa.Column("video_filename", sa.String(length=255), nullable=True),
        sa.Column("video_path", sa.String(length=1024), nullable=True),
        sa.Column("video_url", sa.String(length=1024), nullable=True),
        sa.Column("thumbnail_url", sa.String(length=1024), nullable=True),
        sa.Column("duration", sa.Float(), server_default="0.0"),
        sa.Column("width", sa.Integer(), server_default="1920"),
        sa.Column("height", sa.Integer(), server_default="1080"),
        sa.Column("fps", sa.Float(), server_default="30.0"),
        sa.Column("style_preset", sa.String(length=50), server_default="Modern"),
        sa.Column("style_config", sa.JSON(), nullable=True),
        sa.Column("captions", sa.JSON(), nullable=True),
        sa.Column("active_track_id", sa.String(length=36), nullable=True),
        sa.Column("status", sa.String(length=50), server_default="ready"),
        sa.Column("is_deleted", sa.Boolean(), server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_projects_user_id", "projects", ["user_id"])

    # Media Assets table
    op.create_table(
        "media_assets",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("original_name", sa.String(length=255), nullable=False),
        sa.Column("storage_key", sa.String(length=512), nullable=False),
        sa.Column("storage_provider", sa.String(length=50), server_default="local"),
        sa.Column("mime_type", sa.String(length=100), server_default="video/mp4"),
        sa.Column("size_bytes", sa.BigInteger(), server_default="0"),
        sa.Column("duration", sa.Float(), server_default="0.0"),
        sa.Column("width", sa.Integer(), server_default="0"),
        sa.Column("height", sa.Integer(), server_default="0"),
        sa.Column("fps", sa.Float(), server_default="30.0"),
        sa.Column("codec", sa.String(length=50), nullable=True),
        sa.Column("checksum", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_media_assets_user_id", "media_assets", ["user_id"])

    # Caption Tracks table
    op.create_table(
        "caption_tracks",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("language", sa.String(length=20), nullable=False, server_default="en"),
        sa.Column("label", sa.String(length=100), nullable=False, server_default="Original Track"),
        sa.Column("source", sa.String(length=50), server_default="transcription"),
        sa.Column("is_default", sa.Boolean(), server_default="0"),
        sa.Column("segments", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_caption_tracks_project_id", "caption_tracks", ["project_id"])

    # Export Jobs table
    op.create_table(
        "export_jobs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("track_id", sa.String(length=36), nullable=True),
        sa.Column("status", sa.String(length=50), server_default="queued"),
        sa.Column("progress", sa.Integer(), server_default="0"),
        sa.Column("current_stage", sa.String(length=100), server_default="Queued"),
        sa.Column("output_filename", sa.String(length=255), nullable=True),
        sa.Column("output_path", sa.String(length=1024), nullable=True),
        sa.Column("output_url", sa.String(length=1024), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), server_default="0"),
        sa.Column("max_retries", sa.Integer(), server_default="3"),
        sa.Column("cancel_requested", sa.Boolean(), server_default="0"),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_export_jobs_user_id", "export_jobs", ["user_id"])

    # Usage Records table
    op.create_table(
        "usage_records",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("metric", sa.String(length=50), nullable=False),
        sa.Column("quantity", sa.Float(), server_default="0.0"),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_usage_records_user_id", "usage_records", ["user_id"])

    # Subscriptions table
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("plan_id", sa.String(length=50), nullable=False, server_default="free"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="active"),
        sa.Column("provider", sa.String(length=50), server_default="system"),
        sa.Column("current_period_start", sa.DateTime(), nullable=True),
        sa.Column("current_period_end", sa.DateTime(), nullable=True),
    )

    # Admin Audit Logs table
    op.create_table(
        "admin_audit_logs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("admin_id", sa.String(length=36), nullable=False),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("target_user_id", sa.String(length=36), nullable=True),
        sa.Column("target_resource", sa.String(length=255), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    # Templates table
    op.create_table(
        "templates",
        sa.Column("id", sa.String(length=50), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("description", sa.String(length=255), server_default=""),
        sa.Column("preview_text", sa.String(length=100), server_default="SAMPLE CAPTION"),
        sa.Column("style_config", sa.JSON(), nullable=True),
    )

def downgrade() -> None:
    op.drop_table("templates")
    op.drop_table("admin_audit_logs")
    op.drop_table("subscriptions")
    op.drop_table("usage_records")
    op.drop_table("export_jobs")
    op.drop_table("caption_tracks")
    op.drop_table("media_assets")
    op.drop_table("projects")
    op.drop_table("users")

