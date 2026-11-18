import os
import uuid
import json
import shutil
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form, Depends, status
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection
from backend.app.models.schemas import (
    ProjectResponse, ProjectCreate, ProjectUpdate, DashboardStatsResponse
)
from backend.app.services.ffmpeg_service import ffmpeg_service
from backend.app.services.usage_service import check_permission_and_quota, deduct_usage
from backend.app.api.deps import get_current_user

router = APIRouter()

# Seed default projects into SQLite if empty
def ensure_default_projects():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM projects;")
    count = cur.fetchone()[0]
    if count == 0:
        with conn:
            conn.execute("""
                INSERT INTO projects (
                    id, name, description, category, status,
                    target_clip_count, preferred_duration_seconds, tags,
                    clip_count, metadata, created_at, updated_at
                ) VALUES 
                ('11111111-1111-1111-1111-111111111111', 'Future of Artificial General Intelligence Podcast', 'Full 90-minute interview with leading AI research engineers.', 'podcast', 'completed', 8, 45, '["AI", "Tech", "AGI"]', 8, '{"source_filename": "agi_podcast_ep42_4k.mp4", "source_duration": 5420.5}', datetime('now', '-2 days'), datetime('now')),
                ('22222222-2222-2222-2222-222222222222', 'Elden Ring DLC Boss Fights & Live Reactions', 'High-intensity boss encounters with commentary and web cam overlays.', 'gaming', 'processing', 12, 30, '["Gaming", "EldenRing"]', 0, '{"source_filename": "shadow_erdtree_stream_part3.mp4", "source_duration": 7200.0}', datetime('now', '-4 hours'), datetime('now')),
                ('33333333-3333-3333-3333-333333333333', 'Creator Economy & Monetization Secrets Masterclass', 'Practical strategies for growing to 1M subscribers with short-form content.', 'interview', 'completed', 6, 50, '["CreatorEconomy", "Growth"]', 6, '{"source_filename": "monetization_masterclass.mov", "source_duration": 3600.0}', datetime('now', '-5 days'), datetime('now'));
            """)
    conn.close()

ensure_default_projects()

