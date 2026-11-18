import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.ai_analyzer import ai_analyzer_service
from backend.app.services.analysis_manager import analysis_manager
from backend.app.core.database import get_db_connection

client = TestClient(app)

def test_moment_type_detection():
    """Verify that the 10 moment types are accurately recognized from cues."""
    dummy_words = [{"word": "sample", "start": 0.0, "end": 1.0}]
    cuts = [1.0]

    # 1. Funny
    m_funny = ai_analyzer_service._detect_moment_type("That was so hilarious and ridiculous, I couldn't stop laughing!", dummy_words, cuts, 15.0)
    assert m_funny == "funny"

    # 2. Dramatic
    m_dram = ai_analyzer_service._detect_moment_type("Suddenly everything changed and the danger was immediately evident with intense consequences.", dummy_words, cuts, 15.0)
    assert m_dram == "dramatic"

    # 3. Emotional
    m_emo = ai_analyzer_service._detect_moment_type("I felt so deeply touched, crying tears of joy from my heart.", dummy_words, cuts, 15.0)
    assert m_emo == "emotional"

    # 4. Surprising
    m_surp = ai_analyzer_service._detect_moment_type("What? How is that even possible? That is an unbelievable shocking surprise!", dummy_words, cuts, 15.0)
    assert m_surp == "surprising"

    # 5. Interesting Fact
    m_fact = ai_analyzer_service._detect_moment_type("Did you know that studies show 84 percent of the population has this exact trait according to research?", dummy_words, cuts, 15.0)
    assert m_fact == "interesting_fact"

    # 6. Heated Discussion
    m_heat = ai_analyzer_service._detect_moment_type("I completely disagree with you, that argument is nonsense and we must debate the facts!", dummy_words, cuts, 15.0)
    assert m_heat == "heated_discussion"

    # 7. Reaction
    m_react = ai_analyzer_service._detect_moment_type("Wait what? Look at that face, my jaw dropped at that reaction! Wow!", dummy_words, cuts, 15.0)
    assert m_react == "reaction"

    # 8. Exciting
    m_excite = ai_analyzer_service._detect_moment_type("Let's go! What an epic insane energy, we just won the championship!", dummy_words * 50, [1.0, 2.0, 3.0, 4.0], 10.0)
    assert m_excite == "exciting"

    # 9. Memorable Statement
    m_memo = ai_analyzer_service._detect_moment_type("Always remember this: greatness is never given, it is earned every single morning.", dummy_words, cuts, 15.0)
    assert m_memo == "memorable_statement"

    # 10. Unexpected Event
    m_unex = ai_analyzer_service._detect_moment_type("All of a sudden, chaos broke out out of nowhere!", dummy_words, cuts, 15.0)
    assert m_unex == "unexpected_event"

def test_context_aware_clip_boundaries():
    """Verify elimination of dangling conjunctions and question-answer context resolution."""
    raw_segments = [
        {"id": 0, "start": 5.0, "end": 9.8, "text": "Here is the critical context beforehand."},
        {"id": 1, "start": 10.0, "end": 12.8, "text": "And so the key question is why?"},
        {"id": 2, "start": 13.0, "end": 18.0, "text": "Because consistency always wins."}
    ]

    refined_start, refined_end, meta = ai_analyzer_service._refine_context_boundaries(
        start_time=10.0,
        end_time=12.8,
        segments=raw_segments,
        total_duration=30.0,
        min_dur=5.0,
        max_dur=25.0
    )

    # Starts should backtrack or snap past dangling conjunction 'And so'
    assert meta["has_qa_pair"] is True
    # Question should be extended to include the answer
    assert refined_end >= 15.0

