-- ====================================================================
-- AI SHORTS FACTORY - Database Architecture Schema
-- Target: Supabase / PostgreSQL 15+
-- ====================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom Types / Enums
DO $$ BEGIN
    CREATE TYPE project_status AS ENUM (
        'draft', 'uploading', 'analysing', 'processing', 'completed', 'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE video_category AS ENUM (
        'automatic', 'gaming', 'podcast', 'entertainment', 'interview', 'education', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE clip_status AS ENUM (
        'detected', 'rendering', 'ready', 'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE publishing_status AS ENUM (
        'waiting', 'uploading', 'processing', 'published', 'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE publishing_visibility AS ENUM (
        'public', 'unlisted', 'private'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 1. USERS PROFILE TABLE (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{
        "default_clip_duration": 45,
        "default_clip_count": 10,
        "default_aspect_ratio": "9:16",
        "default_category": "automatic",
        "caption_preset": "hormozi",
        "theme": "dark"
    }'::jsonb,
    storage_used_bytes BIGINT DEFAULT 0,
    storage_limit_bytes BIGINT DEFAULT 10737418240, -- 10 GB default
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CONNECTED ACCOUNTS TABLE (YouTube OAuth credentials & metadata)
CREATE TABLE IF NOT EXISTS public.connected_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'youtube',
    account_name TEXT,
    channel_id TEXT,
    channel_title TEXT,
    channel_avatar_url TEXT,
    subscriber_count BIGINT DEFAULT 0,
    scopes TEXT[] DEFAULT ARRAY['https://www.googleapis.com/auth/youtube.upload'],
    access_token_enc TEXT,  -- Encrypted token, never returned to client raw
    refresh_token_enc TEXT, -- Encrypted token
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_provider_channel UNIQUE (user_id, provider, channel_id)
);

-- 3. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category video_category DEFAULT 'automatic',
    status project_status DEFAULT 'draft',
    target_clip_count INTEGER DEFAULT 10,
    preferred_duration_seconds INTEGER DEFAULT 45,
    source_language TEXT DEFAULT 'en',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SOURCE VIDEOS TABLE
CREATE TABLE IF NOT EXISTS public.source_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    duration_seconds NUMERIC(10, 2),
    resolution_width INTEGER,
    resolution_height INTEGER,
    aspect_ratio TEXT DEFAULT '16:9',
    mime_type TEXT NOT NULL,
    fps NUMERIC(6, 2),
    thumbnail_url TEXT,
    transcription_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    transcription_data JSONB DEFAULT '{}'::jsonb, -- full word-level transcript with timestamps
    ai_metadata JSONB DEFAULT '{}'::jsonb, -- AI hook moments, sentiment analysis, audio peaks
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_project_source_video UNIQUE (project_id)
);

-- 5. GENERATED CLIPS TABLE
CREATE TABLE IF NOT EXISTS public.generated_clips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    source_video_id UUID NOT NULL REFERENCES public.source_videos(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT,
    hook_sentence TEXT,
    start_time NUMERIC(10, 2) NOT NULL,
    end_time NUMERIC(10, 2) NOT NULL,
    duration_seconds NUMERIC(10, 2) GENERATED ALWAYS AS (end_time - start_time) STORED,
    engagement_score INTEGER CHECK (engagement_score BETWEEN 0 AND 100),
    virality_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    aspect_ratio TEXT DEFAULT '9:16',
    resolution_width INTEGER DEFAULT 1080,
    resolution_height INTEGER DEFAULT 1920,
    video_url TEXT,
    thumbnail_url TEXT,
    captions_style JSONB DEFAULT '{
        "fontFamily": "Inter",
        "fontSize": 24,
        "color": "#FFFFFF",
        "highlightColor": "#FACC15",
        "position": "bottom",
        "animation": "pop"
    }'::jsonb,
    status clip_status DEFAULT 'detected',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EDITING SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.editing_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    clip_id UUID REFERENCES public.generated_clips(id) ON DELETE SET NULL,
    version INTEGER DEFAULT 1,
    timeline_data JSONB NOT NULL DEFAULT '{
        "zoom": 1,
        "currentTime": 0,
        "duration": 0,
        "tracks": [
            {"id": "video-1", "type": "video", "name": "Video Track", "muted": false, "locked": false, "items": []},
            {"id": "audio-1", "type": "audio", "name": "Audio Track", "muted": false, "locked": false, "items": []},
            {"id": "text-1", "type": "text", "name": "Captions & Text", "muted": false, "locked": false, "items": []}
        ]
    }'::jsonb,
    canvas_settings JSONB DEFAULT '{
        "aspectRatio": "9:16",
        "width": 1080,
        "height": 1920,
        "backgroundColor": "#000000"
    }'::jsonb,
    undo_stack JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PUBLISHING JOBS TABLE