@router.get("", response_model=List[ProjectResponse])
def list_projects(
    search: Optional[str] = Query(None, description="Search term for project name/description"),
    status: Optional[str] = Query(None, description="Filter by project status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    user: Dict[str, Any] = Depends(get_current_user)
):
    conn = get_db_connection()
    cur = conn.cursor()
    # Scoped to authenticated user or default demo project
    query = "SELECT * FROM projects WHERE (user_id = ? OR user_id = 'usr_default_alex')"
    params = [user["id"]]

    if search:
        query += " AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)"
        params.extend([f"%{search.lower()}%", f"%{search.lower()}%"])

    if status and status != "all":
        query += " AND status = ?"
        params.append(status)

    if category and category != "all":
        query += " AND category = ?"
        params.append(category)

    query += " ORDER BY created_at DESC;"
    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()

    result = []
    for r in rows:
        p = dict(r)
        p["tags"] = json.loads(p["tags"]) if p.get("tags") else []
        p["metadata"] = json.loads(p["metadata"]) if p.get("metadata") else {}
        p["created_at"] = datetime.fromisoformat(p["created_at"]) if "T" in p["created_at"] else datetime.strptime(p["created_at"], "%Y-%m-%d %H:%M:%S")
        p["updated_at"] = datetime.fromisoformat(p["updated_at"]) if "T" in p["updated_at"] else datetime.strptime(p["updated_at"], "%Y-%m-%d %H:%M:%S")
        result.append(p)
    return result

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM projects;")
    total_projects = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM generated_clips;")
    total_clips = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM generated_clips WHERE status = 'ready';")
    ready_clips = cur.fetchone()[0]

    conn.close()

    return {
        "total_projects": max(total_projects, 3),
        "total_clips_generated": max(total_clips, 14),
        "clips_ready_to_publish": max(ready_clips, 11),
        "successfully_published": 3,
        "storage_used_bytes": 5170000000,
        "connected_channel": {
            "channel_title": "AI Shorts Factory Studios",
            "subscriber_count": 148500,
            "status": "connected"
        }
    }

@router.post("", response_model=ProjectResponse)
def create_project(payload: ProjectCreate, user: Dict[str, Any] = Depends(get_current_user)):
    project_id = str(uuid.uuid4())
    user_id = user["id"]
    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT INTO projects (
                id, user_id, name, description, category, status,
                target_clip_count, preferred_duration_seconds, tags,
                clip_count, metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, 0, '{}', datetime('now'), datetime('now'));
        """, (
            project_id,
            user_id,
            payload.name or "Untitled Project",
            payload.description or "",
            payload.category,
            payload.target_clip_count,
            payload.preferred_duration_seconds,
            json.dumps(payload.tags or [])
        ))
    conn.close()

    return get_project(project_id, user=user)

@router.post("/upload")
async def upload_video_and_create_project(
    video: UploadFile = File(...),
    name: Optional[str] = Form(None),
    category: str = Form("automatic"),
    target_clip_count: int = Form(10),
    preferred_duration_seconds: int = Form(45),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Ingests actual video file, validates extensions, extracts media specs with FFprobe,
    enforces server-side video processing quota, generates poster thumbnail, and creates a project.
    """
    allowed_exts = [".mp4", ".mov", ".webm", ".m4v"]
    ext = os.path.splitext(video.filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported video format: '{ext}'. Allowed: MP4, MOV, WebM.")

    project_id = str(uuid.uuid4())
    user_id = user["id"]
    saved_filename = f"{project_id}{ext}"
    dest_path = os.path.join(settings.MEDIA_STORAGE_DIR, "uploads", saved_filename)

    # Save uploaded chunks
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    # Inspect media metadata via FFprobe
    probe = ffmpeg_service.probe_video(dest_path)
    duration = probe.get("duration", 0.0)
    duration_mins = max(0.1, duration / 60.0)

    # Enforce quota check
    allowed, reason, upgrade_info = check_permission_and_quota(
        user_id=user_id,
        metric_type="video_processing_minutes",
        amount=duration_mins
    )
    if not allowed:
        # Clean up uploaded file
        if os.path.exists(dest_path):
            try:
                os.remove(dest_path)
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=reason or "Monthly video processing quota exceeded. Please upgrade your plan."
        )

    # Deduct usage
    deduct_usage(
        user_id=user_id,
        metric_type="video_processing_minutes",
        amount=duration_mins,
        resource_id=project_id,
        description=f"Ingested video '{video.filename}' ({duration_mins:.1f} mins)"
    )

    # Generate thumbnail frame
    thumb_filename = f"thumb_{project_id}.jpg"
    thumb_path = os.path.join(settings.MEDIA_STORAGE_DIR, "thumbnails", thumb_filename)
    ffmpeg_service.generate_thumbnail(dest_path, thumb_path, timestamp=min(1.5, duration * 0.1))

    thumb_url = f"/media/thumbnails/{thumb_filename}"
    proj_name = name or os.path.splitext(video.filename)[0].replace("_", " ").title()

    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT INTO projects (
                id, user_id, name, description, category, status,
                target_clip_count, preferred_duration_seconds, tags,
                clip_count, metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'uploading', ?, ?, '["Shorts"]', 0, ?, datetime('now'), datetime('now'));
        """, (
            project_id,
            user_id,
            proj_name,
            f"Uploaded {video.filename} ({round(probe['duration'], 1)}s)",
            category,
            target_clip_count,
            preferred_duration_seconds,
            json.dumps({
                "source_filename": video.filename,
                "source_duration": probe["duration"],
                "source_size_mb": round(os.path.getsize(dest_path) / (1024 * 1024), 1),
                "resolution": f"{probe['width']}x{probe['height']}",
                "fps": probe["fps"],
                "thumbnail_url": thumb_url,
                "storage_path": dest_path
            })
        ))

        # Store source_videos record
        source_id = f"src_{project_id[:8]}"
        conn.execute("""
            INSERT INTO source_videos (
                id, project_id, original_filename, storage_path,
                file_size_bytes, duration_seconds, resolution_width, resolution_height,
                aspect_ratio, fps, mime_type, thumbnail_url, audio_codec, audio_sample_rate,
                transcription_status, ai_metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'), datetime('now'));
        """, (
            source_id,
            project_id,
            video.filename,
            dest_path,
            os.path.getsize(dest_path),
            probe["duration"],
            probe["width"],
            probe["height"],
            probe["aspect_ratio"],
            probe["fps"],
            video.content_type or "video/mp4",
            thumb_url,
            probe.get("audio_codec"),
            probe.get("audio_sample_rate"),
            json.dumps(probe)
        ))
    conn.close()

    return {
        "status": "uploaded",
        "project_id": project_id,
        "source_video_id": source_id,
        "storage_path": dest_path,
        "thumbnail_url": thumb_url,
        "metadata": probe
    }

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM projects WHERE id = ?;", (project_id,))
    row = cur.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    p = dict(row)
    # Check tenant isolation
    proj_owner = p.get("user_id")
    if proj_owner and proj_owner != user["id"] and proj_owner != "usr_default_alex" and user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You do not own this project.")

    p["tags"] = json.loads(p["tags"]) if p.get("tags") else []
    p["metadata"] = json.loads(p["metadata"]) if p.get("metadata") else {}
    p["created_at"] = datetime.fromisoformat(p["created_at"]) if "T" in p["created_at"] else datetime.strptime(p["created_at"], "%Y-%m-%d %H:%M:%S")
    p["updated_at"] = datetime.fromisoformat(p["updated_at"]) if "T" in p["updated_at"] else datetime.strptime(p["updated_at"], "%Y-%m-%d %H:%M:%S")
    return p

@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, payload: ProjectUpdate, user: Dict[str, Any] = Depends(get_current_user)):
    # Verify ownership
    get_project(project_id, user=user)

    conn = get_db_connection()
    update_dict = payload.model_dump(exclude_unset=True)
    if not update_dict:
        return get_project(project_id, user=user)

    set_clauses = []
    params = []
    for k, v in update_dict.items():
        if k == "tags":
            set_clauses.append("tags = ?")
            params.append(json.dumps(v))
        else:
            set_clauses.append(f"{k} = ?")
            params.append(v)

    set_clauses.append("updated_at = datetime('now')")
    params.append(project_id)

    with conn:
        conn.execute(f"UPDATE projects SET {', '.join(set_clauses)} WHERE id = ?;", params)
    conn.close()

    return get_project(project_id, user=user)

@router.delete("/{project_id}")
def delete_project(project_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    # Verify ownership
    get_project(project_id, user=user)

    conn = get_db_connection()
    with conn:
        conn.execute("DELETE FROM projects WHERE id = ?;", (project_id,))
    conn.close()
    return {"status": "deleted", "id": project_id}
