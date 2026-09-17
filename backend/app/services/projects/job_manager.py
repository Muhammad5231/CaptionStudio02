import uuid
import asyncio
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.models import ExportJobModel, ProjectModel
from app.services.rendering.ass_generator import ass_generator
from app.services.ffmpeg.wrapper import ffmpeg_wrapper

class JobManager:
    @staticmethod
    def get_job(db: Session, job_id: str) -> ExportJobModel:
        db.expire_all()
        return db.query(ExportJobModel).filter(ExportJobModel.id == job_id).first()

    @staticmethod
    def create_job(db: Session, project_id: str) -> ExportJobModel:
        job = ExportJobModel(
            id=str(uuid.uuid4()),
            project_id=project_id,
            status="queued",
            progress=0,
            current_stage="Preparing your video...",
            created_at=datetime.utcnow()
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    @classmethod
    async def run_export_pipeline(cls, job_id: str, quality: str = "1080p"):
        """Background asynchronous export task."""
        db = SessionLocal()
        try:
            job = db.query(ExportJobModel).filter(ExportJobModel.id == job_id).first()
            if not job:
                return

            project = db.query(ProjectModel).filter(ProjectModel.id == job.project_id).first()
            if not project or not project.video_path or not Path(project.video_path).exists():
                job.status = "failed"
                job.error = "Original video file was not found or was deleted. Please re-upload your video."
                db.commit()
                return

            # Stage 1: Preparing
            job.status = "processing"
            job.progress = 10
            job.current_stage = "Analyzing video & timing..."
            db.commit()

            # Stage 2: Generate ASS Subtitles
            job.progress = 25
            job.current_stage = "Generating caption styles..."
            db.commit()

            ass_filename = f"subtitles_{job_id}.ass"
            ass_path = str(settings.STORAGE_DIR / ass_filename)
            
            ass_content = ass_generator.generate(
                captions=project.captions or [],
                style=project.style_config or {},
                video_width=project.width or 1920,
                video_height=project.height or 1080
            )

            with open(ass_path, "w", encoding="utf-8-sig") as f:
                f.write(ass_content)

            # Stage 3: FFmpeg Video Render
            out_filename = f"export_{job.project_id[:8]}_{int(datetime.utcnow().timestamp())}.mp4"
            out_path = str(settings.RENDER_DIR / out_filename)

            def on_progress(pct: int, msg: str):
                # Update job in fresh session
                sub_db = SessionLocal()
                j = sub_db.query(ExportJobModel).filter(ExportJobModel.id == job_id).first()
                if j:
                    j.progress = pct
                    j.current_stage = msg
                    sub_db.commit()
                sub_db.close()

            on_progress(35, "Rendering captions with FFmpeg...")

            await ffmpeg_wrapper.render_video_with_ass(
                input_video=project.video_path,
                ass_subtitles_path=ass_path,
                output_video=out_path,
                target_resolution=quality,
                progress_callback=on_progress
            )

            # Cleanup temp ASS file
            try:
                Path(ass_path).unlink(missing_ok=True)
            except Exception:
                pass

            # Finalize
            job.status = "completed"
            job.progress = 100
            job.current_stage = "Your video is ready"
            job.output_filename = out_filename
            job.output_path = out_path
            job.output_url = f"/api/media/renders/{out_filename}"
            job.completed_at = datetime.utcnow()
            db.commit()

        except Exception as e:
            job.status = "failed"
            job.error = f"We encountered an issue while finalizing your video: {str(e)}"
            db.commit()
        finally:
            db.close()

job_manager = JobManager()
