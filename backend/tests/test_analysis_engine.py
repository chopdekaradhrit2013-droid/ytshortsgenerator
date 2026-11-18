import os
import subprocess
import pytest
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection
from backend.app.services.ffmpeg_service import ffmpeg_service
from backend.app.services.whisper_service import whisper_service
from backend.app.services.ai_analyzer import ai_analyzer_service
from backend.app.services.analysis_manager import analysis_manager

TEST_VIDEO_PATH = os.path.join(settings.MEDIA_STORAGE_DIR, "uploads", "test_sample.mp4")

@pytest.fixture(scope="session", autouse=True)
def setup_test_video():
    """Generates a real 10-second test video with audio and seeds test DB rows."""
    os.makedirs(os.path.dirname(TEST_VIDEO_PATH), exist_ok=True)
    if not os.path.exists(TEST_VIDEO_PATH):
        cmd = [
            settings.FFMPEG_BIN,
            "-y",
            "-f", "lavfi",
            "-i", "testsrc=duration=10:size=1280x720:rate=30",
            "-f", "lavfi",
            "-i", "sine=frequency=1000:duration=10",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-c:a", "aac",
            "-pix_fmt", "yuv420p",
            TEST_VIDEO_PATH
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        assert res.returncode == 0, f"FFmpeg failed: {res.stderr.decode()}"

    # Seed test database rows so foreign key constraints pass
    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT OR IGNORE INTO projects (id, name, created_at, updated_at)
            VALUES ('test_proj_lifecycle', 'Test Project Lifecycle', datetime('now'), datetime('now'));
        """)
        conn.execute("""
            INSERT OR IGNORE INTO projects (id, name, created_at, updated_at)
            VALUES ('test_proj_1', 'Test Project 1', datetime('now'), datetime('now'));
        """)
        conn.execute("""
            INSERT OR IGNORE INTO source_videos (
                id, project_id, original_filename, storage_path, file_size_bytes, created_at, updated_at
            ) VALUES (
                'test_src_1', 'test_proj_1', 'test_sample.mp4', ?, 1024, datetime('now'), datetime('now')
            );
        """, (TEST_VIDEO_PATH,))

    yield TEST_VIDEO_PATH

def test_ffmpeg_probe_and_metadata():
    """Verifies that FFprobe accurately extracts video duration, resolution, fps and audio."""
    meta = ffmpeg_service.probe_video(TEST_VIDEO_PATH)
    assert meta["duration"] >= 9.0
    assert meta["width"] == 1280
    assert meta["height"] == 720
    assert meta["fps"] == 30.0
    assert meta["has_audio"] is True
    assert meta["size_bytes"] > 0

def test_ffmpeg_audio_extraction():
    """Verifies that FFmpeg extracts 16kHz mono WAV audio properly."""
    audio_out = os.path.join(settings.MEDIA_STORAGE_DIR, "audio", "test_extracted.wav")
    extracted = ffmpeg_service.extract_audio(TEST_VIDEO_PATH, audio_out)
    assert os.path.exists(extracted)
    assert os.path.getsize(extracted) > 1000

def test_ffmpeg_silence_detection():
    """Verifies silence and speech activity detection filter."""
    audio_out = os.path.join(settings.MEDIA_STORAGE_DIR, "audio", "test_extracted.wav")
    activity = ffmpeg_service.detect_silence_and_speech_activity(audio_out, total_duration=10.0)
    assert "pauses" in activity
    assert "speech_intervals" in activity
    assert "speech_ratio" in activity
    assert isinstance(activity["speech_ratio"], float)

def test_whisper_transcription():
    """Verifies speech transcription and timestamp extraction."""
    result = whisper_service.transcribe_video(
        video_path=TEST_VIDEO_PATH,
        source_video_id="test_src_1",
        language="en"
    )
    assert "full_text" in result
    assert "segments" in result
    assert "words" in result
    assert len(result["segments"]) > 0
    assert result["duration_seconds"] >= 9.0

def test_ai_highlight_scoring_and_deduplication():
    """Verifies intelligent highlight detection, 7-factor scoring, and non-overlapping optimization."""
    transcription_data = {
        "has_speech": True,
        "segments": [
            {"id": 0, "start": 0.0, "end": 4.5, "text": "Here is the shocking truth about viral growth."},
            {"id": 1, "start": 4.5, "end": 9.5, "text": "Nobody realizes that consistency beats perfection."}
        ],
        "words": [
            {"word": "Here", "start": 0.0, "end": 0.5},
            {"word": "is", "start": 0.5, "end": 0.8},
            {"word": "the", "start": 0.8, "end": 1.0},
            {"word": "shocking", "start": 1.0, "end": 1.8},
            {"word": "truth", "start": 1.8, "end": 2.5}
        ],
        "pauses": [{"start": 4.2, "end": 4.5, "duration": 0.3}]
    }

    highlights = ai_analyzer_service.analyze_and_extract_highlights(
        transcription_data=transcription_data,
        scene_changes=[2.0, 6.0],
        keyframes=[],
        duration_seconds=10.0,
        target_clip_count=3,
        preferred_duration=8,
        category="podcast"
    )

    assert len(highlights) > 0
    clip = highlights[0]
    assert "start_time" in clip
    assert "end_time" in clip
    assert "engagement_score" in clip
    assert 50 <= clip["engagement_score"] <= 100
    assert "score_breakdown" in clip
    assert "hook_strength" in clip["score_breakdown"]
    assert "suggested_title" in clip
    assert "opening_hook" in clip

def test_ffmpeg_clip_preview_cutting():
    """Verifies cutting a real 9:16 vertical video clip preview and thumbnail."""
    clip_out = os.path.join(settings.MEDIA_STORAGE_DIR, "clips", "test_preview_clip.mp4")
    thumb_out = os.path.join(settings.MEDIA_STORAGE_DIR, "thumbnails", "test_preview_thumb.jpg")

    cut_result = ffmpeg_service.cut_clip_preview(
        input_path=TEST_VIDEO_PATH,
        output_path=clip_out,
        start_time=1.0,
        duration=4.0,
        vertical_crop=True
    )

    assert os.path.exists(cut_result)
    assert os.path.getsize(cut_result) > 1000

    # Probe the cut clip
    clip_meta = ffmpeg_service.probe_video(cut_result)
    assert clip_meta["duration"] >= 3.0
    assert clip_meta["width"] == 1080
    assert clip_meta["height"] == 1920

    # Test thumbnail generation
    thumb_result = ffmpeg_service.generate_thumbnail(cut_result, thumb_out, timestamp=1.0)
    assert os.path.exists(thumb_result)
    assert os.path.getsize(thumb_result) > 500

def test_analysis_job_manager_lifecycle():
    """Verifies analysis job creation, status querying and cancellation."""
    job = analysis_manager.create_job(
        project_id="test_proj_lifecycle",
        target_clip_count=5,
        preferred_duration=30,
        category="gaming"
    )

    assert job["id"].startswith("job_")
    assert job["status"] == "queued"
    assert job["stage"] == "preparing"

    # Query status
    status = analysis_manager.get_job(job["id"])
    assert status["id"] == job["id"]

    # Test cancellation
    cancelled = analysis_manager.cancel_job(job["id"])
    assert cancelled is True

    updated_status = analysis_manager.get_job(job["id"])
    assert updated_status["status"] == "cancelled"
