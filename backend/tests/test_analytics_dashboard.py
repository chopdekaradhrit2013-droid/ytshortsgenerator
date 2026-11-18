import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.youtube_analytics import youtube_analytics_service

client = TestClient(app)

def test_get_analytics_overview():
    """Verify overview metrics calculation and period comparisons."""
    response = client.get("/api/v1/analytics/overview?time_range=28d")
    assert response.status_code == 200
    data = response.json()

    assert "metrics" in data
    assert "channel_name" in data
    metrics = data["metrics"]
    
    assert "total_views" in metrics
    assert "total_subscribers" in metrics
    assert "total_likes" in metrics
    assert "total_comments" in metrics
    assert "total_shares" in metrics
    assert "avg_views_per_short" in metrics
    assert "avg_engagement_rate" in metrics

    assert metrics["total_views"]["value"] > 0
    assert "change_pct" in metrics["total_views"]
    assert "is_positive" in metrics["total_views"]

def test_get_time_series():
    """Verify time series daily datapoints across different timeframes."""
    for tr in ["7d", "28d", "90d"]:
        response = client.get(f"/api/v1/analytics/time-series?time_range={tr}&metric=views")
        assert response.status_code == 200
        data = response.json()
        assert data["time_range"] == tr
        assert len(data["data"]) > 0
        point = data["data"][0]
        assert "date" in point
        assert "views" in point
        assert "subscribers_gained" in point
        assert "likes" in point
        assert "comments" in point
        assert "shorts_published" in point

def test_get_individual_shorts():
    """Verify individual published Shorts table with sorting."""
    response = client.get("/api/v1/analytics/shorts?sort_by=views&order=desc&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "shorts" in data
    assert len(data["shorts"]) > 0

    first = data["shorts"][0]
    assert "title" in first
    assert "views" in first
    assert "likes" in first
    assert "comments" in first
    assert "engagement_rate" in first
    assert "performance_badge" in first
    assert first["platform_url"].startswith("https://youtube.com/shorts/")

def test_get_short_detail():
    """Verify detailed analytics for an individual Short including retention curve."""
    response = client.get("/api/v1/analytics/shorts/dQw4w9WgXcQ")
    assert response.status_code == 200
    data = response.json()

    assert data["video_id"] == "dQw4w9WgXcQ"
    assert "retention_curve" in data
    assert len(data["retention_curve"]) > 0
    assert "daily_views_trajectory" in data
    assert "diagnostics" in data
    assert "hook_retention_3s" in data["diagnostics"]
    assert data["diagnostics"]["hook_retention_3s"] >= 80.0

def test_top_performing_shorts():
    """Verify Top 10 leaderboards by views, likes, engagement, and growth."""
    response = client.get("/api/v1/analytics/top-shorts")
    assert response.status_code == 200
    data = response.json()

    assert "top_by_views" in data
    assert "top_by_likes" in data
    assert "top_by_engagement" in data
    assert "fastest_growing" in data
    assert len(data["top_by_views"]) > 0
    assert len(data["fastest_growing"]) > 0

def test_audience_insights():
    """Verify audience demographics, geography, age, and viewer breakdown."""
    response = client.get("/api/v1/analytics/audience?time_range=28d")
    assert response.status_code == 200
    data = response.json()

    assert "age_distribution" in data
    assert "gender_distribution" in data
    assert "top_geographies" in data
    assert "viewers_breakdown" in data
    assert "traffic_sources" in data

    assert len(data["age_distribution"]) > 0
    assert len(data["top_geographies"]) > 0
    assert data["viewers_breakdown"]["new_viewers_pct"] > 50.0

def test_content_performance_insights():
    """Verify data-driven insights across topics, hooks, durations, and best publishing times."""
    response = client.get("/api/v1/analytics/content-insights")
    assert response.status_code == 200
    data = response.json()

    assert "topic_insights" in data
    assert "hook_insights" in data
    assert "duration_insights" in data
    assert "best_publishing_days" in data
    assert "best_publishing_times" in data
    assert "actionable_recommendations" in data

    assert len(data["topic_insights"]) > 0
    assert len(data["actionable_recommendations"]) > 0

def test_ai_performance_assistant():
    """Verify AI assistant generates grounded, data-backed recommendations."""
    queries = [
        "Why did my top Short perform so well?",
        "Why did this Short perform poorly?",
        "What topics should I make next?",
        "What should I improve in my next upload?",
        "Which videos are gaining momentum right now?"
    ]

    for q in queries:
        response = client.post("/api/v1/analytics/assistant/query", json={"question": q})
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert len(data["answer"]) > 50
        assert "citations" in data
        assert len(data["citations"]) > 0

def test_performance_alerts_and_settings():
    """Verify milestone alert notifications, read status, and custom thresholds."""
    # Fetch alerts
    response = client.get("/api/v1/analytics/alerts")
    assert response.status_code == 200
    data = response.json()
    assert "alerts" in data
    assert data["total_alerts"] > 0

    # Mark all read
    mark_res = client.post("/api/v1/analytics/alerts/mark-read")
    assert mark_res.status_code == 200

    # Update threshold settings
    patch_res = client.patch("/api/v1/analytics/alerts/settings", json={
        "milestone_1k_enabled": True,
        "milestone_10k_enabled": True,
        "milestone_100k_enabled": True,
        "velocity_spike_threshold_pct": 250.0,
        "retention_drop_threshold_pct": 35.0,
        "subscriber_milestone_interval": 5000,
        "email_notifications_enabled": True
    })
    assert patch_res.status_code == 200
    settings_data = patch_res.json()
    assert settings_data["velocity_spike_threshold_pct"] == 250.0

def test_export_csv_and_report():
    """Verify CSV export and formatted printable report data."""
    # CSV export
    csv_res = client.get("/api/v1/analytics/export/csv?time_range=28d")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "AI SHORTS FACTORY" in csv_res.text
    assert "TOTAL VIEWS" in csv_res.text

    # Structured printable report
    report_res = client.get("/api/v1/analytics/export/report?time_range=28d")
    assert report_res.status_code == 200
    report_data = report_res.json()
    assert "overview" in report_data
    assert "top_performing" in report_data
    assert "audience" in report_data

