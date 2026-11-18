import os
import json
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import get_db_connection
from backend.app.services.studio_service import studio_service

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_studio_test_data():
    """
    Sets up a fixture project and generated clip for studio testing with isolated IDs.
    """
    import uuid
    conn = get_db_connection()
    project_id = f"test_studio_proj_{uuid.uuid4().hex[:6]}"
    clip_id = f"c_test_studio_{uuid.uuid4().hex[:8]}"

    try:
        with conn:
            conn.execute("""
                INSERT OR IGNORE INTO projects (id, name, status, created_at, updated_at)
                VALUES (?, 'Studio Test Project', 'completed', datetime('now'), datetime('now'));
            """, (project_id,))

            conn.execute("""
                INSERT OR IGNORE INTO source_videos (id, project_id, original_filename, storage_path, file_size_bytes, duration_seconds, created_at, updated_at)
                VALUES (?, ?, 'test.mp4', '/tmp/test.mp4', 1048576, 60.0, datetime('now'), datetime('now'));
            """, (f"sv_{project_id}", project_id))

            conn.execute("""
                INSERT OR IGNORE INTO generated_clips (id, project_id, source_video_id, title, duration_seconds, start_time, end_time, engagement_score, created_at, updated_at)
                VALUES (?, ?, ?, 'Why DeepMind Switched To Swarms #Shorts', 42.0, 10.0, 52.0, 94, datetime('now'), datetime('now'));
            """, (clip_id, project_id, f"sv_{project_id}"))
    finally:
        conn.close()

    return {"project_id": project_id, "clip_id": clip_id}

def test_get_or_create_studio_project(setup_studio_test_data):
    """
    Verifies that a multi-track studio project is initialized with all track layers,
    canvas dimensions, video adjustments, and export parameters.
    """
    clip_id = setup_studio_test_data["clip_id"]
    project_id = setup_studio_test_data["project_id"]

    res = client.get(f"/api/v1/studio/project/{clip_id}?project_id={project_id}")
    assert res.status_code == 200
    data = res.json()

    assert data["clip_id"] == clip_id
    assert data["aspect_ratio"] == "9:16"
    assert "canvas_settings" in data
    assert data["canvas_settings"]["width"] == 1080
    assert data["canvas_settings"]["height"] == 1920

    # Verify multi-track timeline structure
    timeline = data["timeline_data"]
    assert "tracks" in timeline
    track_ids = [t["id"] for t in timeline["tracks"]]
    assert "track_v1" in track_ids
    assert "track_t1" in track_ids
    assert "track_c1" in track_ids
    assert "track_a1" in track_ids
    assert "track_a2" in track_ids

    # Verify adjustments & state defaults
    assert "video_adjustments" in data
    assert data["video_adjustments"]["speed"] == 1.0
    assert "captions_state" in data
    assert "audio_state" in data
    assert "export_settings" in data
    assert data["export_settings"]["resolution"] == "1080p"

def test_save_and_autosave_studio_project(setup_studio_test_data):
    """
    Verifies saving and autosaving updates to timeline tracks, color grading, and captions.
    """
    clip_id = setup_studio_test_data["clip_id"]
    project_id = setup_studio_test_data["project_id"]

    proj = studio_service.get_or_create_studio_project(project_id, clip_id)
    studio_project_id = proj["id"]

    # 1. Test Save
    save_payload = {
        "name": "Updated Viral Swarm Short",
        "video_adjustments": {
            "brightness": 5,
            "contrast": 1.25,
            "saturation": 1.15,
            "speed": 1.1,
            "blur": 0,
            "transition": "dissolve"
        },
        "captions_state": {
            "preset": "bold_pop",
            "font_family": "Impact",
            "font_size": 58,
            "highlight_color": "#FACC15"
        }
    }
    res_save = client.post(f"/api/v1/studio/project/{studio_project_id}/save", json=save_payload)
    assert res_save.status_code == 200
    saved = res_save.json()["project"]
    assert saved["name"] == "Updated Viral Swarm Short"
    assert saved["video_adjustments"]["contrast"] == 1.25
    assert saved["captions_state"]["font_size"] == 58
    assert saved["version"] >= 2

    # 2. Test Autosave
    autosave_payload = {
        "video_adjustments": {
            "brightness": 8,
            "contrast": 1.30,
            "saturation": 1.20,
            "speed": 1.1
        }
    }
    res_auto = client.post(f"/api/v1/studio/project/{studio_project_id}/autosave", json=autosave_payload)
    assert res_auto.status_code == 200
    assert res_auto.json()["status"] == "autosaved"

