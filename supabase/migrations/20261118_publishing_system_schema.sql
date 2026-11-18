-- ==============================================================================
-- AI SHORTS FACTORY — YOUTUBE INTEGRATION & PUBLISHING SYSTEM SCHEMA
-- Migration: 20261118_publishing_system_schema.sql
-- ==============================================================================

-- 1. Connected Channels Table (Stores YouTube OAuth tokens securely on server)
CREATE TABLE IF NOT EXISTS public.connected_channels (
    id TEXT PRIMARY KEY,
    platform TEXT DEFAULT 'youtube',
    channel_title TEXT NOT NULL,
    channel_id TEXT NOT NULL UNIQUE,
    subscriber_count INTEGER DEFAULT 0,
    avatar_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expiry TIMESTAMPTZ,
    scopes JSONB DEFAULT '[]'::jsonb,
    is_connected BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enhance Publishing Jobs Table with audience, hashtags, and upload metrics
ALTER TABLE public.publishing_jobs ADD COLUMN IF NOT EXISTS hashtags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.publishing_jobs ADD COLUMN IF NOT EXISTS made_for_kids BOOLEAN DEFAULT false;
ALTER TABLE public.publishing_jobs ADD COLUMN IF NOT EXISTS upload_speed_mbps NUMERIC(6, 2) DEFAULT 0.0;
ALTER TABLE public.publishing_jobs ADD COLUMN IF NOT EXISTS estimated_remaining_seconds NUMERIC(6, 2) DEFAULT 0.0;
ALTER TABLE public.publishing_jobs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 3. Indexes for Calendar & Queue performance
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_scheduled_at ON public.publishing_jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_status_sched ON public.publishing_jobs(status, scheduled_at);

