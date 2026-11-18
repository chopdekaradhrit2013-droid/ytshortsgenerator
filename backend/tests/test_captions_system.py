import os
import json
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection
from backend.app.services.caption_generator import caption_generator, hex_to_ass_color, format_ass_time
from backend.app.services.whisper_service import whisper_service

client = TestClient(app)

def test_hex_to_ass_color_conversion():
    # CSS #RRGGBB -> ASS &HAABBGGRR&
    assert hex_to_ass_color("#FFFFFF", alpha_hex="00") == "&H00FFFFFF&"
    assert hex_to_ass_color("#00FF00", alpha_hex="00") == "&H0000FF00&"  # Neon Green
    assert hex_to_ass_color("#FACC15", alpha_hex="00") == "&H0015CCFA&"  # Yellow in BBGGRR
    # Transparent / alpha test
    assert hex_to_ass_color("#000000", alpha_hex="80") == "&H80000000&"
    # Graceful handling of None or empty
    assert hex_to_ass_color(None) == "&H00000000&"
    assert hex_to_ass_color("") == "&H00000000&"

def test_format_ass_time():
    assert format_ass_time(0.0) == "0:00:00.00"
    assert format_ass_time(65.42) == "0:01:05.42"
    assert format_ass_time(3661.05) == "1:01:01.05"

def test_words_to_editable_segments_partitioning():
    words = [
        {"word": "Welcome", "start": 10.0, "end": 10.4, "speaker": "Speaker 1"},
        {"word": "to", "start": 10.4, "end": 10.6, "speaker": "Speaker 1"},
        {"word": "AI", "start": 10.6, "end": 10.9, "speaker": "Speaker 1"},
        {"word": "Shorts!", "start": 10.9, "end": 11.5, "speaker": "Speaker 1"},
        {"word": "This", "start": 11.8, "end": 12.1, "speaker": "Speaker 2"},
        {"word": "will", "start": 12.1, "end": 12.3, "speaker": "Speaker 2"},
        {"word": "blow", "start": 12.3, "end": 12.6, "speaker": "Speaker 2"},
        {"word": "your", "start": 12.6, "end": 12.9, "speaker": "Speaker 2"},
        {"word": "mind.", "start": 12.9, "end": 13.5, "speaker": "Speaker 2"}
    ]

    # Clip start at 10.0, duration 4.0 (10.0 to 14.0)
    segments = caption_generator.words_to_editable_segments(
        words=words,
        clip_start=10.0,
        clip_duration=4.0,
        words_per_line=4
    )

    assert len(segments) >= 2
    # First segment: "Welcome to AI Shorts!"
    assert segments[0]["start"] == 0.0
    assert "Welcome" in segments[0]["text"]
    assert "Shorts!" in segments[0]["text"]
    assert len(segments[0]["words"]) == 4

    # Second segment timestamps relative to 10.0 clip start
    assert segments[1]["start"] == 1.8
    assert "This" in segments[1]["text"]

def test_all_6_presets_ass_generation():
    segments = [
        {
            "id": "seg_1",
            "start": 0.2,
            "end": 2.5,
            "text": "Stop scrolling right now!",
            "speaker": "Speaker 1",
            "words": [
                {"id": "w1", "word": "Stop", "start": 0.2, "end": 0.6, "emphasis": False},
                {"id": "w2", "word": "scrolling", "start": 0.6, "end": 1.2, "emphasis": False},
                {"id": "w3", "word": "right", "start": 1.2, "end": 1.8, "emphasis": False},
                {"id": "w4", "word": "now!", "start": 1.8, "end": 2.5, "emphasis": True}
            ]
        }
    ]

    all_presets = ["mrbeast", "bold_pop", "minimal", "gaming", "cinematic", "karaoke"]
    for p in all_presets:
        out_path = os.path.join(settings.MEDIA_STORAGE_DIR, "captions", f"test_full_{p}.ass")
        script = caption_generator.generate_ass_script_from_segments(
            segments=segments,
            clip_duration=3.0,
            output_ass_path=out_path,
            preset=p,
            hook_text="STOP SCROLLING!"
        )
        assert os.path.exists(script)
        with open(script, "r", encoding="utf-8") as f:
            content = f.read()

        # Check essential ASS sections
        assert "[Script Info]" in content
        assert "[V4+ Styles]" in content
        assert "[Events]" in content
        assert "PlayResX: 1080" in content
        assert "PlayResY: 1920" in content
        assert "STOP SCROLLING!" in content
        assert "Dialogue: 0," in content

        # Check preset specific style rules
        if p == "mrbeast":
            assert "\\fscx115\\fscy115" in content  # Scale bump pop animation
        elif p == "karaoke":
            assert "\\c&H00" in content

