import os
import subprocess
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection
from backend.app.services.video_reframer import video_reframer
from backend.app.services.caption_generator import caption_generator
from backend.app.services.smart_zoom import smart_zoom_engine
from backend.app.services.audio_enhancer import audio_enhancer
from backend.app.services.hook_service import hook_service
from backend.app.services.quality_control import quality_control
from backend.app.services.export_manager import export_manager

client = TestClient(app)

TEST_VIDEO_16_9 = os.path.join(settings.MEDIA_STORAGE_DIR, "uploads", "test_editing_16_9.mp4")

@pytest.fixture(scope="session", autouse=True)
def setup_editing_test_video():
    """Generates a 12-second 1280x720 video with 440Hz test audio for editing tests."""
    os.makedirs(os.path.dirname(TEST_VIDEO_16_9), exist_ok=True)
    if not os.path.exists(TEST_VIDEO_16_9):
        cmd = [
            settings.FFMPEG_BIN,
            "-y",
            "-f", "lavfi",
            "-i", "testsrc=duration=12:size=1280x720:rate=30",
            "-f", "lavfi",
            "-i", "sine=frequency=440:duration=12",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-c:a", "aac",
            "-pix_fmt", "yuv420p",
            TEST_VIDEO_16_9
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    # Seed test project, source video and clip in SQLite
    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT OR IGNORE INTO projects (id, name, created_at, updated_at)
            VALUES ('test_edit_proj', 'Test Editing Project', datetime('now'), datetime('now'));
        """)
        conn.execute("""
            INSERT OR IGNORE INTO source_videos (
                id, project_id, original_filename, storage_path, file_size_bytes, created_at, updated_at
            ) VALUES ('test_edit_src', 'test_edit_proj', 'test_editing_16_9.mp4', ?, 1024, datetime('now'), datetime('now'));
        """, (TEST_VIDEO_16_9,))
        conn.execute("""
            INSERT OR IGNORE INTO generated_clips (
                id, project_id, source_video_id, title, summary, hook_sentence,
                start_time, end_time, duration_seconds, engagement_score,
                aspect_ratio, resolution_width, resolution_height,
                status, created_at, updated_at
            ) VALUES (
                'test_edit_clip_1', 'test_edit_proj', 'test_edit_src',
                'Unbelievable AI Breakthrough Nobody Expected',
                'Explains how autonomous agent workflows achieve 10x faster execution.',
                'Most developers have no idea this tool even exists yet.',
                1.0, 7.0, 6.0, 95, '9:16', 1080, 1920, 'ready',
                datetime('now'), datetime('now')
            );
        """)
    conn.close()

    yield TEST_VIDEO_16_9

def test_intelligent_video_reframing():
    """Verifies OpenCV subject tracking and 9:16 crop filter calculations."""
    tracking = video_reframer.analyze_subject_tracking(
        video_path=TEST_VIDEO_16_9,
        start_time=1.0,
        duration=4.0
    )
    assert "center_x_ratio" in tracking
    assert 0.0 <= tracking["center_x_ratio"] <= 1.0

    # Test landscape 1280x720 crop filter
    crop_filter, box = video_reframer.compute_crop_filter(
        source_width=1280,
        source_height=720,
        center_x_ratio=tracking["center_x_ratio"],
        crop_mode="smart_face"
    )
    assert "crop=" in crop_filter
    assert "scale=1080:1920" in crop_filter
    assert box["crop_h"] == 720
    assert box["crop_w"] == int(720 * 9 / 16) - (int(720 * 9 / 16) % 2)

def test_caption_generator_ass_and_presets():
    """Verifies timed ASS subtitle generation across all 5 styling presets."""
    sample_words = [
        {"word": "Most", "start": 1.0, "end": 1.4},
        {"word": "people", "start": 1.4, "end": 1.8},
        {"word": "never", "start": 1.8, "end": 2.2},
        {"word": "realize", "start": 2.2, "end": 2.8},
        {"word": "this!", "start": 2.8, "end": 3.4}
    ]

    for preset_name in ["bold_pop", "clean", "gaming", "podcast", "cinematic"]:
        out_ass = os.path.join(settings.MEDIA_STORAGE_DIR, "captions", f"test_{preset_name}.ass")
        script_path = caption_generator.generate_ass_script(
            words=sample_words,
            clip_start=1.0,
            clip_duration=3.0,
            output_ass_path=out_ass,
            preset=preset_name,
            hook_text="DON'T MISS THIS..."
        )
        assert os.path.exists(script_path)
        with open(script_path, "r", encoding="utf-8") as f:
            content = f.read()

        assert "[Script Info]" in content
        assert "PlayResX: 1080" in content
        assert "PlayResY: 1920" in content
        assert "DON'T MISS THIS..." in content
        assert "Dialogue:" in content
        # Check active word highlight tag exists
        assert r"\c&H" in content

def test_smart_zoom_filter_generation():
    """Verifies emotion peak detection and smooth sine zoom expressions."""
    words = [
        {"word": "This", "start": 1.0, "end": 1.3},
        {"word": "was", "start": 1.3, "end": 1.5},
        {"word": "completely", "start": 1.5, "end": 1.9},
        {"word": "shocking!", "start": 1.9, "end": 2.5}
    ]
    moments = smart_zoom_engine.detect_zoom_moments(words, clip_duration=10.0, intensity="dynamic")
    assert len(moments) >= 1
    z_start, z_end, max_z = moments[0]
    assert z_end > z_start
    assert max_z == 1.22

    zoom_filter = smart_zoom_engine.build_zoom_filter(moments)
    assert zoom_filter is not None
    assert "sin(" in zoom_filter
    assert "scale=1080:1920" in zoom_filter

def test_audio_enhancer_loudnorm_and_bgm():
    """Verifies EBU R128 loudnorm, speech EQ, and background music ducking."""
    spec_no_bgm = audio_enhancer.build_audio_filtergraph(
        clip_duration=6.0,
        enable_loudnorm=True,
        enable_denoise=True,
        enable_speech_boost=True
    )
    assert spec_no_bgm["has_bgm"] is False
    assert "loudnorm=I=-14" in spec_no_bgm["filter_simple"]
    assert "highpass=f=80" in spec_no_bgm["filter_simple"]
    assert "equalizer=f=3000" in spec_no_bgm["filter_simple"]
    assert "afade=" in spec_no_bgm["filter_simple"]

    # Test with BGM
    spec_bgm = audio_enhancer.build_audio_filtergraph(
        clip_duration=6.0,
        bgm_track_name="lofi_ambient",
        bgm_volume=0.15
    )
    assert spec_bgm["has_bgm"] is True
    assert spec_bgm["bgm_input_path"] is not None
    assert "amix=" in spec_bgm["filter_complex"]

def test_hook_generator_suggestions():
    """Verifies that 3 contextual opening hook suggestions are produced."""
    hooks = hook_service.generate_hooks_for_clip(
        title="10X Productivity With AI Coding Agents",
        summary="Deep technical breakdown on agent orchestration replacing syntax.",
        transcript_snippet="Nobody realizes how fast this is moving.",
        category="podcast"
    )
    assert len(hooks) == 3
    types = [h["type"] for h in hooks]
    assert "Curiosity Question" in types
    assert "Dramatic Impact" in types
    assert "Payoff Hint" in types

def test_quality_control_inspector():
    """Verifies automated QC checks on a valid 1080x1920 MP4 file."""
    qc_sample_path = os.path.join(settings.MEDIA_STORAGE_DIR, "exports", "qc_sample_test.mp4")
    # Render a small 2-second vertical test clip
    cmd = [
        settings.FFMPEG_BIN,
        "-y",
        "-f", "lavfi",
        "-i", "testsrc=duration=2:size=1080x1920:rate=30",
        "-f", "lavfi",
        "-i", "sine=frequency=500:duration=2",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-c:a", "aac",
        "-pix_fmt", "yuv420p",
        qc_sample_path
    ]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    passed, report, err = quality_control.inspect_rendered_short(
        video_path=qc_sample_path,
        expected_duration=2.0,
        require_audio=True
    )
    assert passed is True, f"QC failed: {err}"
    assert report["resolution_valid"] is True
    assert report["aspect_ratio_valid"] is True
    assert report["codec_valid"] is True
    assert report["audio_present"] is True
    assert report["all_checks_passed"] is True

def test_full_render_export_pipeline_and_qc():
    """
    End-to-end rendering pipeline test:
    Reframing + ASS Captions + Smart Zoom + Loudnorm + H.264 Export + Automated QC.
    """
    job = export_manager.create_export_job(
        project_id="test_edit_proj",
        clip_id="test_edit_clip_1",
        config={
            "caption_preset": "bold_pop",
            "zoom_intensity": "dynamic",
            "crop_mode": "smart_face",
            "selected_hook": "STOP SCROLLING: AI JUST EVOLVED!",
            "hook_enabled": True,
            "bgm_track": "lofi_ambient",
            "bgm_volume": 0.12,
            "audio_enhancement": {
                "loudnorm": True,
                "denoise": True,
                "speech_boost": True
            }
        }
    )

    # Execute synchronous pipeline run
    export_manager.run_export_pipeline(
        job_id=job["id"],
        project_id="test_edit_proj",
        clip_id="test_edit_clip_1",
        source_video_path=TEST_VIDEO_16_9,
        start_time=1.0,
        duration=4.0,
        config=job["config"]
    )

    # Query status
    completed_job = export_manager.get_export_job(job["id"])
    assert completed_job is not None
    assert completed_job["status"] == "completed", f"Render failed: {completed_job.get('error_message')}"
    assert completed_job["progress_percentage"] == 100
    assert completed_job["output_video_path"] is not None

    # Check physical file on disk
    rel_out = completed_job["output_video_path"].replace("/media/", "")
    full_out = os.path.join(settings.MEDIA_STORAGE_DIR, rel_out)
    assert os.path.exists(full_out)
    assert os.path.getsize(full_out) > 50000

    # Probe rendered output
    probe = quality_control.inspect_rendered_short(full_out, expected_duration=4.0)
    assert probe[0] is True

def test_bulk_zip_export():
    """Verifies that bulk ZIP export packages rendered clips into a downloadable archive."""
    resp = client.get("/api/v1/clips/export-zip/download?project_id=test_edit_proj")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/zip"
    assert "AI_Shorts_" in resp.headers["content-disposition"]
    assert len(resp.content) > 1000

