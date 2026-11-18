-- ====================================================================
-- AI SHORTS FACTORY - Database Seed Data (Demo Environment)
-- ====================================================================

-- Insert sample profile if not exists
INSERT INTO public.profiles (id, email, full_name, avatar_url, preferences)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'creator@aishortsfactory.com',
    'Alex Vance',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    '{
        "default_clip_duration": 45,
        "default_clip_count": 8,
        "default_aspect_ratio": "9:16",
        "default_category": "podcast",
        "caption_preset": "hormozi"
    }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Insert sample connected YouTube account
INSERT INTO public.connected_accounts (
    id, user_id, provider, account_name, channel_id, channel_title, channel_avatar_url, subscriber_count, is_active
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'youtube',
    'AI Shorts Factory Studios',
    'UC_x5XG1OV2P6uZZ5FSM9Ttw',
    'Tech & Creators Daily',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    148500,
    true
) ON CONFLICT DO NOTHING;

-- Insert sample projects
INSERT INTO public.projects (
    id, user_id, name, description, category, status, target_clip_count, preferred_duration_seconds, tags
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'Future of Artificial General Intelligence Podcast',
    'Full 90-minute interview with leading AI research engineers.',
    'podcast',
    'completed',
    8,
    45,
    ARRAY['AI', 'Tech', 'AGI', 'Future']
),
(
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    'Elden Ring DLC Boss Fights & Reactions',
    'High-intensity boss encounters with commentary and web cam overlays.',
    'gaming',
    'processing',
    12,
    30,
    ARRAY['Gaming', 'EldenRing', 'BossFight']
),
(
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000001',
    'Creator Economy & Monetization Secrets Masterclass',
    'Practical strategies for growing to 1M subscribers with short-form content.',
    'interview',
    'completed',
    6,
    50,
    ARRAY['CreatorEconomy', 'YouTubeShorts', 'Growth']
) ON CONFLICT DO NOTHING;

