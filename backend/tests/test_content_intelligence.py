import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.content_intelligence import content_intelligence_service

client = TestClient(app)

def test_get_and_update_niche_profile():
    """Verify fetching and updating channel niche profile."""
    # GET profile
    res = client.get("/api/v1/intelligence/profile")
    assert res.status_code == 200
    data = res.json()
    assert "niche_name" in data
    assert "core_topics" in data
    assert "target_audience" in data
    assert len(data["core_topics"]) > 0

    # PUT update
    update_payload = {
        "niche_name": "Autonomous AI & High-Performance Engineering",
        "core_topics": ["Agent Swarms", "DeepSeek", "Local LLMs", "Microservices"],
        "target_audience": "Senior developers and AI technical founders aged 20-40",
        "brand_voice": "Authoritative, fast-paced, contrarian",
        "preferred_duration_seconds": 40,
        "top_performing_hook_styles": ["Contrarian Statement", "Cost Proof"],
        "manual_overrides": {"primary_focus": "Agent Swarms"}
    }
    update_res = client.put("/api/v1/intelligence/profile", json=update_payload)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["niche_name"] == "Autonomous AI & High-Performance Engineering"
    assert "Agent Swarms" in updated_data["core_topics"]

def test_discover_trending_topics():
    """Verify trending content discovery and long-form candidates."""
    res = client.get("/api/v1/intelligence/trends")
    assert res.status_code == 200
    data = res.json()
    assert "trends" in data
    assert len(data["trends"]) > 0

    trend = data["trends"][0]
    assert "topic" in trend
    assert "growth_velocity_pct" in trend
    assert "sample_candidates" in trend
    assert len(trend["sample_candidates"]) > 0
    candidate = trend["sample_candidates"][0]
    assert "estimated_shorts_count" in candidate
    assert "opportunity_score" in candidate

def test_competitors_management():
    """Verify listing, adding, and removing competitors."""
    # List competitors
    res = client.get("/api/v1/intelligence/competitors")
    assert res.status_code == 200
    data = res.json()
    assert "competitors" in data
    assert len(data["competitors"]) > 0

    # Add competitor
    add_payload = {
        "channel_name": "AI Foundations Daily",
        "competitor_channel_id": "UC_ai_foundations_test",
        "subscribers": 450000,
        "avg_shorts_views": 85000,
        "upload_frequency_per_week": 4.0,
        "top_topics": ["ChatGPT Hacks", "Claude Workflows"]
    }
    add_res = client.post("/api/v1/intelligence/competitors", json=add_payload)
    assert add_res.status_code == 200

    # Verify added
    res_after = client.get("/api/v1/intelligence/competitors")
    names = [c["channel_name"] for c in res_after.json()["competitors"]]
    assert "AI Foundations Daily" in names

    # Delete competitor
    del_res = client.delete("/api/v1/intelligence/competitors/UC_ai_foundations_test")
    assert del_res.status_code == 200

def test_content_gap_analysis():
    """Verify content gap identification and opportunity scoring."""
    res = client.get("/api/v1/intelligence/content-gaps")
    assert res.status_code == 200
    data = res.json()
    assert "content_gaps" in data
    assert len(data["content_gaps"]) > 0

    gap = data["content_gaps"][0]
    assert "topic_name" in gap
    assert "opportunity_score" in gap
    assert "suggested_angle" in gap
    assert gap["opportunity_score"] >= 80

def test_evaluate_source_video_opportunity():
    """Verify evaluation of potential long-form source videos."""
    payload = {
        "title": "Why DeepSeek-V3 Trained for 1/10th the Cost of Llama 3",
        "description": "Architectural breakdown of Multi-Head Latent Attention and DualPipe parallelism.",
        "duration_seconds": 2100.0,
        "category": "AI Research"
    }
    res = client.post("/api/v1/intelligence/evaluate-source-video", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "opportunity_score" in data
    assert data["opportunity_score"] >= 80
    assert "estimated_interesting_moments" in data
    assert data["estimated_interesting_moments"] >= 4
    assert "breakdown" in data
    assert "criteria_explanation" in data

def test_generate_and_evaluate_shorts_ideas():
    """Verify Shorts idea generation and viral potential evaluation."""
    # Generate ideas
    res = client.get("/api/v1/intelligence/ideas?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "ideas" in data
    assert len(data["ideas"]) > 0

    idea = data["ideas"][0]
    assert "title" in idea
    assert "hook_sentence" in idea
    assert "suggested_structure" in idea
    assert "opportunity_score" in idea

    # Evaluate custom idea
    eval_payload = {
        "title": "Stop Paying $20/mo For ChatGPT Plus: Use This Local Hack #Shorts",
        "hook_sentence": "You are literally burning $240 a year for something your laptop can run offline for free.",
        "concept_summary": "Demonstrates running quantized DeepSeek R1 100% offline with zero latency.",
        "duration_seconds": 42
    }
    eval_res = client.post("/api/v1/intelligence/ideas/evaluate", json=eval_payload)
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert "opportunity_score" in eval_data
    assert "score_breakdown" in eval_data
    assert eval_data["score_breakdown"]["hook_strength"] > 70
    assert "diagnostic_feedback" in eval_data

def test_convert_idea_to_project():
    """Verify converting an AI Shorts idea directly into an active project."""
    res_ideas = client.get("/api/v1/intelligence/ideas?limit=1")
    assert res_ideas.status_code == 200
    idea = res_ideas.json()["ideas"][0]

    conv_res = client.post(f"/api/v1/intelligence/ideas/{idea['id']}/convert-to-project")
    assert conv_res.status_code == 200
    conv_data = conv_res.json()
    assert conv_data["success"] is True
    assert "project_id" in conv_data

    # Verify project exists in projects API
    proj_res = client.get(f"/api/v1/projects/{conv_data['project_id']}")
    assert proj_res.status_code == 200
    proj_data = proj_res.json()
    assert proj_data["name"] == idea["title"]

def test_content_strategy_calendar():
    """Verify 7-day and 14-day sequential content calendar generation."""
    for days in [7, 14]:
        res = client.get(f"/api/v1/intelligence/strategy?timeframe_days={days}")
        assert res.status_code == 200
        data = res.json()
        assert "daily_schedule" in data
        assert len(data["daily_schedule"]) == days
        day_item = data["daily_schedule"][0]
        assert "title" in day_item
        assert "hook" in day_item
        assert "topic" in day_item
        assert "publish_date" in day_item

def test_strategy_assistant_query():
    """Verify AI strategy assistant answering creator questions."""
    queries = [
        "What are my competitors doing?",
        "What are my biggest content gaps?",
        "How can I improve my opening hooks?"
    ]
    for q in queries:
        res = client.post("/api/v1/intelligence/assistant/query", json={"question": q})
        assert res.status_code == 200
        data = res.json()
        assert "answer" in data
        assert len(data["answer"]) > 50
        assert "channel_niche" in data