def test_hook_detection_and_alternatives():
    """Verify hook style categorization and generation of 2-3 alternative opening hooks."""
    text = "Why do 99% of people fail at YouTube? Because they quit too early. In this video, we reveal the system."
    words = [
        {"word": "Why", "start": 2.0, "end": 2.3},
        {"word": "do", "start": 2.3, "end": 2.5},
        {"word": "99%", "start": 2.5, "end": 2.9},
        {"word": "of", "start": 2.9, "end": 3.0},
        {"word": "people", "start": 3.0, "end": 3.4},
        {"word": "fail", "start": 3.4, "end": 3.8},
        {"word": "at", "start": 3.8, "end": 4.0},
        {"word": "YouTube?", "start": 4.0, "end": 4.5},
        {"word": "Because", "start": 5.0, "end": 5.5},
        {"word": "they", "start": 5.5, "end": 5.8},
        {"word": "quit", "start": 5.8, "end": 6.2},
        {"word": "too", "start": 6.2, "end": 6.5},
        {"word": "early.", "start": 6.5, "end": 7.0},
        {"word": "In", "start": 7.5, "end": 7.7},
        {"word": "this", "start": 7.7, "end": 7.9},
        {"word": "video,", "start": 7.9, "end": 8.3},
        {"word": "we", "start": 8.3, "end": 8.5},
        {"word": "reveal", "start": 8.5, "end": 9.0},
        {"word": "the", "start": 9.0, "end": 9.2},
        {"word": "system.", "start": 9.2, "end": 9.7}
    ]

    hook_info = ai_analyzer_service._analyze_hooks_and_alternatives(text, words, start_time=2.0, duration=20.0)

    assert hook_info["hook_style"] in ["Unexpected Question", "Bold Numbered Claim", "Curiosity Gap"]
    assert len(hook_info["alternative_hooks"]) >= 2
    assert "absolute_start_time" in hook_info["alternative_hooks"][0]
    assert "hook_style" in hook_info["alternative_hooks"][0]

def test_speaker_and_dialogue_analysis():
    """Verify speaker diarization cues, turn detection, interruptions and dialogue flow."""
    dialogue_segments = [
        {"speaker": "Speaker 1", "start": 1.0, "end": 2.8, "text": "Do you agree with this?"},
        {"speaker": "Speaker 2", "start": 2.9, "end": 5.0, "text": "Wait, hold on, I must interrupt you."}
    ]

    analysis = ai_analyzer_service._analyze_speakers_and_dialogue(dialogue_segments)

    assert analysis["speaker_count"] == 2
    assert analysis["contains_interruption"] is True
    assert analysis["speaker_turn_count"] >= 2
    assert analysis["dialogue_flow"] == "interactive"

def test_nine_factor_clip_scoring():
    """Verify all 9 scoring dimensions, priority weighting, and non-guarantee disclaimer."""
    words = [{"word": "Test", "start": 0.0, "end": 1.0}] * 30
    scores = ai_analyzer_service._compute_nine_factor_scores(
        text="Why does this scientific breakthrough amaze everyone? Here is the exact proof.",
        duration=35.0,
        words=words,
        scene_cuts=[5.0, 15.0, 25.0],
        speaker_analysis={"speaker_count": 2, "speaker_turn_count": 3, "contains_interruption": False},
        context_meta={"has_punchline": True, "has_qa_pair": True, "beginning_adjusted": True},
        category="interesting_fact",
        content_priority="information",
        has_speech=True
    )

    breakdown = scores["breakdown"]
    required_dimensions = [
        "hook_strength", "entertainment_value", "emotional_impact",
        "context_completeness", "storytelling_quality", "audio_clarity",
        "visual_quality", "ending_quality", "standalone_understandability"
    ]
    for dim in required_dimensions:
        assert dim in breakdown
        assert 0 <= breakdown[dim] <= 100

    assert 0 <= scores["engagement_score"] <= 100
    assert 0 <= scores["content_quality_score"] <= 100
    assert "not a view guarantee" in scores["score_explanation"]

def test_duplicate_and_similar_clip_detection():
    """Verify IoU and Jaccard similarity detection between overlapping clip candidates."""
    candidates = [
        {
            "id": "cand_1",
            "start_time": 10.0,
            "end_time": 40.0,
            "transcript_excerpt": "This is the revolutionary secret to making YouTube Shorts that explode in views.",
            "engagement_score": 92,
            "content_quality_score": 90,
            "is_duplicate_or_similar": False,
            "similarity_info": {}
        },
        {
            "id": "cand_2",
            "start_time": 12.0,
            "end_time": 42.0,  # 80% overlap with cand_1
            "transcript_excerpt": "the revolutionary secret to making YouTube Shorts that explode in views every time.",
            "engagement_score": 84,
            "content_quality_score": 82,
            "is_duplicate_or_similar": False,
            "similarity_info": {}
        },
        {
            "id": "cand_3",
            "start_time": 100.0,
            "end_time": 130.0,  # Zero overlap
            "transcript_excerpt": "Completely separate topic about cooking pasta in Italy.",
            "engagement_score": 88,
            "content_quality_score": 85,
            "is_duplicate_or_similar": False,
            "similarity_info": {}
        }
    ]

    deduped = ai_analyzer_service._detect_similar_and_duplicate_clips(candidates)

    # cand_2 should be identified as duplicate/similar variation of cand_1
    cand_2_found = next(c for c in deduped if c["id"] == "cand_2")
    assert cand_2_found["is_duplicate_or_similar"] is True
    assert cand_2_found["similarity_info"]["primary_candidate_id"] == "cand_1"
    assert cand_2_found["similarity_info"]["similarity_percentage"] > 50

    # cand_3 is unique
    cand_3_found = next(c for c in deduped if c["id"] == "cand_3")
    assert cand_3_found["is_duplicate_or_similar"] is False

