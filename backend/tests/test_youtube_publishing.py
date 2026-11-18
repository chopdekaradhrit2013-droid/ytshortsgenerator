import os
import json
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection
from backend.app.services.youtube_publisher import youtube_publisher_service

client = TestClient(app)

def test_youtube_channel_status_and_oauth_url():
    # 1. Fetch channel status
    res = client.get("/api/v1/publishing/channel-status")
    assert res.status_code == 200
    data = res.json()
    assert "channel_connected" in data
    assert "is_configured" in data

    # 2. Fetch OAuth URL
    url_res = client.get("/api/v1/publishing/oauth/url")
    assert url_res.status_code == 200
    assert "oauth_url" in url_res.json()

def test_youtube_channel_connect_demo_and_disconnect():
    # Connect demo channel
    conn_res = client.post("/api/v1/publishing/channel/connect-demo")
    assert conn_res.status_code == 200
    assert conn_res.json()["success"] is True

    # Verify channel details
    status_res = client.get("/api/v1/publishing/channel-status")
    assert status_res.status_code == 200
    ch = status_res.json()
    assert ch["channel_connected"] is True
    assert ch["channel_title"] == "AI Shorts Factory Studios"
    assert ch["subscriber_count"] >= 100000
    assert ch["channel_id"] == "UC_x5XG1OV2P6uZZ5FSM9Ttw"

    # Disconnect channel
    disc_res = client.post("/api/v1/publishing/channel/disconnect")
    assert disc_res.status_code == 200
    assert disc_res.json()["success"] is True

    # Verify disconnected
    after_disc = client.get("/api/v1/publishing/channel-status").json()
    assert after_disc["channel_connected"] is False

    # Restore channel for subsequent tests
    client.post("/api/v1/publishing/channel/connect-demo")

def test_seo_metadata_auto_suggester():
    # Fetch existing clip
    clips_res = client.get("/api/v1/clips")
    assert clips_res.status_code == 200
    clips = clips_res.json()
    assert len(clips) > 0
    clip_id = clips[0]["id"]

    res = client.post(
        "/api/v1/publishing/suggest-metadata",
        json={"clip_id": clip_id, "category": "tech"}
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["titles"]) == 3
    assert all("#Shorts" in t for t in data["titles"])
    assert "#Shorts" in data["description"]
    assert "#Viral" in data["hashtags"]
    assert len(data["tags"]) >= 3

def test_create_publishing_job_immediate_upload():
    clips = client.get("/api/v1/clips").json()
    clip = clips[0]

    payload = {
        "project_id": clip["project_id"],
        "clip_id": clip["id"],
        "video_title": "AI Breakout Secret Revealed #Shorts",
        "video_description": "Exclusive breakdown of high-retention AI models.\n\n#Shorts #AI",
        "tags": ["AI", "Shorts", "Tech"],
        "hashtags": ["#Shorts", "#AI"],
        "visibility": "public",
        "made_for_kids": False,
        "scheduled_at": None
    }

    create_res = client.post("/api/v1/publishing/jobs", json=payload)
    assert create_res.status_code == 200
    job = create_res.json()
    assert job["video_title"] == "AI Breakout Secret Revealed #Shorts"
    assert job["platform"] == "youtube"
    assert job["status"] in ("uploading", "published")

def test_schedule_short_and_calendar():
    clips = client.get("/api/v1/clips").json()
    clip = clips[0]

    scheduled_time = (datetime.now() + timedelta(days=2)).isoformat()
    payload = {
        "project_id": clip["project_id"],
        "clip_id": clip["id"],
        "video_title": "Scheduled Future Viral Hit #Shorts",
        "video_description": "Scheduled via AI Shorts Factory calendar.",
        "tags": ["Shorts", "Scheduled"],
        "hashtags": ["#Shorts"],
        "visibility": "public",
        "made_for_kids": False,
        "scheduled_at": scheduled_time
    }

    create_res = client.post("/api/v1/publishing/jobs", json=payload)
    assert create_res.status_code == 200
    job = create_res.json()
    job_id = job["id"]
    assert job["status"] == "scheduled"
    assert job["scheduled_at"] is not None

    # Verify in Calendar endpoint
    cal_res = client.get("/api/v1/publishing/calendar")
    assert cal_res.status_code == 200
    cal_data = cal_res.json()
    target_date = scheduled_time[:10]
    assert target_date in cal_data
    assert any(j["id"] == job_id for j in cal_data[target_date])

    # Edit scheduled job
    new_title = "UPDATED Scheduled Future Hit #Shorts"
    patch_res = client.patch(
        f"/api/v1/publishing/jobs/{job_id}",
        json={"video_title": new_title}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["video_title"] == new_title

    # Delete scheduled job
    del_res = client.delete(f"/api/v1/publishing/jobs/{job_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

def test_batch_publish_multiple_shorts():
    clips = client.get("/api/v1/clips").json()
    clip_ids = [c["id"] for c in clips[:2]]

    payload = {
        "clip_ids": clip_ids,
        "visibility": "unlisted",
        "made_for_kids": False,
        "schedule_interval_minutes": 120
    }

    batch_res = client.post("/api/v1/publishing/batch-publish", json=payload)
    assert batch_res.status_code == 200
    data = batch_res.json()
    assert data["queued"] == len(clip_ids)
    assert len(data["jobs"]) == len(clip_ids)

