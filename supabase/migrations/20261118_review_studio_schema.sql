-- ==============================================================================
-- AI SHORTS FACTORY — REVIEW STUDIO SCHEMA MIGRATION
-- Migration: 20261118_review_studio_schema.sql
-- ==============================================================================

-- 1. Add is_edited and review flags to generated_clips
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS review_notes TEXT DEFAULT NULL;
ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS review_approved BOOLEAN DEFAULT false;

