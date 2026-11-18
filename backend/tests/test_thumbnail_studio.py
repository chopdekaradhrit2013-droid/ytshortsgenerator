import os
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection, init_db
from backend.app.services.thumbnail_studio import (
    extract_candidate_thumbnail_frames,
    generate_ai_thumbnail_text_suggestions,
    render_thumbnail_composite,
    analyze_thumbnail_quality,
    list_thumbnail_templates,
    save_thumbnail_template,
    list_thumbnail_designs,
    save_or_update_thumbnail_design,
    get_thumbnail_design,
    delete_thumbnail_design,
    duplicate_thumbnail_design,
    toggle_favorite_thumbnail_design
)

from backend.app.services.ffmpeg_service import ffmpeg_service

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_data():
    init_db()
    # Ensure sample video exists
    sample_video = os.path.join(settings.MEDIA_STORAGE_DIR, "sample_podcast.mp4")
    if not os.path.exists(sample_video):
        # Generate dummy 5-sec video via FFmpeg
        import subprocess
        cmd = [
            ffmpeg_service.ffmpeg_bin, "-y", "-f", "lavfi", "-i", "testsrc=duration=5:size=1920x1080:rate=30",
            "-f", "lavfi", "-i", "sine=frequency=1000:duration=5",
            "-c:v", "libx264", "-c:a", "aac", sample_video
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    yield


def test_extract_candidate_thumbnail_frames():
    """Verify extracting multiple candidate frames and scoring them."""
    sample_video = os.path.join(settings.MEDIA_STORAGE_DIR, "sample_podcast.mp4")
    candidates = extract_candidate_thumbnail_frames(
        video_path=sample_video,
        start_time=0.5,
        duration=4.0,
        count=4,
        clip_id="test_clip_101"
    )

    assert len(candidates) >= 1
    first_cand = candidates[0]
    assert "image_url" in first_cand
    assert "sharpness_score" in first_cand
    assert "composition_score" in first_cand
    assert "total_score" in first_cand
    assert 0.0 <= first_cand["total_score"] <= 100.0

    # Exactly one frame should be recommended
    recommended_count = sum(1 for c in candidates if c.get("is_recommended"))
    assert recommended_count == 1


def test_ai_thumbnail_text_suggestions():
    """Verify generating punchy 2-5 word thumbnail text hooks."""
    title = "Why Modern AI Coding Will Replace Traditional Engineering"
    hook = "Stop learning full-stack development right now"
    transcript = "In this breakdown, researchers discovered that autonomous agents can build entire systems in seconds."

    suggestions = generate_ai_thumbnail_text_suggestions(
        title=title,
        hook=hook,
        transcript=transcript,
        niche="tech",
        count=6
    )

    assert len(suggestions) == 6
    for s in suggestions:
        assert "text" in s
        assert "category" in s
        assert "estimated_ctr_rating" in s
        assert s["word_count"] <= 6
        assert s["estimated_ctr_rating"] >= 80


def test_render_thumbnail_composite():
    """Verify rendering high-res composite image with custom text, arrow, and shapes."""
    canvas = {
        "background": {"color": "#0B0F19", "vignette": True, "overlay_opacity": 0.2},
        "adjustments": {"brightness": 1.05, "contrast": 1.25, "saturation": 1.2, "blur": 0},
        "text_layers": [
            {
                "id": "t1",
                "text": "DO NOT DO THIS!",
                "font_family": "Impact",
                "font_size": 96,
                "color": "#FACC15",
                "stroke_color": "#000000",
                "stroke_width": 12,
                "position_x": 50,
                "position_y": 20,
                "uppercase": True,
                "bg_banner": True,
                "bg_color": "#000000"
            },
            {
                "id": "t2",
                "text": "100X MISTAKE",
                "font_family": "Montserrat",
                "font_size": 80,
                "color": "#FFFFFF",
                "stroke_color": "#EF4444",
                "stroke_width": 10,
                "position_x": 50,
                "position_y": 32,
                "uppercase": True
            }
        ],
        "shapes": [
            {
                "id": "s1",
                "type": "pill",
                "color": "#DC2626",
                "position_x": 50,
                "position_y": 90,
                "width": 360,
                "height": 60,
                "opacity": 0.95
            }
        ],
        "arrows": [
            {"start_x": 80, "start_y": 68, "end_x": 55, "end_y": 50, "color": "#EF4444", "width": 16}
        ],
        "stickers": [
            {"emoji": "⚠️", "position_x": 15, "position_y": 16, "scale": 1.2}
        ]
    }

    # Render 9:16 vertical
    out_path, img_url = render_thumbnail_composite(None, canvas, aspect_ratio="9:16", width=1080, height=1920)
    assert os.path.exists(out_path)
    assert os.path.getsize(out_path) > 0
    assert img_url.startswith("/media/thumbnails/designs/")

    from PIL import Image
    with Image.open(out_path) as im:
        assert im.size == (1080, 1920)

    # Render 16:9 landscape
    out_path_169, img_url_169 = render_thumbnail_composite(None, canvas, aspect_ratio="16:9", width=1280, height=720)
    assert os.path.exists(out_path_169)
    with Image.open(out_path_169) as im:
        assert im.size == (1280, 720)


def test_thumbnail_quality_analyzer():
    """Verify AI quality checker analyzes readability, contrast, clutter, and suggestions."""
    canvas = {
        "text_layers": [
            {
                "id": "t1",
                "text": "STOP RIGHT NOW",
                "font_size": 90,
                "stroke_width": 10,
                "bg_banner": True,
                "shadow_color": "#000000"
            }
        ],
        "shapes": [{"type": "pill"}],
        "arrows": [{"start_x": 80, "start_y": 70, "end_x": 50, "end_y": 50}]
    }
    out_path, _ = render_thumbnail_composite(None, canvas, aspect_ratio="9:16")

    qc = analyze_thumbnail_quality(
        image_path=out_path,
        canvas_data=canvas,
        context_title="Stop Making This Coding Mistake",
        context_transcript="Developers waste hours on this simple configuration."
    )

    assert "overall_score" in qc
    assert 0 <= qc["overall_score"] <= 100
    assert "rating_tier" in qc
    assert "metrics" in qc
    assert "suggestions" in qc
    assert len(qc["suggestions"]) >= 1
    assert "readability" in qc["metrics"]
    assert "contrast" in qc["metrics"]


def test_thumbnail_templates_lifecycle():
    """Verify 8 built-in templates and saving custom user templates."""
    templates = list_thumbnail_templates()
    assert len(templates) >= 8

    categories = {t["category"] for t in templates}
    assert "gaming" in categories
    assert "football" in categories
    assert "podcast" in categories
    assert "reactions" in categories
    assert "educational" in categories
    assert "entertainment" in categories
    assert "interviews" in categories
    assert "viral_shorts" in categories

    # Save custom template
    custom = save_thumbnail_template({
        "name": "Custom Cyber Neon",
        "category": "custom",
        "aspect_ratio": "9:16",
        "description": "User created custom neon template",
        "canvas_data": {"theme": "neon", "text_layers": []}
    })
    assert custom["id"].startswith("tpl_user_")
    assert custom["name"] == "Custom Cyber Neon"

    # Verify listed
    all_tpls = list_thumbnail_templates()
    assert any(t["id"] == custom["id"] for t in all_tpls)


def test_thumbnail_designs_crud_and_library():
    """Verify full CRUD, duplicate, and favorite toggle for thumbnail designs."""
    # 1. Create Design
    design = save_or_update_thumbnail_design({
        "title": "Secret AI Method",
        "project_id": "proj_test_1",
        "clip_id": "clip_test_1",
        "aspect_ratio": "9:16",
        "canvas_data": {"text_layers": [{"text": "SECRET!"}]},
        "quality_score": 88
    })
    des_id = design["id"]
    assert des_id.startswith("th_des_")
    assert design["title"] == "Secret AI Method"
    assert design["quality_score"] == 88

    # 2. Get Single Design
    fetched = get_thumbnail_design(des_id)
    assert fetched is not None
    assert fetched["id"] == des_id

    # 3. Toggle Favorite
    fav = toggle_favorite_thumbnail_design(des_id)
    assert fav["is_favorite"] is True

    # 4. Duplicate Design
    dup = duplicate_thumbnail_design(des_id)
    assert dup is not None
    assert dup["id"] != des_id
    assert "(Copy)" in dup["title"]

    # 5. List Designs
    designs = list_thumbnail_designs(project_id="proj_test_1")
    assert len(designs) >= 2

    # 6. Delete Design
    assert delete_thumbnail_design(dup["id"]) is True
    assert get_thumbnail_design(dup["id"]) is None


def test_apply_thumbnail_to_clip_and_rest_endpoints():
    """Verify REST API endpoints for frame extraction, text suggestions, rendering, and applying to clip."""
    # Setup test clip in DB
    conn = get_db_connection()
    try:
        conn.execute("""
            INSERT OR REPLACE INTO projects (id, name, created_at, updated_at)
            VALUES ('proj_tb_api', 'Thumbnail API Project', datetime('now'), datetime('now'));
        """)
        conn.execute("""
            INSERT OR REPLACE INTO generated_clips (
                id, project_id, title, start_time, end_time, duration_seconds,
                thumbnail_url, created_at, updated_at
            ) VALUES (
                'clip_tb_api_1', 'proj_tb_api', 'AI Coding Secrets', 0.0, 5.0, 5.0,
                '/media/old_thumb.jpg', datetime('now'), datetime('now')
            );
        """)
        conn.commit()
    finally:
        conn.close()

    # 1. Test suggest-text endpoint
    text_resp = client.post("/api/v1/thumbnails/suggest-text", json={
        "title": "Stop Writing Boilerplate Code",
        "hook": "This autonomous AI agent writes everything",
        "count": 4
    })
    assert text_resp.status_code == 200
    assert len(text_resp.json()["suggestions"]) == 4

    # 2. Test render endpoint
    canvas = {
        "text_layers": [{"id": "t1", "text": "DO NOT MISS", "font_size": 90, "stroke_width": 10}],
        "arrows": [{"start_x": 80, "start_y": 70, "end_x": 50, "end_y": 50}]
    }
    render_resp = client.post("/api/v1/thumbnails/render", json={
        "canvas_data": canvas,
        "aspect_ratio": "9:16"
    })
    assert render_resp.status_code == 200
    render_data = render_resp.json()
    assert "image_url" in render_data
    assert render_data["aspect_ratio"] == "9:16"

    # 3. Test quality analyzer endpoint
    qc_resp = client.post("/api/v1/thumbnails/analyze-quality", json={
        "image_url": render_data["image_url"],
        "canvas_data": canvas,
        "context_title": "AI Coding Secrets"
    })
    assert qc_resp.status_code == 200
    assert qc_resp.json()["quality"]["overall_score"] > 0

    # 4. Test apply-to-clip endpoint
    apply_resp = client.post("/api/v1/thumbnails/apply-to-clip/clip_tb_api_1", json={
        "rendered_image_url": render_data["image_url"],
        "design_id": "th_des_test_apply"
    })
    assert apply_resp.status_code == 200
    assert apply_resp.json()["thumbnail_url"] == render_data["image_url"]

    # Verify clip updated in database
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT thumbnail_url, thumbnail_design_id FROM generated_clips WHERE id = 'clip_tb_api_1';")
        row = cur.fetchone()
        assert row["thumbnail_url"] == render_data["image_url"]
        assert row["thumbnail_design_id"] == "th_des_test_apply"
    finally:
        conn.close()
