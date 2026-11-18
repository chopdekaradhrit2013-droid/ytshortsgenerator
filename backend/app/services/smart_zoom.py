import math
from typing import List, Dict, Any, Optional, Tuple

class SmartAIZoomEngine:
    """
    Intelligent zoom engine for YouTube Shorts.
    Detects key reaction moments and emotional peaks,
    and generates smooth punch-in zoom transitions that return to normal framing.
    """

    ZOOM_INTENSITIES = {
        "none": 1.0,
        "subtle": 1.12,
        "dynamic": 1.22,
        "dramatic": 1.32
    }

    KEY_WORDS = {
        "shocking", "insane", "crazy", "unbelievable", "never", "secret",
        "huge", "truth", "money", "died", "ruined", "billion", "danger",
        "mistake", "stop", "worst", "best", "exploded", "impossible"
    }

    def detect_zoom_moments(
        self,
        words: List[Dict[str, Any]],
        clip_duration: float,
        intensity: str = "dynamic"
    ) -> List[Tuple[float, float, float]]:
        """
        Scans clip transcription words for emotional peaks or punchlines,
        and identifies at most 1-2 key intervals [start_time, end_time, max_zoom].
        """
        if intensity == "none" or clip_duration < 8.0:
            return []

        max_zoom = self.ZOOM_INTENSITIES.get(intensity, 1.20)
        zoom_moments: List[Tuple[float, float, float]] = []

        # Find words with emotional keywords or exclamation
        candidate_times: List[float] = []
        for w in words:
            word_clean = w.get("word", "").lower().strip(".,!?:;\"'")
            if word_clean in self.KEY_WORDS or w.get("word", "").endswith("!"):
                candidate_times.append(w.get("start", 0.0))

        # If no specific keyword, place a subtle punch-in near the 35% mark of the video (classic retention hook)
        if not candidate_times:
            hook_time = clip_duration * 0.35
            zoom_moments.append((hook_time, min(hook_time + 2.5, clip_duration - 1.0), max_zoom))
        else:
            # Pick the strongest moment
            first_moment = candidate_times[0]
            z_start = max(1.0, first_moment - 0.5)
            z_end = min(z_start + 2.8, clip_duration - 1.0)
            zoom_moments.append((z_start, z_end, max_zoom))

            # If clip is longer than 25s, add a second peak moment if available
            if clip_duration >= 25.0 and len(candidate_times) > 1:
                second_moment = candidate_times[-1]
                if second_moment - z_end > 6.0:
                    s_start = second_moment - 0.5
                    s_end = min(s_start + 2.8, clip_duration - 1.0)
                    zoom_moments.append((s_start, s_end, max_zoom))

        return zoom_moments

    def build_zoom_filter(
        self,
        zoom_moments: List[Tuple[float, float, float]],
        target_w: int = 1080,
        target_h: int = 1920
    ) -> Optional[str]:
        """
        Builds a smooth sine-interpolated FFmpeg crop & scale filter.
        Smoothly scales into the subject and returns to 1.0x with zero black bars.
        """
        if not zoom_moments:
            return None

        # Build expression for zoom factor as a function of time 't'
        # Base zoom = 1.0
        expr_terms = ["1.0"]
        for z_start, z_end, max_z in zoom_moments:
            dur = max(z_end - z_start, 0.5)
            # Smooth bell curve sine window: (max_z - 1.0) * sin(PI * (t - z_start) / dur)
            term = (
                f"if(between(t,{round(z_start,2)},{round(z_end,2)}),"
                f"({round(max_z - 1.0, 3)}*sin(3.14159*(t-{round(z_start,2)})/{round(dur,2)})),0)"
            )
            expr_terms.append(term)

        zoom_expr = "+".join(expr_terms)

        # Apply dynamic crop and scale back to 1080x1920
        # When zoom > 1.0, w = 1080 / zoom, h = 1920 / zoom
        filter_str = (
            f"crop=w='min(iw,iw/({zoom_expr}))':h='min(ih,ih/({zoom_expr}))':"
            f"x='(iw-ow)/2':y='(ih-oh)/2',"
            f"scale={target_w}:{target_h}:flags=lanczos"
        )
        return filter_str

smart_zoom_engine = SmartAIZoomEngine()

