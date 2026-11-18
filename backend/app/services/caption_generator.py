import os
import re
from typing import List, Dict, Any, Optional

def hex_to_ass_color(hex_str: Optional[str], alpha_hex: str = "00") -> str:
    """
    Converts CSS hex color (#RRGGBB) to ASS color format (&HAABBGGRR&).
    In ASS: Alpha 00 = fully opaque, FF = fully transparent.
    """
    if not hex_str:
        return f"&H{alpha_hex}000000&"
    clean_hex = str(hex_str).strip().lstrip('#')
    if len(clean_hex) == 3:
        clean_hex = "".join([c * 2 for c in clean_hex])
    if len(clean_hex) != 6:
        return f"&H{alpha_hex}FFFFFF&"
    r = clean_hex[0:2]
    g = clean_hex[2:4]
    b = clean_hex[4:6]
    return f"&H{alpha_hex}{b}{g}{r}&"

def format_ass_time(seconds: float) -> str:
    """
    Formats float seconds into ASS timestamp format: H:MM:SS.cs
    """
    if seconds < 0:
        seconds = 0.0
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))
    if cs >= 100:
        cs = 99
    return f"{hrs}:{mins:02d}:{secs:02d}.{cs:02d}"

class AdvancedCaptionGenerator:
    """
    State-of-the-art captioning & subtitle engine for YouTube Shorts:
    - 6 Professional Style Presets (MrBeast, Hormozi, Minimal, Gaming, Cinematic, Karaoke)
    - Active word-by-word highlighting with scale pop-in animations
    - Smart Face Avoidance: dynamically repositions captions away from detected faces
    - Safe mobile margins avoiding YouTube Shorts UI overlay zones
    - Multilingual & Indian languages UTF-8 support (Hindi, Marathi, Tamil, Telugu, etc.)
    - Structured editable segments conversion for manual subtitle corrections
    """

    PRESETS: Dict[str, Dict[str, Any]] = {
        "mrbeast": {
            "name": "MrBeast Viral Dynamic",
            "font_family": "Impact",
            "font_size": 56,
            "font_weight": 900,
            "primary_color": "#FFFFFF",
            "highlight_color": "#00FF00",  # Acid Neon Green
            "dimmed_color": "#FFFFFF",
            "outline_color": "#000000",
            "outline_width": 6.0,
            "shadow_offset": 3.0,
            "alignment": 2,  # Bottom-center
            "margin_v": 320,  # Safe above YouTube bottom title bar
            "margin_lr": 60,
            "uppercase": True,
            "words_per_line": 3,
            "pop_animation": True,
            "scale_bump": 115,
            "bg_color": None,
            "bg_opacity": 0.0
        },
        "bold_pop": {
            "name": "Hormozi Viral Bold",
            "font_family": "Montserrat",
            "font_size": 52,
            "font_weight": 900,
            "primary_color": "#FFFFFF",
            "highlight_color": "#FACC15",  # Vibrant Yellow
            "dimmed_color": "#FFFFFF",
            "outline_color": "#000000",
            "outline_width": 4.5,
            "shadow_offset": 2.0,
            "alignment": 2,
            "margin_v": 320,
            "margin_lr": 60,
            "uppercase": True,
            "words_per_line": 4,
            "pop_animation": True,
            "scale_bump": 112,
            "bg_color": None,
            "bg_opacity": 0.0
        },
        "minimal": {
            "name": "Clean Minimalist",
            "font_family": "Inter",
            "font_size": 38,
            "font_weight": 600,
            "primary_color": "#FFFFFF",
            "highlight_color": "#38BDF8",  # Sky Blue
            "dimmed_color": "#FFFFFF",
            "outline_color": "#1E293B",
            "outline_width": 2.2,
            "shadow_offset": 1.0,
            "alignment": 2,
            "margin_v": 280,
            "margin_lr": 60,
            "uppercase": False,
            "words_per_line": 5,
            "pop_animation": False,
            "scale_bump": 100,
            "bg_color": "#000000",
            "bg_opacity": 0.4
        },
        "gaming": {
            "name": "Dynamic Gaming",
            "font_family": "Impact",
            "font_size": 52,
            "font_weight": 900,
            "primary_color": "#FFFFFF",
            "highlight_color": "#00F0FF",  # Neon Cyan
            "dimmed_color": "#FFFFFF",
            "outline_color": "#000000",
            "outline_width": 5.5,
            "shadow_offset": 3.0,
            "alignment": 5,  # Middle-center
            "margin_v": 450,
            "margin_lr": 60,
            "uppercase": True,
            "words_per_line": 4,
            "pop_animation": True,
            "scale_bump": 118,
            "bg_color": None,
            "bg_opacity": 0.0
        },
        "podcast": {
            "name": "Modern Podcast",
            "font_family": "Helvetica",
            "font_size": 44,
            "font_weight": 700,
            "primary_color": "#FFFFFF",
            "highlight_color": "#F59E0B",  # Amber Gold
            "dimmed_color": "#FFFFFF",
            "outline_color": "#111827",
            "outline_width": 3.0,
            "shadow_offset": 1.5,
            "alignment": 2,
            "margin_v": 300,
            "margin_lr": 60,
            "uppercase": False,
            "words_per_line": 5,
            "pop_animation": True,
            "scale_bump": 108,
            "bg_color": None,
            "bg_opacity": 0.0
        },
        "cinematic": {
            "name": "Cinematic Story",
            "font_family": "Georgia",
            "font_size": 36,
            "font_weight": 600,
            "primary_color": "#F3F4F6",
            "highlight_color": "#FBBF24",  # Soft Gold
            "dimmed_color": "#D1D5DB",
            "outline_color": "#000000",
            "outline_width": 2.0,
            "shadow_offset": 1.0,
            "alignment": 2,
            "margin_v": 240,
            "margin_lr": 70,
            "uppercase": False,
            "words_per_line": 6,
            "pop_animation": False,
            "scale_bump": 100,
            "bg_color": None,
            "bg_opacity": 0.0
        },
        "karaoke": {
            "name": "Karaoke Word Highlight",
            "font_family": "Inter",
            "font_size": 46,
            "font_weight": 800,
            "primary_color": "#FFFFFF",
            "highlight_color": "#A855F7",  # Vibrant Purple
            "dimmed_color": "#9CA3AF",     # Dimmed Gray for unspoken words
            "outline_color": "#000000",
            "outline_width": 3.8,
            "shadow_offset": 2.0,
            "alignment": 2,
            "margin_v": 320,
            "margin_lr": 60,
            "uppercase": False,
            "words_per_line": 4,
            "pop_animation": True,
            "scale_bump": 110,
            "bg_color": None,
            "bg_opacity": 0.0
        }
    }

    def words_to_editable_segments(
        self,
        words: List[Dict[str, Any]],
        clip_start: float,
        clip_duration: float,
        words_per_line: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Partitions raw Whisper words into clean, structured, editable subtitle segments
        with speaker identifiers, emphasis flags, and normalized relative timestamps.
        """
        clip_end = clip_start + clip_duration
        relevant_words = []
        for idx, w in enumerate(words):
            w_start = w.get("start", 0.0)
            w_end = w.get("end", 0.0)
            if w_end > clip_start and w_start < clip_end:
                adj_start = round(max(0.0, w_start - clip_start), 2)
                adj_end = round(min(clip_duration, w_end - clip_start), 2)
                clean_text = str(w.get("word", "")).strip()
                if clean_text:
                    relevant_words.append({
                        "id": f"w_{idx}_{int(adj_start*100)}",
                        "word": clean_text,
                        "start": adj_start,
                        "end": max(adj_end, adj_start + 0.15),
                        "emphasis": clean_text.endswith("!") or len(clean_text) > 8,
                        "speaker": w.get("speaker", "Speaker 1")
                    })

        segments: List[Dict[str, Any]] = []
        current_segment_words: List[Dict[str, Any]] = []

        for w in relevant_words:
            current_segment_words.append(w)
            has_pause = w["word"].endswith((".", "!", "?", ",", ";", ":"))
            if len(current_segment_words) >= words_per_line or has_pause:
                seg_id = f"seg_{len(segments)+1}"
                seg_start = current_segment_words[0]["start"]
                seg_end = current_segment_words[-1]["end"]
                seg_text = " ".join([item["word"] for item in current_segment_words])
                segments.append({
                    "id": seg_id,
                    "start": seg_start,
                    "end": seg_end,
                    "text": seg_text,
                    "speaker": current_segment_words[0].get("speaker", "Speaker 1"),
                    "words": current_segment_words
                })
                current_segment_words = []

        if current_segment_words:
            seg_id = f"seg_{len(segments)+1}"
            seg_start = current_segment_words[0]["start"]
            seg_end = current_segment_words[-1]["end"]
            seg_text = " ".join([item["word"] for item in current_segment_words])
            segments.append({
                "id": seg_id,
                "start": seg_start,
                "end": seg_end,
                "text": seg_text,
                "speaker": current_segment_words[0].get("speaker", "Speaker 1"),
                "words": current_segment_words
            })

        return segments

    def generate_ass_script_from_segments(
        self,
        segments: List[Dict[str, Any]],
        clip_duration: float,
        output_ass_path: str,
        preset: str = "bold_pop",
        custom_overrides: Optional[Dict[str, Any]] = None,
        face_center_y_ratio: float = 0.35,
        hook_text: Optional[str] = None
    ) -> str:
        """
        Builds a production ASS subtitle script from structured editable segments.
        Features Smart Face Avoidance: moves captions away from detected faces.
        """
        # Resolve preset (alias 'hormozi' -> 'bold_pop', 'clean' -> 'minimal')
        normalized_preset = preset.lower()
        if normalized_preset == "hormozi":
            normalized_preset = "bold_pop"
        elif normalized_preset == "clean":
            normalized_preset = "minimal"

        style_config = dict(self.PRESETS.get(normalized_preset, self.PRESETS["bold_pop"]))
        if custom_overrides:
            style_config.update(custom_overrides)

        os.makedirs(os.path.dirname(output_ass_path), exist_ok=True)

        primary_ass = hex_to_ass_color(style_config["primary_color"])
        highlight_ass = hex_to_ass_color(style_config["highlight_color"])
        dimmed_ass = hex_to_ass_color(style_config.get("dimmed_color", style_config["primary_color"]))
        outline_ass = hex_to_ass_color(style_config["outline_color"])

        # SMART CAPTION PLACEMENT (FACE AVOIDANCE)
        # If speaker face is in the lower half of the frame (Y > 0.58), reposition captions to middle or upper area
        pos_setting = style_config.get("position", "auto")
        if pos_setting == "auto":
            if face_center_y_ratio > 0.58:
                # Face is low: push captions to middle safe area
                alignment = 5  # Middle-center
                margin_v = 450
            else:
                # Face is normal/high: place at standard safe bottom
                alignment = 2  # Bottom-center
                margin_v = 320
        elif pos_setting == "top":
            alignment = 8
            margin_v = 180
        elif pos_setting == "middle":
            alignment = 5
            margin_v = 450
        else:
            alignment = 2
            margin_v = style_config.get("margin_v", 320)

        uppercase = style_config.get("uppercase", False)
        scale_bump = style_config.get("scale_bump", 112)
        pop_anim = style_config.get("pop_animation", True)
        is_karaoke = normalized_preset == "karaoke"

        # Background box style: BorderStyle=3 produces an opaque/translucent backing box
        border_style = 3 if (style_config.get("bg_color") and style_config.get("bg_opacity", 0) > 0.1) else 1
        bg_alpha = hex(int(round((1.0 - min(style_config.get("bg_opacity", 0.5), 1.0)) * 255)))[2:].zfill(2).upper()
        bg_ass = hex_to_ass_color(style_config.get("bg_color") or "#000000", alpha_hex=bg_alpha)

        # Assemble ASS Header
        lines = [
            "[Script Info]",
            "Title: AI Shorts Factory Advanced Subtitles System",
            "ScriptType: v4.00+",
            "WrapStyle: 0",
            "ScaledBorderAndShadow: yes",
            "YCbCr Matrix: TV.709",
            "PlayResX: 1080",
            "PlayResY: 1920",
            "",
            "[V4+ Styles]",
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
            (
                f"Style: Default,{style_config['font_family']},{style_config['font_size']},"
                f"{primary_ass},{highlight_ass},{outline_ass},{bg_ass},"
                f"1,0,0,0,100,100,0,0,{border_style},{style_config['outline_width']},{style_config['shadow_offset']},"
                f"{alignment},{style_config['margin_lr']},{style_config['margin_lr']},{margin_v},1"
            ),
            (
                f"Style: HookBanner,Impact,48,&H00FFFFFF&,&H0000D7FF&,&H00000000&,&H80000000&,"
                f"1,0,0,0,100,100,0,0,1,4.5,2.0,8,60,60,180,1"
            ),
            "",
            "[Events]",
            "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"
        ]

        # Add Opening Hook Banner in first 3.5 seconds if enabled
        if hook_text and hook_text.strip():
            hook_start = format_ass_time(0.0)
            hook_end = format_ass_time(min(3.5, clip_duration))
            clean_hook = hook_text.strip().upper()
            lines.append(
                f"Dialogue: 1,{hook_start},{hook_end},HookBanner,,0,0,0,,{{\\c&H00D7FF&\\b1\\shad2\\bord4}}{clean_hook}"
            )

        # Generate Word-by-Word Highlight Events for each segment
        for seg in segments:
            seg_words = seg.get("words", [])
            if not seg_words:
                continue

            seg_start = seg["start"]
            seg_end = seg["end"]

            for idx, active_w in enumerate(seg_words):
                w_start = active_w["start"]
                if idx < len(seg_words) - 1:
                    w_end = seg_words[idx + 1]["start"]
                else:
                    w_end = seg_end

                if w_end <= w_start:
                    w_end = w_start + 0.22

                start_str = format_ass_time(w_start)
                end_str = format_ass_time(w_end)

                # Assemble phrase
                text_parts = []
                for j, w in enumerate(seg_words):
                    word_str = w["word"].upper() if uppercase else w["word"]
                    if j == idx:
                        # Active word: Highlight color + subtle pop scale
                        if pop_anim and scale_bump > 100:
                            text_parts.append(f"{{\\c{highlight_ass}\\b1\\fscx{scale_bump}\\fscy{scale_bump}}}{word_str}{{\\fscx100\\fscy100\\c{primary_ass}}}")
                        else:
                            text_parts.append(f"{{\\c{highlight_ass}\\b1}}{word_str}{{\\c{primary_ass}}}")
                    elif j < idx:
                        # Spoken earlier
                        text_parts.append(f"{{\\c{primary_ass}}}{word_str}")
                    else:
                        # Future word in phrase
                        if is_karaoke:
                            text_parts.append(f"{{\\c{dimmed_ass}}}{word_str}")
                        else:
                            text_parts.append(f"{{\\c{primary_ass}}}{word_str}")

                dialogue_text = " ".join(text_parts)
                lines.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{dialogue_text}")

        with open(output_ass_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return output_ass_path

    def generate_ass_script(
        self,
        words: List[Dict[str, Any]],
        clip_start: float,
        clip_duration: float,
        output_ass_path: str,
        preset: str = "bold_pop",
        custom_overrides: Optional[Dict[str, Any]] = None,
        face_center_y_ratio: float = 0.35,
        hook_text: Optional[str] = None
    ) -> str:
        """
        Legacy wrapper converting raw words array into segments and generating ASS script.
        """
        words_per_line = (custom_overrides or {}).get("words_per_line", 4)
        segments = self.words_to_editable_segments(
            words=words,
            clip_start=clip_start,
            clip_duration=clip_duration,
            words_per_line=words_per_line
        )
        return self.generate_ass_script_from_segments(
            segments=segments,
            clip_duration=clip_duration,
            output_ass_path=output_ass_path,
            preset=preset,
            custom_overrides=custom_overrides,
            face_center_y_ratio=face_center_y_ratio,
            hook_text=hook_text
        )

caption_generator = AdvancedCaptionGenerator()
