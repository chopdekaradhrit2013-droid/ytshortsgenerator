import os
import json
import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection
from backend.app.services.video_reframer import video_reframer
from backend.app.services.ffmpeg_service import ffmpeg_service

router = APIRouter()

class ReframingAnalyzeRequest(BaseModel):
    video_path: Optional[str] = None
    clip_id: Optional[str] = None
    project_id: Optional[str] = None
    start_time: float = Field(default=0.0, ge=0.0)
    duration: float = Field(default=30.0, ge=1.0, le=180.0)
    quality_mode: str = Field(default="smart") # standard, smart, precision
    manual_config: Optional[Dict[str, Any]] = None

class ReframingUpdateRequest(BaseModel):
    mode: str = Field(default="auto") # auto, smart_face, motion_action, split_screen, manual_center, manual_left, manual_right, custom
    quality_mode: str = Field(default="smart") # standard, smart, precision
    center_x_ratio: Optional[float] = Field(default=0.5, ge=0.0, le=1.0)
    center_y_ratio: Optional[float] = Field(default=0.35, ge=0.0, le=1.0)
    zoom_scale: Optional[float] = Field(default=1.0, ge=1.0, le=2.5)
    smoothness: Optional[float] = Field(default=0.82, ge=0.0, le=1.0)
    safe_headroom: Optional[float] = Field(default=0.15, ge=0.05, le=0.35)
    split_layout: Optional[str] = Field(default="stacked_top_bottom")
    split_divider_color: Optional[str] = Field(default="#A855F7")
    speaker1_x_ratio: Optional[float] = Field(default=0.28, ge=0.0, le=1.0)
    speaker2_x_ratio: Optional[float] = Field(default=0.72, ge=0.0, le=1.0)

def resolve_source_video_path(clip_id: Optional[str], project_id: Optional[str], explicit_path: Optional[str]) -> Optional[str]:
    """Helper to locate source video file on disk."""
    if explicit_path and os.path.exists(explicit_path):
        return explicit_path

    conn = get_db_connection()
    cur = conn.cursor()

    if clip_id:
        cur.execute("SELECT source_video_id, project_id FROM generated_clips WHERE id = ?;", (clip_id,))
        clip_row = cur.fetchone()
        if clip_row:
            sv_id = clip_row["source_video_id"]
            p_id = clip_row["project_id"]
            if sv_id:
                cur.execute("SELECT storage_path FROM source_videos WHERE id = ?;", (sv_id,))
                sv_row = cur.fetchone()
                if sv_row and sv_row["storage_path"] and os.path.exists(sv_row["storage_path"]):
                    conn.close()
                    return sv_row["storage_path"]
            if p_id:
                cur.execute("SELECT storage_path FROM source_videos WHERE project_id = ? ORDER BY created_at DESC LIMIT 1;", (p_id,))
                sv_row = cur.fetchone()
                if sv_row and sv_row["storage_path"] and os.path.exists(sv_row["storage_path"]):
                    conn.close()
                    return sv_row["storage_path"]

    if project_id:
        cur.execute("SELECT storage_path FROM source_videos WHERE project_id = ? ORDER BY created_at DESC LIMIT 1;", (project_id,))
        sv_row = cur.fetchone()
        if sv_row and sv_row["storage_path"] and os.path.exists(sv_row["storage_path"]):
            conn.close()
            return sv_row["storage_path"]

    conn.close()

    # Fallback to test video if present
    test_sample = os.path.join(settings.MEDIA_STORAGE_DIR, "uploads", "test_sample.mp4")
    if os.path.exists(test_sample):
        return test_sample

    return None

