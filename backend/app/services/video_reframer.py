import os
import cv2
import numpy as np
import re
from typing import Dict, Any, List, Tuple, Optional
from backend.app.core.config import settings
from backend.app.services.ffmpeg_service import ffmpeg_service

class IntelligentVideoReframer:
    """
    Intelligent computer-vision reframing and visual tracking engine.
    - Converts landscape footage (16:9, etc.) into professional vertical 9:16 Shorts (1080x1920)
    - Detects people, speakers, faces, objects, and visual motion centroids
    - Applies smooth camera tracking across moving subjects with scene-cut damping
    - Multi-speaker layouts: stacked split-screen, dynamic switching, or single-speaker focus
    - Face-aware safe headroom and vertical golden-ratio portrait framing
    - Quality modes: Standard (fast), Smart (balanced), Precision (dense tracking)
    - Manual overrides: crop position, zoom, split-screen layouts, and static framing
    """

    def __init__(self):
        # Load OpenCV Haar cascade for face detection
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        
        # Load profile face cascade if available
        profile_path = cv2.data.haarcascades + 'haarcascade_profileface.xml'
        self.profile_cascade = cv2.CascadeClassifier(profile_path) if os.path.exists(profile_path) else None

    # --------------------------------------------------------------------------
    # 1. VISUAL SUBJECT & MOTION DETECTION
    # --------------------------------------------------------------------------
    def detect_visual_subjects(
        self,
        frame: np.ndarray,
        prev_gray: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Analyzes a single video frame for visual subjects:
        - Primary & secondary faces (speakers)
        - Optical motion centroids (moving objects, gameplay, sports, action)
        - Saliency energy and bounding boxes
        """
        height, width = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Fast downscaled image for detection (10x faster Haar cascade execution)
        scale = min(1.0, 320.0 / max(width, 1))
        small_w = max(160, int(width * scale))
        small_h = max(90, int(height * scale))
        small_gray = cv2.resize(gray, (small_w, small_h), interpolation=cv2.INTER_NEAREST)
        inv_scale = 1.0 / scale

        # 1. Face detection
        faces = self.face_cascade.detectMultiScale(
            small_gray,
            scaleFactor=1.15,
            minNeighbors=3,
            minSize=(int(small_h * 0.08), int(small_h * 0.08))
        )

        detected_faces = []
        for (sx, sy, sw, sh) in faces:
            x = int(sx * inv_scale)
            y = int(sy * inv_scale)
            w = int(sw * inv_scale)
            h = int(sh * inv_scale)
            detected_faces.append({
                "x": x,
                "y": y,
                "w": w,
                "h": h,
                "center_x": float((x + (w / 2.0)) / width),
                "center_y": float((y + (h / 2.0)) / height),
                "area": int(w * h)
            })

        # Profile face detection if frontal detected 0 faces
        if len(detected_faces) == 0 and self.profile_cascade:
            p_faces = self.profile_cascade.detectMultiScale(
                small_gray,
                scaleFactor=1.15,
                minNeighbors=3,
                minSize=(int(small_h * 0.08), int(small_h * 0.08))
            )
            for (sx, sy, sw, sh) in p_faces:
                x = int(sx * inv_scale)
                y = int(sy * inv_scale)
                w = int(sw * inv_scale)
                h = int(sh * inv_scale)
                detected_faces.append({
                    "x": x,
                    "y": y,
                    "w": w,
                    "h": h,
                    "center_x": float((x + (w / 2.0)) / width),
                    "center_y": float((y + (h / 2.0)) / height),
                    "area": int(w * h)
                })

        # Sort detected faces by area descending (largest = primary subject)
        detected_faces.sort(key=lambda f: f["area"], reverse=True)

        # 2. Motion Detection via frame differencing
        motion_center_x = 0.5
        motion_center_y = 0.5
        motion_energy = 0.0
        motion_box = None

        if prev_gray is not None:
            diff = cv2.absdiff(prev_gray, gray)
            _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            significant_contours = [c for c in contours if cv2.contourArea(c) > (width * height * 0.005)]
            if significant_contours:
                largest_c = max(significant_contours, key=cv2.contourArea)
                mx, my, mw, mh = cv2.boundingRect(largest_c)
                motion_center_x = float((mx + (mw / 2.0)) / width)
                motion_center_y = float((my + (mh / 2.0)) / height)
                motion_energy = float(cv2.contourArea(largest_c) / (width * height))
                motion_box = [int(mx), int(my), int(mw), int(mh)]

        # 3. Determine Primary and Secondary Subjects
        primary_subject = None
        secondary_subject = None

        if len(detected_faces) > 0:
            primary_subject = detected_faces[0]
            # Check for a distinct secondary speaker separated horizontally by > 20%
            if len(detected_faces) > 1:
                p_cx = primary_subject["center_x"]
                for f in detected_faces[1:]:
                    if abs(f["center_x"] - p_cx) > 0.20:
                        secondary_subject = f
                        break
        elif motion_energy > 0.02 and motion_box:
            primary_subject = {
                "x": motion_box[0],
                "y": motion_box[1],
                "w": motion_box[2],
                "h": motion_box[3],
                "center_x": motion_center_x,
                "center_y": motion_center_y,
                "area": motion_box[2] * motion_box[3],
                "is_motion": True
            }
        else:
            primary_subject = {
                "x": int(width * 0.3),
                "y": int(height * 0.15),
                "w": int(width * 0.4),
                "h": int(height * 0.7),
                "center_x": 0.5,
                "center_y": 0.35,
                "area": int(width * height * 0.28),
                "is_default": True
            }

        return {
            "primary_subject": primary_subject,
            "secondary_subject": secondary_subject,
            "faces_count": len(detected_faces),
            "faces": detected_faces,
            "motion_energy": motion_energy,
            "motion_center_x": motion_center_x,
            "motion_center_y": motion_center_y,
            "gray_frame": gray
        }

    # --------------------------------------------------------------------------
    # 2. SMART CAMERA TRACKING & SMOOTH DAMPING
    # --------------------------------------------------------------------------
    def analyze_subject_tracking(
        self,
        video_path: str,
        start_time: float,
        duration: float,
        quality_mode: str = "smart",
        scene_cuts: Optional[List[float]] = None,
        manual_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Samples video frames across the clip interval, tracks visual subjects,
        applies smooth camera damping, respects scene cuts, and evaluates multi-speaker layouts.
        """
        manual_config = manual_config or {}
        override_mode = manual_config.get("mode")

        # Handle static manual overrides early if specified
        if override_mode == "manual_center":
            return self._build_static_reframing_response(0.5, 0.35, "manual_center", quality_mode)
        elif override_mode == "manual_left":
            return self._build_static_reframing_response(0.28, 0.35, "manual_left", quality_mode)
        elif override_mode == "manual_right":
            return self._build_static_reframing_response(0.72, 0.35, "manual_right", quality_mode)
        elif override_mode == "custom" and "center_x_ratio" in manual_config:
            cx = float(manual_config.get("center_x_ratio", 0.5))
            cy = float(manual_config.get("center_y_ratio", 0.35))
            return self._build_static_reframing_response(cx, cy, "custom", quality_mode, manual_config)

        if not os.path.exists(video_path):
            return self._build_static_reframing_response(0.5, 0.35, "auto", quality_mode)

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return self._build_static_reframing_response(0.5, 0.35, "auto", quality_mode)

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1920
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1080
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        start_frame = int(start_time * fps)
        end_frame = min(int((start_time + duration) * fps), total_frames)

        # Sampling step based on Quality Mode
        if quality_mode == "precision":
            sample_fps = 2.0
        elif quality_mode == "standard":
            sample_fps = 0.5
        else:  # "smart"
            sample_fps = 1.0

        total_clip_frames = max(1, end_frame - start_frame)
        max_samples = 15
        frame_step = max(int(fps / sample_fps), int(total_clip_frames / max_samples), 1)

        # Resolve scene cuts within the clip window
        clip_cuts: List[float] = []
        if scene_cuts:
            clip_cuts = [c for c in scene_cuts if start_time <= c <= (start_time + duration)]
        
        # Raw trajectory collection
        raw_trajectory: List[Dict[str, Any]] = []
        prev_gray = None
        current_frame_idx = start_frame
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

        face_detections_count = 0
        left_faces_count = 0
        right_faces_count = 0

        while current_frame_idx <= end_frame:
            cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame_idx)
            ret, frame = cap.read()
            if not ret:
                break

            frame_time = round(current_frame_idx / fps, 2)
            detection = self.detect_visual_subjects(frame, prev_gray=prev_gray)
            prev_gray = detection["gray_frame"]

            primary = detection["primary_subject"]
            secondary = detection["secondary_subject"]

            if detection["faces_count"] > 0:
                face_detections_count += 1
                for f in detection["faces"]:
                    if f["center_x"] < 0.45:
                        left_faces_count += 1
                    elif f["center_x"] > 0.55:
                        right_faces_count += 1

            raw_trajectory.append({
                "time": frame_time,
                "center_x": primary["center_x"],
                "center_y": primary["center_y"],
                "secondary_x": secondary["center_x"] if secondary else None,
                "secondary_y": secondary["center_y"] if secondary else None,
                "face_count": detection["faces_count"],
                "motion_energy": detection["motion_energy"]
            })

            current_frame_idx += frame_step

        cap.release()

        if not raw_trajectory:
            return self._build_static_reframing_response(0.5, 0.35, "auto", quality_mode)

        # ----------------------------------------------------------------------
        # 3. SCENE-AWARE CAMERA DAMPING (SMOOTHING)
        # ----------------------------------------------------------------------
        smoothness = float(manual_config.get("smoothness", 0.82))
        smoothed_trajectory = self._smooth_trajectory_across_shots(
            raw_trajectory=raw_trajectory,
            clip_cuts=clip_cuts,
            smoothness=smoothness,
            quality_mode=quality_mode
        )

        # ----------------------------------------------------------------------
        # 4. MULTI-SPEAKER / SPLIT-SCREEN EVALUATION
        # ----------------------------------------------------------------------
        total_samples = len(raw_trajectory)
        has_two_sides = (left_faces_count >= total_samples * 0.25) and (right_faces_count >= total_samples * 0.25)
        split_screen_recommended = has_two_sides and (face_detections_count >= total_samples * 0.4)

        speaker1_x = 0.28
        speaker2_x = 0.72

        # Extract representative speaker positions if 2 sides exist
        left_xs = [pt["center_x"] for pt in raw_trajectory if pt["center_x"] < 0.45]
        right_xs = [pt["center_x"] for pt in raw_trajectory if pt["center_x"] > 0.55]
        if left_xs:
            speaker1_x = round(float(np.median(left_xs)), 2)
        if right_xs:
            speaker2_x = round(float(np.median(right_xs)), 2)

        # Compute overall representative center_x and center_y ratios
        all_xs = [pt["center_x"] for pt in smoothed_trajectory]
        all_ys = [pt["center_y"] for pt in smoothed_trajectory]
        rep_center_x = round(float(np.median(all_xs)), 3) if all_xs else 0.5
        rep_center_y = round(float(np.median(all_ys)), 3) if all_ys else 0.35

        # Headroom safe area adjustment: keep center_y in upper golden ratio (0.22 - 0.42)
        safe_headroom = float(manual_config.get("safe_headroom", 0.15))
        rep_center_y = float(np.clip(rep_center_y, 0.20, 0.45))

        # Determine effective mode
        chosen_mode = override_mode or ("split_screen" if (split_screen_recommended and manual_config.get("split_screen_auto", True)) else "auto")

        # Compute standard crop box
        crop_filter, crop_box = self.compute_crop_filter(
            source_width=width,
            source_height=height,
            center_x_ratio=rep_center_x,
            center_y_ratio=rep_center_y,
            crop_mode=chosen_mode,
            zoom_scale=float(manual_config.get("zoom_scale", 1.0)),
            split_speaker1_x=speaker1_x,
            split_speaker2_x=speaker2_x
        )

        return {
            "source_width": width,
            "source_height": height,
            "center_x_ratio": rep_center_x,
            "center_y_ratio": rep_center_y,
            "mode": chosen_mode,
            "quality_mode": quality_mode,
            "face_detected": face_detections_count > 0,
            "face_count": max(1, int(round(np.mean([pt["face_count"] for pt in raw_trajectory])))) if face_detections_count > 0 else 0,
            "detection_confidence": round(face_detections_count / max(total_samples, 1), 2),
            "split_screen_recommended": split_screen_recommended,
            "split_layout": manual_config.get("split_layout", "stacked_top_bottom"),
            "split_divider_color": manual_config.get("split_divider_color", "#A855F7"),
            "speaker1_x_ratio": speaker1_x,
            "speaker2_x_ratio": speaker2_x,
            "safe_headroom": safe_headroom,
            "smoothness": smoothness,
            "zoom_scale": float(manual_config.get("zoom_scale", 1.0)),
            "scene_cuts": clip_cuts,
            "crop_box": crop_box,
            "filter_string": crop_filter,
            "trajectory": smoothed_trajectory[::max(1, len(smoothed_trajectory) // 25)], # 25 representative trajectory keyframes
            "sample_count": total_samples
        }

    # --------------------------------------------------------------------------
    # 3. SHOT-BASED TRAJECTORY SMOOTHING (NO WHIP-PANS ACROSS SCENE CUTS)
    # --------------------------------------------------------------------------
    def _smooth_trajectory_across_shots(
        self,
        raw_trajectory: List[Dict[str, Any]],
        clip_cuts: List[float],
        smoothness: float,
        quality_mode: str
    ) -> List[Dict[str, Any]]:
        """
        Partitions trajectory into shot segments delineated by scene cuts.
        Applies smooth damping within each shot, and resets on cuts to prevent jump-pans.
        """
        if not raw_trajectory:
            return []

        # Sort cuts
        sorted_cuts = sorted(clip_cuts)
        shots: List[List[Dict[str, Any]]] = []
        current_shot: List[Dict[str, Any]] = []

        cut_idx = 0
        for pt in raw_trajectory:
            t = pt["time"]
            if cut_idx < len(sorted_cuts) and t >= sorted_cuts[cut_idx]:
                if current_shot:
                    shots.append(current_shot)
                    current_shot = []
                cut_idx += 1
            current_shot.append(dict(pt))

        if current_shot:
            shots.append(current_shot)

        # Smooth within each shot independently
        alpha = max(0.08, min(0.95, 1.0 - (smoothness * 0.85)))
        smoothed_all: List[Dict[str, Any]] = []

        for shot in shots:
            if not shot:
                continue

            curr_x = shot[0]["center_x"]
            curr_y = shot[0]["center_y"]

            for pt in shot:
                # Exponential moving average filter
                curr_x = (alpha * pt["center_x"]) + ((1.0 - alpha) * curr_x)
                curr_y = (alpha * pt["center_y"]) + ((1.0 - alpha) * curr_y)

                # Clamp to avoid off-screen tracking
                clamped_x = float(np.clip(curr_x, 0.18, 0.82))
                clamped_y = float(np.clip(curr_y, 0.15, 0.85))

                pt["center_x"] = round(clamped_x, 3)
                pt["center_y"] = round(clamped_y, 3)
                smoothed_all.append(pt)

        return smoothed_all

    # --------------------------------------------------------------------------
    # 4. CROP FILTER AND SPLIT-SCREEN FILTERGRAPH BUILDER
    # --------------------------------------------------------------------------
    def compute_crop_filter(
        self,
        source_width: int,
        source_height: int,
        center_x_ratio: float = 0.5,
        center_y_ratio: float = 0.35,
        crop_mode: str = "auto",
        zoom_scale: float = 1.0,
        split_speaker1_x: float = 0.28,
        split_speaker2_x: float = 0.72
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Computes the complete FFmpeg video filtergraph to produce exact 1080x1920 (9:16).
        Supports:
        - Single-speaker smart framing
        - 2-Speaker Stacked Split-Screen (Top/Bottom 1080x960 each with accent divider)
        - Manual crop positions (Left, Right, Center, Custom X/Y)
        - Zoom scaling
        """
        target_w = 1080
        target_h = 1920
        target_aspect = 9.0 / 16.0 # 0.5625
        source_aspect = source_width / source_height if source_height > 0 else 1.777

        # ----------------------------------------------------------------------
        # A. MULTI-SPEAKER SPLIT-SCREEN LAYOUT (STACKED TOP / BOTTOM)
        # ----------------------------------------------------------------------
        if crop_mode == "split_screen":
            # In vertical 9:16 (1080x1920), top half is 1080x960 (9:8) and bottom is 1080x960 (9:8)
            split_h = 960
            split_w = 1080
            split_aspect = split_w / split_h # 1.125

            # Calculate crop width for each speaker
            crop_h = source_height
            crop_w = int(crop_h * split_aspect)
            if crop_w > source_width:
                crop_w = source_width
                crop_h = int(crop_w / split_aspect)

            # Speaker 1 crop (Left)
            s1_ideal_x = int(source_width * split_speaker1_x)
            s1_crop_x = max(0, min(source_width - crop_w, int(s1_ideal_x - (crop_w / 2.0))))
            s1_crop_x = s1_crop_x - (s1_crop_x % 2)

            # Speaker 2 crop (Right)
            s2_ideal_x = int(source_width * split_speaker2_x)
            s2_crop_x = max(0, min(source_width - crop_w, int(s2_ideal_x - (crop_w / 2.0))))
            s2_crop_x = s2_crop_x - (s2_crop_x % 2)

            crop_w = crop_w - (crop_w % 2)
            crop_h = crop_h - (crop_h % 2)

            # 2-Tier Stacked Vertical Filtergraph
            # [top] crops Speaker 1 -> scales to 1080x960
            # [bot] crops Speaker 2 -> scales to 1080x960
            # [top][bot]vstack -> 1080x1920 + 2px divider line
            split_filter = (
                f"[0:v]crop={crop_w}:{crop_h}:{s1_crop_x}:0,scale={split_w}:{split_h}:flags=lanczos[vtop];"
                f"[0:v]crop={crop_w}:{crop_h}:{s2_crop_x}:0,scale={split_w}:{split_h}:flags=lanczos[vbot];"
                f"[vtop][vbot]vstack=inputs=2,drawbox=x=0:y=959:w=1080:h=2:color=purple@0.8:t=fill"
            )

            return split_filter, {
                "layout": "stacked_top_bottom",
                "speaker1": {"crop_x": s1_crop_x, "crop_y": 0, "crop_w": crop_w, "crop_h": crop_h},
                "speaker2": {"crop_x": s2_crop_x, "crop_y": 0, "crop_w": crop_w, "crop_h": crop_h},
                "split_h": split_h,
                "split_w": split_w
            }

        # ----------------------------------------------------------------------
        # B. SINGLE-VIEW 9:16 VERTICAL CROP
        # ----------------------------------------------------------------------
        # If source is already vertical 9:16
        if abs(source_aspect - target_aspect) < 0.02 and zoom_scale <= 1.02:
            return (
                f"scale={target_w}:{target_h}:flags=lanczos",
                {"crop_x": 0, "crop_y": 0, "crop_w": source_width, "crop_h": source_height}
            )

        # Compute crop box based on 9:16 aspect ratio
        base_crop_h = source_height
        base_crop_w = int(base_crop_h * target_aspect)

        # Apply zoom scale (zooming in reduces the crop window dimensions)
        zoom = max(1.0, min(2.5, zoom_scale))
        crop_w = int(base_crop_w / zoom)
        crop_h = int(base_crop_h / zoom)

        if crop_w > source_width:
            crop_w = source_width
            crop_h = int(crop_w / target_aspect)
            crop_y = int((source_height - crop_h) / 2.0)
            crop_x = 0
        else:
            # Horizontal positioning
            if crop_mode == "manual_left":
                ideal_center_x = int(source_width * 0.28)
            elif crop_mode == "manual_right":
                ideal_center_x = int(source_width * 0.72)
            elif crop_mode == "manual_center":
                ideal_center_x = int(source_width * 0.50)
            else:  # "auto", "smart_face", "motion_action", "custom"
                ideal_center_x = int(source_width * center_x_ratio)

            crop_x = int(ideal_center_x - (crop_w / 2.0))
            crop_x = max(0, min(crop_x, source_width - crop_w))

            # Vertical positioning (Face Headroom Safe Area)
            if zoom > 1.05:
                ideal_center_y = int(source_height * center_y_ratio)
                crop_y = int(ideal_center_y - (crop_h * 0.35))
                crop_y = max(0, min(crop_y, source_height - crop_h))
            else:
                crop_y = 0

        # Ensure all dimensions and offsets are even for H.264
        crop_w = crop_w - (crop_w % 2)
        crop_h = crop_h - (crop_h % 2)
        crop_x = crop_x - (crop_x % 2)
        crop_y = crop_y - (crop_y % 2)

        crop_filter = f"crop={crop_w}:{crop_h}:{crop_x}:{crop_y},scale={target_w}:{target_h}:flags=lanczos"

        return crop_filter, {
            "crop_x": crop_x,
            "crop_y": crop_y,
            "crop_w": crop_w,
            "crop_h": crop_h,
            "zoom_scale": zoom
        }

    # --------------------------------------------------------------------------
    # 5. HELPER FOR STATIC OVERRIDES
    # --------------------------------------------------------------------------
    def _build_static_reframing_response(
        self,
        cx: float,
        cy: float,
        mode: str,
        quality_mode: str,
        manual_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        manual_config = manual_config or {}
        filter_str, crop_box = self.compute_crop_filter(
            source_width=1920,
            source_height=1080,
            center_x_ratio=cx,
            center_y_ratio=cy,
            crop_mode=mode,
            zoom_scale=float(manual_config.get("zoom_scale", 1.0))
        )
        return {
            "source_width": 1920,
            "source_height": 1080,
            "center_x_ratio": cx,
            "center_y_ratio": cy,
            "mode": mode,
            "quality_mode": quality_mode,
            "face_detected": False,
            "face_count": 1,
            "detection_confidence": 1.0,
            "split_screen_recommended": False,
            "split_layout": "stacked_top_bottom",
            "speaker1_x_ratio": 0.28,
            "speaker2_x_ratio": 0.72,
            "safe_headroom": 0.15,
            "smoothness": 0.85,
            "zoom_scale": float(manual_config.get("zoom_scale", 1.0)),
            "scene_cuts": [],
            "crop_box": crop_box,
            "filter_string": filter_str,
            "trajectory": [{"time": 0.0, "center_x": cx, "center_y": cy}],
            "sample_count": 1
        }

video_reframer = IntelligentVideoReframer()
