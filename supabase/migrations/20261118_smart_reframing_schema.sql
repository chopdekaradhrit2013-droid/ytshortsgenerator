-- Migration: 20261118_smart_reframing_schema.sql
-- Description: Adds smart auto-reframing & visual tracking columns for 9:16 vertical conversion

ALTER TABLE generated_clips ADD COLUMN IF NOT EXISTS reframing_config TEXT DEFAULT '{}';
ALTER TABLE highlight_candidates ADD COLUMN IF NOT EXISTS reframing_config TEXT DEFAULT '{}';

