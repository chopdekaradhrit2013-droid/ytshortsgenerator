-- ============================================================================
-- AI SHORTS FACTORY — AI CONTENT INTELLIGENCE & VIRAL STRATEGY SCHEMA
-- ============================================================================

-- 1. Channel Niche Profiles Table
CREATE TABLE IF NOT EXISTS channel_niche_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id TEXT NOT NULL UNIQUE,
    niche_name TEXT NOT NULL DEFAULT 'AI & Emerging Technology',
    core_topics JSONB DEFAULT '["AI Research", "Autonomous Agents", "Prompt Engineering", "Software Architecture", "Creator Monetization"]'::jsonb,
    target_audience TEXT DEFAULT 'Developers, AI enthusiasts, technical creators, and tech founders aged 18-35',
    brand_voice TEXT DEFAULT 'Contrarian, authoritative, educational, and high-tempo',
    preferred_duration_seconds INTEGER DEFAULT 42,
    top_performing_hook_styles JSONB DEFAULT '["Contrarian Statement", "Number Specific Blueprint", "Curiosity Gap"]'::jsonb,
    manual_overrides JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Competitor Channels Table
CREATE TABLE IF NOT EXISTS competitor_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_channel_id TEXT NOT NULL,
    competitor_channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    avatar_url TEXT,
    subscribers BIGINT DEFAULT 0,
    total_videos INTEGER DEFAULT 0,
    avg_shorts_views BIGINT DEFAULT 0,
    upload_frequency_per_week REAL DEFAULT 3.5,
    top_topics JSONB DEFAULT '[]'::jsonb,
    recent_top_videos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_channel_id, competitor_channel_id)
);

-- 3. Content Gaps Table
CREATE TABLE IF NOT EXISTS content_gap_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id TEXT NOT NULL,
    topic_name TEXT NOT NULL,
    competitor_coverage_score REAL DEFAULT 85.0,
    user_coverage_score REAL DEFAULT 15.0,
    opportunity_score INTEGER DEFAULT 92,
    suggested_angle TEXT NOT NULL,
    potential_views_multiplier REAL DEFAULT 1.8,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. AI Shorts Ideas Table
CREATE TABLE IF NOT EXISTS ai_shorts_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    hook_sentence TEXT NOT NULL,
    concept_summary TEXT NOT NULL,
    suggested_structure JSONB DEFAULT '["0-3s: Provocative Hook", "3-15s: Problem/Data Proof", "15-35s: Secret Solution/Framework", "35-42s: Actionable Takeaway & Subscribe Call"]'::jsonb,
    recommended_duration_seconds INTEGER DEFAULT 42,
    caption_style_preset TEXT DEFAULT 'hormozi_bold',
    keywords JSONB DEFAULT '["Shorts", "Viral", "Tech"]'::jsonb,
    why_it_works TEXT NOT NULL,
    opportunity_score INTEGER DEFAULT 88,
    score_breakdown JSONB DEFAULT '{"hook_strength": 92, "topic_relevance": 95, "originality": 84, "audience_fit": 90, "storytelling": 86, "competition_level": 78}'::jsonb,
    source_type TEXT DEFAULT 'trending',
    is_converted_to_project BOOLEAN DEFAULT FALSE,
    project_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Content Strategy Plans Table
CREATE TABLE IF NOT EXISTS content_strategy_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    timeframe_days INTEGER DEFAULT 14,
    daily_schedule JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_competitors_user ON competitor_channels(user_channel_id);
CREATE INDEX IF NOT EXISTS idx_ideas_channel ON ai_shorts_ideas(channel_id);
CREATE INDEX IF NOT EXISTS idx_gaps_channel ON content_gap_records(channel_id);