def test_smart_face_avoidance_placement():
    segments = [
        {
            "id": "seg_1",
            "start": 0.0,
            "end": 2.0,
            "text": "Face avoidance test",
            "words": [{"id": "w1", "word": "Face", "start": 0.0, "end": 1.0}]
        }
    ]

    # When speaker face is low (Y=0.72 > 0.58), reposition to middle safe area
    out_path_low = os.path.join(settings.MEDIA_STORAGE_DIR, "captions", "test_face_low.ass")
    caption_generator.generate_ass_script_from_segments(
        segments=segments,
        clip_duration=2.0,
        output_ass_path=out_path_low,
        face_center_y_ratio=0.72
    )
    with open(out_path_low, "r") as f:
        low_content = f.read()
    # Alignment 5 = Middle-Center, MarginV = 450
    assert ",5,60,60,450,1" in low_content

    # When speaker face is upper (Y=0.30 <= 0.58), place at standard safe bottom
    out_path_high = os.path.join(settings.MEDIA_STORAGE_DIR, "captions", "test_face_high.ass")
    caption_generator.generate_ass_script_from_segments(
        segments=segments,
        clip_duration=2.0,
        output_ass_path=out_path_high,
        face_center_y_ratio=0.30
    )
    with open(out_path_high, "r") as f:
        high_content = f.read()
    # Alignment 2 = Bottom-Center, MarginV = 320
    assert ",2,60,60,320,1" in high_content

def test_multilingual_indian_languages_ass_generation():
    indian_samples = {
        "hi": "नमस्ते दोस्तों, आज हम इस सीक्रेट स्ट्रेटेजी के बारे में बात करेंगे।",
        "mr": "नमस्कार मित्रांनो, आज आपण सर्वात महत्त्वाच्या विषयावर बोलणार आहोत.",
        "ta": "வணக்கம் நண்பர்களே, இன்று நாம் மிக முக்கியமான ரகசியத்தை பார்க்க போகிறோம்.",
        "te": "నమస్కారం మిత్రులారా, ఈరోజు మనం అత్యంత ముఖ్యమైన రహస్యాన్ని తెలుసుకుందాం.",
        "bn": "নমস্কার বন্ধুরা, আজ আমরা সবচেয়ে গুরুত্বপূর্ণ কৌশলটি নিয়ে আলোচনা করব।",
        "pa": "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਦੋਸਤੋ, ਅੱਜ ਅਸੀਂ ਸਭ ਤੋਂ ਮਹੱਤਵਪੂਰਨ ਰਣਨੀਤੀ ਬਾਰੇ ਗੱਲ ਕਰਾਂਗੇ।"
    }

    for lang, sentence in indian_samples.items():
        words_list = sentence.split()
        words_objs = [
            {"id": f"w_{i}", "word": w, "start": i * 0.4, "end": (i + 1) * 0.4}
            for i, w in enumerate(words_list)
        ]
        segments = caption_generator.words_to_editable_segments(
            words=words_objs,
            clip_start=0.0,
            clip_duration=len(words_list) * 0.45,
            words_per_line=3
        )
        out_path = os.path.join(settings.MEDIA_STORAGE_DIR, "captions", f"test_lang_{lang}.ass")
        script = caption_generator.generate_ass_script_from_segments(
            segments=segments,
            clip_duration=len(words_list) * 0.45,
            output_ass_path=out_path,
            preset="bold_pop"
        )
        assert os.path.exists(script)
        with open(script, "r", encoding="utf-8") as f:
            content = f.read()
        assert words_list[0] in content

def test_clip_captions_rest_api_lifecycle():
    # 1. Fetch default seed clip
    res = client.get("/api/v1/clips")
    assert res.status_code == 200
    clips = res.json()
    assert len(clips) > 0
    clip_id = clips[0]["id"]

    # 2. GET /api/v1/clips/{clip_id}/captions
    get_res = client.get(f"/api/v1/clips/{clip_id}/captions")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["clip_id"] == clip_id
    assert "segments" in data
    assert len(data["segments"]) > 0
    assert data["export_with_captions"] is True

    # 3. PUT /api/v1/clips/{clip_id}/captions (edit inline word & change preset to MrBeast)
    segments = data["segments"]
    # Change first word
    segments[0]["words"][0]["word"] = "ATTENTION:"
    segments[0]["text"] = "ATTENTION: " + " ".join([w["word"] for w in segments[0]["words"][1:]])

    put_payload = {
        "caption_preset": "mrbeast",
        "caption_placement": "middle",
        "export_with_captions": True,
        "custom_overrides": {
            "font_size": 60,
            "highlight_color": "#00FF00"
        },
        "segments": segments
    }
    put_res = client.put(f"/api/v1/clips/{clip_id}/captions", json=put_payload)
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["caption_preset"] == "mrbeast"
    assert updated["caption_placement"] == "middle"
    assert updated["segments"][0]["words"][0]["word"] == "ATTENTION:"
    assert updated["custom_overrides"]["font_size"] == 60

    # 4. POST /api/v1/clips/{clip_id}/captions/regenerate with Hindi
    regen_res = client.post(
        f"/api/v1/clips/{clip_id}/captions/regenerate",
        json={"language": "hi", "words_per_line": 3}
    )
    assert regen_res.status_code == 200
    regen_data = regen_res.json()
    assert regen_data["language"] == "hi"
    assert len(regen_data["segments"]) > 0
    # Check that Hindi native text was populated
    first_seg_text = regen_data["segments"][0]["text"]
    assert any(ord(c) >= 0x0900 and ord(c) <= 0x097F for c in first_seg_text)

