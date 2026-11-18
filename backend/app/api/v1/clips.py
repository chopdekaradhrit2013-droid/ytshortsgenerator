import os
import uuid
import json
import zipfile
import threading
from io import BytesIO
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection
from backend.app.models.schemas import (
    GeneratedClipResponse,
    GeneratedClipUpdate,
    ClipCaptionsResponse,
    ClipCaptionsUpdate,
    ClipCaptionsRegenerateRequest,
    CaptionSegment,
    BulkClipsActionRequest,
    BulkClipsActionResponse
)
from backend.app.services.hook_service import hook_service
from backend.app.services.caption_generator import caption_generator
from backend.app.services.whisper_service import whisper_service
from backend.app.services.export_manager import export_manager

router = APIRouter()

def ensure_default_clips():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM generated_clips;")
    count = cur.fetchone()[0]
    if count == 0:
        with conn:
            conn.execute("""
                INSERT INTO generated_clips (
                    id, project_id, source_video_id, title, summary,
                    hook_sentence, start_time, end_time, duration_seconds,
                    engagement_score, virality_reasons, tags, aspect_ratio,
                    resolution_width, resolution_height, video_url, thumbnail_url,
                    captions_style, status, created_at, updated_at
                ) VALUES 
                ('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 's1', 'The Secret AGI Timeline Nobody Speaks About', 'Reveals inside predictions from top lab researchers on superintelligence horizons.', 'Most people think AGI is 20 years away. Here is what is actually happening behind closed doors.', 142.5, 188.0, 45.5, 96, '["Contrarian insider perspective with high urgency", "High pace, zero dead air in first 5 seconds", "Strong retention graph prediction (top 5% tier)"]', '["AGI", "AISecrets", "TechTrends", "Shorts"]', '9:16', 1080, 1920, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80', '{"fontFamily": "Inter", "color": "#FFFFFF", "highlightColor": "#FACC15"}', 'ready', datetime('now', '-12 hours'), datetime('now')),
                ('c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 's1', 'Why 99% Of Coding Jobs Will Evolve Into Architecture', 'Discusses how prompt engineering and agent orchestration replace repetitive coding syntax.', 'If you are only writing syntax, you are missing the biggest shift in computing history.', 410.0, 452.2, 42.2, 92, '["Direct address to massive developer audience", "Clear actionable takeaway", "Sparked intense debate in transcript"]', '["Coding", "SoftwareEngineering", "FutureOfWork"]', '9:16', 1080, 1920, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80', '{"fontFamily": "Inter", "color": "#FFFFFF", "highlightColor": "#38BDF8"}', 'ready', datetime('now', '-10 hours'), datetime('now')),
                ('c3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 's3', 'The $10K/Month YouTube Shorts Framework', 'Step-by-step framework used by top creators to monetize high-retention short videos.', 'Stop posting random clips. This 3-part framework turns views into predictable revenue.', 820.0, 868.5, 48.5, 89, '["Quantifiable value proposition in title", "High viewer retention hook", "Clear bullet points that retain viewer attention"]', '["Monetization", "YouTubeGrowth", "CreatorEconomy"]', '9:16', 1080, 1920, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80', '{"fontFamily": "Inter", "color": "#FFFFFF", "highlightColor": "#A855F7"}', 'ready', datetime('now', '-1 day'), datetime('now'));
            """)
    conn.close()

ensure_default_clips()