CREATE TABLE IF NOT EXISTS public.publishing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    clip_id UUID NOT NULL REFERENCES public.generated_clips(id) ON DELETE CASCADE,
    connected_account_id UUID REFERENCES public.connected_accounts(id) ON DELETE SET NULL,
    platform TEXT NOT NULL DEFAULT 'youtube',
    video_title TEXT NOT NULL,
    video_description TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    visibility publishing_visibility DEFAULT 'public',
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    status publishing_status DEFAULT 'waiting',
    progress_percentage INTEGER DEFAULT 0,
    platform_video_id TEXT,
    platform_url TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_source_videos_project_id ON public.source_videos(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_clips_project_id ON public.generated_clips(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_clips_score ON public.generated_clips(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_editing_sessions_clip_id ON public.editing_sessions(clip_id);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_user_id ON public.publishing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_status ON public.publishing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id ON public.connected_accounts(user_id);

-- AUTOMATIC UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ATTACH TRIGGERS
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_connected_accounts_updated_at ON public.connected_accounts;
CREATE TRIGGER trg_connected_accounts_updated_at BEFORE UPDATE ON public.connected_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_source_videos_updated_at ON public.source_videos;
CREATE TRIGGER trg_source_videos_updated_at BEFORE UPDATE ON public.source_videos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_generated_clips_updated_at ON public.generated_clips;
CREATE TRIGGER trg_generated_clips_updated_at BEFORE UPDATE ON public.generated_clips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_editing_sessions_updated_at ON public.editing_sessions;
CREATE TRIGGER trg_editing_sessions_updated_at BEFORE UPDATE ON public.editing_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_publishing_jobs_updated_at ON public.publishing_jobs;
CREATE TRIGGER trg_publishing_jobs_updated_at BEFORE UPDATE ON public.publishing_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishing_jobs ENABLE ROW LEVEL SECURITY;

-- Profiles: user can only select/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Connected Accounts: user can view/manage their accounts
CREATE POLICY "Users can view own connected accounts" ON public.connected_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own connected accounts" ON public.connected_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own connected accounts" ON public.connected_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own connected accounts" ON public.connected_accounts FOR DELETE USING (auth.uid() = user_id);

-- Projects: user can CRUD their own projects
CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Source videos: access via parent project ownership
CREATE POLICY "Users can view own source videos" ON public.source_videos FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = source_videos.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can insert own source videos" ON public.source_videos FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = source_videos.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can update own source videos" ON public.source_videos FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = source_videos.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can delete own source videos" ON public.source_videos FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = source_videos.project_id AND projects.user_id = auth.uid())
);

-- Generated clips: access via parent project ownership
CREATE POLICY "Users can view own clips" ON public.generated_clips FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = generated_clips.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can insert own clips" ON public.generated_clips FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = generated_clips.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can update own clips" ON public.generated_clips FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = generated_clips.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can delete own clips" ON public.generated_clips FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = generated_clips.project_id AND projects.user_id = auth.uid())
);

-- Editing sessions: access via parent project ownership
CREATE POLICY "Users can view own editing sessions" ON public.editing_sessions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = editing_sessions.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can insert own editing sessions" ON public.editing_sessions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = editing_sessions.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can update own editing sessions" ON public.editing_sessions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = editing_sessions.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can delete own editing sessions" ON public.editing_sessions FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = editing_sessions.project_id AND projects.user_id = auth.uid())
);

-- Publishing jobs: access via user_id
CREATE POLICY "Users can view own publishing jobs" ON public.publishing_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own publishing jobs" ON public.publishing_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own publishing jobs" ON public.publishing_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own publishing jobs" ON public.publishing_jobs FOR DELETE USING (auth.uid() = user_id);