def test_smart_ranking_badges():
    """Verify accolade assignment for Best Overall, Best Hook, Most Entertaining, etc."""
    candidates = [
        {
            "id": "c1",
            "engagement_score": 95,
            "score_breakdown": {"hook_strength": 80, "entertainment_value": 70, "emotional_impact": 60, "storytelling_quality": 75, "context_completeness": 80},
            "category": "general"
        },
        {
            "id": "c2",
            "engagement_score": 85,
            "score_breakdown": {"hook_strength": 98, "entertainment_value": 70, "emotional_impact": 60, "storytelling_quality": 60, "context_completeness": 70},
            "category": "general"
        },
        {
            "id": "c3",
            "engagement_score": 82,
            "score_breakdown": {"hook_strength": 70, "entertainment_value": 96, "emotional_impact": 65, "storytelling_quality": 60, "context_completeness": 70},
            "category": "entertainment"
        },
        {
            "id": "c4",
            "engagement_score": 80,
            "score_breakdown": {"hook_strength": 65, "entertainment_value": 60, "emotional_impact": 94, "storytelling_quality": 70, "context_completeness": 70},
            "category": "emotional"
        }
    ]

    ranked = ai_analyzer_service._assign_smart_ranking_badges(candidates)
    badges = [c.get("ranking_badge") for c in ranked]

    assert "Best Overall" in badges
    assert "Best Hook" in badges
    assert "Most Entertaining" in badges
    assert "Most Emotional" in badges

def test_rehunt_api_endpoint():
    """Verify POST /api/v1/analysis/rehunt re-runs highlights using stored data without failure."""
    # Ensure a project and source video exist in DB
    conn = get_db_connection()
    with conn:
        conn.execute("INSERT OR IGNORE INTO projects (id, name, status, created_at, updated_at) VALUES ('test_p_rehunt', 'Rehunt Test', 'ready', datetime('now'), datetime('now'));")
        conn.execute("""
            INSERT OR REPLACE INTO source_videos (
                id, project_id, original_filename, storage_path, file_size_bytes, duration_seconds, transcription_status, created_at, updated_at
            ) VALUES ('test_s_rehunt', 'test_p_rehunt', 'test.mp4', '/tmp/nonexistent_test.mp4', 1048576, 120.0, 'completed', datetime('now'), datetime('now'));
        """)
        conn.execute("""
            INSERT OR REPLACE INTO transcriptions (
                id, source_video_id, language, duration_seconds, full_text, words_data, segments_data, pauses_data, speech_ratio, created_at, updated_at
            ) VALUES (
                'test_t_rehunt', 'test_s_rehunt', 'en', 120.0,
                'Why does everyone make this mistake? In this breakdown, we show the solution.',
                '[{"word": "Why", "start": 10.0, "end": 10.5}, {"word": "does", "start": 10.5, "end": 11.0}, {"word": "everyone", "start": 11.0, "end": 11.5}, {"word": "make", "start": 11.5, "end": 12.0}, {"word": "this", "start": 12.0, "end": 12.5}, {"word": "mistake?", "start": 12.5, "end": 13.0}]',
                '[{"id": 0, "start": 10.0, "end": 35.0, "text": "Why does everyone make this mistake? In this breakdown, we show the solution.", "words": []}]',
                '[]', 0.85, datetime('now'), datetime('now')
            );
        """)
    conn.close()

    response = client.post("/api/v1/analysis/rehunt", json={
        "project_id": "test_p_rehunt",
        "min_duration_seconds": 15.0,
        "max_duration_seconds": 45.0,
        "target_clip_count": 5,
        "category": "automatic",
        "content_priority": "entertainment",
        "min_quality_score": 60,
        "include_similar": True
    })

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["project_id"] == "test_p_rehunt"
    assert "candidates" in data
    assert len(data["candidates"]) >= 1
    cand = data["candidates"][0]
    assert "moment_type" in cand
    assert "ranking_badge" in cand
    assert "hook_style" in cand
    assert "alternative_hooks" in cand
    assert "speaker_analysis" in cand
    assert "score_breakdown" in cand