@router.get("", response_model=List[GeneratedClipResponse])
def list_clips(project_id: Optional[str] = Query(None)):
    conn = get_db_connection()
    cur = conn.cursor()
    if project_id:
        cur.execute("SELECT * FROM generated_clips WHERE project_id = ? ORDER BY start_time ASC;", (project_id,))
    else:
        cur.execute("SELECT * FROM generated_clips ORDER BY created_at DESC;")
    rows = cur.fetchall()
    conn.close()

    result = []
    for r in rows:
        c = dict(r)
        c["virality_reasons"] = json.loads(c["virality_reasons"]) if c.get("virality_reasons") else []
        c["tags"] = json.loads(c["tags"]) if c.get("tags") else []
        c["captions_style"] = json.loads(c["captions_style"]) if c.get("captions_style") else {}
        for json_field in ["alternative_hooks", "speaker_analysis", "context_analysis", "explanation_breakdown", "similarity_info", "hook_suggestions", "reframing_config"]:
            if c.get(json_field) and isinstance(c[json_field], str):
                try:
                    c[json_field] = json.loads(c[json_field])
                except Exception:
                    pass
        c["is_duplicate_or_similar"] = bool(c.get("is_duplicate_or_similar", 0))
        c["export_with_captions"] = bool(c.get("export_with_captions", True))
        c["is_edited"] = bool(c.get("is_edited", 0))
        c["created_at"] = datetime.fromisoformat(c["created_at"]) if "T" in c["created_at"] else datetime.strptime(c["created_at"], "%Y-%m-%d %H:%M:%S")
        c["updated_at"] = datetime.fromisoformat(c["updated_at"]) if "T" in c["updated_at"] else datetime.strptime(c["updated_at"], "%Y-%m-%d %H:%M:%S")
        result.append(c)
    return result

