from typing import Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel

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
        "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        "role": "Creator Pro Plan"
    },
    "youtube_account": {
        "channel_name": "AI Shorts Factory Studios",
        "channel_id": "UC_x5XG1OV2P6uZZ5FSM9Ttw",
        "subscribers": 148500,
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
    return CURRENT_SETTINGS

@router.put("")
def update_settings(payload: Dict[str, Any]):
    for section, values in payload.items():
        if section in CURRENT_SETTINGS and isinstance(values, dict):
            CURRENT_SETTINGS[section].update(values)
        else:
            CURRENT_SETTINGS[section] = values
    return {"status": "saved", "settings": CURRENT_SETTINGS}

