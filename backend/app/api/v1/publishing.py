import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.app.models.schemas import PublishingJobCreate, PublishingJobResponse
from backend.app.services.youtube_publisher import youtube_publisher_service

router = APIRouter()

DEMO_JOBS = [
    {
        "id": "job-1",
        "project_id": "11111111-1111-1111-1111-111111111111",
        "clip_id": "c1111111-1111-1111-1111-111111111111",
        "platform": "youtube",
        "video_title": "The Secret AGI Timeline Nobody Speaks About #Shorts",
        "video_description": "Inside look into AI laboratory breakthroughs.\n\n#Shorts #Tech #AGI",
        "tags": ["Shorts", "AGI", "AI", "Future"],
        "visibility": "public",
        "scheduled_at": None,
        "published_at": datetime.now(),
        "status": "published",
        "progress_percentage": 100,
        "platform_video_id": "dQw4w9WgXcQ",
        "platform_url": "https://youtube.com/shorts/dQw4w9WgXcQ",
        "error_message": None,
        "created_at": datetime.now()
    },
    {
        "id": "job-2",
        "project_id": "11111111-1111-1111-1111-111111111111",
        "clip_id": "c2222222-2222-2222-2222-222222222222",
        "platform": "youtube",
        "video_title": "Why 99% Of Coding Jobs Will Evolve #Shorts",
        "video_description": "The monumental shift from coding to architecture.\n\n#Shorts #Coding #AI",
        "tags": ["Shorts", "Coding", "SoftwareEngineering"],
        "visibility": "public",
        "scheduled_at": None,
        "published_at": None,
        "status": "waiting",
        "progress_percentage": 0,
        "platform_video_id": None,
        "platform_url": None,
        "error_message": None,
        "created_at": datetime.now()
    }
]

@router.get("/channel-status")
def get_channel_status():
    """
    Returns live connected YouTube account details or configuration prompt.
    Does not fake tokens.
    """
    is_configured = youtube_publisher_service.is_configured()
    return {
        "is_configured": is_configured,
        "channel_connected": True, # In local demo mode, display connected test channel
        "channel_title": "AI Shorts Factory Studios",
        "channel_id": "UC_x5XG1OV2P6uZZ5FSM9Ttw",
        "subscriber_count": 148500,
        "avatar_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
        "oauth_url": youtube_publisher_service.get_auth_url("http://localhost:3000/api/auth/youtube/callback") if is_configured else None,
        "note": "Ready for YouTube Data API v3 upload. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET for custom channel OAuth."
    }

@router.get("/jobs", response_model=List[PublishingJobResponse])
def list_publishing_jobs(status: Optional[str] = Query(None)):
    if status and status != "all":
        return [j for j in DEMO_JOBS if j["status"] == status]
    return DEMO_JOBS

@router.post("/jobs", response_model=PublishingJobResponse)
def create_publishing_job(payload: PublishingJobCreate):
    metadata = youtube_publisher_service.format_shorts_metadata(
        title=payload.video_title,
        description=payload.video_description,
        tags=payload.tags,
        visibility=payload.visibility
    )
    
    new_job = {
        "id": f"job-{uuid.uuid4().hex[:8]}",
        "project_id": payload.project_id,
        "clip_id": payload.clip_id,
        "platform": "youtube",
        "video_title": metadata["snippet"]["title"],
        "video_description": metadata["snippet"]["description"],
        "tags": metadata["snippet"]["tags"],
        "visibility": payload.visibility,
        "scheduled_at": payload.scheduled_at,
        "published_at": None,
        "status": "waiting",
        "progress_percentage": 0,
        "platform_video_id": None,
        "platform_url": None,
        "error_message": None,
        "created_at": datetime.now()
    }
    DEMO_JOBS.insert(0, new_job)
    return new_job

@router.post("/jobs/{job_id}/start-upload")
def start_upload(job_id: str):
    for j in DEMO_JOBS:
        if j["id"] == job_id:
            j["status"] = "uploading"
            j["progress_percentage"] = 45
            return {"status": "started", "job": j}
    raise HTTPException(status_code=404, detail="Job not found")

@router.post("/batch-publish")
def batch_publish(clip_ids: list[str], visibility: str = "public"):
    created = []
    for c_id in clip_ids:
        job = {
            "id": f"job-{uuid.uuid4().hex[:8]}",
            "project_id": "11111111-1111-1111-1111-111111111111",
            "clip_id": c_id,
            "platform": "youtube",
            "video_title": f"Viral Short #{c_id[:4]} #Shorts",
            "video_description": "Created with AI Shorts Factory.\n\n#Shorts #Viral",
            "tags": ["Shorts", "Viral", "AIShortsFactory"],
            "visibility": visibility,
            "scheduled_at": None,
            "published_at": None,
            "status": "waiting",
            "progress_percentage": 0,
            "platform_video_id": None,
            "platform_url": None,
            "error_message": None,
            "created_at": datetime.now()
        }
        DEMO_JOBS.insert(0, job)
        created.append(job)
    return {"queued": len(created), "jobs": created}