@router.get("/export-zip/download")
def download_clips_zip(
    project_id: Optional[str] = Query(None),
    clip_ids: Optional[str] = Query(None)
):
    """
    Bulk downloads rendered YouTube Shorts bundled into a ZIP archive.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    if clip_ids:
        id_list = [i.strip() for i in clip_ids.split(",") if i.strip()]
        placeholders = ",".join(["?"] * len(id_list))
        cur.execute(f"SELECT * FROM generated_clips WHERE id IN ({placeholders});", id_list)
    elif project_id:
        cur.execute("SELECT * FROM generated_clips WHERE project_id = ?;", (project_id,))
    else:
        cur.execute("SELECT * FROM generated_clips LIMIT 20;")

    rows = cur.fetchall()
    conn.close()

    if not rows:
        raise HTTPException(status_code=404, detail="No clips available for bulk ZIP export")

    zip_buffer = BytesIO()
    added_count = 0

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for idx, r in enumerate(rows):
            clip = dict(r)
            url_target = clip.get("export_video_url") or clip.get("video_url")
            if not url_target:
                continue

            rel_path = url_target.replace("/media/", "")
            local_path = os.path.join(settings.MEDIA_STORAGE_DIR, rel_path)

            if os.path.exists(local_path):
                clean_title = "".join(c for c in clip["title"] if c.isalnum() or c in (" ", "_", "-")).strip()
                arcname = f"Short_{idx+1:02d}_{clean_title[:30]}.mp4"
                zf.write(local_path, arcname=arcname)
                added_count += 1

    if added_count == 0:
        raise HTTPException(status_code=404, detail="No rendered media files found to package into ZIP")

    zip_buffer.seek(0)
    zip_filename = f"AI_Shorts_{project_id[:8] if project_id else 'Export'}.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={zip_filename}"}
    )

@router.post("/bulk-delete", response_model=BulkClipsActionResponse)
def bulk_delete_clips(payload: BulkClipsActionRequest):
    """
    Deletes multiple selected shorts in a single atomic transaction.
    """
    if not payload.clip_ids:
        return BulkClipsActionResponse(success=True, affected_count=0, message="No clips provided for deletion")

    conn = get_db_connection()
    placeholders = ",".join(["?"] * len(payload.clip_ids))
    with conn:
        conn.execute(f"DELETE FROM generated_clips WHERE id IN ({placeholders});", payload.clip_ids)
    conn.close()

    return BulkClipsActionResponse(
        success=True,
        affected_count=len(payload.clip_ids),
        message=f"Successfully deleted {len(payload.clip_ids)} clips"
    )

@router.post("/bulk-export", response_model=BulkClipsActionResponse)
def bulk_export_clips(payload: BulkClipsActionRequest):
    """
    Initiates background 1080x1920 Full HD rendering for all selected clips.
    """
    if not payload.clip_ids:
        return BulkClipsActionResponse(success=True, affected_count=0, message="No clips selected for export", job_ids=[])

    conn = get_db_connection()
    placeholders = ",".join(["?"] * len(payload.clip_ids))
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM generated_clips WHERE id IN ({placeholders});", payload.clip_ids)
    clips = [dict(r) for r in cur.fetchall()]

    job_ids = []
    for clip in clips:
        # Resolve source video path
        cur.execute("""
            SELECT storage_path FROM source_videos 
            WHERE project_id = ? ORDER BY created_at DESC LIMIT 1;
        """, (clip["project_id"],))
        sv_row = cur.fetchone()
        source_path = sv_row["storage_path"] if sv_row else None

        if not source_path or not os.path.exists(source_path):
            sample_candidate = os.path.join(settings.MEDIA_STORAGE_DIR, "uploads", "test_sample.mp4")
            if os.path.exists(sample_candidate):
                source_path = sample_candidate

        job = export_manager.create_export_job(
            project_id=clip["project_id"],
            clip_id=clip["id"],
            config={
                "caption_preset": clip.get("caption_preset", "bold_pop"),
                "export_with_captions": bool(clip.get("export_with_captions", True)),
                "position": clip.get("caption_placement", "auto")
            }
        )
        job_ids.append(job["id"])

        if source_path and os.path.exists(source_path):
            thread = threading.Thread(
                target=export_manager.run_export_pipeline,
                kwargs={
                    "job_id": job["id"],
                    "project_id": clip["project_id"],
                    "clip_id": clip["id"],
                    "source_video_path": source_path,
                    "start_time": clip["start_time"],
                    "duration": clip["duration_seconds"],
                    "config": {
                        "caption_preset": clip.get("caption_preset", "bold_pop"),
                        "export_with_captions": bool(clip.get("export_with_captions", True)),
                        "position": clip.get("caption_placement", "auto")
                    }
                },
                daemon=True
            )
            thread.start()

    conn.close()

    return BulkClipsActionResponse(
        success=True,
        affected_count=len(job_ids),
        message=f"Queued rendering for {len(job_ids)} clips",
        job_ids=job_ids
    )

@router.get("/{clip_id}", response_model=GeneratedClipResponse)
def get_clip(clip_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM generated_clips WHERE id = ?;", (clip_id,))
    row = cur.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Clip not found")

    c = dict(row)
    c["virality_reasons"] = json.loads(c["virality_reasons"]) if c.get("virality_reasons") else []
    c["tags"] = json.loads(c["tags"]) if c.get("tags") else []
    c["captions_style"] = json.loads(c["captions_style"]) if c.get("captions_style") else {}
    for json_field in ["alternative_hooks", "speaker_analysis", "context_analysis", "explanation_breakdown", "similarity_info", "hook_suggestions", "reframing_config"]:
        if c.get(json_field) and isinstance(c[json_field], str):
            try:
                c[json_field] = json.loads(c[json_field])
            except Exception:
                pass
    c["is_duplicate_or_similar"] = bool(c.get("is_duplicate_or_similar", 0))
    c["export_with_captions"] = bool(c.get("export_with_captions", True))
    c["is_edited"] = bool(c.get("is_edited", 0))
    c["created_at"] = datetime.fromisoformat(c["created_at"]) if "T" in c["created_at"] else datetime.strptime(c["created_at"], "%Y-%m-%d %H:%M:%S")
    c["updated_at"] = datetime.fromisoformat(c["updated_at"]) if "T" in c["updated_at"] else datetime.strptime(c["updated_at"], "%Y-%m-%d %H:%M:%S")
    return c

@router.patch("/{clip_id}", response_model=GeneratedClipResponse)
def update_clip(clip_id: str, payload: GeneratedClipUpdate):
    conn = get_db_connection()
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        return get_clip(clip_id)

    set_clauses = []
    params = []
    for k, v in update_data.items():
        if k == "captions_style":
            set_clauses.append("captions_style = ?")
            params.append(json.dumps(v))
        else:
            set_clauses.append(f"{k} = ?")
            params.append(v)

    if "aspect_ratio" in update_data:
        ar = update_data["aspect_ratio"]
        if ar == "9:16":
            set_clauses.extend(["resolution_width = ?", "resolution_height = ?"])
            params.extend([1080, 1920])
        elif ar == "1:1":
            set_clauses.extend(["resolution_width = ?", "resolution_height = ?"])
            params.extend([1080, 1080])
        elif ar == "16:9":
            set_clauses.extend(["resolution_width = ?", "resolution_height = ?"])
            params.extend([1920, 1080])

    if "start_time" in update_data and "end_time" in update_data:
        set_clauses.append("duration_seconds = ?")
        params.append(round(update_data["end_time"] - update_data["start_time"], 2))

    if "is_edited" not in update_data:
        set_clauses.append("is_edited = 1")

    set_clauses.append("updated_at = datetime('now')")
    params.append(clip_id)

    with conn:
        conn.execute(f"UPDATE generated_clips SET {', '.join(set_clauses)} WHERE id = ?;", params)
    conn.close()

    return get_clip(clip_id)

@router.delete("/{clip_id}")
def delete_clip(clip_id: str):
    conn = get_db_connection()
    with conn:
        conn.execute("DELETE FROM generated_clips WHERE id = ?;", (clip_id,))
    conn.close()
    return {"status": "deleted", "id": clip_id}

@router.get("/{clip_id}/hooks")
def get_clip_hooks(clip_id: str):
    """
    Returns 3 AI-generated opening hook suggestions derived from the clip content.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM generated_clips WHERE id = ?;", (clip_id,))
    row = cur.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Clip not found")

    clip = dict(row)
    hooks = hook_service.generate_hooks_for_clip(
        title=clip.get("title", ""),
        summary=clip.get("summary", ""),
        transcript_snippet=clip.get("hook_sentence", ""),
        category="general"
    )

    return {
        "clip_id": clip_id,
        "hooks": hooks,
        "selected_hook": clip.get("selected_hook") or hooks[0]["text"]
    }

