import os
import threading
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, Field
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection
from backend.app.services.analysis_manager import analysis_manager
from backend.app.services.ffmpeg_service import ffmpeg_service

router = APIRouter()

class StartAnalysisRequest(BaseModel):
    project_id: str
    video_path: Optional[str] = None
    target_clip_count: int = Field(default=8, ge=1, le=30)
    preferred_duration_seconds: int = Field(default=45, ge=15, le=60)
    category: str = "automatic"
    min_duration_seconds: Optional[float] = Field(default=15.0, ge=5.0, le=90.0)
    max_duration_seconds: Optional[float] = Field(default=60.0, ge=15.0, le=120.0)
    min_quality_score: int = Field(default=65, ge=0, le=100)
    content_priority: str = Field(default="balanced")  # balanced, entertainment, information, storytelling
    include_similar: bool = Field(default=False)

class RehuntRequest(BaseModel):
    project_id: str
    job_id: Optional[str] = None
    min_duration_seconds: float = Field(default=15.0, ge=5.0, le=120.0)
    max_duration_seconds: float = Field(default=60.0, ge=10.0, le=180.0)
    target_clip_count: int = Field(default=8, ge=1, le=30)
    category: str = "automatic"
    content_priority: str = "balanced"  # balanced, entertainment, information, storytelling
    min_quality_score: int = Field(default=65, ge=0, le=100)
    include_similar: bool = Field(default=False)

@router.post("/start")
def start_analysis(payload: StartAnalysisRequest, background_tasks: BackgroundTasks):
    """
    Initiates real AI video analysis, transcription, and highlight detection.
    Runs asynchronously in the background.
    """
    # 1. Resolve source video path
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM projects WHERE id = ?;", (payload.project_id,))
    project_row = cur.fetchone()

    video_path = payload.video_path
    if not video_path:
        # Check source_videos table
        cur.execute("SELECT storage_path FROM source_videos WHERE project_id = ? ORDER BY created_at DESC LIMIT 1;", (payload.project_id,))
        sv_row = cur.fetchone()
        if sv_row and sv_row["storage_path"] and os.path.exists(sv_row["storage_path"]):
            video_path = sv_row["storage_path"]

    conn.close()

    # If no local file on disk, check if a demo video should be created
    if not video_path or not os.path.exists(video_path):
        # Look in media uploads or generate test video
        demo_path = os.path.join(settings.MEDIA_STORAGE_DIR, "uploads", f"demo_{payload.project_id}.mp4")
        if not os.path.exists(demo_path):
            # Generate a 30s test video with audio test pattern using ffmpeg
            gen_cmd = [
                settings.FFMPEG_BIN,
                "-y",
                "-f", "lavfi",
                "-i", "testsrc=duration=30:size=1280x720:rate=30",
                "-f", "lavfi",
                "-i", "sine=frequency=1000:duration=30",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-c:a", "aac",
                "-pix_fmt", "yuv420p",
                demo_path
            ]
            import subprocess
            subprocess.run(gen_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
        video_path = demo_path

    # 2. Create persistent job in SQLite
    job = analysis_manager.create_job(
        project_id=payload.project_id,
        target_clip_count=payload.target_clip_count,
        preferred_duration=payload.preferred_duration_seconds,
        category=payload.category,
        options={
            "video_path": video_path,
            "min_duration": payload.min_duration_seconds,
            "max_duration": payload.max_duration_seconds,
            "content_priority": payload.content_priority,
            "min_quality_score": payload.min_quality_score,
            "include_similar": payload.include_similar
        }
    )

    # 3. Schedule pipeline in background thread
    thread = threading.Thread(
        target=analysis_manager.run_analysis_pipeline,
        kwargs={
            "job_id": job["id"],
            "video_path": video_path,
            "project_id": payload.project_id,
            "target_clip_count": payload.target_clip_count,
            "preferred_duration": payload.preferred_duration_seconds,
            "category": payload.category,
            "min_duration": payload.min_duration_seconds,
            "max_duration": payload.max_duration_seconds,
            "min_quality_score": payload.min_quality_score,
            "content_priority": payload.content_priority,
            "include_similar": payload.include_similar
        },
        daemon=True
    )
    thread.start()

    return {
        "status": "queued",
        "job_id": job["id"],
        "project_id": payload.project_id,
        "message": "AI analysis job queued and processing started in background."
    }

@router.post("/rehunt")
def rehunt_clips(payload: RehuntRequest):
    """
    Re-runs highlight detection 2.0 with custom parameters without repeating transcription.
    """
    try:
        result = analysis_manager.rehunt_clips(
            project_id=payload.project_id,
            job_id=payload.job_id,
            min_duration_seconds=payload.min_duration_seconds,
            max_duration_seconds=payload.max_duration_seconds,
            target_clip_count=payload.target_clip_count,
            category=payload.category,
            content_priority=payload.content_priority,
            min_quality_score=payload.min_quality_score,
            include_similar=payload.include_similar
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Highlight re-hunt failed: {str(e)}")

@router.get("/status/{job_id}")
def get_analysis_status(job_id: str):
    """
    Returns real-time processing progress, current stage, and generated candidates.
    """
    job = analysis_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return job

@router.post("/cancel/{job_id}")
def cancel_analysis(job_id: str):
    """
    Safely halts an in-flight video analysis job.
    """
    job = analysis_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Analysis job not found")

    success = analysis_manager.cancel_job(job_id)
    return {"status": "cancelled", "job_id": job_id, "success": success}

@router.get("/jobs")
def list_jobs(project_id: Optional[str] = Query(None)):
    """
    Lists historical and running analysis jobs.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    if project_id:
        cur.execute("SELECT * FROM analysis_jobs WHERE project_id = ? ORDER BY created_at DESC;", (project_id,))
    else:
        cur.execute("SELECT * FROM analysis_jobs ORDER BY created_at DESC LIMIT 20;")
    rows = cur.fetchall()
    conn.close()

    return [dict(r) for r in rows]

