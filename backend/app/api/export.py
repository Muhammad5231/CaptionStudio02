import asyncio
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.models import ExportJobModel, ProjectModel
from app.schemas.schemas import ExportRequest, ExportJobResponse
from app.services.projects.job_manager import job_manager

router = APIRouter(tags=["export"])

@router.post("/projects/{project_id}/export", response_model=ExportJobResponse)
async def create_export_job(
    project_id: str,
    req: ExportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.video_path or not Path(project.video_path).exists():
        raise HTTPException(status_code=400, detail="Project has no valid uploaded video to render.")

    # Create Job record
    job = job_manager.create_job(db, project_id)

    # Launch independent background render task
    asyncio.create_task(job_manager.run_export_pipeline(job.id, req.quality))

    return job

@router.get("/jobs/{job_id}", response_model=ExportJobResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = job_manager.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.get("/download/{job_id}")
def download_rendered_video(job_id: str, db: Session = Depends(get_db)):
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

