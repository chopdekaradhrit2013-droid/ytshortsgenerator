import pytest
import numpy as np
import cv2
import os
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.video_reframer import video_reframer
from backend.app.core.database import get_db_connection

client = TestClient(app)

def test_visual_subject_and_motion_detection():
    """Verify that computer vision detects visual subjects, motion centroids, and secondary subjects."""
    # Create two synthetic 1280x720 frames
    frame1 = np.zeros((720, 1280, 3), dtype=np.uint8)
    # Add high-contrast simulated subject on left
    cv2.rectangle(frame1, (200, 150), (400, 450), (255, 255, 255), -1)

    frame2 = np.zeros((720, 1280, 3), dtype=np.uint8)
    # Subject moves slightly right
    cv2.rectangle(frame2, (350, 150), (550, 450), (255, 255, 255), -1)

    prev_gray = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
    detection = video_reframer.detect_visual_subjects(frame2, prev_gray=prev_gray)

    assert "primary_subject" in detection
    assert "motion_energy" in detection
    assert detection["motion_energy"] > 0.0
    assert 0.2 <= detection["motion_center_x"] <= 0.6

def test_smart_camera_tracking_and_smoothing():
    """Verify camera tracking smoothing dampens sudden trajectory jumps."""
    raw_trajectory = [
        {"time": 0.0, "center_x": 0.30, "center_y": 0.35, "face_count": 1},
        {"time": 0.5, "center_x": 0.31, "center_y": 0.35, "face_count": 1},
        {"time": 1.0, "center_x": 0.70, "center_y": 0.35, "face_count": 1}, # sudden movement
        {"time": 1.5, "center_x": 0.72, "center_y": 0.35, "face_count": 1},
        {"time": 2.0, "center_x": 0.73, "center_y": 0.35, "face_count": 1}
    ]

    smoothed = video_reframer._smooth_trajectory_across_shots(
        raw_trajectory=raw_trajectory,
        clip_cuts=[],
        smoothness=0.85,
        quality_mode="smart"
    )

    assert len(smoothed) == len(raw_trajectory)
    # The jump from 0.31 to 0.70 at index 2 must be softened by smoothing
    smoothed_jump_x = smoothed[2]["center_x"]
    assert smoothed_jump_x < 0.65 # Camera smoothly transitions rather than jumping instantly
    assert smoothed_jump_x > 0.35

def test_scene_detection_reset_no_jump_pans():
    """Verify that camera tracking resets at hard scene cuts rather than panning across shots."""
    raw_trajectory = [
        {"time": 1.0, "center_x": 0.25, "center_y": 0.35, "face_count": 1},
        {"time": 2.0, "center_x": 0.25, "center_y": 0.35, "face_count": 1},
        # Scene cut occurs at t=3.0s
        {"time": 3.0, "center_x": 0.80, "center_y": 0.35, "face_count": 1},
        {"time": 4.0, "center_x": 0.80, "center_y": 0.35, "face_count": 1}
    ]

    smoothed = video_reframer._smooth_trajectory_across_shots(
        raw_trajectory=raw_trajectory,
        clip_cuts=[3.0],
        smoothness=0.85,
        quality_mode="smart"
    )

    # Immediately after the cut (t=3.0), position should snap to 0.80 without lagging from shot 1
    post_cut_point = next(pt for pt in smoothed if pt["time"] == 3.0)
    assert abs(post_cut_point["center_x"] - 0.80) <= 0.05

def test_multi_speaker_and_split_screen():
    """Verify multi-speaker stacked split-screen layout generation."""
    filter_string, box = video_reframer.compute_crop_filter(
        source_width=1920,
        source_height=1080,
        crop_mode="split_screen",
        split_speaker1_x=0.25,
        split_speaker2_x=0.75
    )

    assert "[vtop]" in filter_string
    assert "[vbot]" in filter_string
    assert "vstack=inputs=2" in filter_string
    assert box["layout"] == "stacked_top_bottom"
    assert box["split_h"] == 960
    assert box["split_w"] == 1080

