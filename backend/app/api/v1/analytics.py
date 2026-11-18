from fastapi import APIRouter, HTTPException, Query, Response, Body
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from backend.app.services.youtube_analytics import youtube_analytics_service

router = APIRouter()

class AssistantQueryRequest(BaseModel):
    question: str = Field(..., description="Creator question for AI analytics assistant")
    video_id: Optional[str] = Field(None, description="Optional specific video ID context")

class AlertSettingsUpdateRequest(BaseModel):
    milestone_1k_enabled: Optional[bool] = True
    milestone_10k_enabled: Optional[bool] = True
    milestone_100k_enabled: Optional[bool] = True
    velocity_spike_threshold_pct: Optional[float] = 200.0
    retention_drop_threshold_pct: Optional[float] = 40.0
    subscriber_milestone_interval: Optional[int] = 1000
    email_notifications_enabled: Optional[bool] = True

@router.get("/overview")
async def get_analytics_overview(time_range: str = Query("28d", pattern="^(7d|28d|90d|365d)$")):
    """Get channel aggregate metrics and comparison changes against previous equivalent period."""
    return youtube_analytics_service.get_channel_overview(time_range=time_range)

@router.get("/time-series")
async def get_analytics_time_series(
    time_range: str = Query("28d", pattern="^(7d|28d|90d|365d)$"),
    metric: str = Query("views", description="Selected metric: views, subscribers_gained, likes, comments, shares, shorts_published")
):
    """Get day-by-day historical metrics for interactive performance charts."""
    return youtube_analytics_service.get_time_series(time_range=time_range, metric=metric)

@router.get("/shorts")
async def get_individual_shorts_performance(
    sort_by: str = Query("views", description="Field to sort by: views, likes, comments, shares, published_at, engagement_rate"),
    order: str = Query("desc", description="Sort order: asc or desc"),
    limit: int = Query(50, ge=1, le=200)
):
    """Get individual published Shorts performance metrics table."""
    return youtube_analytics_service.get_individual_shorts(sort_by=sort_by, order=order, limit=limit)

@router.get("/shorts/{video_id}")
async def get_short_detailed_analytics(video_id: str):
    """Get in-depth analytics, retention curve, and performance diagnosis for a specific Short."""
    detail = youtube_analytics_service.get_short_detail(video_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Short analytics not found for provided video ID")
    return detail

@router.get("/top-shorts")
async def get_top_performing_shorts():
    """Get Top 10 Shorts ranked by views, likes, engagement rate, and growth velocity."""
    return youtube_analytics_service.get_top_performing_shorts()

@router.get("/audience")
async def get_audience_insights(time_range: str = Query("28d", pattern="^(7d|28d|90d|365d)$")):
    """Get audience demographics, age distribution, geography, and returning viewer statistics."""
    return youtube_analytics_service.get_audience_insights(time_range=time_range)

@router.get("/content-insights")
async def get_content_performance_insights():
    """Get automated content insights: top topics, hook styles, optimal durations, and best publishing times."""
    return youtube_analytics_service.get_content_performance_insights()

@router.post("/assistant/query")
async def query_ai_performance_assistant(payload: AssistantQueryRequest):
    """Ask AI analytics assistant questions grounded in actual channel and video performance metrics."""
    return youtube_analytics_service.query_ai_performance_assistant(
        user_question=payload.question,
        video_id=payload.video_id
    )

@router.get("/alerts")
async def get_performance_alerts(unread_only: bool = Query(False)):
    """Get milestone reach notifications and view growth velocity spike alerts."""
    return youtube_analytics_service.get_alerts(unread_only=unread_only)

@router.post("/alerts/mark-read")
async def mark_alerts_as_read(alert_id: Optional[str] = Query(None)):
    """Mark alerts as read (single alert or all)."""
    success = youtube_analytics_service.mark_alerts_as_read(alert_id=alert_id)
    return {"success": success, "message": "Alerts marked as read"}

@router.get("/alerts/settings")
async def get_alert_settings():
    """Get creator custom threshold settings for performance alerts."""
    return youtube_analytics_service.get_alert_settings()

@router.patch("/alerts/settings")
async def update_alert_settings(payload: AlertSettingsUpdateRequest):
    """Update creator custom threshold settings for performance alerts."""
    updated = youtube_analytics_service.update_alert_settings("UC_x5XG1OV2P6uZZ5FSM9Ttw", payload.model_dump())
    return updated

@router.get("/export/csv")
async def export_analytics_csv(time_range: str = Query("28d", pattern="^(7d|28d|90d|365d)$")):
    """Download full analytics report as CSV file."""
    csv_content = youtube_analytics_service.export_csv_report(time_range=time_range)
    filename = f"ai_shorts_factory_analytics_{time_range}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/export/report")
async def export_printable_analytics_report(time_range: str = Query("28d", pattern="^(7d|28d|90d|365d)$")):
    """Get structured report data formatted for PDF printing and executive presentations."""
    overview = youtube_analytics_service.get_channel_overview(time_range=time_range)
    top_shorts = youtube_analytics_service.get_top_performing_shorts()
    audience = youtube_analytics_service.get_audience_insights(time_range=time_range)
    insights = youtube_analytics_service.get_content_performance_insights()

    return {
        "report_title": "AI Shorts Factory — Channel Performance & Content Intelligence Report",
        "generated_at": overview.get("generated_at"),
        "time_range": time_range,
        "overview": overview,
        "top_performing": top_shorts,
        "audience": audience,
        "content_insights": insights
    }
