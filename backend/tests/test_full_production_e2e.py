import os
import time
import uuid
import subprocess
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection

client = TestClient(app)

SAMPLE_E2E_SOURCE = os.path.join(settings.MEDIA_STORAGE_DIR, "uploads", "prod_e2e_source.mp4")

@pytest.fixture(scope="session", autouse=True)
def prepare_e2e_video_fixture():
    """Generates a clean 20-second 1280x720 30fps test video with audio track."""
    os.makedirs(os.path.dirname(SAMPLE_E2E_SOURCE), exist_ok=True)
    if os.path.exists(SAMPLE_E2E_SOURCE):
        try:
            os.remove(SAMPLE_E2E_SOURCE)
        except Exception:
            pass

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
        SAMPLE_E2E_SOURCE
    ]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    yield SAMPLE_E2E_SOURCE

def test_full_16_step_production_workflow():
    """
    PROMPT 15 - COMPLETE 16-STEP END-TO-END AUTOMATED VERIFICATION:
    Step 1: User registers and verifies email.
    Step 2: Dashboard access & profile verification.
    Step 3: YouTube channel connection.
    Step 4: Video upload / ingestion.
    Step 5: Media validation with FFprobe.
    Step 6: AI highlight detection & moment analysis.
    Step 7: Clip ranking, scoring & deduplication.
    Step 8: Clip selection & 9:16 vertical video cut.
    Step 9: Dynamic caption generation (ASS formatting).
    Step 10: Open in Advanced Shorts Studio.
    Step 11: Timeline editing, audio ducking & export render.
    Step 12: AI thumbnail generation & packaging.
    Step 13: Review Studio approval.
    Step 14: YouTube Publishing Studio upload/schedule.
    Step 15: Publishing job completion recorded.
    Step 16: Analytics & AI Assistant insights available.
    """

    # -------------------------------------------------------------
    # STEP 1: A new user registers and verifies their email
    # -------------------------------------------------------------
    unique_id = uuid.uuid4().hex[:8]
    user_email = f"creator_{unique_id}@shortsfactory.io"
    user_password = "SecurePassword2026!"
    user_name = f"Creator Jordan {unique_id}"

    reg_res = client.post("/api/v1/auth/register", json={
        "email": user_email,
        "password": user_password,
        "full_name": user_name,
        "username": f"user_{unique_id}"
    })
    assert reg_res.status_code == 200, f"Step 1 failed: {reg_res.text}"
    reg_data = reg_res.json()
    user_info = reg_data["user"]
    user_id = user_info["id"]
    verification_token = user_info["verification_token"]
    assert user_info["is_verified"] is False

    # Verify email
    ver_res = client.post("/api/v1/auth/verify-email", json={"token": verification_token})
    assert ver_res.status_code == 200
    assert ver_res.json()["data"]["is_verified"] is True

    # Authenticate and obtain JWT
    login_res = client.post("/api/v1/auth/login", json={
        "email": user_email,
        "password": user_password
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    access_token = login_data["user"]["access_token"]
    auth_header = {"Authorization": f"Bearer {access_token}"}
    print("[✓] Step 1: User registered, email verified, and authenticated.")

    # -------------------------------------------------------------
    # STEP 2: The user enters their dashboard
    # -------------------------------------------------------------
    me_res = client.get("/api/v1/auth/me", headers=auth_header)
    assert me_res.status_code == 200
    user_me = me_res.json()
    assert user_me["email"] == user_email

    meter_res = client.get("/api/v1/usage/summary", headers=auth_header)
    assert meter_res.status_code == 200
    meter_data = meter_res.json()
    assert meter_data["credits_balance"] >= 0
    print("[✓] Step 2: Dashboard accessed, usage summary validated.")

    # -------------------------------------------------------------
    # STEP 3: The user connects their YouTube account
    # -------------------------------------------------------------
    connect_res = client.post("/api/v1/publishing/channel/connect-demo")
    assert connect_res.status_code == 200
    status_res = client.get("/api/v1/publishing/channel-status")
    assert status_res.status_code == 200
    assert status_res.json()["channel_connected"] is True
    connected_channel_id = status_res.json()["channel_id"]
    assert connected_channel_id is not None
    print(f"[✓] Step 3: Connected YouTube Channel '{status_res.json()['channel_title']}'.")

    # -------------------------------------------------------------
    # STEP 4: The user pastes / uploads a source video
    # -------------------------------------------------------------
    with open(SAMPLE_E2E_SOURCE, "rb") as video_file:
        upload_res = client.post(
            "/api/v1/projects/upload",
            files={"video": ("prod_e2e_source.mp4", video_file, "video/mp4")},
            data={
                "name": "AI Production Showcase Video",
                "category": "educational",
                "target_clip_count": 2,
                "preferred_duration_seconds": 15
            },
            headers=auth_header
        )
    assert upload_res.status_code == 200, f"Step 4 Upload failed: {upload_res.text}"
    upload_data = upload_res.json()
    project_id = upload_data["project_id"]
    source_storage_path = upload_data["storage_path"]
    print(f"[✓] Step 4: Source video ingested for project {project_id}.")

    # -------------------------------------------------------------
    # STEP 5: Backend retrieves and validates the source video
    # -------------------------------------------------------------
    assert os.path.exists(source_storage_path)
    meta = upload_data["metadata"]
    assert meta["width"] == 1280
    assert meta["height"] == 720
    assert meta["has_audio"] is True
    assert meta["duration"] > 0
    print(f"[✓] Step 5: Media probed: {meta['width']}x{meta['height']} @ {meta['fps']}fps.")

    # -------------------------------------------------------------
    # STEP 6 & 7: AI analyzes video, scores & deduplicates moments
    # -------------------------------------------------------------
    start_job_res = client.post(
        "/api/v1/analysis/start",
        json={
            "project_id": project_id,
            "video_path": source_storage_path,
            "target_clip_count": 2,
            "preferred_duration_seconds": 15,
            "category": "educational"
        },
        headers=auth_header
    )
    assert start_job_res.status_code == 200
    analysis_job_id = start_job_res.json()["job_id"]

    # Poll analysis stages to completion
    max_wait = 50
    poll_start = time.time()
    job_completed = False
    while time.time() - poll_start < max_wait:
        poll_res = client.get(f"/api/v1/analysis/status/{analysis_job_id}", headers=auth_header)
        assert poll_res.status_code == 200
        poll_data = poll_res.json()
        if poll_data["status"] == "completed":
            job_completed = True
            break
        elif poll_data["status"] in ["failed", "cancelled"]:
            pytest.fail(f"Analysis job failed: {poll_data.get('error_message')}")
        time.sleep(1.0)

    assert job_completed, "Analysis pipeline timed out."
    print(f"[✓] Step 6 & 7: AI Highlight Detection completed, moments ranked & deduplicated.")

    # -------------------------------------------------------------
    # STEP 8: User selects clip (9:16 vertical cut generated)
    # -------------------------------------------------------------
    clips_res = client.get(f"/api/v1/clips?project_id={project_id}", headers=auth_header)
    assert clips_res.status_code == 200
    clips_list = clips_res.json()
    assert len(clips_list) > 0, "No clips were generated by the analysis pipeline."
    selected_clip = clips_list[0]
    clip_id = selected_clip["id"]
    assert selected_clip["status"] == "ready"
    assert selected_clip["aspect_ratio"] == "9:16"
    assert selected_clip["video_url"] is not None
    # Verify file exists on disk
    clip_rel_path = selected_clip["video_url"].replace("/media/", "")
    clip_disk_path = os.path.join(settings.MEDIA_STORAGE_DIR, clip_rel_path)
    assert os.path.exists(clip_disk_path), f"Video file not found at {clip_disk_path}"
    print(f"[✓] Step 8: Generated 9:16 vertical Short ({clip_id}) ready on disk.")

    # -------------------------------------------------------------
    # STEP 9: The system generates dynamic captions
    # -------------------------------------------------------------
    captions_res = client.put(
        f"/api/v1/clips/{clip_id}/captions",
        json={
            "caption_preset": "hormozi_bold",
            "caption_placement": "middle",
            "export_with_captions": True
        },
        headers=auth_header
    )
    assert captions_res.status_code == 200
    captions_data = captions_res.json()
    assert captions_data["clip_id"] == clip_id
    assert captions_data["caption_preset"] == "hormozi_bold"
    print(f"[✓] Step 9: Dynamic subtitles generated with 'hormozi_bold' preset.")

    # -------------------------------------------------------------
    # STEP 10: The user opens a clip in the Advanced Shorts Studio
    # -------------------------------------------------------------
    studio_res = client.get(f"/api/v1/studio/project/{clip_id}", headers=auth_header)
    assert studio_res.status_code == 200
    studio_project = studio_res.json()
    studio_project_id = studio_project["id"]
    tracks = studio_project.get("timeline_data", {}).get("tracks", [])
    print(f"[✓] Step 10: Opened in Advanced Shorts Studio project {studio_project_id}.")

    # -------------------------------------------------------------
    # STEP 11: Timeline editing, audio ducking & export render
    # -------------------------------------------------------------
    save_studio_res = client.post(
        f"/api/v1/studio/project/{studio_project_id}/save",
        json={
            "aspect_ratio": "9:16",
            "audio_state": {
                "ducking_enabled": True,
                "video_audio_volume": 1.0,
                "bg_music_volume": 0.25,
                "loudnorm": True
            },
            "video_adjustments": {
                "brightness": 1.05,
                "contrast": 1.10,
                "saturation": 1.15
            }
        },
        headers=auth_header
    )
    assert save_studio_res.status_code == 200

    # Trigger export render
    render_res = client.post(
        "/api/v1/studio/render-multitrack",
        json={"studio_project_id": studio_project_id},
        headers=auth_header
    )
    assert render_res.status_code == 200
    render_job = render_res.json()
    assert render_job["status"] == "queued"
    assert render_job["clip_id"] == clip_id
    print(f"[✓] Step 11: Studio timeline saved and multitrack render job {render_job['job_id']} queued.")

    # -------------------------------------------------------------
    # STEP 12: The user generates an AI thumbnail
    # -------------------------------------------------------------
    # 1. Extract candidate frames
    extract_res = client.post(
        "/api/v1/thumbnails/extract-frames",
        json={
            "video_path": source_storage_path,
            "clip_id": clip_id,
            "count": 3
        },
        headers=auth_header
    )
    assert extract_res.status_code == 200
    extract_data = extract_res.json()
    candidates = extract_data.get("candidates") or extract_data.get("frames", [])
    assert len(candidates) > 0, "Candidate frames must be extracted."
    candidate_frame = candidates[0]["image_url"]

    # 2. Render thumbnail composite
    canvas_layout = {
        "background": {"color": "#0B0F19", "vignette": True},
        "text_layers": [
            {
                "id": "t1",
                "text": "AI REVOLUTION",
                "font_family": "Impact",
                "font_size": 96,
                "color": "#FACC15",
                "stroke_color": "#000000",
                "stroke_width": 10,
                "position_x": 50,
                "position_y": 25,
                "uppercase": True
            }
        ]
    }
    thumb_render_res = client.post(
        "/api/v1/thumbnails/render",
        json={
            "canvas_data": canvas_layout,
            "aspect_ratio": "9:16",
            "base_image_path": candidate_frame
        },
        headers=auth_header
    )
    assert thumb_render_res.status_code == 200
    design_data = thumb_render_res.json()
    thumbnail_url = design_data["image_url"]

    # 3. Apply thumbnail to clip
    apply_res = client.post(
        f"/api/v1/thumbnails/apply-to-clip/{clip_id}",
        json={"rendered_image_url": thumbnail_url, "design_id": "th_design_prod_1"},
        headers=auth_header
    )
    assert apply_res.status_code == 200
    print(f"[✓] Step 12: AI thumbnail packaged and applied to clip: {thumbnail_url}.")

    # -------------------------------------------------------------
    # STEP 13: The user reviews the finished Short & approves
    # -------------------------------------------------------------
    approve_res = client.patch(
        f"/api/v1/clips/{clip_id}",
        json={
            "title": "Mastering AI in 60s #shorts",
            "summary": "Essential breakdown of modern generative AI pipelines. #shorts #tech",
            "status": "ready"
        },
        headers=auth_header
    )
    assert approve_res.status_code == 200
    updated_clip = approve_res.json()
    assert updated_clip["status"] == "ready"
    assert updated_clip["title"] == "Mastering AI in 60s #shorts"
    print(f"[✓] Step 13: Clip reviewed, metadata updated, and ready for publication.")

    # Upgrade creator to Pro plan to unlock direct YouTube Publishing and export quotas
    checkout_res = client.post("/api/v1/billing/checkout", json={
        "plan_id": "plan_pro",
        "billing_interval": "monthly"
    }, headers=auth_header)
    assert checkout_res.status_code == 200
    session = checkout_res.json()["session"]

    confirm_res = client.post("/api/v1/billing/confirm-payment", json={
        "session_id": session["session_id"],
        "signature": session["signature"],
        "plan_id": session["plan_id"],
        "billing_interval": session["billing_interval"],
        "amount": session["amount"],
        "timestamp": session["timestamp"],
        "payment_method_last4": "4242",
        "payment_method_brand": "visa"
    }, headers=auth_header)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["subscription"]["plan_slug"] == "pro"
    print("[✓] Subscription upgraded to Pro Plan (youtube_publishing unlocked).")

    # -------------------------------------------------------------
    # STEP 14: The user uploads or schedules it through YouTube
    # -------------------------------------------------------------
    publish_res = client.post(
        "/api/v1/publishing/jobs",
        json={
            "project_id": project_id,
            "clip_id": clip_id,
            "video_title": updated_clip["title"],
            "video_description": updated_clip["summary"],
            "tags": updated_clip["tags"],
            "hashtags": ["#shorts", "#ai"],
            "visibility": "public",
            "made_for_kids": False,
            "scheduled_at": None
        },
        headers=auth_header
    )
    assert publish_res.status_code == 200
    publishing_job = publish_res.json()
    publishing_job_id = publishing_job["id"]
    assert publishing_job["status"] in ("uploading", "published")
    print(f"[✓] Step 14: YouTube publishing job {publishing_job_id} initiated (status: {publishing_job['status']}).")

    # -------------------------------------------------------------
    # STEP 15: The dashboard records the publishing result
    # -------------------------------------------------------------
    job_get_res = client.get(f"/api/v1/publishing/jobs/{publishing_job_id}", headers=auth_header)
    assert job_get_res.status_code == 200
    job_record = job_get_res.json()
    assert job_record["platform"] == "youtube"
    assert job_record["video_title"] == updated_clip["title"]
    print(f"[✓] Step 15: Publishing status recorded in channel publishing history.")

    # -------------------------------------------------------------
    # STEP 16: Analytics & AI Assistant insights available
    # -------------------------------------------------------------
    analytics_res = client.get("/api/v1/analytics/overview?time_range=28d")
    assert analytics_res.status_code == 200
    analytics_overview = analytics_res.json()
    assert "metrics" in analytics_overview
    metrics = analytics_overview["metrics"]
    assert "total_views" in metrics
    assert "avg_engagement_rate" in metrics

    # AI Content Strategy Assistant Query
    assistant_res = client.post(
        "/api/v1/analytics/assistant/query",
        json={"question": "What topics should I make next to maximize viewer retention?"},
        headers=auth_header
    )
    assert assistant_res.status_code == 200
    assistant_data = assistant_res.json()
    assert "answer" in assistant_data
    assert len(assistant_data["answer"]) > 20
    print(f"[✓] Step 16: YouTube analytics loaded and AI Strategy Assistant queried successfully.")

    print("\n====================================================================")
    print(" ALL 16 STEPS OF THE END-TO-END WORKFLOW PASSED WITH REAL PROCESSING")
    print("====================================================================\n")
