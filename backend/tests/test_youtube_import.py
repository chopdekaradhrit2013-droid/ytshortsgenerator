import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.youtube_downloader import (
    extract_youtube_video_id,
    get_youtube_metadata,
    download_youtube_video_file
)
from backend.app.core.database import get_db_connection

client = TestClient(app)

def test_extract_youtube_video_id_formats():
    urls = [
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s", "dQw4w9WgXcQ")
    ]
    for url, expected_id in urls:
        assert extract_youtube_video_id(url) == expected_id

    # Invalid url
    assert extract_youtube_video_id("https://vimeo.com/12345678") is None
    assert extract_youtube_video_id("invalid-text") is None

def test_youtube_downloader_resilient_media():
    meta = get_youtube_metadata("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    assert meta["id"] == "dQw4w9WgXcQ"
    assert "title" in meta

    res = download_youtube_video_file("https://www.youtube.com/watch?v=dQw4w9WgXcQ", project_id="test_yt_proj_001")
    assert res["video_id"] == "dQw4w9WgXcQ"
    assert "probe" in res
    assert res["probe"]["duration"] > 0

def test_api_import_youtube_invalid_url():
    res = client.post("/api/v1/projects/import-youtube", json={
        "youtube_url": "https://notyoutube.com/random"
    })
    assert res.status_code == 400
    assert "Invalid YouTube URL" in res.json()["detail"]

def test_api_import_youtube_success():
    res = client.post("/api/v1/projects/import-youtube", json={
        "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "name": "Auto Rickroll Short",
        "category": "entertainment",
        "target_clip_count": 3,
        "preferred_duration_seconds": 30,
        "auto_generate_shorts": True
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "processing"
    assert data["project_id"] is not None
    assert data["job_id"] is not None
    assert data["auto_generating"] is True

    # Verify project in SQLite database
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, status FROM projects WHERE id = ?;", (data["project_id"],))
    proj = cur.fetchone()
    assert proj is not None
    assert proj["name"] == "Auto Rickroll Short"

    # Verify source_videos table
    cur.execute("SELECT id, project_id, storage_path FROM source_videos WHERE project_id = ?;", (data["project_id"],))
    sv = cur.fetchone()
    assert sv is not None
    conn.close()

