-- ==============================================================================
-- AI SHORTS FACTORY — ADVANCED CAPTIONS & SUBTITLES STUDIO MIGRATION
-- Migration: 20261118_captions_studio_schema.sql
-- ==============================================================================

-- 1. Add Captions Studio Columns to Generated Clips
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS captions_data JSONB DEFAULT '[]'::jsonb;
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS export_with_captions BOOLEAN DEFAULT true;
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS caption_placement TEXT DEFAULT 'auto';
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS caption_language TEXT DEFAULT 'en';

-- 2. Seed Prompt 4 Caption Presets (MrBeast, Hormozi, Minimal, Gaming, Cinematic, Karaoke)
INSERT INTO editing_presets (
    id, name, description, category, caption_preset, font_family, font_size,
    primary_color, highlight_color, outline_color, outline_width, position,
    words_per_line, zoom_intensity, crop_mode, audio_enhancement, bgm_track,
    bgm_volume, hook_enabled, is_system, created_at, updated_at
) VALUES
('preset_mrbeast', 'MrBeast Viral Dynamic', 'Massive bold uppercase captions, neon green highlight, thick 6px stroke & active word pop-in.', 'viral', 'mrbeast', 'Impact', 56, '#FFFFFF', '#00FF00', '#000000', 6, 'bottom', 3, 'dynamic', 'smart_face', '{"loudnorm": true, "denoise": true, "speech_boost": true}', NULL, 0.0, true, true, NOW(), NOW()),
('preset_karaoke', 'Karaoke Word Highlight', 'Dimmed secondary words that illuminate into vibrant purple in exact sync with voice.', 'music', 'karaoke', 'Inter', 48, '#9CA3AF', '#A855F7', '#000000', 4, 'bottom', 4, 'subtle', 'smart_face', '{"loudnorm": true, "denoise": true, "speech_boost": true}', 'lofi_ambient', 0.12, false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

