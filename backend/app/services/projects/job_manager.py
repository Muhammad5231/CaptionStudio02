import uuid
import time
import asyncio
import tempfile
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.models import ExportJobModel, ProjectModel, CaptionTrackModel, UsageRecordModel
from app.services.rendering.ass_generator import ass_generator
from app.services.ffmpeg.wrapper import ffmpeg_wrapper

def utc_now():
    return datetime.now(timezone.utc)

class JobManager:
    @staticmethod
    def get_job(db: Session, job_id: str, user_id: Optional[str] = None) -> Optional[ExportJobModel]:
        db.expire_all()
        query = db.query(ExportJobModel).filter(ExportJobModel.id == job_id)
        if user_id:
            query = query.filter(ExportJobModel.user_id == user_id)
        job = query.first()
        if not job and len(job_id) >= 6:
            short_query = db.query(ExportJobModel).filter(ExportJobModel.id.startswith(job_id))
            if user_id:
                short_query = short_query.filter(ExportJobModel.user_id == user_id)
            job = short_query.first()
        return job

    @staticmethod
    def create_job(
        db: Session,
        project_id: str,
        user_id: Optional[str] = None,
        track_id: Optional[str] = None
    ) -> ExportJobModel:
        job = ExportJobModel(
            id=str(uuid.uuid4()),
            user_id=user_id,
            project_id=project_id,
            track_id=track_id,
            status="queued",
            progress=0,
            current_stage="Queued in render queue...",
            created_at=utc_now()
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def cancel_job(db: Session, job_id: str, user_id: Optional[str] = None) -> bool:
        job = JobManager.get_job(db, job_id, user_id)
        if not job:
            return False

        if job.status == "cancelled":
            return True

        if job.status in {"completed", "failed"}:
            return False

        job.cancel_requested = True
        job.status = "cancelled"
        job.current_stage = "Cancelled by user"
        job.completed_at = utc_now()
        db.commit()

        # Signal FFmpeg wrapper to terminate subprocess
        ffmpeg_wrapper.cancel_render(job.id)
        return True

    @classmethod
    async def run_export_pipeline(cls, job_id: str, quality: str = "1080p"):
        """Production background export execution pipeline."""
        db = SessionLocal()
        try:
            job = db.query(ExportJobModel).filter(ExportJobModel.id == job_id).first()
            if not job or job.status == "cancelled":
                return

            project = db.query(ProjectModel).filter(ProjectModel.id == job.project_id).first()
            if not project:
                job.status = "failed"
                job.error = "Project not found."
                db.commit()
                return

            # Determine caption source: specific track vs project captions
            captions_to_render = []
            if job.track_id:
                track = db.query(CaptionTrackModel).filter(CaptionTrackModel.id == job.track_id).first()
                if track and track.segments:
                    captions_to_render = track.segments
            if not captions_to_render:
                captions_to_render = project.captions or []

            cfg = dict(project.style_config or {})
            bg_type = cfg.get("canvas_background_type", "video")
            bg_color = cfg.get("canvas_background_color", "#00FF00")
            aspect_ratio = getattr(project, "aspect_ratio", None) or cfg.get("aspect_ratio", "9:16")

            has_video = project.video_path and Path(project.video_path).exists()
            if not has_video and bg_type != "color":
                bg_type = "color"
                bg_color = "#00FF00"

            if not has_video and not captions_to_render:
                job.status = "failed"
                job.error = "No video or subtitles available to export. Please add subtitles or upload a video."
                db.commit()
                return

            cap_duration = 0.0
            if captions_to_render:
                cap_duration = max((seg.get("end", 0.0) for seg in captions_to_render), default=0.0)
                cap_duration = round(cap_duration + 0.5, 2)
            total_duration = max(project.duration or 0.0, cap_duration)
            if total_duration <= 0.0:
                total_duration = 10.0

            # Stage 1: Initializing
            job.status = "processing"
            job.progress = 10
            job.current_stage = "Analyzing video & timing..."
            job.started_at = utc_now()
            db.commit()

            if job.cancel_requested:
                job.status = "cancelled"
                db.commit()
                return

            # Stage 2: Generate ASS Subtitles
            job.progress = 25
            job.current_stage = "Generating caption styles..."
            db.commit()

            ass_filename = f"captionstudio_{job_id}.ass"
            ass_path = str(Path(tempfile.gettempdir()) / ass_filename)

            if aspect_ratio == "9:16":
                ass_w, ass_h = (1080, 1920)
            elif aspect_ratio == "16:9":
                ass_w, ass_h = (1920, 1080)
            else:
                ass_w, ass_h = (1080, 1080)

            if has_video and bg_type != "color":
                ass_w = project.width or ass_w
                ass_h = project.height or ass_h
            
            ass_content = ass_generator.generate(
                captions=captions_to_render,
                style=project.style_config or {},
                video_width=ass_w,
                video_height=ass_h
            )

            with open(ass_path, "w", encoding="utf-8-sig") as f:
                f.write(ass_content)

            # Stage 3: FFmpeg Video Render
            out_filename = f"export_{job.project_id[:8]}_{int(time.time())}.mp4"
            out_path = str(settings.RENDER_DIR / out_filename)

            last_update_time = [0.0]
            last_pct = [0]

            def on_progress(pct: int, msg: str):
                now = time.time()
                if pct == 100 or abs(pct - last_pct[0]) >= 2 or (now - last_update_time[0]) >= 0.4:
                    last_update_time[0] = now
                    last_pct[0] = pct
                    try:
                        sub_db = SessionLocal()
                        j = sub_db.query(ExportJobModel).filter(ExportJobModel.id == job_id).first()
                        if j and not j.cancel_requested:
                            j.progress = pct
                            j.current_stage = msg
                            sub_db.commit()
                        sub_db.close()
                    except Exception:
                        pass

            on_progress(35, "Rendering captions with FFmpeg...")

            await ffmpeg_wrapper.render_video_with_ass(
                input_video=project.video_path if (has_video and bg_type != "color") else None,
                ass_subtitles_path=ass_path,
                output_video=out_path,
                target_resolution=quality,
                background_color=bg_color if bg_type == "color" else None,
                target_duration=total_duration,
                aspect_ratio=aspect_ratio,
                job_id=job_id,
                progress_callback=on_progress
            )

            # Cleanup temp ASS file
            try:
                Path(ass_path).unlink(missing_ok=True)
            except Exception:
                pass

            # Re-check cancellation after render
            db.expire_all()
            job = db.query(ExportJobModel).filter(ExportJobModel.id == job_id).first()
            if job.cancel_requested:
                job.status = "cancelled"
                job.current_stage = "Cancelled"
                try:
                    Path(out_path).unlink(missing_ok=True)
                except Exception:
                    pass
                db.commit()
                return

            # Finalize
            job.status = "completed"
            job.progress = 100
            job.current_stage = "Your video is ready"
            job.output_filename = out_filename
            job.output_path = out_path
            job.output_url = f"/api/media/renders/{out_filename}"
            job.completed_at = utc_now()
            db.commit()

            # Record usage metric if user_id attached
            if job.user_id:
                try:
                    usage_dur = UsageRecordModel(
                        user_id=job.user_id,
                        metric="render_seconds",
                        quantity=total_duration,
                        details={"project_id": job.project_id, "quality": quality}
                    )
                    usage_exp = UsageRecordModel(
                        user_id=job.user_id,
                        metric="export_count",
                        quantity=1.0,
                        details={"project_id": job.project_id}
                    )
                    db.add(usage_dur)
                    db.add(usage_exp)
                    db.commit()
                except Exception as ue:
                    print(f"[Warning] Failed to record usage: {ue}")

        except asyncio.CancelledError:
            try:
                job = db.query(ExportJobModel).filter(ExportJobModel.id == job_id).first()
                if job:
                    job.status = "cancelled"
                    job.error = "Video export was cancelled."
                    db.commit()
            except Exception:
                pass
            raise
        except Exception as e:
            traceback.print_exc()
            err_msg = str(e).strip() or repr(e)
            try:
                job = db.query(ExportJobModel).filter(ExportJobModel.id == job_id).first()
                if job:
                    job.status = "failed"
                    job.error = f"We encountered an issue while finalizing your video: {err_msg}"
                    job.completed_at = utc_now()
                    db.commit()
            except Exception:
                pass
        finally:
            db.close()

job_manager = JobManager()
