import os
import uuid
import json
import threading
import subprocess
from datetime import datetime
from typing import Dict, Any, Optional, List
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection
from backend.app.services.ffmpeg_service import ffmpeg_service
from backend.app.services.video_reframer import video_reframer
from backend.app.services.caption_generator import caption_generator
from backend.app.services.smart_zoom import smart_zoom_engine
from backend.app.services.audio_enhancer import audio_enhancer
from backend.app.services.hook_service import hook_service
from backend.app.services.quality_control import quality_control

ACTIVE_EXPORT_CANCELLATION_EVENTS: Dict[str, threading.Event] = {}

class ExportManager:
    """
    Production-grade background rendering engine.
    Orchestrates intelligent face reframing, active word-by-word ASS captions,
    smart dynamic zooming, broadcast audio loudnorm & BGM ducking,
    FFmpeg H.264 rendering, and automated Quality Control inspection.
    """

    def create_export_job(
        self,
        project_id: str,
        clip_id: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Creates a persistent rendering job in the SQLite export_jobs table.
        """
        job_id = f"exp_{uuid.uuid4().hex[:12]}"
        conn = get_db_connection()
        with conn:
            conn.execute("""
                INSERT INTO export_jobs (
                    id, project_id, clip_id, status, stage,
                    progress_percentage, duration_seconds, resolution, fps,
                    config, qc_report, error_message, created_at, updated_at
                ) VALUES (?, ?, ?, 'queued', 'preparing', 0, 0.0, '1080x1920', 30.0, ?, '{}', NULL, datetime('now'), datetime('now'));
            """, (job_id, project_id, clip_id, json.dumps(config or {})))

            # Mark clip export_status
            conn.execute("""
                UPDATE generated_clips SET
                    export_status = 'rendering',
                    editing_config = ?,
                    updated_at = datetime('now')
                WHERE id = ?;
            """, (json.dumps(config or {}), clip_id))

        conn.close()
        return self.get_export_job(job_id)

    def get_export_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves export job with parsed JSON fields.
        """
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM export_jobs WHERE id = ?;", (job_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None

        j = dict(row)
        for field in ["config", "qc_report"]:
            if j.get(field):
                try:
                    j[field] = json.loads(j[field])
                except Exception:
                    pass
        return j

    def list_export_jobs(self, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Returns list of export jobs.
        """
        conn = get_db_connection()
        cur = conn.cursor()
        if project_id:
            cur.execute("SELECT * FROM export_jobs WHERE project_id = ? ORDER BY created_at DESC;", (project_id,))
        else:
            cur.execute("SELECT * FROM export_jobs ORDER BY created_at DESC LIMIT 30;")
        rows = cur.fetchall()
        conn.close()

        results = []
        for r in rows:
            j = dict(r)
            for f in ["config", "qc_report"]:
                if j.get(f):
                    try:
                        j[f] = json.loads(j[f])
                    except Exception:
                        pass
            results.append(j)
        return results

    def cancel_export_job(self, job_id: str) -> bool:
        """
        Signals cancellation to in-flight render job.
        """
        if job_id in ACTIVE_EXPORT_CANCELLATION_EVENTS:
            ACTIVE_EXPORT_CANCELLATION_EVENTS[job_id].set()

        conn = get_db_connection()
        with conn:
            conn.execute("""
                UPDATE export_jobs SET
                    status = 'cancelled',
                    stage = 'cancelled',
                    error_message = 'Render cancelled by user',
                    updated_at = datetime('now')
                WHERE id = ?;
            """, (job_id,))
        conn.close()
        return True

    def run_export_pipeline(
        self,
        job_id: str,
        project_id: str,
        clip_id: str,
        source_video_path: str,
        start_time: float,
        duration: float,
        config: Optional[Dict[str, Any]] = None
    ):
        """
        Executes the full professional Shorts editing and export pipeline.
        Runs asynchronously in a background worker thread.
        """
        cfg = config or {}
        cancel_event = threading.Event()
        ACTIVE_EXPORT_CANCELLATION_EVENTS[job_id] = cancel_event

        def update_progress(stage: str, percentage: int, error: Optional[str] = None, qc: Optional[Dict] = None):
            conn = get_db_connection()
            with conn:
                status = 'failed' if error else ('completed' if stage == 'completed' else 'rendering')
                qc_json = json.dumps(qc) if qc else '{}'
                conn.execute("""
                    UPDATE export_jobs SET
                        status = ?,
                        stage = ?,
                        progress_percentage = ?,
                        error_message = ?,
                        qc_report = ?,
                        updated_at = datetime('now')
                    WHERE id = ?;
                """, (status, stage, percentage, error, qc_json, job_id))
            conn.close()

        ass_path = None
        temp_cut_path = None

        try:
            # -------------------------------------------------------------
            # STAGE 1: Preparing clip assets (10%)
            # -------------------------------------------------------------
            if cancel_event.is_set(): return
            update_progress('preparing', 10)

            export_id = f"short_{clip_id}_{uuid.uuid4().hex[:6]}"
            export_filename = f"{export_id}.mp4"
            export_thumb_filename = f"{export_id}_thumb.jpg"
            output_video_path = os.path.join(settings.MEDIA_STORAGE_DIR, "exports", export_filename)
            output_thumb_path = os.path.join(settings.MEDIA_STORAGE_DIR, "thumbnails", export_thumb_filename)

            # Retrieve words and transcripts for this project/video
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("""
                SELECT words_data, segments_data FROM transcriptions
                WHERE source_video_id IN (
                    SELECT id FROM source_videos WHERE project_id = ?
                ) ORDER BY created_at DESC LIMIT 1;
            """, (project_id,))
            trans_row = cur.fetchone()
            conn.close()

            clip_words = []
            if trans_row and trans_row["words_data"]:
                try:
                    clip_words = json.loads(trans_row["words_data"])
                except Exception:
                    pass

            # -------------------------------------------------------------
            # STAGE 2: Computer Vision Face & Subject Tracking (25%)
            # -------------------------------------------------------------
            if cancel_event.is_set(): return
            update_progress('tracking_subject', 25)

            source_probe = ffmpeg_service.probe_video(source_video_path)
            src_w = source_probe.get("width", 1920)
            src_h = source_probe.get("height", 1080)

            reframing_cfg = cfg.get("reframing_config") or cfg.get("reframing") or {}
            crop_mode = reframing_cfg.get("mode") or cfg.get("crop_mode", "auto")
            quality_mode = reframing_cfg.get("quality_mode", "smart")

            # Execute computer vision tracking analysis
            tracking_res = video_reframer.analyze_subject_tracking(
                video_path=source_video_path,
                start_time=start_time,
                duration=duration,
                quality_mode=quality_mode,
                manual_config=reframing_cfg
            )
            center_x_ratio = tracking_res.get("center_x_ratio", 0.5)
            center_y_ratio = tracking_res.get("center_y_ratio", 0.35)
            crop_filter = tracking_res.get("filter_string") or "crop=ih*9/16:ih:(iw-ow)/2:0,scale=1080:1920:flags=lanczos"
            crop_box = tracking_res.get("crop_box", {})

            # -------------------------------------------------------------
            # STAGE 3: Generating Timed ASS Captions & Hook (45%)
            # -------------------------------------------------------------
            if cancel_event.is_set(): return
            update_progress('generating_captions', 45)

            export_with_captions = cfg.get("export_with_captions", True)
            caption_preset = cfg.get("caption_preset", "bold_pop")
            hook_enabled = cfg.get("hook_enabled", True)
            hook_text = cfg.get("selected_hook", None)

            ass_path = None
            if export_with_captions:
                ass_path = os.path.join(settings.MEDIA_STORAGE_DIR, "captions", f"{export_id}.ass")
                # Check for manually edited segments in config or database
                manual_segments = cfg.get("captions_data")
                if not manual_segments:
                    conn_clip = get_db_connection()
                    cur_clip = conn_clip.cursor()
                    cur_clip.execute("SELECT captions_data FROM generated_clips WHERE id = ?;", (clip_id,))
                    c_row = cur_clip.fetchone()
                    conn_clip.close()
                    if c_row and c_row["captions_data"]:
                        try:
                            manual_segments = json.loads(c_row["captions_data"])
                        except Exception:
                            pass

                if manual_segments and len(manual_segments) > 0:
                    caption_generator.generate_ass_script_from_segments(
                        segments=manual_segments,
                        clip_duration=duration,
                        output_ass_path=ass_path,
                        preset=caption_preset,
                        custom_overrides=cfg.get("caption_overrides"),
                        face_center_y_ratio=center_y_ratio,
                        hook_text=hook_text if hook_enabled else None
                    )
                else:
                    caption_generator.generate_ass_script(
                        words=clip_words,
                        clip_start=start_time,
                        clip_duration=duration,
                        output_ass_path=ass_path,
                        preset=caption_preset,
                        custom_overrides=cfg.get("caption_overrides"),
                        face_center_y_ratio=center_y_ratio,
                        hook_text=hook_text if hook_enabled else None
                    )

            # -------------------------------------------------------------
            # STAGE 4: Smart Zoom & Audio Enhancement Graphs (60%)
            # -------------------------------------------------------------
            if cancel_event.is_set(): return
            update_progress('building_filtergraph', 60)

            zoom_intensity = cfg.get("zoom_intensity", "dynamic")
            zoom_filter = None
            if zoom_intensity != "none":
                zoom_moments = smart_zoom_engine.detect_zoom_moments(
                    words=clip_words,
                    clip_duration=duration,
                    intensity=zoom_intensity
                )
                zoom_filter = smart_zoom_engine.build_zoom_filter(zoom_moments)

            # Build video filter chain
            is_split_complex = crop_filter.startswith("[0:v]")
            post_crop_filters = []
            if zoom_filter:
                post_crop_filters.append(zoom_filter)
            if ass_path and os.path.exists(ass_path):
                escaped_ass = ass_path.replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
                post_crop_filters.append(f"ass='{escaped_ass}'")

            post_vf = ",".join(post_crop_filters) if post_crop_filters else None
            if is_split_complex:
                if post_vf:
                    video_complex = f"{crop_filter}[vsplit];[vsplit]{post_vf}[vout]"
                else:
                    video_complex = f"{crop_filter}[vout]"
            else:
                simple_chain = [crop_filter]
                if post_crop_filters:
                    simple_chain.extend(post_crop_filters)
                video_complex = f"[0:v]{','.join(simple_chain)}[vout]"

            # Audio graph: loudnorm, denoise, speech EQ, optional background music
            audio_enh_cfg = cfg.get("audio_enhancement", {})
            bgm_track = cfg.get("bgm_track", None)
            bgm_vol = cfg.get("bgm_volume", 0.14)
            speech_vol = cfg.get("speech_volume", 1.0)

            audio_spec = audio_enhancer.build_audio_filtergraph(
                clip_duration=duration,
                enable_loudnorm=audio_enh_cfg.get("loudnorm", True),
                enable_denoise=audio_enh_cfg.get("denoise", True),
                enable_speech_boost=audio_enh_cfg.get("speech_boost", True),
                speech_volume=speech_vol,
                bgm_track_name=bgm_track,
                bgm_volume=bgm_vol
            )

            # -------------------------------------------------------------
            # STAGE 5: FFmpeg H.264 Video Rendering (85%)
            # -------------------------------------------------------------
            if cancel_event.is_set(): return
            update_progress('rendering_h264', 85)

            cmd = [
                settings.FFMPEG_BIN,
                "-y",
                "-ss", str(start_time),
                "-t", str(duration),
                "-i", source_video_path
            ]

            if audio_spec["has_bgm"] and audio_spec["bgm_input_path"]:
                cmd.extend(["-stream_loop", "-1", "-i", audio_spec["bgm_input_path"]])
                cmd.extend([
                    "-filter_complex",
                    f"{video_complex};{audio_spec['filter_complex']}",
                    "-map", "[vout]",
                    "-map", audio_spec["output_map"]
                ])
            else:
                cmd.extend([
                    "-filter_complex",
                    video_complex,
                    "-map", "[vout]",
                    "-map", "0:a?",
                    "-af", audio_spec["filter_simple"]
                ])

            cmd.extend([
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "20",
                "-c:a", "aac",
                "-b:a", "192k",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                output_video_path
            ])

            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if res.returncode != 0:
                err_msg = res.stderr.decode("utf-8", errors="replace")
                update_progress('failed', 85, error=f"FFmpeg render error: {err_msg[:400]}")
                return

            # -------------------------------------------------------------
            # STAGE 6: Quality Control Verification (95%)
            # -------------------------------------------------------------
            if cancel_event.is_set(): return
            update_progress('quality_control', 95)

            qc_passed, qc_report, qc_err = quality_control.inspect_rendered_short(
                video_path=output_video_path,
                expected_duration=duration,
                require_audio=source_probe.get("has_audio", True)
            )

            if not qc_passed:
                update_progress('failed', 95, error=f"Quality Control failed: {qc_err}", qc=qc_report)
                return

            # -------------------------------------------------------------
            # STAGE 7: Thumbnail Extraction & Completion (100%)
            # -------------------------------------------------------------
            ffmpeg_service.generate_thumbnail(
                video_path=output_video_path,
                output_thumb_path=output_thumb_path,
                timestamp=min(1.5, duration * 0.5)
            )

            rel_video_url = f"/media/exports/{export_filename}"
            rel_thumb_url = f"/media/thumbnails/{export_thumb_filename}"

            conn = get_db_connection()
            with conn:
                conn.execute("""
                    UPDATE export_jobs SET
                        status = 'completed',
                        stage = 'completed',
                        progress_percentage = 100,
                        output_video_path = ?,
                        output_thumbnail_path = ?,
                        duration_seconds = ?,
                        qc_report = ?,
                        updated_at = datetime('now')
                    WHERE id = ?;
                """, (rel_video_url, rel_thumb_url, duration, json.dumps(qc_report), job_id))

                conn.execute("""
                    UPDATE generated_clips SET
                        export_status = 'exported',
                        export_video_url = ?,
                        thumbnail_url = ?,
                        video_url = ?,
                        editing_config = ?,
                        updated_at = datetime('now')
                    WHERE id = ?;
                """, (rel_video_url, rel_thumb_url, rel_video_url, json.dumps(cfg), clip_id))

            conn.close()

        except Exception as e:
            update_progress('failed', 50, error=f"Unexpected pipeline error: {str(e)}")
        finally:
            ACTIVE_EXPORT_CANCELLATION_EVENTS.pop(job_id, None)
            # Cleanup temporary scratch ASS script
            if ass_path and os.path.exists(ass_path):
                try:
                    os.remove(ass_path)
                except Exception:
                    pass

export_manager = ExportManager()

