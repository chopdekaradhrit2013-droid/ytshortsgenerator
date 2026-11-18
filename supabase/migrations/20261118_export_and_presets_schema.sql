-- ==============================================================================
-- AI SHORTS FACTORY — EXPORT ENGINE & EDITING PRESETS SCHEMA MIGRATION
-- Migration: 20261118_export_and_presets_schema.sql
-- ==============================================================================

-- 1. Create Export Jobs Table
CREATE TABLE IF NOT EXISTS export_jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    clip_id TEXT NOT NULL REFERENCES generated_clips(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'rendering', 'completed', 'failed', 'cancelled')),
    stage TEXT NOT NULL DEFAULT 'preparing' CHECK (stage IN (
        'preparing',
        'tracking_subject',
        'generating_captions',
        'building_filtergraph',
        'rendering_h264',
        'quality_control',
        'completed',
        'failed',
        'cancelled'
    )),
    progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    output_video_path TEXT,
    output_thumbnail_path TEXT,
    duration_seconds REAL,
    resolution TEXT DEFAULT '1080x1920',
    fps REAL DEFAULT 30.0,
    config JSONB DEFAULT '{}'::jsonb,
    qc_report JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Editing Presets Table
CREATE TABLE IF NOT EXISTS editing_presets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    caption_preset TEXT NOT NULL DEFAULT 'bold_pop',
    font_family TEXT DEFAULT 'Inter',
    font_size INTEGER DEFAULT 50,
    primary_color TEXT DEFAULT '#FFFFFF',
    highlight_color TEXT DEFAULT '#FACC15',
    outline_color TEXT DEFAULT '#000000',
    outline_width INTEGER DEFAULT 4,
    position TEXT DEFAULT 'bottom',
    words_per_line INTEGER DEFAULT 5,
    zoom_intensity TEXT DEFAULT 'dynamic',
    crop_mode TEXT DEFAULT 'smart_face',
    audio_enhancement JSONB DEFAULT '{"loudnorm": true, "denoise": true, "speech_boost": true}'::jsonb,
    bgm_track TEXT,
    bgm_volume REAL DEFAULT 0.15,
    hook_enabled BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add Export & Hook Columns to Generated Clips
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS hook_suggestions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS selected_hook TEXT;
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS caption_preset TEXT DEFAULT 'bold_pop';
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS editing_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS export_status TEXT DEFAULT 'draft';
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS export_video_url TEXT;

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_export_jobs_project_id ON export_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_clip_id ON export_jobs(clip_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_editing_presets_category ON editing_presets(category);

-- 5. Seed System Presets
INSERT INTO editing_presets (
    id, name, description, category, caption_preset, font_family, font_size,
    primary_color, highlight_color, outline_color, outline_width, position,
    words_per_line, zoom_intensity, crop_mode, audio_enhancement, bgm_track,
    bgm_volume, hook_enabled, is_system, created_at, updated_at
) VALUES
('preset_hormozi', 'Viral Reel / Hormozi Style', 'High-impact yellow keyword pop, dynamic face zoom, vocal compressor & top hook banner.', 'viral', 'bold_pop', 'Impact', 54, '#FFFFFF', '#FACC15', '#000000', 5, 'bottom', 4, 'dynamic', 'smart_face', '{"loudnorm": true, "denoise": true, "speech_boost": true}', NULL, 0.0, true, true, NOW(), NOW()),
('preset_podcast', 'Minimalist Podcaster', 'Warm amber gold highlights, subtle reaction zoom, clean denoise & audio normalizer.', 'podcast', 'podcast', 'Inter', 46, '#FFFFFF', '#F59E0B', '#111827', 3, 'bottom', 5, 'subtle', 'smart_face', '{"loudnorm": true, "denoise": true, "speech_boost": true}', 'lofi_ambient', 0.12, true, true, NOW(), NOW()),
('preset_gaming', 'High-Octane Gaming', 'Electric cyan/neon green captions, punchy dramatic zoom peaks, bass-boosted audio.', 'gaming', 'gaming', 'Impact', 52, '#FFFFFF', '#00F0FF', '#000000', 5, 'middle', 4, 'dramatic', 'smart_face', '{"loudnorm": true, "denoise": false, "speech_boost": true}', 'synthwave_hype', 0.18, true, true, NOW(), NOW()),
('preset_cinematic', 'Documentary & Narrative', 'Elegant spaced subtitles, lower-third placement, smooth gradual zoom & orchestral ambient.', 'cinematic', 'cinematic', 'Georgia', 40, '#F3F4F6', '#E5E7EB', '#000000', 2, 'bottom', 6, 'subtle', 'center', '{"loudnorm": true, "denoise": true, "speech_boost": false}', 'cinematic_ambient', 0.15, false, true, NOW(), NOW()),
('preset_clean', 'Corporate & Clean Ed', 'Crisp modern subtitles, centered face tracking, audio clarity boost, zero distracting zooms.', 'business', 'clean', 'Arial', 42, '#FFFFFF', '#38BDF8', '#1E293B', 2, 'bottom', 5, 'none', 'smart_face', '{"loudnorm": true, "denoise": true, "speech_boost": true}', NULL, 0.0, false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

