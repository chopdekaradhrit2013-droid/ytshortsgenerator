-- ====================================================================
-- AI SHORTS FACTORY - Migration: Analysis Jobs & Highlight Candidates
-- Target: Supabase / PostgreSQL 15+
-- ====================================================================

-- 1. Analysis Job Status Enums
DO $$ BEGIN
    CREATE TYPE analysis_job_status AS ENUM (
        'queued', 'processing', 'completed', 'failed', 'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE analysis_stage AS ENUM (
        'preparing',
        'extracting_audio',
        'transcribing',
        'analyzing_scenes',
        'detecting_highlights',
        'ranking_clips',
        'generating_previews',
        'completed',
        'failed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. ANALYSIS JOBS TABLE
CREATE TABLE IF NOT EXISTS public.analysis_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    source_video_id UUID REFERENCES public.source_videos(id) ON DELETE CASCADE,
    status analysis_job_status DEFAULT 'queued',
    stage analysis_stage DEFAULT 'preparing',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    target_clip_count INTEGER DEFAULT 10,
    preferred_duration_seconds INTEGER DEFAULT 45,
    category TEXT DEFAULT 'automatic',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HIGHLIGHT CANDIDATES TABLE
CREATE TABLE IF NOT EXISTS public.highlight_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_job_id UUID NOT NULL REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    source_video_id UUID REFERENCES public.source_videos(id) ON DELETE CASCADE,
    start_time NUMERIC(10, 2) NOT NULL,
    end_time NUMERIC(10, 2) NOT NULL,
    duration_seconds NUMERIC(10, 2) GENERATED ALWAYS AS (end_time - start_time) STORED,
    suggested_title TEXT NOT NULL,
    opening_hook TEXT NOT NULL,
    explanation TEXT,
    transcript_excerpt TEXT,
    category TEXT DEFAULT 'general',
    engagement_score INTEGER CHECK (engagement_score BETWEEN 0 AND 100),
    content_quality_score INTEGER CHECK (content_quality_score BETWEEN 0 AND 100),
    score_breakdown JSONB DEFAULT '{
        "hook_strength": 80,
        "emotional_impact": 75,
        "entertainment_value": 80,
        "context_completeness": 85,
        "visual_interest": 70,
        "clip_independence": 85,
        "ending_quality": 80
    }'::jsonb,
    virality_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    preview_video_path TEXT,
    thumbnail_path TEXT,
    status TEXT DEFAULT 'candidate', -- candidate, approved, discarded
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TRANSCRIPTIONS TABLE (Normalized transcripts & word-level segments)
CREATE TABLE IF NOT EXISTS public.transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_video_id UUID NOT NULL REFERENCES public.source_videos(id) ON DELETE CASCADE,
    language TEXT DEFAULT 'en',
    duration_seconds NUMERIC(10, 2),
    full_text TEXT NOT NULL,
    words_data JSONB DEFAULT '[]'::jsonb,
    segments_data JSONB DEFAULT '[]'::jsonb,
    pauses_data JSONB DEFAULT '[]'::jsonb,
    speech_ratio NUMERIC(5, 4) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_source_transcription UNIQUE (source_video_id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_project_id ON public.analysis_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON public.analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_highlight_candidates_job_id ON public.highlight_candidates(analysis_job_id);
CREATE INDEX IF NOT EXISTS idx_highlight_candidates_project_id ON public.highlight_candidates(project_id);
CREATE INDEX IF NOT EXISTS idx_highlight_candidates_score ON public.highlight_candidates(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_transcriptions_source_id ON public.transcriptions(source_video_id);

-- TRIGGERS
DROP TRIGGER IF EXISTS trg_analysis_jobs_updated_at ON public.analysis_jobs;
CREATE TRIGGER trg_analysis_jobs_updated_at BEFORE UPDATE ON public.analysis_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_highlight_candidates_updated_at ON public.highlight_candidates;
CREATE TRIGGER trg_highlight_candidates_updated_at BEFORE UPDATE ON public.highlight_candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_transcriptions_updated_at ON public.transcriptions;
CREATE TRIGGER trg_transcriptions_updated_at BEFORE UPDATE ON public.transcriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS POLICIES
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlight_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analysis jobs" ON public.analysis_jobs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = analysis_jobs.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can manage own analysis jobs" ON public.analysis_jobs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = analysis_jobs.project_id AND projects.user_id = auth.uid())
);

CREATE POLICY "Users can view own highlight candidates" ON public.highlight_candidates FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = highlight_candidates.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can manage own highlight candidates" ON public.highlight_candidates FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = highlight_candidates.project_id AND projects.user_id = auth.uid())
);

CREATE POLICY "Users can view own transcriptions" ON public.transcriptions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.source_videos
        JOIN public.projects ON projects.id = source_videos.project_id
        WHERE source_videos.id = transcriptions.source_video_id AND projects.user_id = auth.uid()
    )
);

