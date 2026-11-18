from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends
from backend.app.models.schemas import UpdateProfileRequest
from backend.app.services import auth_service
from backend.app.api.deps import get_current_user
from backend.app.core.database import get_db_connection

router = APIRouter()

@router.get("/profile")
def get_profile(user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve full creator profile with connected channel, subscription, and usage meters."""
    profile = auth_service.get_user_profile(user["id"])
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found.")
    return profile

@router.put("/profile")
def update_profile(payload: UpdateProfileRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Update profile information (full_name, avatar_url, username)."""
    success, message, updated_profile = auth_service.update_user_profile(
        user_id=user["id"],
        updates=payload.model_dump(exclude_unset=True)
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message, "profile": updated_profile}

@router.get("/notifications")
def get_notifications(user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve account notifications (renewals, low balances, payment confirmations)."""
    conn = get_db_connection()
    try:
        rows = conn.execute("""
            SELECT id, user_id, type, title, message, action_url, is_read, created_at
            FROM account_notifications
            WHERE user_id = ?
            ORDER BY created_at DESC LIMIT 50;
        """, (user["id"],)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Mark notification as read."""
    conn = get_db_connection()
    try:
        with conn:
            conn.execute("""
                UPDATE account_notifications
                SET is_read = 1
                WHERE id = ? AND user_id = ?;
            """, (notification_id, user["id"]))
        return {"status": "success", "id": notification_id}
    finally:
        conn.close()

@router.get("/announcements")
def get_user_announcements(user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve active platform announcements targeted to the user."""
    from backend.app.services.admin_service import get_active_user_announcements
    plan_slug = user.get("subscription", {}).get("plan_slug", "free") if isinstance(user.get("subscription"), dict) else "free"
    audience = "paid_only" if plan_slug != "free" else "free_only"
    all_announcements = get_active_user_announcements("all")
    tier_announcements = get_active_user_announcements(audience)
    seen_ids = set()
    combined = []
    for a in all_announcements + tier_announcements:
        if a["id"] not in seen_ids:
            seen_ids.add(a["id"])
            combined.append(a)
    return combined


