import os
import threading
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection
from backend.app.services.studio_service import studio_service
from backend.app.services.export_manager import export_manager

router = APIRouter()

class SaveStudioProjectRequest(BaseModel):
    name: Optional[str] = None
    aspect_ratio: Optional[str] = None
    canvas_settings: Optional[Dict[str, Any]] = None
    timeline_data: Optional[Dict[str, Any]] = None
    video_adjustments: Optional[Dict[str, Any]] = None
    captions_state: Optional[Dict[str, Any]] = None
    audio_state: Optional[Dict[str, Any]] = None
    overlays_state: Optional[Dict[str, Any]] = None
    export_settings: Optional[Dict[str, Any]] = None

class RenameStudioProjectRequest(BaseModel):
    name: str

class SaveUserPresetRequest(BaseModel):
    name: str
    category: str = "custom"
    description: Optional[str] = None
    config: Dict[str, Any]

class AIAssistRequest(BaseModel):
    command: str
    current_state: Dict[str, Any]

class RenderMultiTrackRequest(BaseModel):
    studio_project_id: str

@router.get("/project/{clip_id}")
def get_or_create_studio_project(clip_id: str, project_id: Optional[str] = None):
    """
    Retrieves or initializes a multi-track studio project for a given clip.
    """
    try:
        # If project_id is not passed, look up from generated_clips
        if not project_id:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("SELECT project_id FROM generated_clips WHERE id = ?;", (clip_id,))
            row = cur.fetchone()
            conn.close()
            if row:
                project_id = row["project_id"]
            else:
                project_id = "default_project"

        data = studio_service.get_or_create_studio_project(project_id=project_id, clip_id=clip_id)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/project/{studio_project_id}/save")
