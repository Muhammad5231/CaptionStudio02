from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.models import UserModel, ProjectModel, ExportJobModel

security_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> UserModel:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload["sub"]
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact support.",
        )

    return user

def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> Optional[UserModel]:
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        if not payload or "sub" not in payload:
            return None
        user = db.query(UserModel).filter(UserModel.id == payload["sub"]).first()
        if user and user.status != "suspended":
            return user
        return None
    except Exception:
        return None

def get_current_admin(
    current_user: UserModel = Depends(get_current_user)
) -> UserModel:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required",
        )
    return current_user

def get_user_project(
    project_id: str,
    current_user: UserModel,
    db: Session
) -> ProjectModel:
    """
    IDOR Protection:
    Finds a project strictly scoped to the current user (or any project if admin).
    Returns 404 on mismatch to avoid leaking resource existence.
    """
    query = db.query(ProjectModel).filter(
        ProjectModel.id == project_id,
        ProjectModel.is_deleted == False
    )
    if current_user.role != "admin":
        query = query.filter(ProjectModel.user_id == current_user.id)

    project = query.first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return project

def get_user_export_job(
    job_id: str,
    current_user: UserModel,
    db: Session
) -> ExportJobModel:
    """
    IDOR Protection for export jobs.
    """
    query = db.query(ExportJobModel).filter(ExportJobModel.id == job_id)
    if current_user.role != "admin":
        query = query.filter(ExportJobModel.user_id == current_user.id)

    job = query.first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export job not found"
        )
    return job

