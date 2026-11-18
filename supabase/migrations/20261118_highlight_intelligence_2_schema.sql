-- Supabase Migration: 20261118_highlight_intelligence_2_schema.sql
-- Highlight Detection Engine 2.0: Context-Aware Selection, Speaker Diarization, 9-Factor Scoring, Duplicate Detection

ALTER TABLE highlight_candidates ADD COLUMN IF NOT EXISTS moment_type VARCHAR(64) DEFAULT 'interesting_fact';
ALTER TABLE highlight_candidates ADD COLUMN IF NOT EXISTS ranking_badge VARCHAR(64) DEFAULT 'Best Overall';
ALTER TABLE highlight_candidates ADD COLUMN IF NOT EXISTS hook_style VARCHAR(64) DEFAULT 'Curiosity Gap';
ALTER TABLE highlight_candidates ADD COLUMN IF NOT EXISTS alternative_hooks JSONB DEFAULT '[]';
ALTER TABLE highlight_candidates ADD COLUMN IF NOT EXISTS speaker_analysis JSONB DEFAULT '{}';
ALTER TABLE highlight_candidates ADD COLUMN IF NOT EXISTS context_analysis JSONB DEFAULT '{}';
ALTER TABLE highlight_candidates ADD COLUMN IF NOT EXISTS explanation_breakdown JSONB DEFAULT '{}';
ALTER TABLE highlight_candidates ADD COLUMN IF NOT EXISTS similarity_info JSONB DEFAULT '{}';
ALTER TABLE highlight_candidates ADD COLUMN IF NOT EXISTS is_duplicate_or_similar BOOLEAN DEFAULT FALSE;

ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS moment_type VARCHAR(64) DEFAULT 'interesting_fact';
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS ranking_badge VARCHAR(64) DEFAULT 'Best Overall';
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS hook_style VARCHAR(64) DEFAULT 'Curiosity Gap';
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS alternative_hooks JSONB DEFAULT '[]';
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS speaker_analysis JSONB DEFAULT '{}';
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS context_analysis JSONB DEFAULT '{}';
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS explanation_breakdown JSONB DEFAULT '{}';
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS similarity_info JSONB DEFAULT '{}';
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS is_duplicate_or_similar BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_highlight_candidates_moment_type ON highlight_candidates(moment_type);
CREATE INDEX IF NOT EXISTS idx_highlight_candidates_ranking_badge ON highlight_candidates(ranking_badge);
CREATE INDEX IF NOT EXISTS idx_generated_clips_moment_type ON generated_clips(moment_type);
CREATE INDEX IF NOT EXISTS idx_generated_clips_ranking_badge ON generated_clips(ranking_badge);