def save_studio_project(studio_project_id: str, payload: SaveStudioProjectRequest):
    """
    Persists timeline edits, adjustments, captions, overlays, and audio settings.
    """
    try:
        data = studio_service.save_studio_project(
            studio_project_id=studio_project_id,
            payload=payload.dict(exclude_unset=True)
        )
        return {"status": "saved", "project": data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/project/{studio_project_id}/autosave")
def autosave_studio_project(studio_project_id: str, payload: SaveStudioProjectRequest):
    """
    Silent background autosave for responsive editing experience.
    """
    try:
        data = studio_service.save_studio_project(
            studio_project_id=studio_project_id,
            payload=payload.dict(exclude_unset=True)
        )
        return {"status": "autosaved", "version": data.get("version")}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/project/{studio_project_id}/rename")
def rename_studio_project(studio_project_id: str, payload: RenameStudioProjectRequest):
    """
    Renames a studio editing project.
    """
    try:
        data = studio_service.rename_studio_project(studio_project_id, payload.name)
        return {"status": "renamed", "project": data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/project/{studio_project_id}/duplicate")
def duplicate_studio_project(studio_project_id: str):
    """
    Duplicates a studio project for non-destructive version branching.
    """
    try:
        dup = studio_service.duplicate_studio_project(studio_project_id)
        return {"status": "duplicated", "project": dup}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/projects")
def list_studio_projects(project_id: Optional[str] = Query(None)):
    """
    Lists studio projects.
    """
    try:
        projects = studio_service.list_studio_projects(project_id)
        return {"projects": projects, "total": len(projects)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/presets")
def get_studio_presets(category: Optional[str] = Query(None)):
    """
    Lists builtin and user-saved studio presets (Cinematic, Gaming, Football, Podcast, etc.).
    """
    try:
        presets = studio_service.get_studio_presets(category)
        return {"presets": presets, "total": len(presets)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/presets")
def save_user_preset(payload: SaveUserPresetRequest):
    """
    Saves a user custom studio editing preset template.
    """
    try:
        preset = studio_service.save_user_preset(
            name=payload.name,
            category=payload.category,
            description=payload.description,
            config=payload.config
        )
        return {"status": "created", "preset": preset}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/assets")
def get_studio_assets(asset_type: Optional[str] = Query(None)):
    """
    Lists royalty-free studio audio tracks, sound effects, and stickers.
    """
    try:
        assets = studio_service.get_studio_assets(asset_type)
        return {"assets": assets, "total": len(assets)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-assist")
def ai_editing_assistant(payload: AIAssistRequest):
    """
    Translates natural language creative editing requests into concrete modifications.
    """
    try:
        result = studio_service.process_ai_editing_command(
            command=payload.command,
            current_state=payload.current_state
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/render-multitrack")
def trigger_multitrack_render(payload: RenderMultiTrackRequest):
    """
    Initiates multi-track background rendering reflecting all timeline edits,
    video adjustments, speed, canvas framing, ASS captions, and multi-track audio mixing.
    """
    studio_project = studio_service.get_studio_project(payload.studio_project_id)
    if not studio_project:
        raise HTTPException(status_code=404, detail="Studio project not found")

    clip_id = studio_project["clip_id"]
    project_id = studio_project["project_id"]

    # Resolve clip details
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM generated_clips WHERE id = ?;", (clip_id,))
    clip_row = cur.fetchone()
    if not clip_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Clip not found")

    clip = dict(clip_row)
    cur.execute("""
        SELECT storage_path FROM source_videos
        WHERE project_id = ? ORDER BY created_at DESC LIMIT 1;
    """, (project_id,))
    sv_row = cur.fetchone()
    conn.close()

    source_path = sv_row["storage_path"] if sv_row else None
    if not source_path or not os.path.exists(source_path):
        sample_path = os.path.join(settings.MEDIA_STORAGE_DIR, "uploads", "test_sample.mp4")
        if os.path.exists(sample_path):
            source_path = sample_path
        else:
            raise HTTPException(status_code=400, detail="Source video media file not found on disk")

    # Map studio project settings to export pipeline config
    timeline = studio_project.get("timeline_data", {})
    duration = float(timeline.get("duration", clip.get("duration_seconds", 45.0)))
    start_time = float(clip.get("start_time", 0.0))

    # Check if primary video track item has custom start or duration
    for trk in timeline.get("tracks", []):
        if trk.get("type") == "video" and trk.get("items"):
            first_v = trk["items"][0]
            if first_v.get("source_start_time") is not None:
                start_time = float(first_v["source_start_time"])
            if first_v.get("duration"):
                duration = float(first_v["duration"])
            break

    export_config = {
        "aspect_ratio": studio_project.get("aspect_ratio", "9:16"),
        "canvas_settings": studio_project.get("canvas_settings", {}),
        "video_adjustments": studio_project.get("video_adjustments", {}),
        "caption_preset": studio_project.get("captions_state", {}).get("preset", "bold_pop"),
        "caption_overrides": studio_project.get("captions_state", {}),
        "captions_data": studio_project.get("captions_state", {}).get("segments", []),
        "export_with_captions": True,
        "audio_enhancement": studio_project.get("audio_state", {}),
        "bgm_track": studio_project.get("audio_state", {}).get("bgm_track"),
        "bgm_volume": studio_project.get("audio_state", {}).get("bgm_volume", 0.14),
        "speech_volume": studio_project.get("audio_state", {}).get("video_audio_volume", 1.0),
        "overlays": studio_project.get("overlays_state", {}),
        "export_settings": studio_project.get("export_settings", {})
    }

    job = export_manager.create_export_job(
        project_id=project_id,
        clip_id=clip_id,
        config=export_config
    )

    thread = threading.Thread(
        target=export_manager.run_export_pipeline,
        kwargs={
            "job_id": job["id"],
            "project_id": project_id,
            "clip_id": clip_id,
            "source_video_path": source_path,
            "start_time": start_time,
            "duration": duration,
            "config": export_config
        },
        daemon=True
    )
    thread.start()

    return {
        "status": "queued",
        "job_id": job["id"],
        "studio_project_id": payload.studio_project_id,
        "clip_id": clip_id,
        "export_config": export_config
    }
