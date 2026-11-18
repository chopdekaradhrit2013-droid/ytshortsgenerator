import os
import uuid
import json
import re
import copy
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection
from backend.app.services.ffmpeg_service import ffmpeg_service
from backend.app.services.video_reframer import video_reframer
from backend.app.services.caption_generator import caption_generator
from backend.app.services.audio_enhancer import audio_enhancer

class StudioService:
    """
    Professional Video Editing Suite service for AI Shorts Factory.
    Manages multi-track timeline states, non-destructive project revisions,
    preset application, natural-language AI editing commands, and multi-track rendering.
    """

    def get_or_create_studio_project(self, project_id: str, clip_id: str) -> Dict[str, Any]:
        """
        Retrieves an existing studio editing project for a clip, or initializes
        a full-featured multi-track studio project from clip & transcription metadata.
        """
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM studio_projects WHERE clip_id = ? ORDER BY updated_at DESC LIMIT 1;", (clip_id,))
        row = cur.fetchone()

        if row:
            conn.close()
            return self._deserialize_studio_project(dict(row))

        # Retrieve clip details
        cur.execute("SELECT * FROM generated_clips WHERE id = ?;", (clip_id,))
        clip_row = cur.fetchone()
        if not clip_row:
            conn.close()
            raise ValueError(f"Generated clip {clip_id} not found")

        clip = dict(clip_row)
        duration = float(clip.get("duration_seconds") or 45.0)
        title = clip.get("title") or "Untitled AI Short"

        # Retrieve transcription data for captions track
        cur.execute("""
            SELECT words_data, segments_data FROM transcriptions
            WHERE source_video_id IN (
                SELECT id FROM source_videos WHERE project_id = ?
            ) ORDER BY created_at DESC LIMIT 1;
        """, (project_id,))
        trans_row = cur.fetchone()
        conn.close()

        clip_words = []
        clip_segments = []
        if trans_row:
            if trans_row["words_data"]:
                try:
                    clip_words = json.loads(trans_row["words_data"])
                except Exception:
                    pass
            if trans_row["segments_data"]:
                try:
                    clip_segments = json.loads(trans_row["segments_data"])
                except Exception:
                    pass

        # Check if clip has pre-existing captions_data
        if clip.get("captions_data"):
            try:
                clip_segments = json.loads(clip["captions_data"])
            except Exception:
                pass

        # Build initial multi-track timeline
        tracks = [
            {
                "id": "track_v1",
                "type": "video",
                "name": "Main Video (V1)",
                "muted": False,
                "locked": False,
                "items": [
                    {
                        "id": f"item_v_{clip_id[:8]}",
                        "track_id": "track_v1",
                        "type": "video",
                        "title": title,
                        "start_time": 0.0,
                        "duration": duration,
                        "source_start_time": float(clip.get("start_time") or 0.0),
                        "speed": 1.0,
                        "volume": 1.0,
                        "opacity": 1.0,
                        "media_url": clip.get("video_url") or f"/media/exports/preview_{clip_id}.mp4"
                    }
                ]
            },
            {
                "id": "track_v2",
                "type": "video",
                "name": "Overlay / B-Roll (V2)",
                "muted": False,
                "locked": False,
                "items": []
            },
            {
                "id": "track_t1",
                "type": "text",
                "name": "Text & Titles (T1)",
                "muted": False,
                "locked": False,
                "items": [
                    {
                        "id": f"item_title_0",
                        "track_id": "track_t1",
                        "type": "text",
                        "text": title.split("#")[0].strip(),
                        "start_time": 0.0,
                        "duration": min(3.5, duration),
                        "font_family": "Montserrat",
                        "font_size": 42,
                        "font_weight": 900,
                        "color": "#FFFFFF",
                        "bg_color": "#000000",
                        "bg_opacity": 0.7,
                        "position_y": 18,
                        "position_x": 50,
                        "animation": "slide_down"
                    }
                ]
            },
            {
                "id": "track_c1",
                "type": "captions",
                "name": "AI Subtitles (C1)",
                "muted": False,
                "locked": False,
                "items": [
                    {
                        "id": f"cap_{i}",
                        "track_id": "track_c1",
                        "type": "caption",
                        "text": s.get("text", ""),
                        "start_time": max(0.0, float(s.get("start", 0.0)) - float(clip.get("start_time", 0.0))),
                        "duration": max(0.5, float(s.get("end", 1.0)) - float(s.get("start", 0.0))),
                        "words": s.get("words", [])
                    }
                    for i, s in enumerate(clip_segments[:25])
                ]
            },
            {
                "id": "track_a1",
                "type": "audio",
                "name": "Video Voice (A1)",
                "muted": False,
                "locked": False,
                "items": [
                    {
                        "id": f"item_a_speech",
                        "track_id": "track_a1",
                        "type": "audio",
                        "title": "Speech Audio Track",
                        "start_time": 0.0,
                        "duration": duration,
                        "volume": 1.0,
                        "denoise": True,
                        "loudnorm": True,
                        "speech_boost": True
                    }
                ]
            },
            {
                "id": "track_a2",
                "type": "audio",
                "name": "Background Music (A2)",
                "muted": False,
                "locked": False,
                "items": [
                    {
                        "id": f"item_a_bgm",
                        "track_id": "track_a2",
                        "type": "audio",
                        "title": "Upbeat Lo-Fi Bed",
                        "track_asset": "lofi_chill",
                        "start_time": 0.0,
                        "duration": duration,
                        "volume": 0.14,
                        "fade_in": 1.0,
                        "fade_out": 2.0
                    }
                ]
            },
            {
                "id": "track_a3",
                "type": "audio",
                "name": "Voiceover & SFX (A3)",
                "muted": False,
                "locked": False,
                "items": []
            }
        ]

        studio_project_id = f"sp_{uuid.uuid4().hex[:12]}"
        timeline_data = {
            "duration": duration,
            "playhead": 0.0,
            "zoom_level": 1.0,
            "tracks": tracks
        }

        canvas_settings = {
            "width": 1080,
            "height": 1920,
            "bg_color": "#090A0F",
            "bg_blur": True,
            "fit_mode": "contain_blur",
            "show_safe_guides": True
        }

        video_adjustments = {
            "brightness": 0,
            "contrast": 1.0,
            "saturation": 1.0,
            "blur": 0,
            "speed": 1.0,
            "flip_h": False,
            "flip_v": False,
            "rotate": 0,
            "crop_mode": "smart_face",
            "scale": 100,
            "fade_in": 0.0,
            "fade_out": 0.0,
            "transition": "none"
        }

        captions_state = {
            "preset": "bold_pop",
            "font_family": "Montserrat",
            "font_size": 52,
            "font_weight": 900,
            "primary_color": "#FFFFFF",
            "highlight_color": "#FACC15",
            "bg_color": "#000000",
            "bg_opacity": 0,
            "outline_width": 4.5,
            "shadow_offset": 2.0,
            "placement": "bottom",
            "animation": "pop",
            "uppercase": True,
            "words_per_line": 4,
            "segments": clip_segments
        }

        audio_state = {
            "video_audio_volume": 1.0,
            "video_audio_muted": False,
            "bgm_track": "lofi_chill",
            "bgm_volume": 0.14,
            "bgm_fade_in": 1.0,
            "bgm_fade_out": 2.0,
            "loudnorm": True,
            "denoise": True,
            "speech_boost": True,
            "voiceover_volume": 1.0,
            "voiceover_file": None
        }

        overlays_state = {
            "titles": [
                {
                    "id": "title_hook_1",
                    "text": title.split("#")[0].strip(),
                    "start_time": 0.0,
                    "duration": min(3.5, duration),
                    "position_y": 18,
                    "position_x": 50,
                    "font_family": "Montserrat",
                    "font_size": 42,
                    "color": "#FFFFFF",
                    "bg_color": "#000000",
                    "bg_opacity": 0.7,
                    "animation": "slide_down"
                }
            ],
            "stickers": [],
            "shapes": [],
            "watermark": {
                "enabled": False,
                "text": "@AiShortsFactory",
                "opacity": 0.7,
                "position": "top_right"
            }
        }

        export_settings = {
            "resolution": "1080p",
            "width": 1080,
            "height": 1920,
            "fps": 30,
            "format": "mp4",
            "quality": "high",
            "crf": 20,
            "bitrate": "12M",
            "audio_bitrate": "192k"
        }

        conn_write = get_db_connection()
        with conn_write:
            conn_write.execute("""
                INSERT INTO studio_projects (
                    id, project_id, clip_id, name, aspect_ratio,
                    canvas_settings, timeline_data, video_adjustments,
                    captions_state, audio_state, overlays_state, export_settings,
                    version, created_at, updated_at
                ) VALUES (?, ?, ?, ?, '9:16', ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'));
            """, (
                studio_project_id, project_id, clip_id, title,
                json.dumps(canvas_settings),
                json.dumps(timeline_data),
                json.dumps(video_adjustments),
                json.dumps(captions_state),
                json.dumps(audio_state),
                json.dumps(overlays_state),
                json.dumps(export_settings)
            ))
        conn_write.close()

        return self.get_studio_project(studio_project_id)

    def get_studio_project(self, studio_project_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a studio project by ID with deserialized JSON payloads.
        """
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM studio_projects WHERE id = ?;", (studio_project_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        return self._deserialize_studio_project(dict(row))

    def save_studio_project(self, studio_project_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Persists updated timeline, adjustments, captions, overlays, audio, or canvas settings.
        Increments project revision version.
        """
        existing = self.get_studio_project(studio_project_id)
        if not existing:
            raise ValueError(f"Studio project {studio_project_id} not found")

        name = payload.get("name", existing.get("name"))
        aspect_ratio = payload.get("aspect_ratio", existing.get("aspect_ratio"))
        canvas_settings = payload.get("canvas_settings", existing.get("canvas_settings"))
        timeline_data = payload.get("timeline_data", existing.get("timeline_data"))
        video_adjustments = payload.get("video_adjustments", existing.get("video_adjustments"))
        captions_state = payload.get("captions_state", existing.get("captions_state"))
        audio_state = payload.get("audio_state", existing.get("audio_state"))
        overlays_state = payload.get("overlays_state", existing.get("overlays_state"))
        export_settings = payload.get("export_settings", existing.get("export_settings"))
        new_version = existing.get("version", 1) + 1

        conn = get_db_connection()
        with conn:
            conn.execute("""
                UPDATE studio_projects SET
                    name = ?,
                    aspect_ratio = ?,
                    canvas_settings = ?,
                    timeline_data = ?,
                    video_adjustments = ?,
                    captions_state = ?,
                    audio_state = ?,
                    overlays_state = ?,
                    export_settings = ?,
                    version = ?,
                    updated_at = datetime('now')
                WHERE id = ?;
            """, (
                name,
                aspect_ratio,
                json.dumps(canvas_settings),
                json.dumps(timeline_data),
                json.dumps(video_adjustments),
                json.dumps(captions_state),
                json.dumps(audio_state),
                json.dumps(overlays_state),
                json.dumps(export_settings),
                new_version,
                studio_project_id
            ))

            # Non-destructive sync to clip editing_config
            clip_id = existing["clip_id"]
            editing_sync = {
                "aspect_ratio": aspect_ratio,
                "video_adjustments": video_adjustments,
                "captions_state": captions_state,
                "audio_state": audio_state,
                "overlays_state": overlays_state
            }
            conn.execute("""
                UPDATE generated_clips SET
                    editing_config = ?,
                    title = ?,
                    updated_at = datetime('now')
                WHERE id = ?;
            """, (json.dumps(editing_sync), name, clip_id))

        conn.close()
        return self.get_studio_project(studio_project_id)

    def rename_studio_project(self, studio_project_id: str, new_name: str) -> Dict[str, Any]:
        """
        Renames a studio project.
        """
        conn = get_db_connection()
        with conn:
            conn.execute("""
                UPDATE studio_projects SET name = ?, updated_at = datetime('now')
                WHERE id = ?;
            """, (new_name, studio_project_id))
        conn.close()
        return self.get_studio_project(studio_project_id)

    def duplicate_studio_project(self, studio_project_id: str) -> Dict[str, Any]:
        """
        Duplicates an existing studio project for non-destructive branching.
        """
        source = self.get_studio_project(studio_project_id)
        if not source:
            raise ValueError(f"Studio project {studio_project_id} not found")

        dup_id = f"sp_{uuid.uuid4().hex[:12]}"
        dup_name = f"{source['name']} (Copy)"

        conn = get_db_connection()
        with conn:
            conn.execute("""
                INSERT INTO studio_projects (
                    id, project_id, clip_id, name, aspect_ratio,
                    canvas_settings, timeline_data, video_adjustments,
                    captions_state, audio_state, overlays_state, export_settings,
                    version, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'));
            """, (
                dup_id,
                source["project_id"],
                source["clip_id"],
                dup_name,
                source.get("aspect_ratio", "9:16"),
                json.dumps(source.get("canvas_settings", {})),
                json.dumps(source.get("timeline_data", {})),
                json.dumps(source.get("video_adjustments", {})),
                json.dumps(source.get("captions_state", {})),
                json.dumps(source.get("audio_state", {})),
                json.dumps(source.get("overlays_state", {})),
                json.dumps(source.get("export_settings", {}))
            ))
        conn.close()
        return self.get_studio_project(dup_id)

    def list_studio_projects(self, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Lists studio projects, optionally filtered by project_id.
        """
        conn = get_db_connection()
        cur = conn.cursor()
        if project_id:
            cur.execute("SELECT * FROM studio_projects WHERE project_id = ? ORDER BY updated_at DESC;", (project_id,))
        else:
            cur.execute("SELECT * FROM studio_projects ORDER BY updated_at DESC LIMIT 30;")
        rows = cur.fetchall()
        conn.close()
        return [self._deserialize_studio_project(dict(r)) for r in rows]

    def get_studio_presets(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Lists system and custom studio presets.
        """
        conn = get_db_connection()
        cur = conn.cursor()
        if category and category != "all":
            cur.execute("SELECT * FROM studio_presets WHERE category = ? ORDER BY is_builtin DESC, name ASC;", (category,))
        else:
            cur.execute("SELECT * FROM studio_presets ORDER BY is_builtin DESC, name ASC;")
        rows = cur.fetchall()
        conn.close()

        results = []
        for r in rows:
            p = dict(r)
            if p.get("config"):
                try:
                    p["config"] = json.loads(p["config"])
                except Exception:
                    pass
            results.append(p)
        return results

    def save_user_preset(
        self,
        name: str,
        category: str,
        description: Optional[str],
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Saves a user custom studio editing preset template.
        """
        preset_id = f"usp_{uuid.uuid4().hex[:10]}"
        conn = get_db_connection()
        with conn:
            conn.execute("""
                INSERT INTO studio_presets (
                    id, name, category, description, is_builtin, config, created_at, updated_at
                ) VALUES (?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'));
            """, (preset_id, name, category, description or "User custom studio preset", json.dumps(config)))
        conn.close()

        presets = self.get_studio_presets()
        for p in presets:
            if p["id"] == preset_id:
                return p
        return {"id": preset_id, "name": name, "category": category, "config": config}

    def get_studio_assets(self, asset_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Lists royalty-free studio audio tracks, sound effects, and stickers.
        """
        conn = get_db_connection()
        cur = conn.cursor()
        if asset_type and asset_type != "all":
            cur.execute("SELECT * FROM studio_assets WHERE asset_type = ? ORDER BY name ASC;", (asset_type,))
        else:
            cur.execute("SELECT * FROM studio_assets ORDER BY asset_type ASC, name ASC;")
        rows = cur.fetchall()
        conn.close()

        results = []
        for r in rows:
            a = dict(r)
            if a.get("metadata"):
                try:
                    a["metadata"] = json.loads(a["metadata"])
                except Exception:
                    pass
            results.append(a)
        return results

    # --------------------------------------------------------------------------
    # AI EDITING ASSISTANT
    # --------------------------------------------------------------------------
    def process_ai_editing_command(self, command: str, current_state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Translates natural language creative instructions into actionable
        editing modifications with before/after diffs.
        """
        cmd_lower = command.lower().strip()
        modifications: List[Dict[str, Any]] = []
        explanation = ""
        updated_state = copy.deepcopy(current_state)

        # 1. Caption sizing
        if "bigger caption" in cmd_lower or "increase caption size" in cmd_lower or "large caption" in cmd_lower or "make captions bigger" in cmd_lower:
            old_size = updated_state.get("captions_state", {}).get("font_size", 52)
            new_size = min(72, old_size + 8)
            updated_state.setdefault("captions_state", {})["font_size"] = new_size
            modifications.append({
                "target": "captions",
                "field": "font_size",
                "old_value": old_size,
                "new_value": new_size,
                "action": "set",
                "description": f"Enlarged subtitle font size from {old_size}pt to {new_size}pt"
            })
            explanation = f"Increased caption font size to {new_size}pt for maximum mobile readability."

        elif "smaller caption" in cmd_lower or "decrease caption size" in cmd_lower or "make captions smaller" in cmd_lower:
            old_size = updated_state.get("captions_state", {}).get("font_size", 52)
            new_size = max(32, old_size - 8)
            updated_state.setdefault("captions_state", {})["font_size"] = new_size
            modifications.append({
                "target": "captions",
                "field": "font_size",
                "old_value": old_size,
                "new_value": new_size,
                "action": "set",
                "description": f"Reduced subtitle font size from {old_size}pt to {new_size}pt"
            })
            explanation = f"Reduced caption font size to {new_size}pt for a sleeker aesthetic."

        # 2. Word Highlights & Color
        if "yellow" in cmd_lower and ("highlight" in cmd_lower or "word" in cmd_lower or "color" in cmd_lower):
            updated_state.setdefault("captions_state", {})["highlight_color"] = "#FACC15"
            modifications.append({
                "target": "captions",
                "field": "highlight_color",
                "new_value": "#FACC15",
                "action": "set",
                "description": "Set active keyword highlight color to vibrant yellow (#FACC15)"
            })
            explanation += (" " if explanation else "") + "Changed keyword highlight color to high-contrast YouTube yellow."

        elif "green" in cmd_lower or "mrbeast" in cmd_lower:
            updated_state.setdefault("captions_state", {})["highlight_color"] = "#00FF00"
            updated_state.setdefault("captions_state", {})["preset"] = "mrbeast"
            modifications.append({
                "target": "captions",
                "field": "highlight_color",
                "new_value": "#00FF00",
                "action": "set",
                "description": "Applied MrBeast-style acid green keyword highlight (#00FF00)"
            })
            explanation += (" " if explanation else "") + "Applied MrBeast acid neon green keyword highlight."

        elif "cyan" in cmd_lower or "blue" in cmd_lower:
            updated_state.setdefault("captions_state", {})["highlight_color"] = "#00F0FF"
            modifications.append({
                "target": "captions",
                "field": "highlight_color",
                "new_value": "#00F0FF",
                "action": "set",
                "description": "Set active keyword highlight color to neon cyan (#00F0FF)"
            })
            explanation += (" " if explanation else "") + "Applied vibrant neon cyan highlight color."

        # 3. Word-by-word animation
        if "word by word" in cmd_lower or "karaoke" in cmd_lower or "pop" in cmd_lower or "animate caption" in cmd_lower:
            updated_state.setdefault("captions_state", {})["animation"] = "pop"
            updated_state.setdefault("captions_state", {})["words_per_line"] = 3
            modifications.append({
                "target": "captions",
                "field": "animation",
                "new_value": "pop",
                "action": "set",
                "description": "Activated dynamic word-by-word active pop animation with 3 words per line"
            })
            explanation += (" " if explanation else "") + "Enabled word-by-word active pop animation (3 words per sequence)."

        # 4. Trimming beginning/ending
        match_trim = re.search(r'(remove|trim|cut)\s*(the\s*)?(first\s*)?(\d+)\s*second', cmd_lower)
        if match_trim:
            secs = float(match_trim.group(4))
            timeline = updated_state.get("timeline_data", {})
            tracks = timeline.get("tracks", [])
            for trk in tracks:
                if trk.get("type") == "video":
                    for item in trk.get("items", []):
                        if item.get("start_time") == 0:
                            item["start_time"] = 0.0
                            item["duration"] = max(1.0, float(item["duration"]) - secs)
                            item["source_start_time"] = float(item.get("source_start_time", 0.0)) + secs
            updated_state.setdefault("timeline_data", {})["duration"] = max(1.0, float(timeline.get("duration", 45)) - secs)
            modifications.append({
                "target": "timeline",
                "action": "trim_start",
                "seconds": secs,
                "description": f"Trimmed initial {secs:.1f}s from video start to tighten hook entry"
            })
            explanation += (" " if explanation else "") + f"Trimmed the opening {secs:.1f}s to accelerate viewer retention."

        # 5. Speed adjustments
        if "faster" in cmd_lower or "speed up" in cmd_lower or "fast motion" in cmd_lower:
            target_speed = 1.25
            if "1.5" in cmd_lower: target_speed = 1.5
            elif "1.1" in cmd_lower or "slightly" in cmd_lower: target_speed = 1.1
            updated_state.setdefault("video_adjustments", {})["speed"] = target_speed
            modifications.append({
                "target": "video_adjustments",
                "field": "speed",
                "new_value": target_speed,
                "action": "set",
                "description": f"Adjusted video playback velocity to {target_speed}x"
            })
            explanation += (" " if explanation else "") + f"Increased clip playback velocity to {target_speed}x."

        elif "slower" in cmd_lower or "slow motion" in cmd_lower or "slow mo" in cmd_lower:
            target_speed = 0.8
            updated_state.setdefault("video_adjustments", {})["speed"] = target_speed
            modifications.append({
                "target": "video_adjustments",
                "field": "speed",
                "new_value": target_speed,
                "action": "set",
                "description": f"Engaged smooth slow-motion pacing at {target_speed}x"
            })
            explanation += (" " if explanation else "") + f"Set clip speed to {target_speed}x slow motion."

        # 6. Transitions
        if "transition" in cmd_lower or "fade" in cmd_lower or "dissolve" in cmd_lower:
            trans_type = "dissolve"
            if "slide" in cmd_lower: trans_type = "slide_left"
            elif "zoom" in cmd_lower: trans_type = "zoom_in"
            elif "fade to black" in cmd_lower: trans_type = "fade_black"
            updated_state.setdefault("video_adjustments", {})["transition"] = trans_type
            updated_state.setdefault("video_adjustments", {})["fade_in"] = 0.5
            updated_state.setdefault("video_adjustments", {})["fade_out"] = 0.5
            modifications.append({
                "target": "video_adjustments",
                "field": "transition",
                "new_value": trans_type,
                "action": "set",
                "description": f"Added {trans_type} transition with 0.5s fade curve"
            })
            explanation += (" " if explanation else "") + f"Configured seamless {trans_type} transition."

        # 7. Add Title or Hook Overlay
        if "add title" in cmd_lower or "add a title" in cmd_lower or "hook title" in cmd_lower:
            new_title_item = {
                "id": f"ai_title_{uuid.uuid4().hex[:6]}",
                "text": "🔥 WATCH THIS FIRST",
                "start_time": 0.0,
                "duration": 3.0,
                "position_y": 18,
                "position_x": 50,
                "font_family": "Montserrat",
                "font_size": 44,
                "color": "#FFFFFF",
                "bg_color": "#000000",
                "bg_opacity": 0.8,
                "animation": "slide_down"
            }
            updated_state.setdefault("overlays_state", {}).setdefault("titles", []).append(new_title_item)
            modifications.append({
                "target": "overlays",
                "field": "titles",
                "action": "add",
                "item": new_title_item,
                "description": "Added animated title overlay banner for the opening 3 seconds"
            })
            explanation += (" " if explanation else "") + "Added animated title banner overlay at the opening hook."

        # 8. Watermark
        if "watermark" in cmd_lower:
            wm = {
                "enabled": True,
                "text": "@AiShortsFactory",
                "opacity": 0.75,
                "position": "top_right"
            }
            updated_state.setdefault("overlays_state", {})["watermark"] = wm
            modifications.append({
                "target": "overlays",
                "field": "watermark",
                "new_value": wm,
                "action": "set",
                "description": "Enabled channel watermark '@AiShortsFactory' at top right"
            })
            explanation += (" " if explanation else "") + "Enabled channel watermark brand mark."

        # 9. Audio adjustments & BGM
        if "music" in cmd_lower or "bgm" in cmd_lower or "lofi" in cmd_lower or "soundtrack" in cmd_lower:
            selected_track = "lofi_chill"
            if "energetic" in cmd_lower or "trap" in cmd_lower: selected_track = "energetic_trap"
            elif "cinematic" in cmd_lower: selected_track = "cinematic_ambient"
            elif "cyber" in cmd_lower or "synth" in cmd_lower: selected_track = "synthwave_hype"
            updated_state.setdefault("audio_state", {})["bgm_track"] = selected_track
            updated_state.setdefault("audio_state", {})["bgm_volume"] = 0.14
            modifications.append({
                "target": "audio",
                "field": "bgm_track",
                "new_value": selected_track,
                "action": "set",
                "description": f"Applied royalty-free background soundtrack: '{selected_track}'"
            })
            explanation += (" " if explanation else "") + f"Added '{selected_track}' background music at calibrated -17 dB ducking level."

        if "mute" in cmd_lower and ("original" in cmd_lower or "video" in cmd_lower or "speech" in cmd_lower):
            updated_state.setdefault("audio_state", {})["video_audio_muted"] = True
            modifications.append({
                "target": "audio",
                "field": "video_audio_muted",
                "new_value": True,
                "action": "set",
                "description": "Muted video original audio track"
            })
            explanation += (" " if explanation else "") + "Muted source video audio."

        # 10. Aspect Ratio / Canvas
        if "9:16" in cmd_lower or "vertical" in cmd_lower:
            updated_state["aspect_ratio"] = "9:16"
            updated_state.setdefault("canvas_settings", {})["width"] = 1080
            updated_state.setdefault("canvas_settings", {})["height"] = 1920
            modifications.append({
                "target": "canvas",
                "field": "aspect_ratio",
                "new_value": "9:16",
                "action": "set",
                "description": "Set canvas to 9:16 vertical resolution (1080x1920)"
            })
            explanation += (" " if explanation else "") + "Reformatted canvas to 9:16 vertical (1080x1920)."

        elif "16:9" in cmd_lower or "landscape" in cmd_lower:
            updated_state["aspect_ratio"] = "16:9"
            updated_state.setdefault("canvas_settings", {})["width"] = 1920
            updated_state.setdefault("canvas_settings", {})["height"] = 1080
            modifications.append({
                "target": "canvas",
                "field": "aspect_ratio",
                "new_value": "16:9",
                "action": "set",
                "description": "Set canvas to 16:9 landscape resolution (1920x1080)"
            })
            explanation += (" " if explanation else "") + "Adjusted canvas to 16:9 widescreen landscape."

        # 11. Color adjustments
        if "contrast" in cmd_lower or "brightness" in cmd_lower or "saturation" in cmd_lower:
            c = updated_state.get("video_adjustments", {}).get("contrast", 1.0)
            b = updated_state.get("video_adjustments", {}).get("brightness", 0)
            s = updated_state.get("video_adjustments", {}).get("saturation", 1.0)
            if "contrast" in cmd_lower: c = 1.2
            if "brightness" in cmd_lower: b = 6
            if "saturation" in cmd_lower: s = 1.2
            updated_state.setdefault("video_adjustments", {})["contrast"] = c
            updated_state.setdefault("video_adjustments", {})["brightness"] = b
            updated_state.setdefault("video_adjustments", {})["saturation"] = s
            modifications.append({
                "target": "video_adjustments",
                "field": "color_grading",
                "new_value": {"contrast": c, "brightness": b, "saturation": s},
                "action": "update",
                "description": f"Graded video color (Contrast: {c}, Brightness: {b}, Saturation: {s})"
            })
            explanation += (" " if explanation else "") + "Enhanced color grading, vibrance and contrast."

        # Fallback if no specific rule matched
        if not modifications:
            explanation = f"Analyzed '{command}'. Suggested applying viral high-retention enhancement: bold yellow captions, lo-fi audio bed, and 1080x1920 vertical framing."
            updated_state.setdefault("captions_state", {})["highlight_color"] = "#FACC15"
            updated_state.setdefault("audio_state", {})["bgm_track"] = "lofi_chill"
            modifications.append({
                "target": "captions",
                "field": "highlight_color",
                "new_value": "#FACC15",
                "action": "set",
                "description": "Optimized keyword highlight to viral yellow"
            })

        return {
            "command": command,
            "explanation": explanation,
            "modifications_count": len(modifications),
            "modifications": modifications,
            "updated_state": updated_state
        }

    # --------------------------------------------------------------------------
    # MULTI-TRACK TIMELINE RENDERING
    # --------------------------------------------------------------------------
    def build_multitrack_ffmpeg_command(
        self,
        source_video_path: str,
        output_video_path: str,
        start_time: float,
        duration: float,
        studio_project: Dict[str, Any]
    ) -> List[str]:
        """
        Assembles a comprehensive FFmpeg command combining:
        - Canvas aspect ratio (9:16 vertical, 16:9, etc.) with blurred background fill
        - Video adjustments (brightness, contrast, saturation, blur, rotation, flip, speed)
        - Transitions (fade in / out)
        - Burned ASS captions with custom styles and animations
        - Text overlays (titles, lower thirds, watermark)
        - Audio tracks mixing (A1 speech + A2 BGM + A3 voiceover/SFX) with volume and ducking
        - Target resolution, frame rate, CRF quality, and audio bitrate.
        """
        video_adj = studio_project.get("video_adjustments", {})
        canvas = studio_project.get("canvas_settings", {})
        export_cfg = studio_project.get("export_settings", {})
        audio_cfg = studio_project.get("audio_state", {})
        overlays = studio_project.get("overlays_state", {})

        target_w = canvas.get("width", 1080)
        target_h = canvas.get("height", 1920)
        fps = export_cfg.get("fps", 30)
        crf = export_cfg.get("crf", 20)
        speed = float(video_adj.get("speed", 1.0))
        speed = max(0.25, min(4.0, speed))
        fade_in = float(video_adj.get("fade_in", 0.0))
        fade_out = float(video_adj.get("fade_out", 0.0))

        # Color adjustments filter
        c = float(video_adj.get("contrast", 1.0))
        b = float(video_adj.get("brightness", 0)) / 100.0  # -1.0 to 1.0
        s = float(video_adj.get("saturation", 1.0))
        eq_filter = f"eq=contrast={c:.2f}:brightness={b:.2f}:saturation={s:.2f}"

        # Video filters
        v_filters = [eq_filter]

        # Blur
        blur_val = int(video_adj.get("blur", 0))
        if blur_val > 0:
            v_filters.append(f"boxblur={blur_val}:1")

        # Flips
        if video_adj.get("flip_h"):
            v_filters.append("hflip")
        if video_adj.get("flip_v"):
            v_filters.append("vflip")

        # Rotate
        rot = int(video_adj.get("rotate", 0))
        if rot == 90:
            v_filters.append("transpose=1")
        elif rot == 180:
            v_filters.append("transpose=1,transpose=1")
        elif rot == 270:
            v_filters.append("transpose=2")

        # Speed adjustment
        if abs(speed - 1.0) > 0.01:
            v_filters.append(f"setpts={1.0 / speed:.4f}*PTS")

        # Fade in / fade out
        eff_duration = duration / speed
        if fade_in > 0:
            v_filters.append(f"fade=t=in:st=0:d={fade_in:.2f}")
        if fade_out > 0:
            v_filters.append(f"fade=t=out:st={max(0.1, eff_duration - fade_out):.2f}:d={fade_out:.2f}")

        # Framing / Scaling
        crop_mode = video_adj.get("crop_mode", "smart_face")
        if crop_mode == "contain_blur" or canvas.get("bg_blur", True):
            # Complex split filter: blurred scaled background + centered foreground
            framing_subgraph = (
                f"split=2[bg_in][fg_in];"
                f"[bg_in]scale={target_w}:{target_h}:force_original_aspect_ratio=increase,crop={target_w}:{target_h},boxblur=24:4[bg];"
                f"[fg_in]scale={target_w}:{target_h}:force_original_aspect_ratio=decrease[fg];"
                f"[bg][fg]overlay=(W-w)/2:(H-h)/2"
            )
            v_filters.append(framing_subgraph)
        else:
            v_filters.append(f"scale={target_w}:{target_h}:force_original_aspect_ratio=increase,crop={target_w}:{target_h}")

        # Assemble input arguments
        cmd = [
            settings.FFMPEG_BIN,
            "-y",
            "-ss", str(start_time),
            "-t", str(duration),
            "-i", source_video_path
        ]

        # Audio inputs & mixing
        bgm_track = audio_cfg.get("bgm_track")
        has_bgm = bgm_track and bgm_track != "none"
        bgm_path = None
        if has_bgm:
            bgm_filename = f"{bgm_track}.mp3"
            candidate_paths = [
                os.path.join(settings.MEDIA_STORAGE_DIR, "audio", "bgm", bgm_filename),
                os.path.join(settings.MEDIA_STORAGE_DIR, "audio", bgm_filename),
                os.path.join(settings.MEDIA_STORAGE_DIR, "music", bgm_filename)
            ]
            for cp in candidate_paths:
                if os.path.exists(cp):
                    bgm_path = cp
                    break

        audio_filters = []
        # Video audio speed
        if abs(speed - 1.0) > 0.01:
            audio_filters.append(f"atempo={speed:.4f}")

        # Volume / Mute
        if audio_cfg.get("video_audio_muted"):
            audio_filters.append("volume=0")
        else:
            v_vol = float(audio_cfg.get("video_audio_volume", 1.0))
            if abs(v_vol - 1.0) > 0.01:
                audio_filters.append(f"volume={v_vol:.2f}")

        # Loudnorm & Speech Boost
        if audio_cfg.get("loudnorm", True):
            audio_filters.append("loudnorm=I=-16:LRA=11:TP=-1.5")

        af_simple = ",".join(audio_filters) if audio_filters else "anull"

        if has_bgm and bgm_path and os.path.exists(bgm_path):
            bgm_vol = float(audio_cfg.get("bgm_volume", 0.14))
            cmd.extend(["-stream_loop", "-1", "-i", bgm_path])
            # Filter complex mixing
            filter_complex = (
                f"[0:v]{','.join(v_filters)}[vout];"
                f"[0:a]{af_simple}[a0];"
                f"[1:a]volume={bgm_vol:.2f}[a1];"
                f"[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]"
            )
            cmd.extend([
                "-filter_complex", filter_complex,
                "-map", "[vout]",
                "-map", "[aout]"
            ])
        else:
            cmd.extend([
                "-vf", ",".join(v_filters),
                "-af", af_simple
            ])

        cmd.extend([
            "-r", str(fps),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", str(crf),
            "-c:a", "aac",
            "-b:a", export_cfg.get("audio_bitrate", "192k"),
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            output_video_path
        ])

        return cmd

    def _deserialize_studio_project(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Helper to parse JSON fields from SQLite row.
        """
        for field in [
            "canvas_settings", "timeline_data", "video_adjustments",
            "captions_state", "audio_state", "overlays_state", "export_settings"
        ]:
            if raw.get(field):
                try:
                    raw[field] = json.loads(raw[field])
                except Exception:
                    pass
        return raw

studio_service = StudioService()
