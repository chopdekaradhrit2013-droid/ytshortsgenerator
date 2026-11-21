from typing import Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel
from backend.app.core.database import get_db_connection

router = APIRouter()

class UserSettings(BaseModel):
    profile: Dict[str, Any]
    youtube_account: Dict[str, Any]
    editing_preferences: Dict[str, Any]
    caption_style: Dict[str, Any]
    export_settings: Dict[str, Any]
    storage: Dict[str, Any]
    app_preferences: Dict[str, Any]

CURRENT_SETTINGS = {
    "profile": {
        "name": "Adhrit Chopdekar",
        "email": "adhrit@shortsfactory.io",
        "avatar": "",
        "role": "Creator Pro Plan"
    },
    "youtube_account": {
        "channel_name": "",
        "channel_id": "",
        "subscribers": 0,
        "is_connected": False,
        "auto_publish_approved": False,
        "default_visibility": "public",
        "default_tags": "Shorts, AI, Viral, Tech"
    },
    "editing_preferences": {
        "default_aspect_ratio": "9:16",
        "default_clip_duration": 45,
        "default_target_clips": 10,
        "auto_silence_removal": True,
        "background_music_ducking": True
    },
    "caption_style": {
        "preset": "hormozi",
        "font_family": "Inter",
        "font_size": 24,
        "primary_color": "#FFFFFF",
        "highlight_color": "#FACC15",
        "animation": "pop",
        "casing": "UPPERCASE"
    },
    "export_settings": {
        "resolution": "1080x1920 (Full HD)",
        "framerate": 60,
        "codec": "H.264 (libx264)",
        "bitrate": "12 Mbps",
        "audio_bitrate": "192 kbps"
    },
    "storage": {
        "used_bytes": 5170000000,
        "limit_bytes": 10737418240,
        "auto_cleanup_days": 30
    },
    "app_preferences": {
        "theme": "dark",
        "telemetry": False,
        "sound_effects": True,
        "auto_save_interval_sec": 10
    }
}

@router.get("")
def get_settings():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM connected_channels WHERE is_connected = 1 ORDER BY updated_at DESC LIMIT 1;")
        ch = cur.fetchone()
        conn.close()
        if ch:
            CURRENT_SETTINGS["youtube_account"]["channel_name"] = ch["channel_title"]
            CURRENT_SETTINGS["youtube_account"]["channel_id"] = ch["channel_id"]
            CURRENT_SETTINGS["youtube_account"]["subscribers"] = ch["subscriber_count"]
            CURRENT_SETTINGS["youtube_account"]["avatar_url"] = ch["avatar_url"]
            CURRENT_SETTINGS["youtube_account"]["is_connected"] = True
        else:
            CURRENT_SETTINGS["youtube_account"]["is_connected"] = False
    except Exception:
        pass
    return CURRENT_SETTINGS

@router.put("")
def update_settings(payload: Dict[str, Any]):
    for section, values in payload.items():
        if section in CURRENT_SETTINGS and isinstance(values, dict):
            CURRENT_SETTINGS[section].update(values)
        else:
            CURRENT_SETTINGS[section] = values
    return {"status": "saved", "settings": CURRENT_SETTINGS}

