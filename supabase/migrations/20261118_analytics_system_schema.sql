-- ============================================================================
-- AI SHORTS FACTORY — ANALYTICS & PERFORMANCE SYSTEM SCHEMA
-- ============================================================================

-- 1. Video Analytics Table
CREATE TABLE IF NOT EXISTS video_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id TEXT NOT NULL UNIQUE,
    publishing_job_id TEXT,
    channel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    thumbnail_url TEXT,
    published_at TIMESTAMPTZ NOT NULL,
    duration_seconds REAL DEFAULT 45.0,
    category TEXT DEFAULT 'Tech',
    hook_style TEXT DEFAULT 'Contrarian Statement',
    views BIGINT DEFAULT 0,
    likes BIGINT DEFAULT 0,
    comments BIGINT DEFAULT 0,
    shares BIGINT DEFAULT 0,
    subscribers_gained BIGINT DEFAULT 0,
    watch_time_minutes REAL DEFAULT 0.0,
    avg_view_duration_seconds REAL DEFAULT 0.0,
    avg_percentage_viewed REAL DEFAULT 0.0,
    engagement_rate REAL DEFAULT 0.0,
    performance_badge TEXT DEFAULT 'average' CHECK (performance_badge IN ('viral_outlier', 'above_average', 'average', 'underperforming')),
    retention_curve JSONB DEFAULT '[]'::jsonb,
    daily_views_trajectory JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Channel Analytics Daily Snapshots Table
CREATE TABLE IF NOT EXISTS channel_analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id TEXT NOT NULL,
    snapshot_date DATE NOT NULL,
    views BIGINT DEFAULT 0,
    subscribers_total BIGINT DEFAULT 0,
    subscribers_gained BIGINT DEFAULT 0,
    likes BIGINT DEFAULT 0,
    comments BIGINT DEFAULT 0,
    shares BIGINT DEFAULT 0,
    shorts_published INTEGER DEFAULT 0,
    avg_view_duration_seconds REAL DEFAULT 0.0,
    avg_engagement_rate REAL DEFAULT 0.0,
    traffic_sources JSONB DEFAULT '{}'::jsonb,
    geography_data JSONB DEFAULT '{}'::jsonb,
    demographics_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(channel_id, snapshot_date)
);

-- 3. Performance Alerts Table
CREATE TABLE IF NOT EXISTS analytics_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id TEXT NOT NULL,
    video_id TEXT,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('milestone_1k', 'milestone_10k', 'milestone_100k', 'velocity_spike', 'retention_drop', 'subscriber_milestone')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metric_value REAL DEFAULT 0.0,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Analytics Alert Settings Table
CREATE TABLE IF NOT EXISTS analytics_alert_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id TEXT NOT NULL UNIQUE,
    milestone_1k_enabled BOOLEAN DEFAULT TRUE,
    milestone_10k_enabled BOOLEAN DEFAULT TRUE,
    milestone_100k_enabled BOOLEAN DEFAULT TRUE,
    velocity_spike_threshold_pct REAL DEFAULT 200.0,
    retention_drop_threshold_pct REAL DEFAULT 40.0,
    subscriber_milestone_interval INTEGER DEFAULT 1000,
    email_notifications_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast analytics aggregation queries
CREATE INDEX IF NOT EXISTS idx_video_analytics_channel ON video_analytics(channel_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_views ON video_analytics(views DESC);
CREATE INDEX IF NOT EXISTS idx_video_analytics_published_at ON video_analytics(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_snapshots_channel_date ON channel_analytics_snapshots(channel_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_channel_read ON analytics_alerts(channel_id, is_read);