@router.post("/analyze")
def analyze_video_reframing(payload: ReframingAnalyzeRequest):
    """
    Performs real computer vision subject tracking, face detection, motion analysis,
    and returns 9:16 vertical crop coordinates, multi-speaker layout recommendations,
    and trajectory keyframes.
    """
    video_path = resolve_source_video_path(payload.clip_id, payload.project_id, payload.video_path)

    # If clip_id is given, retrieve start_time and duration from database
    start_time = payload.start_time
    duration = payload.duration

    if payload.clip_id:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT start_time, duration_seconds FROM generated_clips WHERE id = ?;", (payload.clip_id,))
        c_row = cur.fetchone()
        conn.close()
        if c_row:
            start_time = float(c_row["start_time"] or 0.0)
            duration = float(c_row["duration_seconds"] or 30.0)

    try:
        tracking_result = video_reframer.analyze_subject_tracking(
            video_path=video_path or "/tmp/dummy.mp4",
            start_time=start_time,
            duration=duration,
            quality_mode=payload.quality_mode,
            manual_config=payload.manual_config
        )
        return {
            "status": "success",
            "clip_id": payload.clip_id,
            "project_id": payload.project_id,
            "start_time": start_time,
            "duration": duration,
            "tracking": tracking_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Visual reframing analysis failed: {str(e)}")

@router.get("/clip/{clip_id}")
def get_clip_reframing_config(clip_id: str):
    """
    Retrieves the stored reframing configuration for a specific clip.
    If none exists, executes quick CV detection and stores default reframing.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM generated_clips WHERE id = ?;", (clip_id,))
    clip_row = cur.fetchone()

    if not clip_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Clip not found")

    clip = dict(clip_row)
    reframing_cfg = {}
    if clip.get("reframing_config"):
        try:
            reframing_cfg = json.loads(clip["reframing_config"])
        except Exception:
            pass

    if not reframing_cfg or not reframing_cfg.get("crop_box"):
        # Compute fresh tracking
        video_path = resolve_source_video_path(clip_id, clip["project_id"], None)
        tracking_result = video_reframer.analyze_subject_tracking(
            video_path=video_path or "/tmp/dummy.mp4",
            start_time=float(clip["start_time"] or 0.0),
            duration=float(clip["duration_seconds"] or 30.0),
            quality_mode="smart"
        )
        reframing_cfg = tracking_result

        # Save to DB
        with conn:
            conn.execute("""
                UPDATE generated_clips SET
                    reframing_config = ?,
                    updated_at = datetime('now')
                WHERE id = ?;
            """, (json.dumps(reframing_cfg), clip_id))

    conn.close()
    return {
        "clip_id": clip_id,
        "reframing_config": reframing_cfg
    }

@router.patch("/clip/{clip_id}")
def update_clip_reframing_config(clip_id: str, payload: ReframingUpdateRequest):
    """
    Updates the reframing and tracking configuration for a clip,
    re-computes the FFmpeg filtergraph, and updates the vertical video preview.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM generated_clips WHERE id = ?;", (clip_id,))
    clip_row = cur.fetchone()

    if not clip_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Clip not found")

    clip = dict(clip_row)
    video_path = resolve_source_video_path(clip_id, clip["project_id"], None)

    # Compute crop filter for updated configuration
    crop_filter, crop_box = video_reframer.compute_crop_filter(
        source_width=1920,
        source_height=1080,
        center_x_ratio=payload.center_x_ratio or 0.5,
        center_y_ratio=payload.center_y_ratio or 0.35,
        crop_mode=payload.mode,
        zoom_scale=payload.zoom_scale or 1.0,
        split_speaker1_x=payload.speaker1_x_ratio or 0.28,
        split_speaker2_x=payload.speaker2_x_ratio or 0.72
    )

    reframing_cfg = {
        "mode": payload.mode,
        "quality_mode": payload.quality_mode,
        "center_x_ratio": payload.center_x_ratio,
        "center_y_ratio": payload.center_y_ratio,
        "zoom_scale": payload.zoom_scale,
        "smoothness": payload.smoothness,
        "safe_headroom": payload.safe_headroom,
        "split_layout": payload.split_layout,
        "split_divider_color": payload.split_divider_color,
        "speaker1_x_ratio": payload.speaker1_x_ratio,
        "speaker2_x_ratio": payload.speaker2_x_ratio,
        "crop_box": crop_box,
        "filter_string": crop_filter
    }

    # If source video exists, re-cut the vertical preview with new framing
    if video_path and os.path.exists(video_path):
        preview_filename = f"{clip_id}_reframed.mp4"
        preview_path = os.path.join(settings.MEDIA_STORAGE_DIR, "clips", preview_filename)
        ffmpeg_service.cut_clip_preview(
            input_path=video_path,
            output_path=preview_path,
            start_time=float(clip["start_time"] or 0.0),
            duration=float(clip["duration_seconds"] or 30.0),
            vertical_crop=True,
            custom_vf=crop_filter if not crop_filter.startswith("[0:v]") else None
        )
        if os.path.exists(preview_path):
            clip["video_url"] = f"/media/clips/{preview_filename}"

    with conn:
        conn.execute("""
            UPDATE generated_clips SET
                reframing_config = ?,
                video_url = ?,
                is_edited = 1,
                updated_at = datetime('now')
            WHERE id = ?;
        """, (json.dumps(reframing_cfg), clip.get("video_url"), clip_id))

    conn.close()

    return {
        "status": "success",
        "clip_id": clip_id,
        "reframing_config": reframing_cfg,
        "video_url": clip.get("video_url")
    }

