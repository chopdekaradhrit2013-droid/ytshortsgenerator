from fastapi import APIRouter, HTTPException, Query, Body, Path, Depends
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from backend.app.services.content_intelligence import content_intelligence_service
from backend.app.services.usage_service import check_permission_and_quota
from backend.app.api.deps import get_current_user

router = APIRouter()

class NicheProfileUpdateRequest(BaseModel):
    niche_name: str = Field(..., description="Creator primary niche")
    core_topics: List[str] = Field(default_factory=list)
    target_audience: str = Field(...)
    brand_voice: str = Field(...)
    preferred_duration_seconds: int = Field(default=42, ge=15, le=60)
    top_performing_hook_styles: List[str] = Field(default_factory=list)
    manual_overrides: Dict[str, Any] = Field(default_factory=dict)

class AddCompetitorRequest(BaseModel):
    channel_name: str = Field(..., description="Competitor channel display name")
    competitor_channel_id: Optional[str] = Field(None)
    subscribers: int = Field(default=500000)
    avg_shorts_views: int = Field(default=120000)
    upload_frequency_per_week: float = Field(default=3.5)
    top_topics: List[str] = Field(default_factory=lambda: ["AI Tech", "Software Engineering"])

class EvaluateSourceVideoRequest(BaseModel):
    title: str = Field(..., description="Candidate long-form video title")
    description: Optional[str] = Field(default="")
    duration_seconds: float = Field(default=1800.0)
    category: Optional[str] = Field(default="AI Tech")

class GenerateIdeasRequest(BaseModel):
    count: int = Field(default=5, ge=1, le=20)
    focus_topic: Optional[str] = None
    source_type: str = Field(default="trending")

class EvaluateIdeaRequest(BaseModel):
    title: str = Field(..., description="Short idea title")
    hook_sentence: str = Field(..., description="Opening 3-second hook")
    concept_summary: str = Field(default="")
    duration_seconds: int = Field(default=42, ge=15, le=60)

class StrategyGenerateRequest(BaseModel):
    timeframe_days: int = Field(default=14, ge=7, le=30)

class StrategyAssistantQueryRequest(BaseModel):
    question: str = Field(..., description="Strategic query for AI Content Intelligence assistant")

# 1. Niche Profile
@router.get("/profile")
async def get_niche_profile(channel_id: str = Query("UC_x5XG1OV2P6uZZ5FSM9Ttw")):
    """Get channel niche profile, target audience, brand voice, and hook styles."""
    return content_intelligence_service.get_niche_profile(channel_id=channel_id)

@router.put("/profile")
async def update_niche_profile(
    payload: NicheProfileUpdateRequest,
    channel_id: str = Query("UC_x5XG1OV2P6uZZ5FSM9Ttw")
):
    """Update or manually correct channel niche profile and recommendation weights."""
    return content_intelligence_service.update_niche_profile(channel_id=channel_id, updates=payload.model_dump())

# 2. Trending Content Discovery
@router.get("/trends")
async def discover_trending_topics(niche: Optional[str] = Query(None)):
    """Discover real-time trending topics and long-form video candidates ready for short clipping."""
    return content_intelligence_service.discover_trending_topics(niche=niche)

