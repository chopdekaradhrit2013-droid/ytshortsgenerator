import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.app.models.schemas import GeneratedClipResponse, GeneratedClipUpdate
from backend.app.services.ai_analyzer import ai_analyzer_service

router = APIRouter()

DEMO_CLIPS = [
    {
        "id": "c1111111-1111-1111-1111-111111111111",
        "project_id": "11111111-1111-1111-1111-111111111111",
        "source_video_id": "s1",
        "title": "The Secret AGI Timeline Nobody Speaks About",
        "summary": "Reveals inside predictions from top lab researchers on superintelligence horizons.",
        "hook_sentence": "Most people think AGI is 20 years away. Here is what is actually happening behind closed doors.",
        "start_time": 142.5,
        "end_time": 188.0,
        "duration_seconds": 45.5,
        "engagement_score": 96,
        "virality_reasons": [
            "Contrarian insider perspective with high urgency",
            "High pace, zero dead air in first 5 seconds",
            "Strong retention graph prediction (top 5% tier)"
        ],
        "tags": ["AGI", "AISecrets", "TechTrends", "Shorts"],
        "aspect_ratio": "9:16",
        "resolution_width": 1080,
        "resolution_height": 1920,
        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "thumbnail_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        "status": "ready",
        "captions_style": {"fontFamily": "Inter", "color": "#FFFFFF", "highlightColor": "#FACC15"},
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    },
    {
        "id": "c2222222-2222-2222-2222-222222222222",
        "project_id": "11111111-1111-1111-1111-111111111111",
        "source_video_id": "s1",
        "title": "Why 99% Of Coding Jobs Will Evolve Into Architecture",
        "summary": "Discusses how prompt engineering and agent orchestration replace repetitive coding syntax.",
        "hook_sentence": "If you are only writing syntax, you are missing the biggest shift in computing history.",
        "start_time": 410.0,
        "end_time": 452.2,
        "duration_seconds": 42.2,
        "engagement_score": 92,
        "virality_reasons": [
            "Direct address to massive developer audience",
            "Clear actionable takeaway",
            "Sparked intense debate in transcript"
        ],
        "tags": ["Coding", "SoftwareEngineering", "FutureOfWork"],
        "aspect_ratio": "9:16",
        "resolution_width": 1080,
        "resolution_height": 1920,
        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "thumbnail_url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
        "status": "ready",
        "captions_style": {"fontFamily": "Inter", "color": "#FFFFFF", "highlightColor": "#38BDF8"},
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    },
    {
        "id": "c3333333-3333-3333-3333-333333333333",
        "project_id": "33333333-3333-3333-3333-333333333333",
        "source_video_id": "s3",
        "title": "The $10K/Month YouTube Shorts Framework",
        "summary": "Step-by-step framework used by top creators to monetize high-retention short videos.",
        "hook_sentence": "Stop posting random clips. This 3-part framework turns views into predictable revenue.",
        "start_time": 820.0,
        "end_time": 868.5,
        "duration_seconds": 48.5,
        "engagement_score": 89,
        "virality_reasons": [
            "Quantifiable value proposition in title",
            "High viewer retention hook",
            "Clear bullet points that retain viewer attention"
        ],
        "tags": ["Monetization", "YouTubeGrowth", "CreatorEconomy"],
        "aspect_ratio": "9:16",
        "resolution_width": 1080,
        "resolution_height": 1920,
        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        "thumbnail_url": "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80",
        "status": "ready",
        "captions_style": {"fontFamily": "Inter", "color": "#FFFFFF", "highlightColor": "#A855F7"},
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
]

@router.get("", response_model=List[GeneratedClipResponse])
def list_clips(project_id: Optional[str] = Query(None)):
    if project_id:
        return [c for c in DEMO_CLIPS if c["project_id"] == project_id]
    return DEMO_CLIPS

@router.get("/{clip_id}", response_model=GeneratedClipResponse)
def get_clip(clip_id: str):
    for c in DEMO_CLIPS:
        if c["id"] == clip_id:
            return c
    raise HTTPException(status_code=404, detail="Clip not found")

@router.patch("/{clip_id}", response_model=GeneratedClipResponse)
def update_clip(clip_id: str, payload: GeneratedClipUpdate):
    for c in DEMO_CLIPS:
        if c["id"] == clip_id:
            update_data = payload.model_dump(exclude_unset=True)
            c.update(update_data)
            if "start_time" in update_data or "end_time" in update_data:
                c["duration_seconds"] = round(c["end_time"] - c["start_time"], 1)
            c["updated_at"] = datetime.now()
            return c
    raise HTTPException(status_code=404, detail="Clip not found")

@router.post("/trigger-analysis/{project_id}")
def trigger_analysis(project_id: str):
    """
    Triggers AI Clip Generator analysis for a project.
    Generates new candidate clips according to video settings.
    """
    generated = ai_analyzer_service.analyze_transcript_and_segment(
        duration_seconds=3600.0,
        target_clips=6,
        preferred_duration=45,
        category="podcast"
    )
    
    new_clips = []
    for item in generated:
        clip_entry = {
            "id": str(uuid.uuid4()),
            "project_id": project_id,
            "source_video_id": f"src-{project_id[:6]}",
            "title": item["title"],
            "summary": item["summary"],
            "hook_sentence": item["hook_sentence"],
            "start_time": item["start_time"],
            "end_time": item["end_time"],
            "duration_seconds": item["duration_seconds"],
            "engagement_score": item["engagement_score"],
            "virality_reasons": item["virality_reasons"],
            "tags": item["tags"],
            "aspect_ratio": "9:16",
            "resolution_width": 1080,
            "resolution_height": 1920,
            "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            "thumbnail_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
            "status": "ready",
            "captions_style": {"fontFamily": "Inter", "color": "#FFFFFF", "highlightColor": "#FACC15"},
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        DEMO_CLIPS.append(clip_entry)
        new_clips.append(clip_entry)
        
    return {
        "status": "success",
        "project_id": project_id,
        "clips_generated": len(new_clips),
        "clips": new_clips
    }
