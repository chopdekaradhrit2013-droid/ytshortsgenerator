-- Supabase Migration: 20261118_advanced_studio_schema.sql
-- Advanced Shorts Studio & Professional Video Editing Suite Schema

CREATE TABLE IF NOT EXISTS studio_projects (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL,
    clip_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    aspect_ratio VARCHAR(32) DEFAULT '9:16',
    canvas_settings JSONB DEFAULT '{
        "width": 1080,
        "height": 1920,
        "bg_color": "#090A0F",
        "bg_blur": true,
        "fit_mode": "contain_blur",
        "show_safe_guides": true
    }',
    timeline_data JSONB DEFAULT '{
        "duration": 45.0,
        "playhead": 0.0,
        "zoom_level": 1.0,
        "tracks": []
    }',
    video_adjustments JSONB DEFAULT '{
        "brightness": 0,
        "contrast": 1.0,
        "saturation": 1.0,
        "blur": 0,
        "speed": 1.0,
        "flip_h": false,
        "flip_v": false,
        "rotate": 0,
        "crop_mode": "smart_face",
        "scale": 100,
        "fade_in": 0.0,
        "fade_out": 0.0,
        "transition": "none"
    }',
    captions_state JSONB DEFAULT '{
        "preset": "bold_pop",
        "font_family": "Montserrat",
        "font_size": 52,
        "font_weight": 900,
        "primary_color": "#FFFFFF",
        "highlight_color": "#FACC15",
        "bg_color": "#000000",
        "bg_opacity": 0,
        "outline_width": 4.5,
        "shadow_offset": 2.0,
        "placement": "bottom",
        "animation": "pop",
        "uppercase": true,
        "words_per_line": 4,
        "segments": []
    }',
    audio_state JSONB DEFAULT '{
        "video_audio_volume": 1.0,
        "video_audio_muted": false,
        "bgm_track": "none",
        "bgm_volume": 0.14,
        "bgm_fade_in": 1.0,
        "bgm_fade_out": 2.0,
        "loudnorm": true,
        "denoise": true,
        "speech_boost": true,
        "voiceover_volume": 1.0,
        "voiceover_file": null
    }',
    overlays_state JSONB DEFAULT '{
        "titles": [],
        "stickers": [],
        "shapes": [],
        "watermark": {
            "enabled": false,
            "text": "@AiShortsFactory",
            "opacity": 0.7,
            "position": "top_right"
        }
    }',
    export_settings JSONB DEFAULT '{
        "resolution": "1080p",
        "width": 1080,
        "height": 1920,
        "fps": 30,
        "format": "mp4",
        "quality": "high",
        "crf": 20,
        "bitrate": "12M",
        "audio_bitrate": "192k"
    }',
    version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS studio_presets (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    description TEXT,
    is_builtin BOOLEAN DEFAULT FALSE,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS studio_assets (
    id VARCHAR(64) PRIMARY KEY,
    asset_type VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64),
    file_path VARCHAR(512) NOT NULL,
    duration_seconds FLOAT DEFAULT 0.0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_projects_clip ON studio_projects(clip_id);
CREATE INDEX IF NOT EXISTS idx_studio_projects_project ON studio_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_studio_presets_category ON studio_presets(category);