def test_face_aware_headroom_and_safe_area():
    """Verify vertical safe area and headroom clamping for vertical video portrait framing."""
    filter_string, box = video_reframer.compute_crop_filter(
        source_width=1920,
        source_height=1080,
        center_x_ratio=0.5,
        center_y_ratio=0.10, # Very high face near ceiling
        crop_mode="smart_face",
        zoom_scale=1.2
    )

    # Must clamp crop_y >= 0 to protect headroom
    assert box["crop_y"] >= 0
    assert box["crop_w"] == 504
    assert box["crop_h"] == 900
    assert "crop=" in filter_string
    assert "scale=1080:1920" in filter_string

def test_manual_overrides_and_quality_modes():
    """Verify manual framing modes (center, left, right, custom) and quality modes."""
    # 1. Left mode
    f_left, box_left = video_reframer.compute_crop_filter(1920, 1080, crop_mode="manual_left")
    assert box_left["crop_x"] < 300

    # 2. Right mode
    f_right, box_right = video_reframer.compute_crop_filter(1920, 1080, crop_mode="manual_right")
    assert box_right["crop_x"] > 600

    # 3. Custom mode with zoom
    f_custom, box_custom = video_reframer.compute_crop_filter(
        1920, 1080, center_x_ratio=0.4, crop_mode="custom", zoom_scale=1.5
    )
    assert box_custom["zoom_scale"] == 1.5

def test_reframing_api_endpoints():
    """Verify REST API endpoints for reframing analysis, retrieval, and updates."""
    # Ensure test clip exists
    conn = get_db_connection()
    with conn:
        conn.execute("INSERT OR IGNORE INTO projects (id, name, status, created_at, updated_at) VALUES ('test_p_reframing', 'Reframing Test', 'ready', datetime('now'), datetime('now'));")
        conn.execute("""
            INSERT OR REPLACE INTO generated_clips (
                id, project_id, title, start_time, end_time, duration_seconds,
                engagement_score, aspect_ratio, resolution_width, resolution_height,
                status, created_at, updated_at
            ) VALUES (
                'test_c_reframing', 'test_p_reframing', 'Reframing Test Clip',
                10.0, 35.0, 25.0, 88, '9:16', 1080, 1920, 'ready', datetime('now'), datetime('now')
            );
        """)
    conn.close()

    # 1. POST /api/v1/reframing/analyze
    res_analyze = client.post("/api/v1/reframing/analyze", json={
        "clip_id": "test_c_reframing",
        "quality_mode": "smart",
        "manual_config": {"mode": "auto", "smoothness": 0.8}
    })
    assert res_analyze.status_code == 200
    data_analyze = res_analyze.json()
    assert data_analyze["status"] == "success"
    assert "tracking" in data_analyze
    assert "center_x_ratio" in data_analyze["tracking"]
    assert "crop_box" in data_analyze["tracking"]

    # 2. GET /api/v1/reframing/clip/test_c_reframing
    res_get = client.get("/api/v1/reframing/clip/test_c_reframing")
    assert res_get.status_code == 200
    data_get = res_get.json()
    assert data_get["clip_id"] == "test_c_reframing"
    assert "reframing_config" in data_get

    # 3. PATCH /api/v1/reframing/clip/test_c_reframing
    res_patch = client.patch("/api/v1/reframing/clip/test_c_reframing", json={
        "mode": "split_screen",
        "quality_mode": "precision",
        "split_layout": "stacked_top_bottom",
        "split_divider_color": "#A855F7",
        "speaker1_x_ratio": 0.25,
        "speaker2_x_ratio": 0.75,
        "zoom_scale": 1.1
    })
    assert res_patch.status_code == 200
    data_patch = res_patch.json()
    assert data_patch["status"] == "success"
    assert data_patch["reframing_config"]["mode"] == "split_screen"
    assert data_patch["reframing_config"]["quality_mode"] == "precision"
