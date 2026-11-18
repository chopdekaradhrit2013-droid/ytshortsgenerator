from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from backend.app.models.schemas import CheckPermissionRequest
from backend.app.services import usage_service
from backend.app.api.deps import get_current_user

router = APIRouter()

@router.get("/summary")
def get_usage_summary(user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve creator's current monthly usage counters, remaining quota, and credit balance."""
    return usage_service.get_user_usage_summary(user["id"])

@router.get("/history")
def get_usage_history(limit: int = Query(50, ge=1, le=200), user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve auditable usage and credit consumption logs."""
    return usage_service.get_usage_history(user["id"], limit=limit)

@router.post("/check-permission")
def check_permission(payload: CheckPermissionRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Validate whether a user has permissions for a feature or sufficient monthly quota
    before initiating video rendering, export, or AI analysis.
    """
    allowed, reason, upgrade_info = usage_service.check_permission_and_quota(
        user_id=user["id"],
        required_feature=payload.feature,
        metric_type=payload.metric,
        amount=payload.amount or 1.0
    )
    if not allowed:
        return {
            "allowed": False,
            "reason": reason,
            "upgrade": upgrade_info
        }
    return {
        "allowed": True,
        "reason": "Authorized."
    }

