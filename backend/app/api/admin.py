import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.config import settings
from app.core.database import get_db
from app.models.models import UserModel, ProjectModel, ExportJobModel, MediaAssetModel, AdminAuditLogModel
from app.schemas.schemas import AdminOverviewResponse, AdminUserListItem, ExportJobResponse
from app.api.deps import get_current_admin
from app.services.projects.job_manager import job_manager
from app.services.queue.job_queue import job_queue

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/overview", response_model=AdminOverviewResponse)
def get_admin_overview(
    current_admin: UserModel = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    total_users = db.query(func.count(UserModel.id)).scalar() or 0
    active_users = db.query(func.count(UserModel.id)).filter(UserModel.status == "active").scalar() or 0
    total_projects = db.query(func.count(ProjectModel.id)).filter(ProjectModel.is_deleted == False).scalar() or 0
    
    exports_completed = db.query(func.count(ExportJobModel.id)).filter(ExportJobModel.status == "completed").scalar() or 0
    exports_failed = db.query(func.count(ExportJobModel.id)).filter(ExportJobModel.status == "failed").scalar() or 0
    queue_pending = db.query(func.count(ExportJobModel.id)).filter(ExportJobModel.status.in_(["queued", "processing"])).scalar() or 0
    
    storage_total = db.query(func.sum(MediaAssetModel.size_bytes)).scalar() or 0

    return AdminOverviewResponse(
        total_users=total_users,
        active_users=active_users,
        total_projects=total_projects,
        total_exports_completed=exports_completed,
        total_exports_failed=exports_failed,
        storage_bytes_total=int(storage_total),
        queue_pending_jobs=queue_pending
    )

@router.get("/users", response_model=List[AdminUserListItem])
def list_admin_users(
    query: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    current_admin: UserModel = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    q = db.query(UserModel)
    if query:
        clean = f"%{query.strip().lower()}%"
        q = q.filter((UserModel.email.ilike(clean)) | (UserModel.name.ilike(clean)))
    
    users = q.order_by(UserModel.created_at.desc()).offset(offset).limit(limit).all()

    results = []
    for u in users:
        proj_count = db.query(func.count(ProjectModel.id)).filter(ProjectModel.user_id == u.id, ProjectModel.is_deleted == False).scalar() or 0
        exp_count = db.query(func.count(ExportJobModel.id)).filter(ExportJobModel.user_id == u.id).scalar() or 0
        results.append(
            AdminUserListItem(
                id=u.id,
                name=u.name,
                email=u.email,
                role=u.role,
                status=u.status,
                created_at=u.created_at,
                last_login=u.last_login,
                project_count=proj_count,
                exports_count=exp_count
            )
        )
    return results

@router.post("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    new_status: str = Query(..., pattern="^(active|suspended)$"),
    current_admin: UserModel = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot alter your own administrative status")

    prev_status = user.status
    user.status = new_status

    # Audit log
    audit = AdminAuditLogModel(
        admin_id=current_admin.id,
        action="update_user_status",
        target_user_id=user.id,
        target_resource=f"user:{user.id}",
        details={"previous": prev_status, "new": new_status}
    )
    db.add(audit)
    db.commit()

    return {"message": f"User status updated to {new_status}", "user_id": user.id}

@router.get("/jobs", response_model=List[ExportJobResponse])
def list_admin_jobs(
    status_filter: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    current_admin: UserModel = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    q = db.query(ExportJobModel)
    if status_filter:
        q = q.filter(ExportJobModel.status == status_filter)
    return q.order_by(ExportJobModel.created_at.desc()).limit(limit).all()

@router.post("/jobs/{job_id}/retry", response_model=ExportJobResponse)
def retry_failed_job(
    job_id: str,
    current_admin: UserModel = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    job = db.query(ExportJobModel).filter(ExportJobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = "queued"
    job.progress = 0
    job.error = None
    job.retry_count += 1
    job.current_stage = "Re-queued by administrator..."
    db.commit()

    job_queue.enqueue_job(job_manager.run_export_pipeline, job.id, "1080p")
    return job

@router.get("/health")
def get_system_health(
    current_admin: UserModel = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Check Database
    db_ok = False
    try:
        db.execute(func.now())
        db_ok = True
    except Exception:
        pass

    # Check FFmpeg
    ffmpeg_ok = bool(settings.FFMPEG_PATH and shutil.which(settings.FFMPEG_PATH))

    # Check Disk Space
    total, used, free = shutil.disk_usage(settings.STORAGE_DIR)
    free_gb = round(free / (1024 ** 3), 2)

    return {
        "status": "healthy" if db_ok and ffmpeg_ok else "degraded",
        "database_connected": db_ok,
        "database_engine": "sqlite" if "sqlite" in settings.DATABASE_URL else "postgresql",
        "ffmpeg_ready": ffmpeg_ok,
        "storage_free_gb": free_gb,
        "whisper_model": settings.WHISPER_MODEL
    }
