from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from backend.app.api.deps import (
    get_super_admin,
    get_admin_user,
    get_staff_user
)
from backend.app.services import admin_service

router = APIRouter()

# ====================================================================
# PYDANTIC SCHEMAS
# ====================================================================

class UserStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Target status: active, suspended, or disabled")
    reason: str = Field(..., min_length=3, description="Mandatory administrative justification")

class UserRoleUpdateRequest(BaseModel):
    role: str = Field(..., description="Target role: super_admin, admin, support_agent, or creator")

class CreditAdjustmentRequest(BaseModel):
    user_id: str
    adjustment_type: str = Field(..., description="add, deduct, correction, promotional")
    amount: int = Field(..., gt=0, description="Amount of credits to adjust")
    reason: str = Field(..., min_length=5, description="Auditable justification for adjustment")

class PlanCreateRequest(BaseModel):
    name: str = Field(..., min_length=2)
    slug: str = Field(..., min_length=2)
    description: Optional[str] = None
    price_monthly: float = 0.0
    price_yearly: float = 0.0
    currency: str = "USD"
    monthly_video_minutes: int = 60
    monthly_clips_limit: int = 50
    monthly_ai_analysis_limit: int = 25
    monthly_thumbnails_limit: int = 50
    monthly_exports_limit: int = 50
    included_features: List[str] = []
    is_active: bool = True
    sort_order: int = 10

class PlanUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_monthly: Optional[float] = None
    price_yearly: Optional[float] = None
    currency: Optional[str] = None
    monthly_video_minutes: Optional[int] = None
    monthly_clips_limit: Optional[int] = None
    monthly_ai_analysis_limit: Optional[int] = None
    monthly_thumbnails_limit: Optional[int] = None
    monthly_exports_limit: Optional[int] = None
    included_features: Optional[List[str]] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None

class AIServiceUpdateRequest(BaseModel):
    model_name: Optional[str] = None
    status: Optional[str] = None
    daily_request_budget: Optional[int] = None
    monthly_spend_limit_usd: Optional[float] = None
    is_enabled: Optional[bool] = None

class JobCancelRequest(BaseModel):
    reason: str = Field("Cancelled by administrator", min_length=3)

class AnnouncementCreateRequest(BaseModel):
    title: str = Field(..., min_length=3)
    message: str = Field(..., min_length=5)
    type: str = Field("general", description="general, maintenance, release, service_update")
    priority: str = Field("normal", description="low, normal, high, critical")
    target_audience: str = Field("all", description="all, free_only, paid_only, enterprise_only")
    start_date: Optional[str] = None
    expires_at: Optional[str] = None
    is_active: bool = True

class PlatformSettingsUpdateRequest(BaseModel):
    platform_name: Optional[str] = None
    logo_url: Optional[str] = None
    support_email: Optional[str] = None
    maintenance_mode: Optional[bool] = None
    maintenance_message: Optional[str] = None
    registration_enabled: Optional[bool] = None
    default_free_credits: Optional[int] = None
    feature_flags: Optional[Dict[str, bool]] = None
    supported_resolutions: Optional[List[str]] = None
    supported_framerates: Optional[List[str]] = None

# ====================================================================
# 1. MAIN ADMIN OVERVIEW
# ====================================================================

@router.get("/overview")
def get_overview(admin: Dict[str, Any] = Depends(get_staff_user)):
    """Retrieve comprehensive platform metrics, counts, and financial stats."""
    return admin_service.get_admin_overview_metrics()

# ====================================================================
# 2. USER MANAGEMENT
# ====================================================================

@router.get("/users")
def list_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    plan: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    admin: Dict[str, Any] = Depends(get_staff_user)
):
    """Search and filter registered users."""
    return admin_service.list_admin_users(
        search=search,
        role=role,
        plan_slug=plan,
        status=status,
        limit=limit,
        offset=offset
    )

@router.get("/users/{user_id}")
def get_user_detail(user_id: str, admin: Dict[str, Any] = Depends(get_staff_user)):
    """Inspect full details of an individual user."""
    detail = admin_service.get_admin_user_details(user_id)
    if not detail:
        raise HTTPException(status_code=404, detail="User not found.")
    return detail

@router.put("/users/{user_id}/status")
def change_user_status(
    user_id: str,
    payload: UserStatusUpdateRequest,
    admin: Dict[str, Any] = Depends(get_admin_user)
):
    """Suspend, reactivate, or disable a user account."""
    success, message, data = admin_service.update_user_status(
        admin=admin,
        user_id=user_id,
        new_status=payload.status,
        reason=payload.reason
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message, "user": data}

@router.put("/users/{user_id}/role")
def change_user_role(
    user_id: str,
    payload: UserRoleUpdateRequest,
    admin: Dict[str, Any] = Depends(get_super_admin)
):
    """Elevate or change user role. Restricted to Super Admin."""
    success, message, data = admin_service.update_user_role(
        admin=admin,
        user_id=user_id,
        new_role=payload.role
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message, "role_data": data}

# ====================================================================
# 3. SUBSCRIPTIONS & PLANS
# ====================================================================

@router.get("/subscriptions")
def list_subscriptions(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    admin: Dict[str, Any] = Depends(get_staff_user)
):
    """List all user subscriptions across the platform."""
    return admin_service.list_all_subscriptions(status=status, limit=limit, offset=offset)

@router.post("/plans")
def create_plan(
    payload: PlanCreateRequest,
    admin: Dict[str, Any] = Depends(get_admin_user)
):
    """Create a new subscription plan."""
    success, message, plan = admin_service.create_subscription_plan(admin, payload.model_dump())
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message, "plan": plan}

