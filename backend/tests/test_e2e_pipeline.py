import os
import time
import subprocess
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection

client = TestClient(app)

SAMPLE_VIDEO = os.path.join(settings.MEDIA_STORAGE_DIR, "uploads", "e2e_source_test.mp4")

@pytest.fixture(scope="session", autouse=True)
def create_e2e_source_video():
    """Generates a clean 20-second test video with 440Hz test audio."""
    os.makedirs(os.path.dirname(SAMPLE_VIDEO), exist_ok=True)
    if os.path.exists(SAMPLE_VIDEO):
        os.remove(SAMPLE_VIDEO)
    cmd = [
        settings.FFMPEG_BIN,
        "-y",
        "-f", "lavfi",
        "-i", "testsrc=duration=20:size=1280x720:rate=30",
        "-f", "lavfi",
        "-i", "sine=frequency=440:duration=20",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-c:a", "aac",
        "-pix_fmt", "yuv420p",
        SAMPLE_VIDEO
    ]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    yield SAMPLE_VIDEO

def test_full_pipeline_upload_to_highlight_rendering():
    """
    End-to-end integration test:
    1. Upload video -> Inspect media metadata & create thumbnail
    2. Start AI Analysis job
    3. Monitor 7 processing stages to completion
    4. Verify FFmpeg generated 9:16 vertical clips on disk
    5. Verify SQLite database persistence
    """
    # 1. Ingest Video
    with open(SAMPLE_VIDEO, "rb") as f:
        upload_resp = client.post(
            "/api/v1/projects/upload",
            files={"video": ("e2e_source_test.mp4", f, "video/mp4")},
            data={
                "name": "E2E Automated Viral Video Test",
                "category": "podcast",
                "target_clip_count": 3,
                "preferred_duration_seconds": 15
            }
        )

    assert upload_resp.status_code == 200, f"Upload error: {upload_resp.text}"
    upload_data = upload_resp.json()
    project_id = upload_data["project_id"]
    storage_path = upload_data["storage_path"]

    assert os.path.exists(storage_path)
    assert upload_data["metadata"]["width"] == 1280
    assert upload_data["metadata"]["height"] == 720
    assert upload_data["metadata"]["fps"] == 30.0
    assert upload_data["metadata"]["has_audio"] is True

    # 2. Launch Analysis
    start_resp = client.post(
        "/api/v1/analysis/start",
        json={
            "project_id": project_id,
            "video_path": storage_path,
            "target_clip_count": 2,
            "preferred_duration_seconds": 15,
            "category": "podcast"
        }
    )
    assert start_resp.status_code == 200, f"Start error: {start_resp.text}"
    job_id = start_resp.json()["job_id"]
    assert job_id.startswith("job_")

    # 3. Poll until completed (timeout 65s for full CV reframing + transcription + cuts)
    max_wait = 65
    start_time = time.time()
    final_job = None

    while time.time() - start_time < max_wait:
        status_resp = client.get(f"/api/v1/analysis/status/{job_id}")
        assert status_resp.status_code == 200
        job_data = status_resp.json()
        if job_data["status"] in ["completed", "failed", "cancelled"]:
            final_job = job_data
            break
        time.sleep(1.0)

    assert final_job is not None, "Job timed out before finishing"
    assert final_job["status"] == "completed", f"Job failed with: {final_job.get('error_message')}"
    assert final_job["progress_percentage"] == 100

    # 4. Verify candidates and FFmpeg rendered clips
    candidates = final_job.get("candidates", [])
    assert len(candidates) > 0, "No candidates returned by AI highlight analyzer"

    first_cand = candidates[0]
    assert "suggested_title" in first_cand
    assert "opening_hook" in first_cand
    assert "score_breakdown" in first_cand
    assert first_cand["engagement_score"] >= 60

    # Verify preview video file exists on disk and is non-empty
    preview_rel = first_cand.get("preview_video_path")
    assert preview_rel is not None
    # Strip /media/ prefix to find local path in MEDIA_STORAGE_DIR
    local_clip_path = os.path.join(settings.MEDIA_STORAGE_DIR, preview_rel.replace("/media/", ""))
    assert os.path.exists(local_clip_path), f"Rendered clip missing at {local_clip_path}"
    assert os.path.getsize(local_clip_path) > 1000, "Rendered clip is empty"

    # 5. Query generated_clips endpoint
    clips_resp = client.get(f"/api/v1/clips?project_id={project_id}")
    assert clips_resp.status_code == 200
    db_clips = clips_resp.json()
    assert len(db_clips) >= 1
    assert db_clips[0]["aspect_ratio"] == "9:16"
    assert db_clips[0]["resolution_width"] == 1080
    assert db_clips[0]["resolution_height"] == 1920