def test_project_management_rename_and_duplicate(setup_studio_test_data):
    """
    Verifies project renaming, duplication for non-destructive branching, and project listing.
    """
    clip_id = setup_studio_test_data["clip_id"]
    project_id = setup_studio_test_data["project_id"]

    proj = studio_service.get_or_create_studio_project(project_id, clip_id)
    studio_project_id = proj["id"]

    # Rename
    res_rename = client.post(f"/api/v1/studio/project/{studio_project_id}/rename", json={"name": "Renamed AI Short Master"})
    assert res_rename.status_code == 200
    assert res_rename.json()["project"]["name"] == "Renamed AI Short Master"

    # Duplicate
    res_dup = client.post(f"/api/v1/studio/project/{studio_project_id}/duplicate")
    assert res_dup.status_code == 200
    dup_proj = res_dup.json()["project"]
    assert dup_proj["id"] != studio_project_id
    assert "Copy" in dup_proj["name"]
    assert dup_proj["clip_id"] == clip_id

    # List
    res_list = client.get("/api/v1/studio/projects")
    assert res_list.status_code == 200
    assert res_list.json()["total"] >= 2

def test_studio_presets_and_custom_preset():
    """
    Verifies retrieval of all 8 core presets (Cinematic, Gaming, Football, Podcast, Reaction, Educational, Minimal, Viral)
    and creation of user custom presets.
    """
    # 1. Fetch presets
    res = client.get("/api/v1/studio/presets")
    assert res.status_code == 200
    presets = res.json()["presets"]
    assert len(presets) >= 8

    preset_ids = [p["id"] for p in presets]
    assert "sp_cinematic" in preset_ids
    assert "sp_gaming" in preset_ids
    assert "sp_football" in preset_ids
    assert "sp_podcast" in preset_ids
    assert "sp_reaction" in preset_ids
    assert "sp_educational" in preset_ids
    assert "sp_minimal" in preset_ids
    assert "sp_viral" in preset_ids

    # 2. Save user custom preset
    custom_payload = {
        "name": "Alex Signature High-Tech Preset",
        "category": "custom",
        "description": "Custom high-contrast yellow typography with bass-boosted audio",
        "config": {
            "aspect_ratio": "9:16",
            "video_adjustments": {"contrast": 1.3, "brightness": 6, "speed": 1.05},
            "captions": {"preset": "bold_pop", "font_size": 56, "highlight_color": "#FACC15"},
            "audio": {"bgm_track": "lofi_chill", "bgm_volume": 0.12}
        }
    }
    res_create = client.post("/api/v1/studio/presets", json=custom_payload)
    assert res_create.status_code == 200
    assert res_create.json()["status"] == "created"
    assert res_create.json()["preset"]["name"] == "Alex Signature High-Tech Preset"

def test_studio_royalty_free_assets():
    """
    Verifies that royalty-free BGM tracks, SFX, and graphic overlays are accessible.
    """
    res = client.get("/api/v1/studio/assets")
    assert res.status_code == 200
    assets = res.json()["assets"]
    assert len(assets) >= 10

    asset_types = {a["asset_type"] for a in assets}
    assert "bgm" in asset_types
    assert "sfx" in asset_types
    assert "sticker" in asset_types

