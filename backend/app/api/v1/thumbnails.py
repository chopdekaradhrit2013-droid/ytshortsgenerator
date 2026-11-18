import os
import uuid
import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel

from backend.app.core.config import settings
from backend.app.core.database import get_db_connection
from backend.app.models.schemas import (
    ExtractFramesRequest,
    SuggestThumbnailTextRequest,
    RenderThumbnailRequest,
    AnalyzeThumbnailQualityRequest,
    ThumbnailDesignSaveRequest,
    ThumbnailTemplateSaveRequest,
    ApplyThumbnailToClipRequest
)
from backend.app.services.thumbnail_studio import (
    extract_candidate_thumbnail_frames,
    generate_ai_thumbnail_text_suggestions,
    render_thumbnail_composite,
    analyze_thumbnail_quality,
    list_thumbnail_templates,
    save_thumbnail_template,
    list_thumbnail_designs,
    get_thumbnail_design,
    save_or_update_thumbnail_design,
    delete_thumbnail_design,
    duplicate_thumbnail_design,
    toggle_favorite_thumbnail_design,
    THUMBNAIL_STORAGE_DIR
)

router = APIRouter(prefix="/thumbnails", tags=["thumbnails"])


@router.post("/extract-frames")
def extract_frames_endpoint(payload: ExtractFramesRequest):
    """
    Extract candidate thumbnail moments from a video file or clip.
    If clip_id is provided, automatically locates the source video and clip range.
    """
    video_path = payload.video_path
    start_time = payload.start_time
    duration = payload.duration

    # If clip_id provided, resolve from database
    if payload.clip_id:
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT c.id, c.start_time, c.duration_seconds, c.source_video_id, sv.storage_path
                FROM generated_clips c
                LEFT JOIN source_videos sv ON c.source_video_id = sv.id
                WHERE c.id = ?;
            """, (payload.clip_id,))
            clip_row = cur.fetchone()
            if clip_row:
                start_time = float(clip_row["start_time"] or 0.0)
                duration = float(clip_row["duration_seconds"] or 15.0)
                if clip_row["storage_path"] and os.path.exists(clip_row["storage_path"]):
                    video_path = clip_row["storage_path"]
        finally:
            conn.close()

    # Fallback to sample or first video in media storage
    if not video_path or not os.path.exists(video_path):
        sample_path = os.path.join(settings.MEDIA_STORAGE_DIR, "sample_podcast.mp4")
        if os.path.exists(sample_path):
            video_path = sample_path
        else:
            # Look for any mp4 in media storage
            for root, _, files in os.walk(settings.MEDIA_STORAGE_DIR):
                for f in files:
                    if f.endswith(".mp4"):
                        video_path = os.path.join(root, f)
                        break
                if video_path and os.path.exists(video_path):
                    break

    if not video_path or not os.path.exists(video_path):
        raise HTTPException(
            status_code=404,
            detail=f"Source video file not found. Please upload or process a video first."
        )

    try:
        candidates = extract_candidate_thumbnail_frames(
            video_path=video_path,
            start_time=start_time,
            duration=duration,
            count=payload.count,
            clip_id=payload.clip_id
        )
        return {
            "status": "success",
            "count": len(candidates),
            "video_path": video_path,
            "candidates": candidates
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract candidate frames: {str(e)}")


@router.post("/suggest-text")
def suggest_text_endpoint(payload: SuggestThumbnailTextRequest):
    """
    Generates high-CTR, punchy 2-5 word thumbnail text hook suggestions
    based on the video title, hook, and transcript.
    """
    suggestions = generate_ai_thumbnail_text_suggestions(
        title=payload.title or "",
        hook=payload.hook or "",
        transcript=payload.transcript or "",
        niche=payload.niche or "general",
        count=payload.count
    )
    return {
        "status": "success",
        "suggestions": suggestions
    }


@router.post("/render")
def render_thumbnail_endpoint(payload: RenderThumbnailRequest):
    """
    Renders high-resolution composite thumbnail with text layers,
    arrows, stickers, and color grading.
    """
    base_path = payload.base_image_path
    if base_path and base_path.startswith("/media/"):
        # Convert relative media url to absolute path
        rel = base_path.replace("/media/", "")
        base_path = os.path.join(settings.MEDIA_STORAGE_DIR, rel)

    try:
        out_path, img_url = render_thumbnail_composite(
            base_image_path=base_path,
            canvas_data=payload.canvas_data,
            output_filename=payload.output_filename,
            aspect_ratio=payload.aspect_ratio,
            width=payload.width,
            height=payload.height
        )
        return {
            "status": "success",
            "output_path": out_path,
            "image_url": img_url,
            "aspect_ratio": payload.aspect_ratio,
            "width": payload.width or (1080 if payload.aspect_ratio == "9:16" else 1280),
            "height": payload.height or (1920 if payload.aspect_ratio == "9:16" else 720)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render thumbnail composite: {str(e)}")


@router.post("/analyze-quality")
def analyze_quality_endpoint(payload: AnalyzeThumbnailQualityRequest):
    """
    Runs quality check on rendered thumbnail (readability, contrast,
    clarity, subject visibility, visual clutter, text brevity).
    """
    image_path = payload.image_path
    if not image_path and payload.image_url:
        rel = payload.image_url.replace("/media/", "")
        image_path = os.path.join(settings.MEDIA_STORAGE_DIR, rel)

    if not image_path or not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Thumbnail image file not found on disk.")

    try:
        report = analyze_thumbnail_quality(
            image_path=image_path,
            canvas_data=payload.canvas_data,
            context_title=payload.context_title or "",
            context_transcript=payload.context_transcript or ""
        )
        return {
            "status": "success",
            "quality": report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quality analysis failed: {str(e)}")


# -----------------------------------------------------------------------------
# TEMPLATES ENDPOINTS
# -----------------------------------------------------------------------------

@router.get("/templates")
def get_templates_endpoint(category: Optional[str] = Query(None)):
    """List built-in and user-saved thumbnail templates."""
    templates = list_thumbnail_templates(category=category)
    return {
        "status": "success",
        "count": len(templates),
        "templates": templates
    }


@router.post("/templates")
def save_template_endpoint(payload: ThumbnailTemplateSaveRequest):
    """Save a custom user template."""
    try:
        res = save_thumbnail_template(payload.dict(exclude_unset=True))
        return {
            "status": "success",
            "template": res
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save template: {str(e)}")


# -----------------------------------------------------------------------------
# DESIGNS & LIBRARY ENDPOINTS
# -----------------------------------------------------------------------------

@router.get("/designs")
def get_designs_endpoint(
    project_id: Optional[str] = Query(None),
    clip_id: Optional[str] = Query(None),
    favorites_only: bool = Query(False)
):
    """List saved thumbnail designs in library."""
    designs = list_thumbnail_designs(
        project_id=project_id,
        clip_id=clip_id,
        favorites_only=favorites_only
    )
    return {
        "status": "success",
        "count": len(designs),
        "designs": designs
    }


@router.post("/designs")
def save_design_endpoint(payload: ThumbnailDesignSaveRequest):
    """Save or update a thumbnail design."""
    try:
        res = save_or_update_thumbnail_design(payload.dict(exclude_unset=True))
        return {
            "status": "success",
            "design": res
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save design: {str(e)}")


@router.get("/designs/{design_id}")
def get_single_design_endpoint(design_id: str):
    """Retrieve single thumbnail design."""
    design = get_thumbnail_design(design_id)
    if not design:
        raise HTTPException(status_code=404, detail="Thumbnail design not found.")
    return {
        "status": "success",
        "design": design
    }


@router.put("/designs/{design_id}")
def update_design_endpoint(design_id: str, payload: ThumbnailDesignSaveRequest):
    """Update thumbnail design."""
    existing = get_thumbnail_design(design_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Thumbnail design not found.")
    data = payload.dict(exclude_unset=True)
    data["id"] = design_id
    updated = save_or_update_thumbnail_design(data)
    return {
        "status": "success",
        "design": updated
    }


@router.delete("/designs/{design_id}")
def delete_design_endpoint(design_id: str):
    """Delete a thumbnail design."""
    success = delete_thumbnail_design(design_id)
    return {
        "status": "success",
        "deleted": success,
        "design_id": design_id
    }


@router.post("/designs/{design_id}/duplicate")
def duplicate_design_endpoint(design_id: str):
    """Duplicate an existing thumbnail design."""
    duplicated = duplicate_thumbnail_design(design_id)
    if not duplicated:
        raise HTTPException(status_code=404, detail="Original thumbnail design not found.")
    return {
        "status": "success",
        "design": duplicated
    }


@router.patch("/designs/{design_id}/favorite")
def favorite_design_endpoint(design_id: str):
    """Toggle favorite status of a thumbnail design."""
    updated = toggle_favorite_thumbnail_design(design_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Thumbnail design not found.")
    return {
        "status": "success",
        "design": updated
    }


@router.post("/apply-to-clip/{clip_id}")
def apply_thumbnail_to_clip_endpoint(clip_id: str, payload: ApplyThumbnailToClipRequest):
    """
    Applies the customized rendered thumbnail to a generated clip
    and updates the associated publishing job if ready.
    """
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM generated_clips WHERE id = ?;", (clip_id,))
        clip = cur.fetchone()
        if not clip:
            raise HTTPException(status_code=404, detail="Generated clip not found.")

        cur.execute("""
            UPDATE generated_clips
            SET thumbnail_url = ?, thumbnail_design_id = ?, updated_at = datetime('now')
            WHERE id = ?;
        """, (payload.rendered_image_url, payload.design_id, clip_id))

        # Also update any publishing job tied to this clip
        cur.execute("""
            UPDATE publishing_jobs
            SET thumbnail_url = ?, updated_at = datetime('now')
            WHERE clip_id = ?;
        """, (payload.rendered_image_url, clip_id))

        conn.commit()
        return {
            "status": "success",
            "clip_id": clip_id,
            "thumbnail_url": payload.rendered_image_url,
            "design_id": payload.design_id
        }
    finally:
        conn.close()


@router.post("/upload-asset")
async def upload_thumbnail_asset_endpoint(file: UploadFile = File(...)):
    """Upload custom background or sticker/graphic asset."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Empty filename provided.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Unsupported image format. Please upload JPG, PNG, or WebP.")

    asset_id = f"asset_{uuid.uuid4().hex[:8]}"
    saved_filename = f"{asset_id}{ext}"
    uploads_dir = os.path.join(THUMBNAIL_STORAGE_DIR, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    dest_path = os.path.join(uploads_dir, saved_filename)

    content = await file.read()
    with open(dest_path, "wb") as f:
        f.write(content)

    return {
        "status": "success",
        "asset_id": asset_id,
        "image_url": f"/media/thumbnails/uploads/{saved_filename}",
        "file_path": dest_path
    }

