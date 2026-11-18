-- ====================================================================
-- Migration: 20261118_super_admin_schema.sql
-- Description: Super Admin Dashboard, RBAC, Audit Logging, Credit Adjustments,
--              Platform Configuration, AI Services Config, and Announcements
-- ====================================================================

-- 1. Extend Users table with account status & suspension tracking
ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN suspension_reason TEXT;

-- 2. Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    admin_role TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details_json TEXT DEFAULT '{}',
    ip_address TEXT DEFAULT '127.0.0.1',
    created_at TEXT NOT NULL,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at);

-- 3. Credit Adjustments Ledger (Auditable Manual Adjustments)
CREATE TABLE IF NOT EXISTS credit_adjustments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    admin_id TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    adjustment_type TEXT NOT NULL, -- 'add', 'deduct', 'correction', 'promotional'
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_credit_adj_user_id ON credit_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_adj_created_at ON credit_adjustments(created_at);

-- 4. Platform Announcements Table
CREATE TABLE IF NOT EXISTS platform_announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'general', -- 'general', 'maintenance', 'release', 'service_update'
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
    target_audience TEXT DEFAULT 'all', -- 'all', 'free_only', 'paid_only', 'enterprise_only'
    is_active INTEGER DEFAULT 1,
    start_date TEXT,
    expires_at TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Platform Settings Table (Singleton)
CREATE TABLE IF NOT EXISTS platform_settings (
    id TEXT PRIMARY KEY,
    platform_name TEXT DEFAULT 'AI Shorts Factory',
    logo_url TEXT DEFAULT '/logo.svg',
    support_email TEXT DEFAULT 'support@shortsfactory.io',
    maintenance_mode INTEGER DEFAULT 0,
    maintenance_message TEXT DEFAULT 'AI Shorts Factory is undergoing brief scheduled maintenance.',
    registration_enabled INTEGER DEFAULT 1,
    default_free_credits INTEGER DEFAULT 100,
    feature_flags TEXT DEFAULT '{"auto_reframing": true, "ai_thumbnails": true, "competitor_analysis": true, "bulk_publishing": true, "dynamic_subtitles": true, "high_fps_exports": true}',
    supported_resolutions TEXT DEFAULT '["720p", "1080p", "4k"]',
    supported_framerates TEXT DEFAULT '["30", "60"]',
    ai_costs_config TEXT DEFAULT '{"whisper_per_minute": 0.006, "claude_highlight_per_call": 0.015, "cv_reframe_per_minute": 0.008, "thumbnail_ai_per_call": 0.02}',
    updated_by TEXT,
    updated_at TEXT NOT NULL
);

-- 6. AI Services Configuration & Telemetry Table
CREATE TABLE IF NOT EXISTS ai_services_config (
    id TEXT PRIMARY KEY,
    service_key TEXT UNIQUE NOT NULL,
    service_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'degraded', 'maintenance', 'disabled'
    daily_request_budget INTEGER DEFAULT 5000,
    monthly_spend_limit_usd REAL DEFAULT 500.0,
    latency_ms REAL DEFAULT 145.0,
    total_requests_count INTEGER DEFAULT 0,
    failed_requests_count INTEGER DEFAULT 0,
    estimated_spend_usd REAL DEFAULT 0.0,
    api_key_masked TEXT DEFAULT 'sk-proj-...a9f1',
    is_enabled INTEGER DEFAULT 1,
    updated_at TEXT NOT NULL
);