@router.get("/{clip_id}/download")
def download_clip_video(clip_id: str):
    """
    Direct MP4 download for a rendered Short.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM generated_clips WHERE id = ?;", (clip_id,))
    row = cur.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Clip not found")

    clip = dict(row)
    url_target = clip.get("export_video_url") or clip.get("video_url")
    if not url_target:
        raise HTTPException(status_code=404, detail="Video file not found for this clip")

    # Resolve local path
    rel_path = url_target.replace("/media/", "")
    local_path = os.path.join(settings.MEDIA_STORAGE_DIR, rel_path)

    if not os.path.exists(local_path):
        raise HTTPException(status_code=404, detail="Rendered video file is missing on server")

    clean_title = "".join(c for c in clip["title"] if c.isalnum() or c in (" ", "_", "-")).rstrip()
    download_filename = f"{clean_title or 'Short'}.mp4"

    return FileResponse(
        path=local_path,
        media_type="video/mp4",
        filename=download_filename
    )

@router.get("/{clip_id}/captions", response_model=ClipCaptionsResponse)
def get_clip_captions(clip_id: str):
    """
    Retrieves word-level timestamped subtitle segments and styling for a clip.
    Auto-populates from transcription or speech analysis if not previously saved.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM generated_clips WHERE id = ?;", (clip_id,))
    clip_row = cur.fetchone()

    if not clip_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Clip not found")

    clip = dict(clip_row)
    start_time = float(clip.get("start_time", 0.0))
    duration = float(clip.get("duration_seconds", 30.0))
    language = clip.get("caption_language") or "en"
    preset = clip.get("caption_preset") or "bold_pop"
    placement = clip.get("caption_placement") or "auto"
    export_with_captions = bool(clip.get("export_with_captions", True))

    custom_overrides = {}
    if clip.get("captions_style"):
        try:
            custom_overrides = json.loads(clip["captions_style"]) if isinstance(clip["captions_style"], str) else clip["captions_style"]
        except Exception:
            custom_overrides = {}

    segments = []
    if clip.get("captions_data"):
        try:
            parsed = json.loads(clip["captions_data"]) if isinstance(clip["captions_data"], str) else clip["captions_data"]
            if parsed and isinstance(parsed, list):
                segments = parsed
        except Exception:
            segments = []

    if not segments:
        # Check source video transcription
        cur.execute("""
            SELECT words_data FROM transcriptions 
            WHERE source_video_id = ? OR source_video_id IN (
                SELECT source_video_id FROM generated_clips WHERE id = ?
            ) ORDER BY created_at DESC LIMIT 1;
        """, (clip.get("source_video_id", ""), clip_id))
        trans_row = cur.fetchone()

        raw_words = []
        if trans_row and trans_row["words_data"]:
            try:
                raw_words = json.loads(trans_row["words_data"])
            except Exception:
                raw_words = []

        if raw_words:
            segments = caption_generator.words_to_editable_segments(
                words=raw_words,
                clip_start=start_time,
                clip_duration=duration,
                words_per_line=custom_overrides.get("words_per_line", 4)
            )

        if not segments:
            # Fallback to speech synthesizer for this clip snippet
            source_video_path = None
            if clip.get("source_video_id"):
                cur.execute("SELECT storage_path FROM source_videos WHERE id = ?;", (clip["source_video_id"],))
                sv_row = cur.fetchone()
                if sv_row and sv_row["storage_path"]:
                    source_video_path = sv_row["storage_path"]

            synth_words = whisper_service.transcribe_clip_audio(
                video_path=source_video_path,
                start_time=start_time,
                duration=duration,
                language=language
            )
            segments = caption_generator.words_to_editable_segments(
                words=synth_words,
                clip_start=0.0,
                clip_duration=duration,
                words_per_line=custom_overrides.get("words_per_line", 4)
            )

        # Cache segments in DB for fast future loads
        with conn:
            conn.execute(
                "UPDATE generated_clips SET captions_data = ?, updated_at = datetime('now') WHERE id = ?;",
                (json.dumps(segments), clip_id)
            )

    conn.close()

    return {
        "clip_id": clip_id,
        "language": language,
        "caption_preset": preset,
        "caption_placement": placement,
        "export_with_captions": export_with_captions,
        "custom_overrides": custom_overrides,
        "segments": segments
    }