@router.put("/plans/{plan_id}")
def update_plan(
    plan_id: str,
    payload: PlanUpdateRequest,
    admin: Dict[str, Any] = Depends(get_admin_user)
):
    """Update an existing subscription plan."""
    success, message, plan = admin_service.update_subscription_plan(
        admin=admin,
        plan_id=plan_id,
        updates=payload.model_dump(exclude_unset=True)
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message, "plan": plan}

# ====================================================================
# 4. CREDIT MANAGEMENT
# ====================================================================

@router.post("/credits/adjust")
def adjust_credits(
    payload: CreditAdjustmentRequest,
    admin: Dict[str, Any] = Depends(get_admin_user)
):
    """Manually add, deduct, or correct credits with required audit justification."""
    success, message, adjustment = admin_service.adjust_user_credits(
        admin=admin,
        user_id=payload.user_id,
        adjustment_type=payload.adjustment_type,
        amount=payload.amount,
        reason=payload.reason
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message, "adjustment": adjustment}

@router.get("/credits/adjustments")
def list_credits_adjustments(
    user_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    admin: Dict[str, Any] = Depends(get_staff_user)
):
    """View auditable ledger of manual credit adjustments."""
    return admin_service.list_credit_adjustments(user_id=user_id, limit=limit, offset=offset)

# ====================================================================
# 5. AI SERVICES MANAGEMENT
# ====================================================================

@router.get("/ai-services")
def get_ai_services(admin: Dict[str, Any] = Depends(get_staff_user)):
    """List configured AI pipelines, models, budgets, and operational latency."""
    return admin_service.list_ai_services()

@router.put("/ai-services/{service_key}")
def update_ai_service_config(
    service_key: str,
    payload: AIServiceUpdateRequest,
    admin: Dict[str, Any] = Depends(get_admin_user)
):
    """Configure model selection, processing limits, request budgets, and status."""
    success, message, updated = admin_service.update_ai_service(
        admin=admin,
        service_key=service_key,
        updates=payload.model_dump(exclude_unset=True)
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message, "service": updated}

# ====================================================================
# 6. VIDEO PROCESSING JOBS
# ====================================================================

@router.get("/jobs")
def get_jobs(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    admin: Dict[str, Any] = Depends(get_staff_user)
):
    """List video processing jobs with owner info and error diagnostics."""
    return admin_service.list_processing_jobs(
        status=status,
        search=search,
        limit=limit,
        offset=offset
    )

@router.post("/jobs/{job_id}/retry")
def retry_job(job_id: str, admin: Dict[str, Any] = Depends(get_admin_user)):
    """Retry a failed or stuck video processing job."""
    success, message, data = admin_service.retry_processing_job(admin, job_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message, "job": data}

@router.post("/jobs/{job_id}/cancel")
def cancel_job(
    job_id: str,
    payload: JobCancelRequest,
    admin: Dict[str, Any] = Depends(get_admin_user)
):
    """Cancel an active or stuck processing job."""
    success, message, data = admin_service.cancel_processing_job(admin, job_id, payload.reason)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message, "job": data}

# ====================================================================
# 7. PLATFORM ANNOUNCEMENTS
# ====================================================================

@router.get("/announcements")
def get_announcements(
    include_inactive: bool = Query(True),
    admin: Dict[str, Any] = Depends(get_staff_user)
):
    """List platform announcements."""
    return admin_service.list_platform_announcements(include_inactive=include_inactive)

@router.post("/announcements")
def create_announcement(
    payload: AnnouncementCreateRequest,
    admin: Dict[str, Any] = Depends(get_admin_user)
):
    """Create a new platform announcement."""
    success, message, data = admin_service.create_platform_announcement(admin, payload.model_dump())
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message, "announcement": data}

@router.delete("/announcements/{announcement_id}")
def delete_announcement(
    announcement_id: str,
    admin: Dict[str, Any] = Depends(get_admin_user)
):
    """Delete a platform announcement."""
    success, message = admin_service.delete_platform_announcement(admin, announcement_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message}

# ====================================================================
# 8. SYSTEM HEALTH
# ====================================================================

@router.get("/health")
def get_system_health(admin: Dict[str, Any] = Depends(get_staff_user)):
    """Run authentic diagnostic checks against backend components."""
    return admin_service.get_live_system_health()

# ====================================================================
# 9. ADMIN AUDIT LOGS
# ====================================================================

@router.get("/audit-logs")
def get_audit_logs(
    action: Optional[str] = Query(None),
    admin_id: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    admin: Dict[str, Any] = Depends(get_staff_user)
):
    """Search and filter administrative audit logs."""
    return admin_service.list_admin_audit_logs(
        action=action,
        admin_id=admin_id,
        resource_type=resource_type,
        search=search,
        limit=limit,
        offset=offset
    )

# ====================================================================
# 10. PLATFORM CONFIGURATION & SETTINGS
# ====================================================================

@router.get("/settings")
def get_settings(admin: Dict[str, Any] = Depends(get_staff_user)):
    """Retrieve global platform configuration settings."""
    return admin_service.get_platform_settings()

@router.put("/settings")
def update_settings(
    payload: PlatformSettingsUpdateRequest,
    admin: Dict[str, Any] = Depends(get_super_admin)
):
    """Update global platform configuration. Super Admin only."""
    success, message, data = admin_service.update_platform_settings(
        admin=admin,
        updates=payload.model_dump(exclude_unset=True)
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message, "settings": data}

