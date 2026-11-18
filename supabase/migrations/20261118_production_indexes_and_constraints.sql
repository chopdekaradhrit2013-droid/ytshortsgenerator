-- ====================================================================
-- Migration: 20261118_production_indexes_and_constraints.sql
-- Description: Comprehensive production database indexes for high performance,
--              fast multi-tenant queries, and concurrent query safety.
-- ====================================================================

-- 1. Projects & Source Media
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_source_videos_project_id ON source_videos(project_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_source_id ON transcriptions(source_video_id);

-- 2. Analysis & Clips Pipeline
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_project_id ON analysis_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_highlight_candidates_source_id ON highlight_candidates(source_video_id);
CREATE INDEX IF NOT EXISTS idx_generated_clips_project_id ON generated_clips(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_clips_source_id ON generated_clips(source_video_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_clip_id ON export_jobs(clip_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);

-- 3. YouTube Publishing & Channels
CREATE INDEX IF NOT EXISTS idx_connected_channels_user_id ON connected_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_channel_id ON publishing_jobs(connected_channel_id);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_status ON publishing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_scheduled_at ON publishing_jobs(scheduled_at);

-- 4. Analytics & Channel Intelligence
CREATE INDEX IF NOT EXISTS idx_video_analytics_channel_id ON video_analytics(channel_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_video_id ON video_analytics(video_id);
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_channel_id ON analytics_alerts(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_niche_profiles_channel_id ON channel_niche_profiles(channel_id);
CREATE INDEX IF NOT EXISTS idx_competitor_channels_user_channel ON competitor_channels(user_channel_id);
CREATE INDEX IF NOT EXISTS idx_content_gap_records_channel_id ON content_gap_records(channel_id);
CREATE INDEX IF NOT EXISTS idx_ai_shorts_ideas_channel_id ON ai_shorts_ideas(channel_id);
CREATE INDEX IF NOT EXISTS idx_content_strategy_plans_channel_id ON content_strategy_plans(channel_id);

-- 5. Studio & Thumbnail Packaging
CREATE INDEX IF NOT EXISTS idx_studio_projects_project_id ON studio_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_studio_projects_clip_id ON studio_projects(clip_id);
CREATE INDEX IF NOT EXISTS idx_studio_projects_user_id ON studio_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_thumbnail_designs_clip_id ON thumbnail_designs(clip_id);
CREATE INDEX IF NOT EXISTS idx_thumbnail_designs_user_id ON thumbnail_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_thumbnail_candidate_frames_clip ON thumbnail_candidate_frames(clip_id);

-- 6. SaaS Multi-Tenancy, Subscriptions & Ledger
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_usage_meters_user_id ON user_usage_meters(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_ref ON payment_transactions(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_account_notifications_user_id ON account_notifications(user_id);

-- 7. Platform Administration & Auditing
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_adjustments_user_id ON credit_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_adjustments_created_at ON credit_adjustments(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_announcements_active ON platform_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_services_config_key ON ai_services_config(service_key);

