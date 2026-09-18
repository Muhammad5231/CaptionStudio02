from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import UserModel, UsageRecordModel, SubscriptionModel
from app.schemas.schemas import UsageSummaryResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/usage", tags=["usage"])

PLAN_QUOTAS = {
    "free": {
        "transcription_minutes": 30.0,
        "exports_count": 10,
        "storage_mb": 500.0,
    },
    "pro": {
        "transcription_minutes": 300.0,
        "exports_count": 100,
        "storage_mb": 5000.0,
    },
    "enterprise": {
        "transcription_minutes": 10000.0,
        "exports_count": 5000,
        "storage_mb": 50000.0,
    }
}

@router.get("/me", response_model=UsageSummaryResponse)
def get_user_usage_summary(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Current month start
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    # Fetch user subscription
    sub = db.query(SubscriptionModel).filter(SubscriptionModel.user_id == current_user.id).first()
    plan_id = sub.plan_id if sub else "free"
    quotas = PLAN_QUOTAS.get(plan_id, PLAN_QUOTAS["free"])

    # Aggregate transcription seconds
    transcribe_sec = db.query(func.sum(UsageRecordModel.quantity)).filter(
        UsageRecordModel.user_id == current_user.id,
        UsageRecordModel.metric == "transcription_seconds",
        UsageRecordModel.created_at >= month_start
    ).scalar() or 0.0

    # Aggregate exports
    exports = db.query(func.sum(UsageRecordModel.quantity)).filter(
        UsageRecordModel.user_id == current_user.id,
        UsageRecordModel.metric == "export_count",
        UsageRecordModel.created_at >= month_start
    ).scalar() or 0.0

    # Aggregate storage bytes
    storage_bytes = db.query(func.sum(UsageRecordModel.quantity)).filter(
        UsageRecordModel.user_id == current_user.id,
        UsageRecordModel.metric == "storage_bytes"
    ).scalar() or 0.0

    return UsageSummaryResponse(
        user_id=current_user.id,
        plan_id=plan_id,
        transcription_minutes_used=round(transcribe_sec / 60.0, 1),
        transcription_minutes_limit=quotas["transcription_minutes"],
        exports_count_used=int(exports),
        exports_count_limit=quotas["exports_count"],
        storage_mb_used=round(storage_bytes / (1024 * 1024), 1),
        storage_mb_limit=quotas["storage_mb"]
    )

