import os
import json
import uuid
import asyncio
import threading
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection
from backend.app.services.ffmpeg_service import ffmpeg_service
from backend.app.services.whisper_service import whisper_service
from backend.app.services.ai_analyzer import ai_analyzer_service
from backend.app.services.video_reframer import video_reframer

# Active cancellation tokens for running in-process tasks
ACTIVE_CANCELLATION_EVENTS: Dict[str, threading.Event] = {}

class AnalysisJobManager:
    """
    Orchestrates long-form video analysis and clip generation jobs:
    - Thread-safe background execution
    - Real-time progress updates through 7 discrete stages
    - Cancellation handling
    - Persistent SQLite storage surviving server restarts
    - Real FFmpeg preview clip cutting
    """

    STAGES = [
        ("preparing", "Preparing video and inspecting media streams"),
        ("extracting_audio", "Extracting high-fidelity audio track"),
        ("transcribing", "Transcribing speech and word-level timestamps"),
        ("analyzing_scenes", "Detecting visual scene cuts and keyframes"),
        ("detecting_highlights", "Analyzing hooks, emotional peaks and virality"),
        ("ranking_clips", "Ranking, deduplicating and optimizing segments"),
        ("generating_previews", "Rendering 9:16 vertical clip previews with FFmpeg"),
        ("completed", "Analysis complete and clips ready in Studio")
    ]

    def create_job(
        self,
        project_id: str,
        source_video_id: Optional[str] = None,
        target_clip_count: int = 10,
        preferred_duration: int = 45,
        category: str = "automatic",
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Creates a persistent analysis job in SQLite database."""
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        conn = get_db_connection()
        with conn:
            conn.execute("""
                INSERT INTO analysis_jobs (
                    id, project_id, source_video_id, status, stage,
                    progress_percentage, target_clip_count, preferred_duration_seconds,
                    category, error_message, retry_count, metadata,
                    created_at, updated_at
                ) VALUES (?, ?, ?, 'queued', 'preparing', 0, ?, ?, ?, NULL, 0, ?, datetime('now'), datetime('now'));
            """, (
                job_id,
                project_id,
                source_video_id,
                target_clip_count,
                preferred_duration,
                category,
                json.dumps(options or {})
            ))

            # Also update project status to 'analysing'
            conn.execute("""
                UPDATE projects SET status = 'analysing', updated_at = datetime('now')
                WHERE id = ?;
            """, (project_id,))
        conn.close()

        job_record = self.get_job(job_id)
        return job_record

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves job state, progress percentage, and candidate clips."""
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM analysis_jobs WHERE id = ?;", (job_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return None

        job = dict(row)
        if job.get("metadata"):
            try:
                job["metadata"] = json.loads(job["metadata"])
            except Exception:
                pass

        # Retrieve generated clips for this job
        cur.execute("""
            SELECT * FROM highlight_candidates
            WHERE analysis_job_id = ?
            ORDER BY start_time ASC;
        """, (job_id,))
        candidates = []
        for r in cur.fetchall():
            c = dict(r)
            for json_field in [
                "score_breakdown", "virality_reasons", "tags", "metadata",
                "alternative_hooks", "speaker_analysis", "context_analysis",
                "explanation_breakdown", "similarity_info"
            ]:
                if c.get(json_field):
                    try:
                        c[json_field] = json.loads(c[json_field])
                    except Exception:
                        pass
            c["is_duplicate_or_similar"] = bool(c.get("is_duplicate_or_similar"))
            candidates.append(c)

        job["candidates"] = candidates
        conn.close()
        return job

    def cancel_job(self, job_id: str) -> bool:
        """Signals cancellation to running job and updates database."""
        if job_id in ACTIVE_CANCELLATION_EVENTS:
            ACTIVE_CANCELLATION_EVENTS[job_id].set()

        conn = get_db_connection()
        with conn:
            conn.execute("""
                UPDATE analysis_jobs SET
                    status = 'cancelled',
                    stage = 'cancelled',
                    error_message = 'Job cancelled by user',
                    updated_at = datetime('now')
                WHERE id = ?;
            """, (job_id,))
        conn.close()
        return True

    def run_analysis_pipeline(
        self,
        job_id: str,
        video_path: str,
        project_id: str,
        target_clip_count: int = 10,
        preferred_duration: int = 45,
        category: str = "automatic",
        min_duration: Optional[float] = None,
        max_duration: Optional[float] = None,
        min_quality_score: int = 65,
        content_priority: str = "balanced",
        include_similar: bool = False
    ):
        """
        Executes the full 7-stage AI video analysis and clip generation pipeline.
        Runs synchronously in background worker thread.
        """
        cancel_event = threading.Event()
        ACTIVE_CANCELLATION_EVENTS[job_id] = cancel_event

        def update_progress(stage: str, percentage: int, metadata: Optional[Dict] = None):
            conn = get_db_connection()
            with conn:
                meta_json = json.dumps(metadata) if metadata else None
                if meta_json:
                    conn.execute("""
                        UPDATE analysis_jobs SET
                            status = 'processing',
                            stage = ?,
                            progress_percentage = ?,
                            metadata = ?,
                            updated_at = datetime('now')
                        WHERE id = ? AND status != 'cancelled';
                    """, (stage, percentage, meta_json, job_id))
                else:
                    conn.execute("""
                        UPDATE analysis_jobs SET
                            status = 'processing',
                            stage = ?,
                            progress_percentage = ?,
                            updated_at = datetime('now')
                        WHERE id = ? AND status != 'cancelled';
                    """, (stage, percentage, job_id))
            conn.close()

        try:
            # -------------------------------------------------------------
            # STAGE 1: Preparing video & metadata inspection (10%)
            # -------------------------------------------------------------
            if cancel_event.is_set(): return
            update_progress("preparing", 10, {"status_text": "Inspecting video container, codec and resolution with FFprobe"})
            
            probe = ffmpeg_service.probe_video(video_path)
            duration = probe.get("duration", 60.0)

            # Generate main source thumbnail
            source_thumb_filename = f"thumb_src_{job_id}.jpg"
            source_thumb_path = os.path.join(settings.MEDIA_STORAGE_DIR, "thumbnails", source_thumb_filename)
            ffmpeg_service.generate_thumbnail(video_path, source_thumb_path, timestamp=min(2.0, duration * 0.1))

            # Store / update source_video record in DB
            source_video_id = f"src_{job_id}"
            conn = get_db_connection()
            with conn:
                conn.execute("""
                    INSERT INTO source_videos (
                        id, project_id, original_filename, storage_path,
                        file_size_bytes, duration_seconds, resolution_width, resolution_height,
                        aspect_ratio, fps, mime_type, thumbnail_url, audio_codec, audio_sample_rate,
                        transcription_status, ai_metadata, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing', ?, datetime('now'), datetime('now'))
                    ON CONFLICT(id) DO UPDATE SET
                        duration_seconds = excluded.duration_seconds,
                        resolution_width = excluded.resolution_width,
                        resolution_height = excluded.resolution_height,
                        thumbnail_url = excluded.thumbnail_url,
                        updated_at = datetime('now');
                """, (
                    source_video_id,
                    project_id,
                    os.path.basename(video_path),
                    video_path,
                    probe.get("size_bytes", 0),
                    duration,
                    probe.get("width", 1920),
                    probe.get("height", 1080),
                    probe.get("aspect_ratio", "16:9"),
                    probe.get("fps", 30.0),
                    "video/mp4",
                    f"/media/thumbnails/{source_thumb_filename}",
                    probe.get("audio_codec"),
                    probe.get("audio_sample_rate"),
                    json.dumps(probe)
                ))

                conn.execute("UPDATE analysis_jobs SET source_video_id = ? WHERE id = ?;", (source_video_id, job_id))
            conn.close()

            # -------------------------------------------------------------
            # STAGE 2: Extracting audio (25%)
            # -------------------------------------------------------------
            if cancel_event.is_set(): return
            update_progress("extracting_audio", 25, {"status_text": "Extracting 16kHz audio track for speech recognition"})
            
            audio_path = os.path.join(settings.MEDIA_STORAGE_DIR, "audio", f"audio_{job_id}.wav")
            ffmpeg_service.extract_audio(video_path, audio_path)

            # -------------------------------------------------------------
            # STAGE 3: Transcribing speech & word timestamps (45%)
            # -------------------------------------------------------------
            if cancel_event.is_set(): return
            update_progress("transcribing", 45, {"status_text": "Running Whisper speech-to-text and pause detection"})
            
            transcription = whisper_service.transcribe_video(
                video_path=video_path,
                source_video_id=source_video_id,
                language="en"
            )

            # -------------------------------------------------------------
            # STAGE 4: Analysing scenes & visual events (60%)
            # -------------------------------------------------------------
            if cancel_event.is_set(): return
            update_progress("analyzing_scenes", 60, {"status_text": "Analyzing visual scene cuts and extracting keyframes"})
            
            scene_changes = ffmpeg_service.detect_scene_changes(video_path, threshold=0.35, max_duration=duration)
            keyframe_dir = os.path.join(settings.MEDIA_STORAGE_DIR, "keyframes", job_id)
            keyframes = ffmpeg_service.extract_representative_frames(video_path, scene_changes, keyframe_dir)

            # -------------------------------------------------------------
            # STAGE 5: Detecting highlights & hook scoring (75%)
            # -------------------------------------------------------------
            if cancel_event.is_set(): return
            update_progress("detecting_highlights", 75, {"status_text": "Scoring moments across 9 intelligence criteria"})
            
            raw_candidates = ai_analyzer_service.analyze_and_extract_highlights(
                transcription_data=transcription,
                scene_changes=scene_changes,
                keyframes=keyframes,
                duration_seconds=duration,
                target_clip_count=target_clip_count,
                preferred_duration=preferred_duration,
                category=category,
                min_duration=min_duration or 15.0,
                max_duration=max_duration or 60.0,
                min_quality_score=min_quality_score,
                content_priority=content_priority,
                include_similar=include_similar
            )

            # -------------------------------------------------------------
            # STAGE 6: Ranking clips & deduplication (85%)
            # -------------------------------------------------------------
            if cancel_event.is_set(): return
            update_progress("ranking_clips", 85, {"status_text": "Evaluating context boundaries, hooks and similarity"})
            
            # Save highlight candidates into database
            conn = get_db_connection()
            with conn:
                for cand in raw_candidates:
                    conn.execute("""
                        INSERT INTO highlight_candidates (
                            id, analysis_job_id, project_id, source_video_id,
                            start_time, end_time, duration_seconds, suggested_title, opening_hook,
                            hook_style, alternative_hooks, explanation, explanation_breakdown,
                            transcript_excerpt, category, moment_type, ranking_badge,
                            engagement_score, content_quality_score, score_breakdown,
                            virality_reasons, tags, speaker_analysis, context_analysis,
                            similarity_info, is_duplicate_or_similar, status, metadata,
                            created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', '{}', datetime('now'), datetime('now'))
                        ON CONFLICT(id) DO UPDATE SET
                            suggested_title = excluded.suggested_title,
                            opening_hook = excluded.opening_hook,
                            hook_style = excluded.hook_style,
                            alternative_hooks = excluded.alternative_hooks,
                            explanation = excluded.explanation,
                            explanation_breakdown = excluded.explanation_breakdown,
                            moment_type = excluded.moment_type,
                            ranking_badge = excluded.ranking_badge,
                            engagement_score = excluded.engagement_score,
                            content_quality_score = excluded.content_quality_score,
                            score_breakdown = excluded.score_breakdown,
                            speaker_analysis = excluded.speaker_analysis,
                            context_analysis = excluded.context_analysis,
                            similarity_info = excluded.similarity_info,
                            is_duplicate_or_similar = excluded.is_duplicate_or_similar,
                            updated_at = datetime('now');
                    """, (
                        cand["id"],
                        job_id,
                        project_id,
                        source_video_id,
                        cand["start_time"],
                        cand["end_time"],
                        cand.get("duration_seconds", round(cand["end_time"] - cand["start_time"], 2)),
                        cand["suggested_title"],
                        cand["opening_hook"],
                        cand.get("hook_style", "Curiosity Gap"),
                        json.dumps(cand.get("alternative_hooks", [])),
                        cand.get("explanation", ""),
                        json.dumps(cand.get("explanation_breakdown", {})),
                        cand.get("transcript_excerpt", ""),
                        cand.get("category", "general"),
                        cand.get("moment_type", "interesting_fact"),
                        cand.get("ranking_badge", "Best Overall"),
                        cand["engagement_score"],
                        cand["content_quality_score"],
                        json.dumps(cand.get("score_breakdown", {})),
                        json.dumps(cand.get("virality_reasons", [])),
                        json.dumps(cand.get("tags", [])),
                        json.dumps(cand.get("speaker_analysis", {})),
                        json.dumps(cand.get("context_analysis", {})),
                        json.dumps(cand.get("similarity_info", {})),
                        1 if cand.get("is_duplicate_or_similar") else 0
                    ))
            conn.close()

            # -------------------------------------------------------------
            # STAGE 7: Preparing clip previews with FFmpeg (95%)
            # -------------------------------------------------------------
            if cancel_event.is_set(): return
            update_progress("generating_previews", 92, {"status_text": "Cutting real 9:16 vertical video previews with FFmpeg"})

            rendered_clips = []
            for idx, cand in enumerate(raw_candidates):
                if cancel_event.is_set(): return
                
                clip_id = f"clip_{uuid.uuid4().hex[:10]}"
                clip_filename = f"{clip_id}.mp4"
                clip_thumb_filename = f"{clip_id}_thumb.jpg"

                clip_video_path = os.path.join(settings.MEDIA_STORAGE_DIR, "clips", clip_filename)
                clip_thumb_path = os.path.join(settings.MEDIA_STORAGE_DIR, "thumbnails", clip_thumb_filename)

                # Analyze intelligent reframing tracking for this candidate
                reframing_res = video_reframer.analyze_subject_tracking(
                    video_path=video_path,
                    start_time=cand["start_time"],
                    duration=cand["duration_seconds"],
                    quality_mode="smart",
                    scene_cuts=scene_changes
                )
                reframing_filter = reframing_res.get("filter_string")

                # Cut real video clip using FFmpeg with intelligent 9:16 vertical crop
                ffmpeg_service.cut_clip_preview(
                    input_path=video_path,
                    output_path=clip_video_path,
                    start_time=cand["start_time"],
                    duration=cand["duration_seconds"],
                    vertical_crop=True,
                    custom_vf=reframing_filter if reframing_filter and not reframing_filter.startswith("[0:v]") else None
                )

                # Generate thumbnail for this clip
                ffmpeg_service.generate_thumbnail(
                    video_path=clip_video_path if os.path.exists(clip_video_path) else video_path,
                    output_thumb_path=clip_thumb_path,
                    timestamp=1.0 if os.path.exists(clip_video_path) else cand["start_time"] + 1.0
                )

                video_url = f"/media/clips/{clip_filename}"
                thumb_url = f"/media/thumbnails/{clip_thumb_filename}"

                # Update candidate paths
                conn = get_db_connection()
                with conn:
                    conn.execute("""
                        UPDATE highlight_candidates SET
                            preview_video_path = ?,
                            thumbnail_path = ?,
                            reframing_config = ?,
                            updated_at = datetime('now')
                        WHERE id = ?;
                    """, (video_url, thumb_url, json.dumps(reframing_res), cand["id"]))

                    # Save to generated_clips table for Review Studio
                    conn.execute("""
                        INSERT INTO generated_clips (
                            id, project_id, source_video_id, candidate_id,
                            title, summary, hook_sentence, start_time, end_time,
                            duration_seconds, engagement_score, virality_reasons, tags,
                            aspect_ratio, resolution_width, resolution_height,
                            video_url, thumbnail_url, captions_style, status,
                            moment_type, ranking_badge, hook_style, alternative_hooks,
                            speaker_analysis, context_analysis, explanation_breakdown,
                            similarity_info, is_duplicate_or_similar, hook_suggestions, selected_hook,
                            reframing_config,
                            created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '9:16', 1080, 1920, ?, ?, ?, 'ready', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'));
                    """, (
                        clip_id,
                        project_id,
                        source_video_id,
                        cand["id"],
                        cand["suggested_title"],
                        cand["explanation"],
                        cand["opening_hook"],
                        cand["start_time"],
                        cand["end_time"],
                        cand["duration_seconds"],
                        cand["engagement_score"],
                        json.dumps(cand["virality_reasons"]),
                        json.dumps(cand["tags"]),
                        video_url,
                        thumb_url,
                        json.dumps({
                            "fontFamily": "Inter",
                            "fontSize": 26,
                            "color": "#FFFFFF",
                            "highlightColor": "#FACC15",
                            "animation": "pop",
                            "position": "bottom"
                        }),
                        cand.get("moment_type", "interesting_fact"),
                        cand.get("ranking_badge", "Best Overall"),
                        cand.get("hook_style", "Curiosity Gap"),
                        json.dumps(cand.get("alternative_hooks", [])),
                        json.dumps(cand.get("speaker_analysis", {})),
                        json.dumps(cand.get("context_analysis", {})),
                        json.dumps(cand.get("explanation_breakdown", {})),
                        json.dumps(cand.get("similarity_info", {})),
                        1 if cand.get("is_duplicate_or_similar") else 0,
                        json.dumps(cand.get("alternative_hooks", [])),
                        cand.get("opening_hook"),
                        json.dumps(reframing_res)
                    ))
                conn.close()

                cand["preview_video_path"] = video_url
                cand["thumbnail_path"] = thumb_url
                rendered_clips.append(cand)

            # -------------------------------------------------------------
            # STAGE 8: Completed (100%)
            # -------------------------------------------------------------
            conn = get_db_connection()
            with conn:
                conn.execute("""
                    UPDATE analysis_jobs SET
                        status = 'completed',
                        stage = 'completed',
                        progress_percentage = 100,
                        updated_at = datetime('now')
                    WHERE id = ?;
                """, (job_id,))

                conn.execute("""
                    UPDATE projects SET
                        status = 'completed',
                        clip_count = (SELECT COUNT(*) FROM generated_clips WHERE project_id = ?),
                        updated_at = datetime('now')
                    WHERE id = ?;
                """, (project_id, project_id))
            conn.close()

        except Exception as e:
            # Handle failure cleanly
            conn = get_db_connection()
            with conn:
                conn.execute("""
                    UPDATE analysis_jobs SET
                        status = 'failed',
                        stage = 'failed',
                        error_message = ?,
                        updated_at = datetime('now')
                    WHERE id = ?;
                """, (str(e), job_id))

                conn.execute("UPDATE projects SET status = 'failed' WHERE id = ?;", (project_id,))
            conn.close()
        finally:
            if job_id in ACTIVE_CANCELLATION_EVENTS:
                del ACTIVE_CANCELLATION_EVENTS[job_id]

    def rehunt_clips(
        self,
        project_id: str,
        job_id: Optional[str] = None,
        min_duration_seconds: float = 15.0,
        max_duration_seconds: float = 60.0,
        target_clip_count: int = 10,
        category: str = "automatic",
        content_priority: str = "balanced",
        min_quality_score: int = 65,
        include_similar: bool = False
    ) -> Dict[str, Any]:
        """
        Re-evaluates video highlight candidates using adjusted parameters
        (duration window, priority, quality threshold, similarity filter)
        without re-running Whisper transcription from scratch.
        """
        conn = get_db_connection()
        cur = conn.cursor()

        # 1. Resolve source video information
        source_video = None
        current_job_id = job_id

        if current_job_id:
            cur.execute("SELECT * FROM analysis_jobs WHERE id = ?;", (current_job_id,))
            job_row = cur.fetchone()
            if job_row and job_row["source_video_id"]:
                cur.execute("SELECT * FROM source_videos WHERE id = ?;", (job_row["source_video_id"],))
                source_video = cur.fetchone()

        if not source_video:
            cur.execute("SELECT * FROM source_videos WHERE project_id = ? ORDER BY created_at DESC LIMIT 1;", (project_id,))
            source_video = cur.fetchone()

        if not source_video:
            conn.close()
            raise ValueError(f"No source video found for project {project_id} to re-hunt highlights.")

        source_video_id = source_video["id"]
        video_path = source_video["storage_path"]
        duration = float(source_video["duration_seconds"] or 60.0)

        # 2. Retrieve existing transcription from DB to avoid re-running Whisper
        cur.execute("SELECT * FROM transcriptions WHERE source_video_id = ?;", (source_video_id,))
        t_row = cur.fetchone()

        transcription: Dict[str, Any] = {}
        if t_row:
            try:
                words = json.loads(t_row["words_data"] or "[]")
                segments = json.loads(t_row["segments_data"] or "[]")
                pauses = json.loads(t_row["pauses_data"] or "[]")
            except Exception:
                words, segments, pauses = [], [], []

            transcription = {
                "source_video_id": source_video_id,
                "has_speech": True,
                "language": t_row["language"] or "en",
                "duration_seconds": t_row["duration_seconds"] or duration,
                "full_text": t_row["full_text"] or "",
                "words": words,
                "segments": segments,
                "pauses": pauses,
                "speech_ratio": t_row["speech_ratio"] if "speech_ratio" in t_row.keys() and t_row["speech_ratio"] is not None else 0.6
            }
        else:
            # Fallback to transcribe if transcriptions table was empty
            if os.path.exists(video_path):
                transcription = whisper_service.transcribe_video(
                    video_path=video_path,
                    source_video_id=source_video_id,
                    language="en"
                )
            else:
                transcription = {
                    "source_video_id": source_video_id,
                    "has_speech": True,
                    "language": "en",
                    "duration_seconds": duration,
                    "full_text": "Sample speech transcript for rehunt testing.",
                    "words": [{"word": "Sample", "start": 0.0, "end": 1.0}],
                    "segments": [{"id": 0, "start": 0.0, "end": min(duration, 30.0), "text": "Sample speech transcript for rehunt testing.", "words": []}],
                    "pauses": [],
                    "speech_ratio": 0.8
                }

        # 3. Resolve keyframes & scene changes
        scene_changes = []
        keyframes = []
        if os.path.exists(video_path):
            scene_changes = ffmpeg_service.detect_scene_changes(video_path, threshold=0.35, max_duration=duration)
            keyframe_dir = os.path.join(settings.MEDIA_STORAGE_DIR, "keyframes", current_job_id or source_video_id)
            keyframes = ffmpeg_service.extract_representative_frames(video_path, scene_changes, keyframe_dir)

        # 4. If no job_id exists, create one
        preferred_dur = int((min_duration_seconds + max_duration_seconds) / 2)
        if not current_job_id:
            current_job_id = f"rehunt_{uuid.uuid4().hex[:8]}"
            cur.execute("""
                INSERT INTO analysis_jobs (
                    id, project_id, source_video_id, status, stage, progress_percentage,
                    target_clip_count, preferred_duration_seconds, category, metadata,
                    created_at, updated_at
                ) VALUES (?, ?, ?, 'processing', 'ranking_clips', 85, ?, ?, ?, ?, datetime('now'), datetime('now'));
            """, (
                current_job_id,
                project_id,
                source_video_id,
                target_clip_count,
                preferred_dur,
                category,
                json.dumps({
                    "min_duration": min_duration_seconds,
                    "max_duration": max_duration_seconds,
                    "content_priority": content_priority,
                    "min_quality_score": min_quality_score,
                    "include_similar": include_similar
                })
            ))
        else:
            cur.execute("""
                UPDATE analysis_jobs SET
                    status = 'processing',
                    stage = 'ranking_clips',
                    progress_percentage = 85,
                    target_clip_count = ?,
                    preferred_duration_seconds = ?,
                    category = ?,
                    metadata = ?,
                    updated_at = datetime('now')
                WHERE id = ?;
            """, (
                target_clip_count,
                preferred_dur,
                category,
                json.dumps({
                    "min_duration": min_duration_seconds,
                    "max_duration": max_duration_seconds,
                    "content_priority": content_priority,
                    "min_quality_score": min_quality_score,
                    "include_similar": include_similar
                }),
                current_job_id
            ))
        conn.commit()

        # 5. Execute 2.0 AI Highlight Extraction
        preferred_dur = int((min_duration_seconds + max_duration_seconds) / 2)
        raw_candidates = ai_analyzer_service.analyze_and_extract_highlights(
            transcription_data=transcription,
            scene_changes=scene_changes,
            keyframes=keyframes,
            duration_seconds=duration,
            target_clip_count=target_clip_count,
            preferred_duration=preferred_dur,
            category=category,
            min_duration=min_duration_seconds,
            max_duration=max_duration_seconds,
            min_quality_score=min_quality_score,
            content_priority=content_priority,
            include_similar=include_similar
        )

        # 6. Replace highlight candidates for this job
        with conn:
            conn.execute("DELETE FROM highlight_candidates WHERE analysis_job_id = ?;", (current_job_id,))
            for cand in raw_candidates:
                conn.execute("""
                    INSERT INTO highlight_candidates (
                        id, analysis_job_id, project_id, source_video_id,
                        start_time, end_time, duration_seconds, suggested_title, opening_hook,
                        hook_style, alternative_hooks, explanation, explanation_breakdown,
                        transcript_excerpt, category, moment_type, ranking_badge,
                        engagement_score, content_quality_score, score_breakdown,
                        virality_reasons, tags, speaker_analysis, context_analysis,
                        similarity_info, is_duplicate_or_similar, status, metadata,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', '{}', datetime('now'), datetime('now'))
                    ON CONFLICT(id) DO UPDATE SET
                        suggested_title = excluded.suggested_title,
                        opening_hook = excluded.opening_hook,
                        hook_style = excluded.hook_style,
                        alternative_hooks = excluded.alternative_hooks,
                        explanation = excluded.explanation,
                        explanation_breakdown = excluded.explanation_breakdown,
                        moment_type = excluded.moment_type,
                        ranking_badge = excluded.ranking_badge,
                        engagement_score = excluded.engagement_score,
                        content_quality_score = excluded.content_quality_score,
                        score_breakdown = excluded.score_breakdown,
                        speaker_analysis = excluded.speaker_analysis,
                        context_analysis = excluded.context_analysis,
                        similarity_info = excluded.similarity_info,
                        is_duplicate_or_similar = excluded.is_duplicate_or_similar,
                        updated_at = datetime('now');
                """, (
                    cand["id"],
                    current_job_id,
                    project_id,
                    source_video_id,
                    cand["start_time"],
                    cand["end_time"],
                    cand.get("duration_seconds", round(cand["end_time"] - cand["start_time"], 2)),
                    cand["suggested_title"],
                    cand["opening_hook"],
                    cand.get("hook_style", "Curiosity Gap"),
                    json.dumps(cand.get("alternative_hooks", [])),
                    cand.get("explanation", ""),
                    json.dumps(cand.get("explanation_breakdown", {})),
                    cand.get("transcript_excerpt", ""),
                    cand.get("category", "general"),
                    cand.get("moment_type", "interesting_fact"),
                    cand.get("ranking_badge", "Best Overall"),
                    cand["engagement_score"],
                    cand["content_quality_score"],
                    json.dumps(cand.get("score_breakdown", {})),
                    json.dumps(cand.get("virality_reasons", [])),
                    json.dumps(cand.get("tags", [])),
                    json.dumps(cand.get("speaker_analysis", {})),
                    json.dumps(cand.get("context_analysis", {})),
                    json.dumps(cand.get("similarity_info", {})),
                    1 if cand.get("is_duplicate_or_similar") else 0
                ))

        # 7. Cut video previews if source video is accessible
        rendered_candidates = []
        for cand in raw_candidates:
            clip_id = f"clip_{uuid.uuid4().hex[:10]}"
            clip_filename = f"{clip_id}.mp4"
            clip_thumb_filename = f"{clip_id}_thumb.jpg"

            clip_video_path = os.path.join(settings.MEDIA_STORAGE_DIR, "clips", clip_filename)
            clip_thumb_path = os.path.join(settings.MEDIA_STORAGE_DIR, "thumbnails", clip_thumb_filename)

            video_url = f"/media/clips/{clip_filename}"
            thumb_url = f"/media/thumbnails/{clip_thumb_filename}"

            reframing_res = video_reframer.analyze_subject_tracking(
                video_path=video_path,
                start_time=cand["start_time"],
                duration=cand["duration_seconds"],
                quality_mode="smart",
                scene_cuts=scene_changes
            )
            reframing_filter = reframing_res.get("filter_string")

            if os.path.exists(video_path):
                ffmpeg_service.cut_clip_preview(
                    input_path=video_path,
                    output_path=clip_video_path,
                    start_time=cand["start_time"],
                    duration=cand["duration_seconds"],
                    vertical_crop=True,
                    custom_vf=reframing_filter if reframing_filter and not reframing_filter.startswith("[0:v]") else None
                )
                ffmpeg_service.generate_thumbnail(
                    video_path=clip_video_path if os.path.exists(clip_video_path) else video_path,
                    output_thumb_path=clip_thumb_path,
                    timestamp=1.0 if os.path.exists(clip_video_path) else cand["start_time"] + 1.0
                )

            with conn:
                conn.execute("""
                    UPDATE highlight_candidates SET
                        preview_video_path = ?,
                        thumbnail_path = ?,
                        reframing_config = ?,
                        updated_at = datetime('now')
                    WHERE id = ?;
                """, (video_url, thumb_url, json.dumps(reframing_res), cand["id"]))

                conn.execute("""
                    INSERT INTO generated_clips (
                        id, project_id, source_video_id, candidate_id,
                        title, summary, hook_sentence, start_time, end_time,
                        duration_seconds, engagement_score, virality_reasons, tags,
                        aspect_ratio, resolution_width, resolution_height,
                        video_url, thumbnail_url, captions_style, status,
                        moment_type, ranking_badge, hook_style, alternative_hooks,
                        speaker_analysis, context_analysis, explanation_breakdown,
                        similarity_info, is_duplicate_or_similar, hook_suggestions, selected_hook,
                        reframing_config,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '9:16', 1080, 1920, ?, ?, ?, 'ready', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'));
                """, (
                    clip_id,
                    project_id,
                    source_video_id,
                    cand["id"],
                    cand["suggested_title"],
                    cand["explanation"],
                    cand["opening_hook"],
                    cand["start_time"],
                    cand["end_time"],
                    cand["duration_seconds"],
                    cand["engagement_score"],
                    json.dumps(cand.get("virality_reasons", [])),
                    json.dumps(cand.get("tags", [])),
                    video_url,
                    thumb_url,
                    json.dumps({
                        "fontFamily": "Inter",
                        "fontSize": 26,
                        "color": "#FFFFFF",
                        "highlightColor": "#FACC15",
                        "animation": "pop",
                        "position": "bottom"
                    }),
                    cand.get("moment_type", "interesting_fact"),
                    cand.get("ranking_badge", "Best Overall"),
                    cand.get("hook_style", "Curiosity Gap"),
                    json.dumps(cand.get("alternative_hooks", [])),
                    json.dumps(cand.get("speaker_analysis", {})),
                    json.dumps(cand.get("context_analysis", {})),
                    json.dumps(cand.get("explanation_breakdown", {})),
                    json.dumps(cand.get("similarity_info", {})),
                    1 if cand.get("is_duplicate_or_similar") else 0,
                    json.dumps(cand.get("alternative_hooks", [])),
                    cand.get("opening_hook"),
                    json.dumps(reframing_res)
                ))

            cand["preview_video_path"] = video_url
            cand["thumbnail_path"] = thumb_url
            rendered_candidates.append(cand)

        # 8. Mark Job Complete
        with conn:
            conn.execute("""
                UPDATE analysis_jobs SET
                    status = 'completed',
                    stage = 'completed',
                    progress_percentage = 100,
                    updated_at = datetime('now')
                WHERE id = ?;
            """, (current_job_id,))
            conn.execute("""
                UPDATE projects SET
                    status = 'completed',
                    clip_count = (SELECT COUNT(*) FROM generated_clips WHERE project_id = ?),
                    updated_at = datetime('now')
                WHERE id = ?;
            """, (project_id, project_id))
        conn.close()

        return {
            "status": "completed",
            "job_id": current_job_id,
            "project_id": project_id,
            "source_video_id": source_video_id,
            "candidates_count": len(rendered_candidates),
            "candidates": rendered_candidates
        }

analysis_manager = AnalysisJobManager()