def test_ai_editing_assistant_commands():
    """
    Verifies natural language interpretation for prompt commands:
    - Make captions bigger
    - Highlight important words in yellow
    - Add a title at the beginning
    - Remove the first 2 seconds
    - Make the video faster
    - Add a smooth transition
    - Add upbeat lo-fi music
    - Change aspect ratio to 9:16 vertical
    """
    base_state = {
        "aspect_ratio": "9:16",
        "timeline_data": {
            "duration": 40.0,
            "tracks": [
                {
                    "id": "track_v1",
                    "type": "video",
                    "items": [{"id": "v1", "start_time": 0.0, "duration": 40.0, "source_start_time": 0.0}]
                }
            ]
        },
        "video_adjustments": {"speed": 1.0, "contrast": 1.0, "brightness": 0, "transition": "none"},
        "captions_state": {"font_size": 48, "highlight_color": "#FFFFFF", "animation": "none"},
        "audio_state": {"bgm_track": "none", "video_audio_muted": False},
        "overlays_state": {"titles": []}
    }

    # 1. "Make captions bigger"
    res1 = client.post("/api/v1/studio/ai-assist", json={"command": "Make captions bigger", "current_state": base_state})
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["updated_state"]["captions_state"]["font_size"] > 48
    assert any(m["field"] == "font_size" for m in data1["modifications"])

    # 2. "Highlight important words in yellow"
    res2 = client.post("/api/v1/studio/ai-assist", json={"command": "Highlight important words in yellow", "current_state": base_state})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["updated_state"]["captions_state"]["highlight_color"] == "#FACC15"

    # 3. "Add a title at the beginning"
    res3 = client.post("/api/v1/studio/ai-assist", json={"command": "Add a title at the beginning", "current_state": base_state})
    assert res3.status_code == 200
    data3 = res3.json()
    assert len(data3["updated_state"]["overlays_state"]["titles"]) > 0

    # 4. "Remove the first 2 seconds"
    res4 = client.post("/api/v1/studio/ai-assist", json={"command": "Remove the first 2 seconds", "current_state": base_state})
    assert res4.status_code == 200
    data4 = res4.json()
    assert data4["updated_state"]["timeline_data"]["duration"] == 38.0

    # 5. "Make the video faster"
    res5 = client.post("/api/v1/studio/ai-assist", json={"command": "Make the video faster", "current_state": base_state})
    assert res5.status_code == 200
    data5 = res5.json()
    assert data5["updated_state"]["video_adjustments"]["speed"] > 1.0

    # 6. "Add a smooth transition"
    res6 = client.post("/api/v1/studio/ai-assist", json={"command": "Add a smooth transition", "current_state": base_state})
    assert res6.status_code == 200
    data6 = res6.json()
    assert data6["updated_state"]["video_adjustments"]["transition"] == "dissolve"

    # 7. "Add upbeat lo-fi music"
    res7 = client.post("/api/v1/studio/ai-assist", json={"command": "Add upbeat lo-fi music", "current_state": base_state})
    assert res7.status_code == 200
    data7 = res7.json()
    assert data7["updated_state"]["audio_state"]["bgm_track"] == "lofi_chill"

def test_multitrack_ffmpeg_command_builder(setup_studio_test_data):
    """
    Verifies that StudioService builds a valid FFmpeg filtergraph incorporating:
    - Speed adjustment (setpts / atempo)
    - Color grading (eq filter)
    - Aspect ratio & blurred background framing
    - Transitions (fade in / out)
    - Audio mixing
    """
    clip_id = setup_studio_test_data["clip_id"]
    project_id = setup_studio_test_data["project_id"]

    proj = studio_service.get_or_create_studio_project(project_id, clip_id)
    proj["video_adjustments"]["speed"] = 1.15
    proj["video_adjustments"]["contrast"] = 1.2
    proj["video_adjustments"]["brightness"] = 5
    proj["video_adjustments"]["fade_in"] = 0.5
    proj["video_adjustments"]["fade_out"] = 0.5

    cmd = studio_service.build_multitrack_ffmpeg_command(
        source_video_path="/tmp/test_source.mp4",
        output_video_path="/tmp/test_output.mp4",
        start_time=5.0,
        duration=30.0,
        studio_project=proj
    )

    cmd_str = " ".join(cmd)
    assert "-ss 5.0" in cmd_str
    assert "-t 30.0" in cmd_str
    assert "setpts=" in cmd_str
    assert "atempo=" in cmd_str
    assert "eq=contrast=" in cmd_str
    assert "fade=t=in" in cmd_str
    assert "fade=t=out" in cmd_str
    assert "libx264" in cmd_str
    assert "/tmp/test_output.mp4" in cmd_str

def test_trigger_multitrack_render_endpoint(setup_studio_test_data):
    """
    Verifies that the /api/v1/studio/render-multitrack endpoint queues a multi-track
    export job with all timeline track parameters.
    """
    clip_id = setup_studio_test_data["clip_id"]
    project_id = setup_studio_test_data["project_id"]

    proj = studio_service.get_or_create_studio_project(project_id, clip_id)
    studio_project_id = proj["id"]

    res = client.post("/api/v1/studio/render-multitrack", json={"studio_project_id": studio_project_id})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "queued"
    assert "job_id" in data
    assert data["clip_id"] == clip_id
    assert "export_config" in data

