from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import UserModel, ProjectModel, ExportJobModel
from app.schemas.schemas import ExportRequest, ExportJobResponse
from app.services.projects.job_manager import job_manager
from app.services.queue.job_queue import job_queue
from app.api.deps import get_current_user_optional, get_user_project, get_user_export_job

router = APIRouter(tags=["export"])

@router.post("/projects/{project_id}/export", response_model=ExportJobResponse)
async def create_export_job(
    project_id: str,
    req: ExportRequest,
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    if current_user:
        project = get_user_project(project_id, current_user, db)
    else:
        project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    cfg = project.style_config or {}
    bg_type = cfg.get("canvas_background_type", "video")
    has_video = project.video_path and Path(project.video_path).exists()

    if not has_video and bg_type != "color" and not project.captions:
        raise HTTPException(status_code=400, detail="Project has no valid video or captions to render.")

    # Create Job record with user and track associations
    user_id = current_user.id if current_user else None
    job = job_manager.create_job(db, project_id, user_id=user_id, track_id=req.track_id)

    # Queue background processing pipeline
    job_queue.enqueue_job(job_manager.run_export_pipeline, job.id, req.quality)

    return job

@router.get("/jobs/{job_id}", response_model=ExportJobResponse)
def get_job_status(
    job_id: str,
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    if current_user:
        job = get_user_export_job(job_id, current_user, db)
    else:
        job = job_manager.get_job(db, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/jobs/{job_id}/cancel")
def cancel_job_status(
    job_id: str,
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Cancels an active or queued export job, stopping running FFmpeg processes.
    """
    user_id = current_user.id if (current_user and current_user.role != "admin") else None
    success = job_manager.cancel_job(db, job_id, user_id=user_id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Job cannot be cancelled (it may already be completed or failed)."
        )
    return {"message": "Export job cancelled successfully.", "status": "cancelled"}

@router.get("/download/{job_id}")
def download_rendered_video(
    job_id: str,
    current_user: Optional[UserModel] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    if current_user:
        job = get_user_export_job(job_id, current_user, db)
    else:
        job = job_manager.get_job(db, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "completed" or not job.output_path or not Path(job.output_path).exists():
        raise HTTPException(status_code=400, detail="Rendered video is not ready or failed to generate.")

    filename = job.output_filename or f"captionstudio_{job.project_id[:6]}.mp4"
    return FileResponse(
        path=job.output_path,
        filename=filename,
        media_type="video/mp4",
        headers={
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
