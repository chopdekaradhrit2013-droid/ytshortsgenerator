import os
import json
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection

client = TestClient(app)

def test_review_studio_clip_lifecycle_and_editing():
    # 1. Fetch existing clips
    res = client.get("/api/v1/clips")
    assert res.status_code == 200
    clips = res.json()
    assert len(clips) > 0
    clip = clips[0]
    clip_id = clip["id"]

    # 2. Patch clip: title, aspect ratio, trim bounds
    patch_payload = {
        "title": "UPDATED: 3 Proven Hacks To Scale YouTube Shorts",
        "aspect_ratio": "1:1",
        "start_time": 10.0,
        "end_time": 35.5,
        "captions_style": {
            "fontSize": 48,
            "highlightColor": "#00FF00"
        }
    }
    patch_res = client.patch(f"/api/v1/clips/{clip_id}", json=patch_payload)
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["title"] == "UPDATED: 3 Proven Hacks To Scale YouTube Shorts"
    assert updated["aspect_ratio"] == "1:1"
    assert updated["resolution_width"] == 1080
    assert updated["resolution_height"] == 1080
    assert updated["duration_seconds"] == 25.5
    assert updated["is_edited"] is True

    # 3. Verify get_clip returns is_edited=True
    get_res = client.get(f"/api/v1/clips/{clip_id}")
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert fetched["is_edited"] is True
    assert fetched["title"] == "UPDATED: 3 Proven Hacks To Scale YouTube Shorts"

def test_review_studio_bulk_export_endpoint():
    res = client.get("/api/v1/clips")
    assert res.status_code == 200
    clips = res.json()
    clip_ids = [c["id"] for c in clips[:2]]

    bulk_res = client.post("/api/v1/clips/bulk-export", json={"clip_ids": clip_ids})
    assert bulk_res.status_code == 200
    data = bulk_res.json()
    assert data["success"] is True
    assert data["affected_count"] == len(clip_ids)
    assert len(data["job_ids"]) == len(clip_ids)

def test_review_studio_bulk_delete_endpoint():
    # Insert a temporary test clip for deletion
    conn = get_db_connection()
    temp_id = "test_del_clip_999"
    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO generated_clips (
                id, project_id, title, start_time, end_time, duration_seconds,
                engagement_score, aspect_ratio, created_at, updated_at
            ) VALUES (?, 'test_edit_proj', 'Clip To Delete', 0.0, 10.0, 10.0, 80, '9:16', datetime('now'), datetime('now'));
        """, (temp_id,))
    conn.close()

    del_res = client.post("/api/v1/clips/bulk-delete", json={"clip_ids": [temp_id]})
    assert del_res.status_code == 200
    data = del_res.json()
    assert data["success"] is True
    assert data["affected_count"] == 1

    # Verify deleted
    verify_res = client.get(f"/api/v1/clips/{temp_id}")
    assert verify_res.status_code == 404

