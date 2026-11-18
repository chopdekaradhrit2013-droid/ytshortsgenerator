import os
import threading
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, Field
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection
from backend.app.services.export_manager import export_manager

router = APIRouter()

class RenderShortRequest(BaseModel):
    project_id: str
    clip_id: str
    config: Optional[Dict[str, Any]] = None

class SavePresetRequest(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "general"
    caption_preset: str = "bold_pop"
    font_family: str = "Inter"
    font_size: int = 50
    primary_color: str = "#FFFFFF"
    highlight_color: str = "#FACC15"
    outline_color: str = "#000000"
    outline_width: int = 4
    position: str = "bottom"
    words_per_line: int = 5
    zoom_intensity: str = "dynamic"
    crop_mode: str = "smart_face"
    audio_enhancement: Optional[Dict[str, Any]] = None
    bgm_track: Optional[str] = None
    bgm_volume: float = 0.15
    hook_enabled: bool = True

@router.post("/render")
def trigger_render_export(payload: RenderShortRequest):
    """
    Initiates background rendering of a polished vertical YouTube Short
    with intelligent reframing, ASS captions, smart zoom, and audio enhancement.
    """
    # 1. Resolve clip and source video
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM generated_clips WHERE id = ?;", (payload.clip_id,))
    clip_row = cur.fetchone()
    if not clip_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Clip not found")

    clip = dict(clip_row)
    cur.execute("""
        SELECT storage_path FROM source_videos
        WHERE project_id = ? ORDER BY created_at DESC LIMIT 1;
    """, (payload.project_id,))
    sv_row = cur.fetchone()
    conn.close()

    source_path = sv_row["storage_path"] if sv_row else None
    if not source_path or not os.path.exists(source_path):
        # Fallback to test sample if exists
        test_path = os.path.join(settings.MEDIA_STORAGE_DIR, "uploads", f"demo_{payload.project_id}.mp4")
        if os.path.exists(test_path):
            source_path = test_path
        else:
            sample_candidate = os.path.join(settings.MEDIA_STORAGE_DIR, "uploads", "test_sample.mp4")
            if os.path.exists(sample_candidate):
                source_path = sample_candidate
            else:
                raise HTTPException(status_code=400, detail="Source video media file not found on disk")

    # 2. Create export job
    job = export_manager.create_export_job(
        project_id=payload.project_id,
        clip_id=payload.clip_id,
        config=payload.config
    )

    # 3. Schedule in background worker thread
    thread = threading.Thread(
        target=export_manager.run_export_pipeline,
        kwargs={
            "job_id": job["id"],
            "project_id": payload.project_id,
            "clip_id": payload.clip_id,
            "source_video_path": source_path,
            "start_time": clip["start_time"],
            "duration": clip["duration_seconds"],
            "config": payload.config
        },
        daemon=True
    )
    thread.start()

    return {
        "status": "queued",
        "job_id": job["id"],
        "project_id": payload.project_id,
        "clip_id": payload.clip_id,
        "message": "Export render job queued. Processing in background."
    }

@router.get("/status/{job_id}")
def get_export_status(job_id: str):
    """
    Returns real-time render progress, stage, output paths, and QC certificate.
    """
    job = export_manager.get_export_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Export job not found")
    return job

@router.post("/cancel/{job_id}")
def cancel_export(job_id: str):
    """
    Cancels an active render job.
    """
    success = export_manager.cancel_export_job(job_id)
    return {"status": "cancelled", "job_id": job_id, "success": success}

@router.get("/jobs")
def list_exports(project_id: Optional[str] = Query(None)):
    """
    Lists export jobs for a project.
    """
    return export_manager.list_export_jobs(project_id)

@router.get("/presets")
def list_presets():
    """
    Returns built-in system presets and saved user presets.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM editing_presets ORDER BY is_system DESC, created_at DESC;")
    rows = cur.fetchall()
    conn.close()

    import json
    presets = []
    for r in rows:
        p = dict(r)
        if p.get("audio_enhancement"):
            try:
                p["audio_enhancement"] = json.loads(p["audio_enhancement"])
            except Exception:
                pass
        presets.append(p)
    return presets

@router.post("/presets")
def save_custom_preset(payload: SavePresetRequest):
    """
    Saves a user-customized editing preset.
    """
    import uuid, json
    preset_id = f"preset_user_{uuid.uuid4().hex[:8]}"
    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT INTO editing_presets (
                id, name, description, category, caption_preset, font_family, font_size,
                primary_color, highlight_color, outline_color, outline_width, position,
                words_per_line, zoom_intensity, crop_mode, audio_enhancement, bgm_track,
                bgm_volume, hook_enabled, is_system, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'));
        """, (
            preset_id,
            payload.name,
            payload.description or "",
            payload.category,
            payload.caption_preset,
            payload.font_family,
            payload.font_size,
            payload.primary_color,
            payload.highlight_color,
            payload.outline_color,
            payload.outline_width,
            payload.position,
            payload.words_per_line,
            payload.zoom_intensity,
            payload.crop_mode,
            json.dumps(payload.audio_enhancement or {"loudnorm": True, "denoise": True, "speech_boost": True}),
            payload.bgm_track,
            payload.bgm_volume,
            1 if payload.hook_enabled else 0
        ))
    conn.close()
    return {"status": "saved", "id": preset_id, "name": payload.name}

