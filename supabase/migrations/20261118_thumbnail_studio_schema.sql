-- =============================================================================
-- Migration: 20261118_thumbnail_studio_schema.sql
-- Prompt 12: AI Thumbnail Generator & Visual Packaging Studio
-- =============================================================================

-- 1. Thumbnail Templates Table
CREATE TABLE IF NOT EXISTS thumbnail_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'viral_shorts',
    aspect_ratio TEXT DEFAULT '9:16',
    description TEXT,
    preview_image_url TEXT,
    canvas_data TEXT NOT NULL DEFAULT '{}',
    is_builtin INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Thumbnail Designs Table (User Created / Generated Designs)
CREATE TABLE IF NOT EXISTS thumbnail_designs (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    clip_id TEXT,
    title TEXT NOT NULL,
    aspect_ratio TEXT DEFAULT '9:16',
    width INTEGER DEFAULT 1080,
    height INTEGER DEFAULT 1920,
    source_frame_path TEXT,
    rendered_image_url TEXT,
    template_id TEXT,
    canvas_data TEXT NOT NULL DEFAULT '{}',
    quality_score INTEGER DEFAULT 85,
    quality_report TEXT DEFAULT '{}',
    is_favorite INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Cache of Candidate Frames for Shorts
CREATE TABLE IF NOT EXISTS thumbnail_candidate_frames (
    id TEXT PRIMARY KEY,
    clip_id TEXT,
    video_path TEXT NOT NULL,
    timestamp_sec REAL NOT NULL,
    image_url TEXT NOT NULL,
    sharpness_score REAL DEFAULT 80.0,
    face_score REAL DEFAULT 80.0,
    composition_score REAL DEFAULT 80.0,
    total_score REAL DEFAULT 80.0,
    is_recommended INTEGER DEFAULT 0,
    metadata TEXT DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Add thumbnail_design_id to generated_clips if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'generated_clips' AND column_name = 'thumbnail_design_id'
    ) THEN
        ALTER TABLE generated_clips ADD COLUMN thumbnail_design_id TEXT;
    END IF;
END $$;

