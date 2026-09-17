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
        job = db.query(ExportJobModel).filter(ExportJobModel.id == job_id).first()
        if not job and len(job_id) >= 6:
            job = db.query(ExportJobModel).filter(ExportJobModel.id.startswith(job_id)).first()
        return job

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
            if not project:
                job.status = "failed"
                job.error = "Project not found."
                db.commit()
                return

            cfg = dict(project.style_config or {})
            bg_type = cfg.get("canvas_background_type", "video")
            bg_color = cfg.get("canvas_background_color", "#00FF00")
            aspect_ratio = getattr(project, "aspect_ratio", None) or cfg.get("aspect_ratio", "9:16")

            has_video = project.video_path and Path(project.video_path).exists()
            if not has_video and bg_type != "color":
                bg_type = "color"
                bg_color = "#00FF00"

            if not has_video and not project.captions:
                job.status = "failed"
                job.error = "No video or subtitles available to export. Please add subtitles or upload a video."
                db.commit()
                return

            # Compute total export duration from subtitles and project
            cap_duration = 0.0
            if project.captions:
                cap_duration = max((seg.get("end", 0.0) for seg in project.captions), default=0.0)
                cap_duration = round(cap_duration + 0.5, 2)
            total_duration = max(project.duration or 0.0, cap_duration)
            if total_duration <= 0.0:
                total_duration = 10.0

            # Stage 1: Preparing
            job.status = "processing"
            job.progress = 10
            job.current_stage = "Analyzing video & timing..."
            db.commit()

            # Stage 2: Generate ASS Subtitles in system temp directory to prevent watcher restarts
            job.progress = 25
            job.current_stage = "Generating caption styles..."
            db.commit()

            import tempfile
            import time
            import traceback

            ass_filename = f"captionstudio_{job_id}.ass"
            ass_path = str(Path(tempfile.gettempdir()) / ass_filename)

            # Dimensions for ASS coordinates matching target export resolution
            if quality == "720p":
                if aspect_ratio == "9:16":
                    ass_w, ass_h = (720, 1280)
                elif aspect_ratio == "16:9":
                    ass_w, ass_h = (1280, 720)
                else:
                    ass_w, ass_h = (720, 720)
            else:
                if aspect_ratio == "9:16":
                    ass_w, ass_h = (1080, 1920)
                elif aspect_ratio == "16:9":
                    ass_w, ass_h = (1920, 1080)
                else:
                    ass_w, ass_h = (1080, 1080)

            if has_video and bg_type != "color":
                probe = ffmpeg_wrapper.probe_video(project.video_path)
                src_w = probe.get("width") or project.width or ass_w
                src_h = probe.get("height") or project.height or ass_h
                if quality == "720p":
                    ass_w, ass_h = (720, int(round(720 * (src_h / src_w)))) if src_h > src_w else (int(round(720 * (src_w / src_h))), 720)
                else:
                    ass_w, ass_h = src_w, src_h
            
            ass_content = ass_generator.generate(
                captions=project.captions or [],
                style=project.style_config or {},
                video_width=ass_w,
                video_height=ass_h
            )

            with open(ass_path, "w", encoding="utf-8-sig") as f:
                f.write(ass_content)

            # Stage 3: FFmpeg Video Render
            out_filename = f"export_{job.project_id[:8]}_{int(datetime.utcnow().timestamp())}.mp4"
            out_path = str(settings.RENDER_DIR / out_filename)

            last_update_time = [0.0]
            last_pct = [0]

            def on_progress(pct: int, msg: str):
                now = time.time()
                # Throttle DB writes: only write if >= 2% change or 0.4s elapsed or 100%
                if pct == 100 or abs(pct - last_pct[0]) >= 2 or (now - last_update_time[0]) >= 0.4:
                    last_update_time[0] = now
                    last_pct[0] = pct
                    try:
                        sub_db = SessionLocal()
                        j = sub_db.query(ExportJobModel).filter(ExportJobModel.id == job_id).first()
                        if j:
                            j.progress = pct
                            j.current_stage = msg
                            sub_db.commit()
                        sub_db.close()
                    except Exception as pe:
                        print(f"[Warning] Failed to update progress in DB: {pe}")

            on_progress(35, "Rendering captions with FFmpeg...")

            await ffmpeg_wrapper.render_video_with_ass(
                input_video=project.video_path if (has_video and bg_type != "color") else None,
                ass_subtitles_path=ass_path,
                output_video=out_path,
                target_resolution=quality,
                background_color=bg_color if bg_type == "color" else None,
                target_duration=total_duration,
                aspect_ratio=aspect_ratio,
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

        except asyncio.CancelledError:
            print(f"[Export] Job {job_id} cancelled by server reload or shutdown")
            try:
                job.status = "failed"
                job.error = "Video export was interrupted or cancelled. Please try again."
                db.commit()
            except Exception:
                pass
            raise
        except Exception as e:
            traceback.print_exc()
            err_msg = str(e).strip() or repr(e)
            job.status = "failed"
            job.error = f"We encountered an issue while finalizing your video: {err_msg}"
            try:
                db.commit()
            except Exception:
                pass
        finally:
            db.close()

job_manager = JobManager()