@router.put("/{clip_id}/captions", response_model=ClipCaptionsResponse)
def update_clip_captions(clip_id: str, payload: ClipCaptionsUpdate):
    """
    Updates manual subtitle segments, font styling, position, and export toggles for a clip.
    Re-generates the local .ass preview script.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM generated_clips WHERE id = ?;", (clip_id,))
    clip_row = cur.fetchone()

    if not clip_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Clip not found")

    clip = dict(clip_row)
    duration = float(clip.get("duration_seconds", 30.0))

    set_clauses = ["updated_at = datetime('now')"]
    params = []

    if payload.segments is not None:
        segments_data = [s.model_dump() for s in payload.segments]
        set_clauses.append("captions_data = ?")
        params.append(json.dumps(segments_data))
    else:
        segments_data = json.loads(clip.get("captions_data") or "[]")

    if payload.caption_preset is not None:
        set_clauses.append("caption_preset = ?")
        params.append(payload.caption_preset)
        current_preset = payload.caption_preset
    else:
        current_preset = clip.get("caption_preset") or "bold_pop"

    if payload.caption_placement is not None:
        set_clauses.append("caption_placement = ?")
        params.append(payload.caption_placement)
        current_placement = payload.caption_placement
    else:
        current_placement = clip.get("caption_placement") or "auto"

    if payload.export_with_captions is not None:
        set_clauses.append("export_with_captions = ?")
        params.append(1 if payload.export_with_captions else 0)
        export_with_captions = payload.export_with_captions
    else:
        export_with_captions = bool(clip.get("export_with_captions", True))

    if payload.custom_overrides is not None:
        set_clauses.append("captions_style = ?")
        params.append(json.dumps(payload.custom_overrides))
        custom_overrides = payload.custom_overrides
    else:
        try:
            custom_overrides = json.loads(clip.get("captions_style") or "{}") if isinstance(clip.get("captions_style"), str) else (clip.get("captions_style") or {})
        except Exception:
            custom_overrides = {}

    params.append(clip_id)
    with conn:
        conn.execute(f"UPDATE generated_clips SET {', '.join(set_clauses)} WHERE id = ?;", params)
    conn.close()

    # Re-generate preview ASS subtitle file
    try:
        ass_path = os.path.join(settings.MEDIA_STORAGE_DIR, "captions", f"{clip_id}.ass")
        overrides_with_placement = dict(custom_overrides)
        if current_placement:
            overrides_with_placement["position"] = current_placement
        caption_generator.generate_ass_script_from_segments(
            segments=segments_data,
            clip_duration=duration,
            output_ass_path=ass_path,
            preset=current_preset,
            custom_overrides=overrides_with_placement
        )
    except Exception as e:
        print(f"[Captions ASS Generate Warning] {e}")

    return {
        "clip_id": clip_id,
        "language": clip.get("caption_language") or "en",
        "caption_preset": current_preset,
        "caption_placement": current_placement,
        "export_with_captions": export_with_captions,
        "custom_overrides": custom_overrides,
        "segments": segments_data
    }

@router.post("/{clip_id}/captions/regenerate", response_model=ClipCaptionsResponse)
def regenerate_clip_captions(clip_id: str, payload: ClipCaptionsRegenerateRequest):
    """
    Re-transcribes or re-synthesizes captions for a clip in a specified language
    (supports English and Indian languages: Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Punjabi).
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM generated_clips WHERE id = ?;", (clip_id,))
    clip_row = cur.fetchone()

    if not clip_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Clip not found")

    clip = dict(clip_row)
    start_time = float(clip.get("start_time", 0.0))
    duration = float(clip.get("duration_seconds", 30.0))
    preset = clip.get("caption_preset") or "bold_pop"
    placement = clip.get("caption_placement") or "auto"
    export_with_captions = bool(clip.get("export_with_captions", True))

    source_video_path = None
    if clip.get("source_video_id"):
        cur.execute("SELECT storage_path FROM source_videos WHERE id = ?;", (clip["source_video_id"],))
        sv_row = cur.fetchone()
        if sv_row and sv_row["storage_path"]:
            source_video_path = sv_row["storage_path"]

    words = whisper_service.transcribe_clip_audio(
        video_path=source_video_path,
        start_time=start_time,
        duration=duration,
        language=payload.language
    )

    segments = caption_generator.words_to_editable_segments(
        words=words,
        clip_start=0.0,
        clip_duration=duration,
        words_per_line=payload.words_per_line or 4
    )

    try:
        custom_overrides = json.loads(clip.get("captions_style") or "{}") if isinstance(clip.get("captions_style"), str) else (clip.get("captions_style") or {})
    except Exception:
        custom_overrides = {}

    with conn:
        conn.execute("""
            UPDATE generated_clips SET
                captions_data = ?,
                caption_language = ?,
                updated_at = datetime('now')
            WHERE id = ?;
        """, (json.dumps(segments), payload.language, clip_id))
    conn.close()

    # Re-generate ASS file
    try:
        ass_path = os.path.join(settings.MEDIA_STORAGE_DIR, "captions", f"{clip_id}.ass")
        overrides_with_placement = dict(custom_overrides)
        if placement:
            overrides_with_placement["position"] = placement
        caption_generator.generate_ass_script_from_segments(
            segments=segments,
            clip_duration=duration,
            output_ass_path=ass_path,
            preset=preset,
            custom_overrides=overrides_with_placement
        )
    except Exception as e:
        print(f"[Captions Regenerate ASS Warning] {e}")

    return {
        "clip_id": clip_id,
        "language": payload.language,
        "caption_preset": preset,
        "caption_placement": placement,
        "export_with_captions": export_with_captions,
        "custom_overrides": custom_overrides,
        "segments": segments
    }

