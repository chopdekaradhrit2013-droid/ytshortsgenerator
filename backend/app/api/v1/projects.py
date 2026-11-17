import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from backend.app.models.schemas import (
    ProjectResponse, ProjectCreate, ProjectUpdate, DashboardStatsResponse
)
from backend.app.services.ai_analyzer import ai_analyzer_service

router = APIRouter()

# In-memory realistic store with initial seed for when Supabase is running locally or without active DB credentials
DEMO_PROJECTS = [
    {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "Future of Artificial General Intelligence Podcast",
        "description": "Full 90-minute interview with leading AI research engineers.",
        "category": "podcast",
        "status": "completed",
        "target_clip_count": 8,
        "preferred_duration_seconds": 45,
        "tags": ["AI", "Tech", "AGI"],
        "clip_count": 8,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "metadata": {
            "source_filename": "agi_podcast_ep42_4k.mp4",
            "source_duration": 5420.5,
            "source_size_mb": 1420
        }
    },
    {
        "id": "22222222-2222-2222-2222-222222222222",
        "name": "Elden Ring DLC Boss Fights & Live Reactions",
        "description": "High-intensity boss encounters with commentary and web cam overlays.",
        "category": "gaming",
        "status": "processing",
        "target_clip_count": 12,
        "preferred_duration_seconds": 30,
        "tags": ["Gaming", "EldenRing"],
        "clip_count": 0,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "metadata": {
            "source_filename": "shadow_erdtree_stream_part3.mp4",
            "source_duration": 7200.0,
            "source_size_mb": 2800
        }
    },
    {
        "id": "33333333-3333-3333-3333-333333333333",
        "name": "Creator Economy & Monetization Secrets Masterclass",
        "description": "Practical strategies for growing to 1M subscribers with short-form content.",
        "category": "interview",
        "status": "completed",
        "target_clip_count": 6,
        "preferred_duration_seconds": 50,
        "tags": ["CreatorEconomy", "Growth"],
        "clip_count": 6,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "metadata": {
            "source_filename": "monetization_masterclass.mov",
            "source_duration": 3600.0,
            "source_size_mb": 950
        }
    }
]

@router.get("", response_model=List[ProjectResponse])
def list_projects(
    search: Optional[str] = Query(None, description="Search term for project name/description"),
    status: Optional[str] = Query(None, description="Filter by project status"),
    category: Optional[str] = Query(None, description="Filter by category")
):
    projects = DEMO_PROJECTS
    if search:
        s = search.lower()
        projects = [p for p in projects if s in p["name"].lower() or (p.get("description") and s in p["description"].lower())]
    if status and status != "all":
        projects = [p for p in projects if p["status"] == status]
    if category and category != "all":
        projects = [p for p in projects if p["category"] == category]
    return projects

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats():
    total_projects = len(DEMO_PROJECTS)
    total_clips = sum(p.get("clip_count", 0) for p in DEMO_PROJECTS)
    return {
        "total_projects": total_projects,
        "total_clips_generated": total_clips,
        "clips_ready_to_publish": 11,
        "successfully_published": 3,
        "storage_used_bytes": 5170000000, # ~5.17 GB
        "connected_channel": {
            "channel_title": "AI Shorts Factory Studios",
            "subscriber_count": 148500,
            "status": "connected"
        }
    }

@router.post("", response_model=ProjectResponse)
def create_project(payload: ProjectCreate):
    new_project = {
        "id": str(uuid.uuid4()),
        "name": payload.name or "Untitled Project",
        "description": payload.description,
        "category": payload.category,
        "status": "uploading",
        "target_clip_count": payload.target_clip_count,
        "preferred_duration_seconds": payload.preferred_duration_seconds,
        "tags": payload.tags,
        "clip_count": 0,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "metadata": {}
    }
    DEMO_PROJECTS.insert(0, new_project)
    return new_project

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str):
    for p in DEMO_PROJECTS:
        if p["id"] == project_id:
            return p
    raise HTTPException(status_code=404, detail="Project not found")

@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, payload: ProjectUpdate):
    for p in DEMO_PROJECTS:
        if p["id"] == project_id:
            update_data = payload.model_dump(exclude_unset=True)
            p.update(update_data)
            p["updated_at"] = datetime.now()
            return p
    raise HTTPException(status_code=404, detail="Project not found")

@router.delete("/{project_id}")
def delete_project(project_id: str):
    global DEMO_PROJECTS
    initial_len = len(DEMO_PROJECTS)
    DEMO_PROJECTS = [p for p in DEMO_PROJECTS if p["id"] != project_id]
    if len(DEMO_PROJECTS) == initial_len:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "deleted", "id": project_id}