# 3. Competitor Intelligence
@router.get("/competitors")
async def get_competitors(
    user_channel_id: str = Query("UC_x5XG1OV2P6uZZ5FSM9Ttw"),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Get tracked competitor channels with public metrics and top video benchmarks (Requires Pro plan)."""
    allowed, reason, upgrade_info = check_permission_and_quota(
        user_id=user["id"],
        required_feature="competitor_analysis"
    )
    if not allowed:
        raise HTTPException(status_code=403, detail=reason or "Competitor Channel Intelligence requires Pro tier or higher.")
    return content_intelligence_service.get_competitors(user_channel_id=user_channel_id)

@router.post("/competitors")
async def add_competitor(
    payload: AddCompetitorRequest,
    user_channel_id: str = Query("UC_x5XG1OV2P6uZZ5FSM9Ttw"),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Add competitor YouTube channel for benchmarking and gap discovery (Requires Pro plan)."""
    allowed, reason, upgrade_info = check_permission_and_quota(
        user_id=user["id"],
        required_feature="competitor_analysis"
    )
    if not allowed:
        raise HTTPException(status_code=403, detail=reason or "Competitor Channel Intelligence requires Pro tier or higher.")
    return content_intelligence_service.add_competitor(
        user_channel_id=user_channel_id,
        channel_name=payload.channel_name,
        competitor_channel_id=payload.competitor_channel_id,
        subscribers=payload.subscribers,
        avg_shorts_views=payload.avg_shorts_views,
        upload_frequency_per_week=payload.upload_frequency_per_week,
        top_topics=payload.top_topics
    )

@router.delete("/competitors/{competitor_id}")
async def remove_competitor(
    competitor_id: str = Path(...),
    user_channel_id: str = Query("UC_x5XG1OV2P6uZZ5FSM9Ttw"),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Remove competitor channel from tracking."""
    success = content_intelligence_service.remove_competitor(user_channel_id=user_channel_id, competitor_id=competitor_id)
    return {"success": success, "message": "Competitor removed"}

# 4. Content Gap Analysis
@router.get("/content-gaps")
async def get_content_gaps(
    channel_id: str = Query("UC_x5XG1OV2P6uZZ5FSM9Ttw"),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Get high-opportunity topic gaps covered by competitors but not yet by creator (Requires Pro plan)."""
    allowed, reason, upgrade_info = check_permission_and_quota(
        user_id=user["id"],
        required_feature="competitor_analysis"
    )
    if not allowed:
        raise HTTPException(status_code=403, detail=reason or "Content Gap Analysis requires Pro tier or higher.")
    return content_intelligence_service.get_content_gaps(channel_id=channel_id)

# 5. Source Video Evaluator
@router.post("/evaluate-source-video")
async def evaluate_source_video(payload: EvaluateSourceVideoRequest):
    """Evaluate candidate long-form video and calculate 0-100 opportunity score with clipping estimates."""
    return content_intelligence_service.evaluate_source_video_opportunity(
        title=payload.title,
        description=payload.description or "",
        duration_seconds=payload.duration_seconds,
        category=payload.category or "AI Tech"
    )

# 6. AI Shorts Idea Generator
@router.get("/ideas")
async def get_ideas(
    channel_id: str = Query("UC_x5XG1OV2P6uZZ5FSM9Ttw"),
    limit: int = Query(10, ge=1, le=50)
):
    """Get stored high-opportunity Shorts ideas."""
    return content_intelligence_service.generate_shorts_ideas(channel_id=channel_id, count=limit)

@router.post("/ideas/generate")
async def generate_ideas(
    payload: GenerateIdeasRequest,
    channel_id: str = Query("UC_x5XG1OV2P6uZZ5FSM9Ttw")
):
    """Generate original Shorts blueprints with titles, hooks, structures, and keywords."""
    return content_intelligence_service.generate_shorts_ideas(
        channel_id=channel_id,
        count=payload.count,
        focus_topic=payload.focus_topic,
        source_type=payload.source_type
    )

# 7. Viral Potential Evaluator
@router.post("/ideas/evaluate")
async def evaluate_idea_viral_potential(payload: EvaluateIdeaRequest):
    """Score viral opportunity (0-100) of any user idea with diagnostic feedback."""
    return content_intelligence_service.evaluate_idea_viral_potential(
        title=payload.title,
        hook_sentence=payload.hook_sentence,
        concept_summary=payload.concept_summary,
        duration_seconds=payload.duration_seconds
    )

# 8. Convert Idea into Project
@router.post("/ideas/{idea_id}/convert-to-project")
async def convert_idea_to_project(
    idea_id: str = Path(...),
    channel_id: str = Query("UC_x5XG1OV2P6uZZ5FSM9Ttw")
):
    """Turn an AI Shorts idea directly into an active Shorts Factory project."""
    try:
        return content_intelligence_service.convert_idea_to_project(idea_id=idea_id, channel_id=channel_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# 9. Content Strategy Calendar
@router.get("/strategy")
async def get_strategy_plan(
    channel_id: str = Query("UC_x5XG1OV2P6uZZ5FSM9Ttw"),
    timeframe_days: int = Query(14, ge=7, le=30)
):
    """Get 7, 14, or 30-day personalized content strategy plan."""
    return content_intelligence_service.get_or_generate_strategy_plan(
        channel_id=channel_id,
        timeframe_days=timeframe_days
    )

@router.post("/strategy/generate")
async def generate_strategy_plan(
    payload: StrategyGenerateRequest,
    channel_id: str = Query("UC_x5XG1OV2P6uZZ5FSM9Ttw")
):
    """Generate fresh personalized content strategy calendar."""
    return content_intelligence_service.get_or_generate_strategy_plan(
        channel_id=channel_id,
        timeframe_days=payload.timeframe_days
    )

# 10. AI Strategy Assistant
@router.post("/assistant/query")
async def query_strategy_assistant(
    payload: StrategyAssistantQueryRequest,
    channel_id: str = Query("UC_x5XG1OV2P6uZZ5FSM9Ttw")
):
    """Query AI strategic advisor for competitor analysis, gap advice, and hook optimization."""
    return content_intelligence_service.query_strategy_assistant(
        channel_id=channel_id,
        question=payload.question
    )

