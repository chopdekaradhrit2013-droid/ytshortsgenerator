-- Migration: 20261118_saas_auth_and_billing_schema.sql
-- Description: User accounts, authentication, subscriptions, usage tracking, payment transactions, and notifications.

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    is_verified INTEGER DEFAULT 0,
    verification_token TEXT,
    reset_password_token TEXT,
    reset_password_expires_at TEXT,
    role TEXT DEFAULT 'creator',
    is_active INTEGER DEFAULT 1,
    onboarding_completed INTEGER DEFAULT 0,
    onboarding_data TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. Subscription Plans Table (Fully configurable via backend/admin)
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_monthly REAL DEFAULT 0.0,
    price_yearly REAL DEFAULT 0.0,
    currency TEXT DEFAULT 'USD',
    monthly_video_minutes INTEGER DEFAULT 15,
    monthly_clips_limit INTEGER DEFAULT 10,
    monthly_ai_analysis_limit INTEGER DEFAULT 5,
    monthly_thumbnails_limit INTEGER DEFAULT 15,
    monthly_exports_limit INTEGER DEFAULT 10,
    included_features TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 3. User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    plan_id TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    billing_interval TEXT DEFAULT 'monthly',
    current_period_start TEXT NOT NULL,
    current_period_end TEXT NOT NULL,
    cancel_at_period_end INTEGER DEFAULT 0,
    canceled_at TEXT,
    payment_method_brand TEXT DEFAULT 'visa',
    payment_method_last4 TEXT DEFAULT '4242',
    provider_customer_id TEXT,
    provider_subscription_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- 4. User Usage Meters Table
CREATE TABLE IF NOT EXISTS user_usage_meters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    video_processing_minutes_used REAL DEFAULT 0.0,
    ai_clips_generated_used INTEGER DEFAULT 0,
    ai_analysis_requests_used INTEGER DEFAULT 0,
    thumbnails_generated_used INTEGER DEFAULT 0,
    exports_count_used INTEGER DEFAULT 0,
    credits_balance INTEGER DEFAULT 100,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Usage Logs Table (Auditable ledger)
CREATE TABLE IF NOT EXISTS usage_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    amount REAL NOT NULL,
    credits_deducted INTEGER DEFAULT 0,
    balance_after INTEGER DEFAULT 0,
    resource_id TEXT,
    description TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Payment Transactions & Invoices Table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subscription_id TEXT,
    plan_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    provider TEXT DEFAULT 'stripe',
    transaction_ref TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'succeeded',
    billing_interval TEXT DEFAULT 'monthly',
    invoice_number TEXT NOT NULL,
    invoice_pdf_url TEXT,
    payment_method_summary TEXT DEFAULT 'Visa ending in 4242',
    error_message TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Account Notifications Table
CREATE TABLE IF NOT EXISTS account_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for fast tenant lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_meters_user ON user_usage_meters(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON account_notifications(user_id);

