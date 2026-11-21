import sqlite3
import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from backend.app.core.config import settings

def get_db_connection() -> sqlite3.Connection:
    """Connect to SQLite database with foreign keys and dict-like row factory."""
    conn = sqlite3.connect(settings.DATABASE_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Initialize database tables matching the schema."""
    conn = get_db_connection()
    with conn:
        # 1. Projects Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT DEFAULT 'automatic',
                status TEXT DEFAULT 'draft',
                target_clip_count INTEGER DEFAULT 10,
                preferred_duration_seconds INTEGER DEFAULT 45,
                tags TEXT DEFAULT '[]',
                clip_count INTEGER DEFAULT 0,
                metadata TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)

        # 2. Source Videos Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS source_videos (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                storage_path TEXT NOT NULL,
                file_size_bytes INTEGER NOT NULL,
                duration_seconds REAL,
                resolution_width INTEGER,
                resolution_height INTEGER,
                aspect_ratio TEXT DEFAULT '16:9',
                fps REAL,
                mime_type TEXT DEFAULT 'video/mp4',
                thumbnail_url TEXT,
                audio_codec TEXT,
                audio_sample_rate INTEGER,
                transcription_status TEXT DEFAULT 'pending',
                ai_metadata TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
        """)

        # 3. Transcriptions Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS transcriptions (
                id TEXT PRIMARY KEY,
                source_video_id TEXT NOT NULL UNIQUE,
                language TEXT DEFAULT 'en',
                duration_seconds REAL,
                full_text TEXT NOT NULL,
                words_data TEXT DEFAULT '[]',
                segments_data TEXT DEFAULT '[]',
                pauses_data TEXT DEFAULT '[]',
                speech_ratio REAL DEFAULT 1.0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (source_video_id) REFERENCES source_videos(id) ON DELETE CASCADE
            );
        """)

        # 4. Analysis Jobs Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS analysis_jobs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                source_video_id TEXT,
                status TEXT DEFAULT 'queued',
                stage TEXT DEFAULT 'preparing',
                progress_percentage INTEGER DEFAULT 0,
                target_clip_count INTEGER DEFAULT 10,
                preferred_duration_seconds INTEGER DEFAULT 45,
                category TEXT DEFAULT 'automatic',
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                metadata TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
        """)

        # 5. Highlight Candidates Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS highlight_candidates (
                id TEXT PRIMARY KEY,
                analysis_job_id TEXT NOT NULL,
                project_id TEXT NOT NULL,
                source_video_id TEXT,
                start_time REAL NOT NULL,
                end_time REAL NOT NULL,
                duration_seconds REAL NOT NULL,
                suggested_title TEXT NOT NULL,
                opening_hook TEXT NOT NULL,
                explanation TEXT,
                transcript_excerpt TEXT,
                category TEXT DEFAULT 'general',
                engagement_score INTEGER DEFAULT 85,
                content_quality_score INTEGER DEFAULT 85,
                score_breakdown TEXT DEFAULT '{}',
                virality_reasons TEXT DEFAULT '[]',
                tags TEXT DEFAULT '[]',
                preview_video_path TEXT,
                thumbnail_path TEXT,
                status TEXT DEFAULT 'candidate',
                metadata TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (analysis_job_id) REFERENCES analysis_jobs(id) ON DELETE CASCADE,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
        """)

        # 6. Generated Clips Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS generated_clips (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                source_video_id TEXT,
                candidate_id TEXT,
                title TEXT NOT NULL,
                summary TEXT,
                hook_sentence TEXT,
                start_time REAL NOT NULL,
                end_time REAL NOT NULL,
                duration_seconds REAL NOT NULL,
                engagement_score INTEGER DEFAULT 85,
                virality_reasons TEXT DEFAULT '[]',
                tags TEXT DEFAULT '[]',
                aspect_ratio TEXT DEFAULT '9:16',
                resolution_width INTEGER DEFAULT 1080,
                resolution_height INTEGER DEFAULT 1920,
                video_url TEXT,
                thumbnail_url TEXT,
                captions_style TEXT DEFAULT '{}',
                status TEXT DEFAULT 'ready',
                hook_suggestions TEXT DEFAULT '[]',
                selected_hook TEXT,
                caption_preset TEXT DEFAULT 'bold_pop',
                editing_config TEXT DEFAULT '{}',
                export_status TEXT DEFAULT 'draft',
                export_video_url TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
        """)

        # Add any missing columns to existing generated_clips tables (safe SQLite migration)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(generated_clips);")
        columns = [row["name"] for row in cursor.fetchall()]
        for col_name, col_type, col_default in [
            ("hook_suggestions", "TEXT", "'[]'"),
            ("selected_hook", "TEXT", "NULL"),
            ("caption_preset", "TEXT", "'bold_pop'"),
            ("editing_config", "TEXT", "'{}'"),
            ("export_status", "TEXT", "'draft'"),
            ("export_video_url", "TEXT", "NULL"),
            ("captions_data", "TEXT", "'[]'"),
            ("export_with_captions", "INTEGER", "1"),
            ("caption_placement", "TEXT", "'auto'"),
            ("caption_language", "TEXT", "'en'"),
            ("is_edited", "INTEGER", "0"),
            ("moment_type", "TEXT", "'interesting_fact'"),
            ("ranking_badge", "TEXT", "'Best Overall'"),
            ("hook_style", "TEXT", "'Curiosity Gap'"),
            ("alternative_hooks", "TEXT", "'[]'"),
            ("speaker_analysis", "TEXT", "'{}'"),
            ("context_analysis", "TEXT", "'{}'"),
            ("explanation_breakdown", "TEXT", "'{}'"),
            ("similarity_info", "TEXT", "'{}'"),
            ("is_duplicate_or_similar", "INTEGER", "0"),
            ("reframing_config", "TEXT", "'{}'"),
            ("thumbnail_design_id", "TEXT", "NULL")
        ]:
            if col_name not in columns:
                try:
                    conn.execute(f"ALTER TABLE generated_clips ADD COLUMN {col_name} {col_type} DEFAULT {col_default};")
                except Exception:
                    pass

        # Add 2.0 intelligence columns to highlight_candidates
        cursor.execute("PRAGMA table_info(highlight_candidates);")
        cand_columns = [row["name"] for row in cursor.fetchall()]
        for col_name, col_type, col_default in [
            ("moment_type", "TEXT", "'interesting_fact'"),
            ("ranking_badge", "TEXT", "'Best Overall'"),
            ("hook_style", "TEXT", "'Curiosity Gap'"),
            ("alternative_hooks", "TEXT", "'[]'"),
            ("speaker_analysis", "TEXT", "'{}'"),
            ("context_analysis", "TEXT", "'{}'"),
            ("explanation_breakdown", "TEXT", "'{}'"),
            ("similarity_info", "TEXT", "'{}'"),
            ("is_duplicate_or_similar", "INTEGER", "0"),
            ("reframing_config", "TEXT", "'{}'"),
            ("thumbnail_design_id", "TEXT", "NULL")
        ]:
            if col_name not in cand_columns:
                try:
                    conn.execute(f"ALTER TABLE highlight_candidates ADD COLUMN {col_name} {col_type} DEFAULT {col_default};")
                except Exception:
                    pass

        # 7. Export Jobs Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS export_jobs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                clip_id TEXT NOT NULL,
                status TEXT DEFAULT 'queued',
                stage TEXT DEFAULT 'preparing',
                progress_percentage INTEGER DEFAULT 0,
                output_video_path TEXT,
                output_thumbnail_path TEXT,
                duration_seconds REAL,
                resolution TEXT DEFAULT '1080x1920',
                fps REAL DEFAULT 30.0,
                config TEXT DEFAULT '{}',
                qc_report TEXT DEFAULT '{}',
                error_message TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (clip_id) REFERENCES generated_clips(id) ON DELETE CASCADE
            );
        """)

        # 8. Editing Presets Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS editing_presets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT DEFAULT 'general',
                caption_preset TEXT DEFAULT 'bold_pop',
                font_family TEXT DEFAULT 'Inter',
                font_size INTEGER DEFAULT 50,
                primary_color TEXT DEFAULT '#FFFFFF',
                highlight_color TEXT DEFAULT '#FACC15',
                outline_color TEXT DEFAULT '#000000',
                outline_width INTEGER DEFAULT 4,
                position TEXT DEFAULT 'bottom',
                words_per_line INTEGER DEFAULT 5,
                zoom_intensity TEXT DEFAULT 'dynamic',
                crop_mode TEXT DEFAULT 'smart_face',
                audio_enhancement TEXT DEFAULT '{"loudnorm": true, "denoise": true, "speech_boost": true}',
                bgm_track TEXT,
                bgm_volume REAL DEFAULT 0.15,
                hook_enabled INTEGER DEFAULT 1,
                is_system INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)

        # Seed System Presets
        conn.execute("""
            INSERT OR IGNORE INTO editing_presets (
                id, name, description, category, caption_preset, font_family, font_size,
                primary_color, highlight_color, outline_color, outline_width, position,
                words_per_line, zoom_intensity, crop_mode, audio_enhancement, bgm_track,
                bgm_volume, hook_enabled, is_system, created_at, updated_at
            ) VALUES
            ('preset_mrbeast', 'MrBeast Viral Dynamic', 'Massive bold uppercase captions, neon green highlight, thick 6px stroke & active word pop-in.', 'viral', 'mrbeast', 'Impact', 56, '#FFFFFF', '#00FF00', '#000000', 6, 'bottom', 3, 'dynamic', 'smart_face', '{"loudnorm": true, "denoise": true, "speech_boost": true}', NULL, 0.0, 1, 1, datetime('now'), datetime('now')),
            ('preset_hormozi', 'Viral Reel / Hormozi Style', 'High-impact yellow keyword pop, dynamic face zoom, vocal compressor & top hook banner.', 'viral', 'bold_pop', 'Impact', 54, '#FFFFFF', '#FACC15', '#000000', 5, 'bottom', 4, 'dynamic', 'smart_face', '{"loudnorm": true, "denoise": true, "speech_boost": true}', NULL, 0.0, 1, 1, datetime('now'), datetime('now')),
            ('preset_karaoke', 'Karaoke Word Highlight', 'Dimmed secondary words that illuminate into vibrant purple in exact sync with voice.', 'music', 'karaoke', 'Inter', 48, '#9CA3AF', '#A855F7', '#000000', 4, 'bottom', 4, 'subtle', 'smart_face', '{"loudnorm": true, "denoise": true, "speech_boost": true}', 'lofi_ambient', 0.12, 0, 1, datetime('now'), datetime('now')),
            ('preset_podcast', 'Minimalist Podcaster', 'Warm amber gold highlights, subtle reaction zoom, clean denoise & audio normalizer.', 'podcast', 'podcast', 'Inter', 46, '#FFFFFF', '#F59E0B', '#111827', 3, 'bottom', 5, 'subtle', 'smart_face', '{"loudnorm": true, "denoise": true, "speech_boost": true}', 'lofi_ambient', 0.12, 1, 1, datetime('now'), datetime('now')),
            ('preset_gaming', 'High-Octane Gaming', 'Electric cyan/neon green captions, punchy dramatic zoom peaks, bass-boosted audio.', 'gaming', 'gaming', 'Impact', 52, '#FFFFFF', '#00F0FF', '#000000', 5, 'middle', 4, 'dramatic', 'smart_face', '{"loudnorm": true, "denoise": false, "speech_boost": true}', 'synthwave_hype', 0.18, 1, 1, datetime('now'), datetime('now')),
            ('preset_cinematic', 'Documentary & Narrative', 'Elegant spaced subtitles, lower-third placement, smooth gradual zoom & orchestral ambient.', 'cinematic', 'cinematic', 'Georgia', 40, '#F3F4F6', '#E5E7EB', '#000000', 2, 'bottom', 6, 'subtle', 'center', '{"loudnorm": true, "denoise": true, "speech_boost": false}', 'cinematic_ambient', 0.15, 0, 1, datetime('now'), datetime('now')),
            ('preset_clean', 'Corporate & Clean Ed', 'Crisp modern subtitles, centered face tracking, audio clarity boost, zero distracting zooms.', 'business', 'clean', 'Arial', 42, '#FFFFFF', '#38BDF8', '#1E293B', 2, 'bottom', 5, 'none', 'smart_face', '{"loudnorm": true, "denoise": true, "speech_boost": true}', NULL, 0.0, 0, 1, datetime('now'), datetime('now'));
        """)

        # 9. Connected Channels Table (Prompt 6)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS connected_channels (
                id TEXT PRIMARY KEY,
                platform TEXT DEFAULT 'youtube',
                channel_title TEXT NOT NULL,
                channel_id TEXT NOT NULL UNIQUE,
                subscriber_count INTEGER DEFAULT 0,
                avatar_url TEXT,
                access_token TEXT,
                refresh_token TEXT,
                token_expiry TEXT,
                scopes TEXT DEFAULT '[]',
                is_connected INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)

        # 10. Persistent Publishing Jobs Table (Prompt 6)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS publishing_jobs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                clip_id TEXT NOT NULL,
                connected_channel_id TEXT,
                platform TEXT DEFAULT 'youtube',
                video_title TEXT NOT NULL,
                video_description TEXT,
                tags TEXT DEFAULT '[]',
                hashtags TEXT DEFAULT '[]',
                visibility TEXT DEFAULT 'public',
                made_for_kids INTEGER DEFAULT 0,
                thumbnail_url TEXT,
                scheduled_at TEXT,
                published_at TEXT,
                status TEXT DEFAULT 'waiting',
                progress_percentage INTEGER DEFAULT 0,
                upload_speed_mbps REAL DEFAULT 0.0,
                estimated_remaining_seconds REAL DEFAULT 0.0,
                platform_video_id TEXT,
                platform_url TEXT,
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                metadata TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (clip_id) REFERENCES generated_clips(id) ON DELETE CASCADE
            );
        """)

        # 11. Video Analytics Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS video_analytics (
                id TEXT PRIMARY KEY,
                video_id TEXT NOT NULL UNIQUE,
                publishing_job_id TEXT,
                channel_id TEXT NOT NULL,
                title TEXT NOT NULL,
                thumbnail_url TEXT,
                published_at TEXT NOT NULL,
                duration_seconds REAL DEFAULT 45.0,
                category TEXT DEFAULT 'Tech',
                hook_style TEXT DEFAULT 'Contrarian Statement',
                views INTEGER DEFAULT 0,
                likes INTEGER DEFAULT 0,
                comments INTEGER DEFAULT 0,
                shares INTEGER DEFAULT 0,
                subscribers_gained INTEGER DEFAULT 0,
                watch_time_minutes REAL DEFAULT 0.0,
                avg_view_duration_seconds REAL DEFAULT 0.0,
                avg_percentage_viewed REAL DEFAULT 0.0,
                engagement_rate REAL DEFAULT 0.0,
                performance_badge TEXT DEFAULT 'average',
                retention_curve TEXT DEFAULT '[]',
                daily_views_trajectory TEXT DEFAULT '[]',
                metadata TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)

        # 12. Channel Analytics Daily Snapshots Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS channel_analytics_snapshots (
                id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL,
                snapshot_date TEXT NOT NULL,
                views INTEGER DEFAULT 0,
                subscribers_total INTEGER DEFAULT 0,
                subscribers_gained INTEGER DEFAULT 0,
                likes INTEGER DEFAULT 0,
                comments INTEGER DEFAULT 0,
                shares INTEGER DEFAULT 0,
                shorts_published INTEGER DEFAULT 0,
                avg_view_duration_seconds REAL DEFAULT 0.0,
                avg_engagement_rate REAL DEFAULT 0.0,
                traffic_sources TEXT DEFAULT '{}',
                geography_data TEXT DEFAULT '{}',
                demographics_data TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                UNIQUE(channel_id, snapshot_date)
            );
        """)

        # 13. Analytics Alerts Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS analytics_alerts (
                id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL,
                video_id TEXT,
                alert_type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                metric_value REAL DEFAULT 0.0,
                is_read INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );
        """)

        # 14. Analytics Alert Settings Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS analytics_alert_settings (
                id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL UNIQUE,
                milestone_1k_enabled INTEGER DEFAULT 1,
                milestone_10k_enabled INTEGER DEFAULT 1,
                milestone_100k_enabled INTEGER DEFAULT 1,
                velocity_spike_threshold_pct REAL DEFAULT 200.0,
                retention_drop_threshold_pct REAL DEFAULT 40.0,
                subscriber_milestone_interval INTEGER DEFAULT 1000,
                email_notifications_enabled INTEGER DEFAULT 1,
                updated_at TEXT NOT NULL
            );
        """)

        # 15. Channel Niche Profiles Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS channel_niche_profiles (
                id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL UNIQUE,
                niche_name TEXT NOT NULL DEFAULT 'AI & Emerging Technology',
                core_topics TEXT DEFAULT '["AI Research", "Autonomous Agents", "Prompt Engineering", "Software Architecture", "Creator Monetization"]',
                target_audience TEXT DEFAULT 'Developers, AI enthusiasts, technical creators, and tech founders aged 18-35',
                brand_voice TEXT DEFAULT 'Contrarian, authoritative, educational, and high-tempo',
                preferred_duration_seconds INTEGER DEFAULT 42,
                top_performing_hook_styles TEXT DEFAULT '["Contrarian Statement", "Number Specific Blueprint", "Curiosity Gap"]',
                manual_overrides TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)

        # 16. Competitor Channels Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS competitor_channels (
                id TEXT PRIMARY KEY,
                user_channel_id TEXT NOT NULL,
                competitor_channel_id TEXT NOT NULL,
                channel_name TEXT NOT NULL,
                avatar_url TEXT,
                subscribers INTEGER DEFAULT 0,
                total_videos INTEGER DEFAULT 0,
                avg_shorts_views INTEGER DEFAULT 0,
                upload_frequency_per_week REAL DEFAULT 3.5,
                top_topics TEXT DEFAULT '[]',
                recent_top_videos TEXT DEFAULT '[]',
                created_at TEXT NOT NULL,
                UNIQUE(user_channel_id, competitor_channel_id)
            );
        """)

        # 17. Content Gap Records Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS content_gap_records (
                id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL,
                topic_name TEXT NOT NULL,
                competitor_coverage_score REAL DEFAULT 85.0,
                user_coverage_score REAL DEFAULT 15.0,
                opportunity_score INTEGER DEFAULT 92,
                suggested_angle TEXT NOT NULL,
                potential_views_multiplier REAL DEFAULT 1.8,
                created_at TEXT NOT NULL
            );
        """)

        # 18. AI Shorts Ideas Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ai_shorts_ideas (
                id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL,
                title TEXT NOT NULL,
                hook_sentence TEXT NOT NULL,
                concept_summary TEXT NOT NULL,
                suggested_structure TEXT DEFAULT '["0-3s: Provocative Hook", "3-15s: Problem/Data Proof", "15-35s: Secret Solution/Framework", "35-42s: Actionable Takeaway & Subscribe Call"]',
                recommended_duration_seconds INTEGER DEFAULT 42,
                caption_style_preset TEXT DEFAULT 'hormozi_bold',
                keywords TEXT DEFAULT '["Shorts", "Viral", "Tech"]',
                why_it_works TEXT NOT NULL,
                opportunity_score INTEGER DEFAULT 88,
                score_breakdown TEXT DEFAULT '{"hook_strength": 92, "topic_relevance": 95, "originality": 84, "audience_fit": 90, "storytelling": 86, "competition_level": 78}',
                source_type TEXT DEFAULT 'trending',
                is_converted_to_project INTEGER DEFAULT 0,
                project_id TEXT,
                created_at TEXT NOT NULL
            );
        """)

        # 19. Content Strategy Plans Table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS content_strategy_plans (
                id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL,
                plan_name TEXT NOT NULL,
                timeframe_days INTEGER DEFAULT 14,
                daily_schedule TEXT DEFAULT '[]',
                status TEXT DEFAULT 'active',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)

        # 20. Advanced Studio Projects Table (Prompt 9)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS studio_projects (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                clip_id TEXT NOT NULL,
                name TEXT NOT NULL,
                aspect_ratio TEXT DEFAULT '9:16',
                canvas_settings TEXT DEFAULT '{"width": 1080, "height": 1920, "bg_color": "#090A0F", "bg_blur": true, "fit_mode": "contain_blur", "show_safe_guides": true}',
                timeline_data TEXT DEFAULT '{"duration": 45.0, "playhead": 0.0, "zoom_level": 1.0, "tracks": []}',
                video_adjustments TEXT DEFAULT '{"brightness": 0, "contrast": 1.0, "saturation": 1.0, "blur": 0, "speed": 1.0, "flip_h": 0, "flip_v": 0, "rotate": 0, "crop_mode": "smart_face", "scale": 100, "fade_in": 0.0, "fade_out": 0.0, "transition": "none"}',
                captions_state TEXT DEFAULT '{"preset": "bold_pop", "font_family": "Montserrat", "font_size": 52, "font_weight": 900, "primary_color": "#FFFFFF", "highlight_color": "#FACC15", "bg_color": "#000000", "bg_opacity": 0, "outline_width": 4.5, "shadow_offset": 2.0, "placement": "bottom", "animation": "pop", "uppercase": 1, "words_per_line": 4, "segments": []}',
                audio_state TEXT DEFAULT '{"video_audio_volume": 1.0, "video_audio_muted": 0, "bgm_track": "none", "bgm_volume": 0.14, "bgm_fade_in": 1.0, "bgm_fade_out": 2.0, "loudnorm": 1, "denoise": 1, "speech_boost": 1, "voiceover_volume": 1.0, "voiceover_file": null}',
                overlays_state TEXT DEFAULT '{"titles": [], "stickers": [], "shapes": [], "watermark": {"enabled": 0, "text": "@AiShortsFactory", "opacity": 0.7, "position": "top_right"}}',
                export_settings TEXT DEFAULT '{"resolution": "1080p", "width": 1080, "height": 1920, "fps": 30, "format": "mp4", "quality": "high", "crf": 20, "bitrate": "12M", "audio_bitrate": "192k"}',
                version INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
        """)

        # 21. Advanced Studio Presets Table (Prompt 9)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS studio_presets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                is_builtin INTEGER DEFAULT 0,
                config TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)

        # 22. Studio Royalty-Free Audio & Graphic Assets Table (Prompt 9)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS studio_assets (
                id TEXT PRIMARY KEY,
                asset_type TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT,
                file_path TEXT NOT NULL,
                duration_seconds REAL DEFAULT 0.0,
                metadata TEXT DEFAULT '{}',
                created_at TEXT NOT NULL
            );
        """)

        # 23. Thumbnail Templates Table (Prompt 12)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS thumbnail_templates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'viral_shorts',
                aspect_ratio TEXT DEFAULT '9:16',
                description TEXT,
                preview_image_url TEXT,
                canvas_data TEXT NOT NULL DEFAULT '{}',
                is_builtin INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)

        # 24. Thumbnail Designs Table (Prompt 12)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS thumbnail_designs (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                clip_id TEXT,
                title TEXT NOT NULL,
                aspect_ratio TEXT DEFAULT '9:16',
                width INTEGER DEFAULT 1080,
                height INTEGER DEFAULT 1920,
                source_frame_path TEXT,
                rendered_image_url TEXT,
                template_id TEXT,
                canvas_data TEXT NOT NULL DEFAULT '{}',
                quality_score INTEGER DEFAULT 85,
                quality_report TEXT DEFAULT '{}',
                is_favorite INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)

        # 25. Thumbnail Candidate Frames Table (Prompt 12)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS thumbnail_candidate_frames (
                id TEXT PRIMARY KEY,
                clip_id TEXT,
                video_path TEXT NOT NULL,
                timestamp_sec REAL NOT NULL,
                image_url TEXT NOT NULL,
                sharpness_score REAL DEFAULT 80.0,
                face_score REAL DEFAULT 80.0,
                composition_score REAL DEFAULT 80.0,
                total_score REAL DEFAULT 80.0,
                is_recommended INTEGER DEFAULT 0,
                metadata TEXT DEFAULT '{}',
                created_at TEXT NOT NULL
            );
        """)

        # Seed Default Connected Channel if empty
        ch_cur = conn.cursor()
        ch_cur.execute("SELECT COUNT(*) FROM connected_channels;")
        if ch_cur.fetchone()[0] == 0:
            conn.execute("""
                INSERT INTO connected_channels (
                    id, platform, channel_title, channel_id, subscriber_count,
                    avatar_url, access_token, refresh_token, token_expiry,
                    scopes, is_connected, created_at, updated_at, user_id
                ) VALUES (
                    'ch_adhrit_1', 'youtube', 'Adhrit Chopdekar', 'UC_adhrit_chopdekar_shorts',
                    24800, 'https://api.dicebear.com/7.x/initials/svg?seed=Adhrit&chars=2&backgroundColor=6366f1,8b5cf6&fontSize=42&fontWeight=700',
                    'handle_acc_adhrit', 'handle_ref_adhrit', '2099-12-31T23:59:59Z',
                    '["https://www.googleapis.com/auth/youtube.upload"]', 0, datetime('now'), datetime('now'), 'usr_default_alex'
                );
            """)

        # Seed Initial Publishing Jobs if empty
        pj_cur = conn.cursor()
        pj_cur.execute("SELECT COUNT(*) FROM publishing_jobs;")
        if pj_cur.fetchone()[0] == 0:
            conn.execute("""
                INSERT INTO publishing_jobs (
                    id, project_id, clip_id, connected_channel_id, platform,
                    video_title, video_description, tags, hashtags, visibility,
                    made_for_kids, thumbnail_url, scheduled_at, published_at,
                    status, progress_percentage, upload_speed_mbps,
                    platform_video_id, platform_url, created_at, updated_at
                ) VALUES
                (
                    'pub_job_1', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111',
                    'ch_default_1', 'youtube', 'The Secret AGI Timeline Nobody Speaks About #Shorts',
                    'Inside prediction from leading lab researchers on the superintelligence horizon.\n\n#Shorts #TechTrends #AGI',
                    '["AGI", "AISecrets", "TechTrends", "Shorts"]', '["#Shorts", "#AGI", "#Viral"]', 'public',
                    0, 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
                    NULL, datetime('now', '-2 days'), 'published', 100, 14.5,
                    'dQw4w9WgXcQ', 'https://youtube.com/shorts/dQw4w9WgXcQ', datetime('now', '-2 days'), datetime('now', '-2 days')
                ),
                (
                    'pub_job_2', '11111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222',
                    'ch_default_1', 'youtube', 'Why 99% Of Coding Jobs Will Evolve Into Architecture #Shorts',
                    'Prompt orchestration and agent swarms are replacing boilerplate coding.\n\n#Shorts #Coding #SoftwareEngineering',
                    '["Coding", "SoftwareEngineering", "FutureOfWork"]', '["#Shorts", "#Coding", "#Tech"]', 'public',
                    0, 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
                    datetime('now', '+1 day', '14:00:00'), NULL, 'scheduled', 0, 0.0,
                    NULL, NULL, datetime('now', '-1 day'), datetime('now')
                ),
                (
                    'pub_job_3', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333',
                    'ch_default_1', 'youtube', 'The $10K/Month YouTube Shorts Framework #Shorts',
                    'Exact 3-step retention structure used by high-monetization short-form creators.\n\n#Shorts #CreatorEconomy #Monetization',
                    '["Monetization", "YouTubeGrowth", "CreatorEconomy"]', '["#Shorts", "#Monetization", "#Growth"]', 'public',
                    0, 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80',
                    datetime('now', '+3 days', '18:30:00'), NULL, 'scheduled', 0, 0.0,
                    NULL, NULL, datetime('now', '-12 hours'), datetime('now')
                );
            """)

        # Seed Alert Settings if empty
        as_cur = conn.cursor()
        as_cur.execute("SELECT COUNT(*) FROM analytics_alert_settings;")
        if as_cur.fetchone()[0] == 0:
            conn.execute("""
                INSERT INTO analytics_alert_settings (
                    id, channel_id, milestone_1k_enabled, milestone_10k_enabled,
                    milestone_100k_enabled, velocity_spike_threshold_pct,
                    retention_drop_threshold_pct, subscriber_milestone_interval,
                    email_notifications_enabled, updated_at
                ) VALUES (
                    'as_default_1', 'UC_x5XG1OV2P6uZZ5FSM9Ttw', 1, 1, 1, 200.0, 40.0, 1000, 1, datetime('now')
                );
            """)

        # Seed Initial Alerts if empty
        al_cur = conn.cursor()
        al_cur.execute("SELECT COUNT(*) FROM analytics_alerts;")
        if al_cur.fetchone()[0] == 0:
            conn.execute("""
                INSERT INTO analytics_alerts (
                    id, channel_id, video_id, alert_type, title, message, metric_value, is_read, created_at
                ) VALUES
                (
                    'al_1', 'UC_x5XG1OV2P6uZZ5FSM9Ttw', 'dQw4w9WgXcQ', 'milestone_100k',
                    '🔥 100,000 Views Milestone Reached!',
                    'Your Short "The Secret AGI Timeline Nobody Speaks About" surpassed 100K views.',
                    148200.0, 0, datetime('now', '-4 hours')
                ),
                (
                    'al_2', 'UC_x5XG1OV2P6uZZ5FSM9Ttw', 'vid_deepmind_07', 'velocity_spike',
                    '⚡ High View Growth Velocity Detected (+310%)',
                    '"Why Google DeepMind Built Antigravity" is experiencing 3.1x faster view accumulation than your 28-day channel average.',
                    310.0, 0, datetime('now', '-18 hours')
                ),
                (
                    'al_3', 'UC_x5XG1OV2P6uZZ5FSM9Ttw', NULL, 'subscriber_milestone',
                    '🎉 New Subscriber Milestone: 148,000+',
                    'Your channel crossed 148,000 subscribers, adding +2,400 net subscribers over the past 7 days.',
                    148500.0, 1, datetime('now', '-2 days')
                );
            """)

        # Seed Default Niche Profile if empty
        np_cur = conn.cursor()
        np_cur.execute("SELECT COUNT(*) FROM channel_niche_profiles;")
        if np_cur.fetchone()[0] == 0:
            conn.execute("""
                INSERT INTO channel_niche_profiles (
                    id, channel_id, niche_name, core_topics, target_audience,
                    brand_voice, preferred_duration_seconds, top_performing_hook_styles,
                    manual_overrides, created_at, updated_at
                ) VALUES (
                    'np_default_1', 'UC_x5XG1OV2P6uZZ5FSM9Ttw', 'AI & Emerging Technology',
                    '["AI Research", "Autonomous Agents", "Prompt Engineering", "Software Architecture", "Creator Monetization"]',
                    'Developers, AI engineers, technical founders, and productivity-focused creators aged 18-35',
                    'Contrarian, authoritative, educational, and high-tempo with visual code proofs',
                    42,
                    '["Contrarian Statement", "Number Specific Blueprint", "Secret Hack", "Curiosity Gap"]',
                    '{"primary_focus": "Autonomous Multi-Agent Architecture", "target_upload_cadence_days": 2}',
                    datetime('now'), datetime('now')
                );
            """)

        # Seed Competitors if empty
        cc_cur = conn.cursor()
        cc_cur.execute("SELECT COUNT(*) FROM competitor_channels;")
        if cc_cur.fetchone()[0] == 0:
            conn.execute("""
                INSERT INTO competitor_channels (
                    id, user_channel_id, competitor_channel_id, channel_name, avatar_url,
                    subscribers, total_videos, avg_shorts_views, upload_frequency_per_week,
                    top_topics, recent_top_videos, created_at
                ) VALUES
                (
                    'comp_1', 'UC_x5XG1OV2P6uZZ5FSM9Ttw', 'UC_fireship_tech', 'Fireship Tech',
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                    1420000, 840, 245000, 4.2,
                    '["New JS Frameworks", "AI Tools in 100 Seconds", "Linux vs Mac", "Docker Secrets"]',
                    '[{"title": "DeepSeek in 100 Seconds", "views": 840000, "url": "https://youtube.com/shorts/demo1"}, {"title": "Why TypeScript 5.8 Changes Everything", "views": 420000, "url": "https://youtube.com/shorts/demo2"}]',
                    datetime('now')
                ),
                (
                    'comp_2', 'UC_x5XG1OV2P6uZZ5FSM9Ttw', 'UC_two_minute_papers', 'Two Minute Papers',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
                    1650000, 1120, 310000, 3.0,
                    '["NVIDIA Physics Simulations", "Neural Rendering", "Robotics Foundation Models", "OpenAI Research"]',
                    '[{"title": "OpenAI SORA 2 Breakdown in 60s", "views": 950000, "url": "https://youtube.com/shorts/demo3"}]',
                    datetime('now')
                ),
                (
                    'comp_3', 'UC_x5XG1OV2P6uZZ5FSM9Ttw', 'UC_matthew_berman', 'Matthew Berman AI',
                    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
                    620000, 680, 95000, 5.0,
                    '["Local LLMs", "Ollama Setups", "AI Agents Workflow", "Claude vs ChatGPT"]',
                    '[{"title": "Run DeepSeek R1 100% Offline", "views": 380000, "url": "https://youtube.com/shorts/demo4"}]',
                    datetime('now')
                );
            """)

        # Seed Content Gaps if empty
        cg_cur = conn.cursor()
        cg_cur.execute("SELECT COUNT(*) FROM content_gap_records;")
        if cg_cur.fetchone()[0] == 0:
            conn.execute("""
                INSERT INTO content_gap_records (
                    id, channel_id, topic_name, competitor_coverage_score, user_coverage_score,
                    opportunity_score, suggested_angle, potential_views_multiplier, created_at
                ) VALUES
                (
                    'gap_1', 'UC_x5XG1OV2P6uZZ5FSM9Ttw', 'DeepSeek-V3 MoE Architecture Secrets',
                    88.0, 10.0, 95,
                    'Why Multi-Head Latent Attention beats standard transformers without requiring 8x H100 clusters',
                    2.4, datetime('now')
                ),
                (
                    'gap_2', 'UC_x5XG1OV2P6uZZ5FSM9Ttw', 'Local Llama 3.3 on Apple Silicon M3/M4',
                    82.0, 15.0, 91,
                    'Step-by-step benchmark showing token speeds on unified memory vs $20/month cloud subscriptions',
                    1.9, datetime('now')
                ),
                (
                    'gap_3', 'UC_x5XG1OV2P6uZZ5FSM9Ttw', 'Multi-Agent Loop Failures & Self-Correction Traps',
                    76.0, 20.0, 88,
                    'Expose the hidden loop traps when 5 autonomous agents run simultaneously and how to break infinite loops',
                    1.7, datetime('now')
                ),
                (
                    'gap_4', 'UC_x5XG1OV2P6uZZ5FSM9Ttw', 'Building Production MCP Servers in 60 Seconds',
                    70.0, 5.0, 86,
                    'Model Context Protocol tutorial demonstrating how to connect tools directly to Claude Code and Cursor',
                    1.6, datetime('now')
                );
            """)

        # Seed AI Shorts Ideas if empty
        ai_cur = conn.cursor()
        ai_cur.execute("SELECT COUNT(*) FROM ai_shorts_ideas;")
        if ai_cur.fetchone()[0] == 0:
            conn.execute("""
                INSERT INTO ai_shorts_ideas (
                    id, channel_id, title, hook_sentence, concept_summary,
                    suggested_structure, recommended_duration_seconds, caption_style_preset,
                    keywords, why_it_works, opportunity_score, score_breakdown, source_type, created_at
                ) VALUES
                (
                    'idea_1', 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
                    'The Dirty Secret of Cloud AI APIs Nobody Tells You #Shorts',
                    'You are literally paying 12x more than necessary every time you make an API call.',
                    'Breakdown of prompt token caching and local model quantizations that save startups $5,000/mo.',
                    '["0-3s: Provocative financial hook with price invoice overlay", "3-15s: Show identical outputs side by side", "15-35s: Reveal token caching architecture trick", "35-42s: Share open-source repo and subscribe call"]',
                    42, 'hormozi_bold', '["Shorts", "AISecrets", "CloudCosts", "Tech"]',
                    'Taps into creator frustration over runaway API bills; high financial and technical shareability.',
                    94, '{"hook_strength": 96, "topic_relevance": 95, "originality": 92, "audience_fit": 94, "storytelling": 90, "competition_level": 82}',
                    'trending', datetime('now')
                ),
                (
                    'idea_2', 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
                    'Why Google DeepMind Switched to Native Swarms #Shorts',
                    'Single-agent models have officially reached their mathematical reasoning ceiling.',
                    'Explains why multi-agent swarms with specialized verification agents outperform monolithic 1T-parameter models.',
                    '["0-3s: Bold paradigm shift hook", "3-15s: Benchmark chart showing single vs multi-agent accuracy", "15-32s: 3 roles every swarm needs (Author, Critic, Verifier)", "32-40s: Challenge viewers to test it in their workflow"]',
                    38, 'mrbeast_bold', '["DeepMind", "AIAgents", "SwarmIntelligence", "Shorts"]',
                    'Direct continuation of your highest-performing video format (AI Research insider breakdown).',
                    91, '{"hook_strength": 93, "topic_relevance": 96, "originality": 88, "audience_fit": 92, "storytelling": 89, "competition_level": 79}',
                    'analytics_replicated', datetime('now')
                ),
                (
                    'idea_3', 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
                    'How To Turn Any Long Video Into 10 Viral Shorts Automatically #Shorts',
                    'Stop manually scrubbing through 2-hour podcasts with premiere timeline shears.',
                    'Demonstrates how AI Clip Hunters and Whisper timestamp alignments isolate virality moments with zero manual clipping.',
                    '["0-3s: High-friction manual workflow visual", "3-14s: Contrast with automated virality score detection", "14-34s: Show 9:16 auto-reframing and dynamic captions in action", "34-42s: Live demo takeaway"]',
                    44, 'hormozi_bold', '["ContentCreation", "VideoEditing", "YouTubeGrowth", "Shorts"]',
                    'Mass appeal to video creators looking to scale short-form output with automation.',
                    89, '{"hook_strength": 90, "topic_relevance": 92, "originality": 86, "audience_fit": 91, "storytelling": 87, "competition_level": 75}',
                    'gap', datetime('now')
                );
            """)

        # Seed Content Strategy Plan if empty
        sp_cur = conn.cursor()
        sp_cur.execute("SELECT COUNT(*) FROM content_strategy_plans;")
        if sp_cur.fetchone()[0] == 0:
            schedule_json = json.dumps([
                {
                    "day": 1,
                    "title": "The Dirty Secret of Cloud AI APIs Nobody Tells You #Shorts",
                    "hook": "You are literally paying 12x more than necessary every time you make an API call.",
                    "topic": "AI Engineering & Cost Optimization",
                    "duration": 42,
                    "format": "Financial Proof & Tech Hack",
                    "publish_date": (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d"),
                    "status": "ready"
                },
                {
                    "day": 2,
                    "title": "Why Google DeepMind Switched to Native Swarms #Shorts",
                    "hook": "Single-agent models have officially reached their mathematical reasoning ceiling.",
                    "topic": "AI Research & Architecture",
                    "duration": 38,
                    "format": "Whitepaper Paradigm Shift",
                    "publish_date": (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%d"),
                    "status": "planned"
                },
                {
                    "day": 3,
                    "title": "Run DeepSeek-V3 Locally: Complete 60s Setup #Shorts",
                    "hook": "Do not pay another dollar to cloud APIs before testing this 1-line terminal command.",
                    "topic": "Local Open-Source Models",
                    "duration": 44,
                    "format": "Interactive Screen Tutorial",
                    "publish_date": (datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%d"),
                    "status": "planned"
                },
                {
                    "day": 4,
                    "title": "The $10K/Month YouTube Shorts Framework Part 2 #Shorts",
                    "hook": "The biggest mistake junior creators make is editing captions after rendering.",
                    "topic": "Creator Monetization",
                    "duration": 40,
                    "format": "Step-by-Step Blueprint",
                    "publish_date": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d"),
                    "status": "planned"
                },
                {
                    "day": 5,
                    "title": "3 Audio Tricks That Keep Shorts Retention Above 90% #Shorts",
                    "hook": "If your audio doesn't duck by exactly -14 dB behind speech, viewers swipe within 4 seconds.",
                    "topic": "Audio Production Secrets",
                    "duration": 35,
                    "format": "Audio Before/After Comparison",
                    "publish_date": (datetime.utcnow() + timedelta(days=9)).strftime("%Y-%m-%d"),
                    "status": "planned"
                },
                {
                    "day": 6,
                    "title": "Why 99% of Agent Loops Get Stuck in Infinite Recursion #Shorts",
                    "hook": "Most YouTube demos show agents succeeding on trial 1. Here is what happens on loop 42.",
                    "topic": "Software Engineering Reality",
                    "duration": 45,
                    "format": "Behind-the-Scenes Diagnostic",
                    "publish_date": (datetime.utcnow() + timedelta(days=11)).strftime("%Y-%m-%d"),
                    "status": "planned"
                },
                {
                    "day": 7,
                    "title": "The Autonomous AI Shorts Factory Pipeline #Shorts",
                    "hook": "This entire video was found, edited, captioned, and published without human hands.",
                    "topic": "Meta Automation Showcase",
                    "duration": 39,
                    "format": "High-Tempo Case Study",
                    "publish_date": (datetime.utcnow() + timedelta(days=13)).strftime("%Y-%m-%d"),
                    "status": "planned"
                }
            ])
            conn.execute("""
                INSERT INTO content_strategy_plans (
                    id, channel_id, plan_name, timeframe_days, daily_schedule, status, created_at, updated_at
                ) VALUES (
                    'plan_default_14d', 'UC_x5XG1OV2P6uZZ5FSM9Ttw', '14-Day High-Velocity AI Authority Campaign',
                    14, ?, 'active', datetime('now'), datetime('now')
                );
            """, (schedule_json,))

        # Seed Studio Presets if empty (Prompt 9)
        stp_cur = conn.cursor()
        stp_cur.execute("SELECT COUNT(*) FROM studio_presets;")
        if stp_cur.fetchone()[0] == 0:
            conn.execute("""
                INSERT INTO studio_presets (id, name, category, description, is_builtin, config, created_at, updated_at) VALUES
                (
                    'sp_cinematic', 'Cinematic Narrative', 'cinematic',
                    'Elegant 24fps documentary pacing, letterbox guides, Georgia serif styling and orchestral ambient audio.',
                    1,
                    '{"aspect_ratio": "9:16", "video_adjustments": {"brightness": 0, "contrast": 1.15, "saturation": 0.9, "blur": 0, "speed": 1.0, "fade_in": 0.8, "fade_out": 0.8, "transition": "dissolve"}, "captions": {"preset": "cinematic", "font_family": "Georgia", "font_size": 40, "font_weight": 600, "primary_color": "#F3F4F6", "highlight_color": "#E5E7EB", "placement": "bottom", "animation": "fade", "words_per_line": 5}, "audio": {"bgm_track": "cinematic_ambient", "bgm_volume": 0.16, "loudnorm": true, "speech_boost": false}, "export": {"resolution": "1080p", "fps": 24, "quality": "high"}}',
                    datetime('now'), datetime('now')
                ),
                (
                    'sp_gaming', 'High-Octane Gaming', 'gaming',
                    'Electric cyan subtitles, dynamic punch-ins, bass-boosted voice EQ and high-energy synthwave.',
                    1,
                    '{"aspect_ratio": "9:16", "video_adjustments": {"brightness": 5, "contrast": 1.25, "saturation": 1.35, "blur": 0, "speed": 1.0, "fade_in": 0.2, "fade_out": 0.2, "transition": "zoom_in"}, "captions": {"preset": "gaming", "font_family": "Impact", "font_size": 54, "font_weight": 900, "primary_color": "#FFFFFF", "highlight_color": "#00F0FF", "placement": "middle", "animation": "pop", "words_per_line": 4}, "audio": {"bgm_track": "synthwave_hype", "bgm_volume": 0.20, "loudnorm": true, "speech_boost": true}, "export": {"resolution": "1080p", "fps": 60, "quality": "high"}}',
                    datetime('now'), datetime('now')
                ),
                (
                    'sp_football', 'Football & Sports Highlights', 'sports',
                    'Aggressive speed pacing, bold angled lower thirds, stadium energy and high-contrast visuals.',
                    1,
                    '{"aspect_ratio": "9:16", "video_adjustments": {"brightness": 2, "contrast": 1.2, "saturation": 1.25, "blur": 0, "speed": 1.05, "fade_in": 0.1, "fade_out": 0.3, "transition": "slide_left"}, "captions": {"preset": "mrbeast", "font_family": "Impact", "font_size": 56, "font_weight": 900, "primary_color": "#FFFFFF", "highlight_color": "#FACC15", "placement": "bottom", "animation": "bounce", "words_per_line": 3}, "audio": {"bgm_track": "energetic_trap", "bgm_volume": 0.18, "loudnorm": true, "speech_boost": true}, "export": {"resolution": "1080p", "fps": 60, "quality": "high"}}',
                    datetime('now'), datetime('now')
                ),
                (
                    'sp_podcast', 'Deep Conversation Podcast', 'podcast',
                    'Warm amber keyword highlights, face-centered crop, speech compressor and gentle lo-fi bed.',
                    1,
                    '{"aspect_ratio": "9:16", "video_adjustments": {"brightness": 0, "contrast": 1.05, "saturation": 1.0, "blur": 0, "speed": 1.0, "fade_in": 0.5, "fade_out": 0.5, "transition": "none"}, "captions": {"preset": "bold_pop", "font_family": "Inter", "font_size": 46, "font_weight": 800, "primary_color": "#FFFFFF", "highlight_color": "#F59E0B", "placement": "bottom", "animation": "pop", "words_per_line": 4}, "audio": {"bgm_track": "lofi_chill", "bgm_volume": 0.10, "loudnorm": true, "denoise": true, "speech_boost": true}, "export": {"resolution": "1080p", "fps": 30, "quality": "high"}}',
                    datetime('now'), datetime('now')
                ),
                (
                    'sp_reaction', 'Dynamic Reaction & Review', 'reaction',
                    'Picture-in-picture ready framing, expressive word pops, comedic zoom cuts and sharp audio EQ.',
                    1,
                    '{"aspect_ratio": "9:16", "video_adjustments": {"brightness": 3, "contrast": 1.1, "saturation": 1.15, "blur": 0, "speed": 1.0, "fade_in": 0.2, "fade_out": 0.2, "transition": "cut"}, "captions": {"preset": "bold_pop", "font_family": "Montserrat", "font_size": 52, "font_weight": 900, "primary_color": "#FFFFFF", "highlight_color": "#FACC15", "placement": "bottom", "animation": "pop", "words_per_line": 4}, "audio": {"bgm_track": "cyber_beats", "bgm_volume": 0.12, "loudnorm": true, "speech_boost": true}, "export": {"resolution": "1080p", "fps": 30, "quality": "high"}}',
                    datetime('now'), datetime('now')
                ),
                (
                    'sp_educational', 'Educational & Tutorial Explainer', 'educational',
                    'High clarity typography, sky blue accents, safe area margins and pristine vocal denoise.',
                    1,
                    '{"aspect_ratio": "9:16", "video_adjustments": {"brightness": 0, "contrast": 1.05, "saturation": 1.0, "blur": 0, "speed": 1.0, "fade_in": 0.3, "fade_out": 0.3, "transition": "none"}, "captions": {"preset": "minimal", "font_family": "Inter", "font_size": 42, "font_weight": 700, "primary_color": "#FFFFFF", "highlight_color": "#38BDF8", "placement": "bottom", "animation": "fade", "words_per_line": 5}, "audio": {"bgm_track": "acoustic_ambient", "bgm_volume": 0.08, "loudnorm": true, "denoise": true, "speech_boost": true}, "export": {"resolution": "1080p", "fps": 30, "quality": "high"}}',
                    datetime('now'), datetime('now')
                ),
                (
                    'sp_minimal', 'Minimalist Clean Subtitles', 'minimal',
                    'Understated modern aesthetic, dark translucent backdrops, no distracting motion and natural colors.',
                    1,
                    '{"aspect_ratio": "9:16", "video_adjustments": {"brightness": 0, "contrast": 1.0, "saturation": 1.0, "blur": 0, "speed": 1.0, "fade_in": 0.2, "fade_out": 0.2, "transition": "none"}, "captions": {"preset": "minimal", "font_family": "Inter", "font_size": 38, "font_weight": 600, "primary_color": "#FFFFFF", "highlight_color": "#38BDF8", "bg_color": "#000000", "bg_opacity": 0.5, "placement": "bottom", "animation": "none", "words_per_line": 5}, "audio": {"bgm_track": "none", "bgm_volume": 0.0, "loudnorm": true, "denoise": true, "speech_boost": true}, "export": {"resolution": "1080p", "fps": 30, "quality": "high"}}',
                    datetime('now'), datetime('now')
                ),
                (
                    'sp_viral', 'Viral Retention Beast', 'viral',
                    'Ultra-bold 3-word pop sequences in electric acid green, fast 1080x1920 reframing, high-energy trap beat.',
                    1,
                    '{"aspect_ratio": "9:16", "video_adjustments": {"brightness": 4, "contrast": 1.2, "saturation": 1.25, "blur": 0, "speed": 1.0, "fade_in": 0.1, "fade_out": 0.2, "transition": "zoom_in"}, "captions": {"preset": "mrbeast", "font_family": "Impact", "font_size": 56, "font_weight": 900, "primary_color": "#FFFFFF", "highlight_color": "#00FF00", "placement": "bottom", "animation": "pop", "words_per_line": 3}, "audio": {"bgm_track": "energetic_trap", "bgm_volume": 0.16, "loudnorm": true, "speech_boost": true}, "export": {"resolution": "1080p", "fps": 30, "quality": "ultra"}}',
                    datetime('now'), datetime('now')
                );
            """)

        # Seed Studio Royalty-Free Audio & Graphic Assets if empty (Prompt 9)
        sta_cur = conn.cursor()
        sta_cur.execute("SELECT COUNT(*) FROM studio_assets;")
        if sta_cur.fetchone()[0] == 0:
            conn.execute("""
                INSERT INTO studio_assets (id, asset_type, name, category, file_path, duration_seconds, metadata, created_at) VALUES
                ('bgm_lofi', 'bgm', 'Upbeat Lo-Fi Chill Hop', 'chill', 'audio/bgm/lofi_chill.mp3', 180.0, '{"bpm": 85, "mood": "relaxed", "license": "royalty_free"}', datetime('now')),
                ('bgm_cinematic', 'bgm', 'Deep Cinematic Atmospheric', 'cinematic', 'audio/bgm/cinematic_ambient.mp3', 210.0, '{"bpm": 70, "mood": "epic", "license": "royalty_free"}', datetime('now')),
                ('bgm_trap', 'bgm', 'High-Octane Phonk & Trap', 'energetic', 'audio/bgm/energetic_trap.mp3', 140.0, '{"bpm": 130, "mood": "intense", "license": "royalty_free"}', datetime('now')),
                ('bgm_synthwave', 'bgm', 'Cyber Synthwave Drive', 'gaming', 'audio/bgm/synthwave_hype.mp3', 165.0, '{"bpm": 120, "mood": "retro_gaming", "license": "royalty_free"}', datetime('now')),
                ('bgm_acoustic', 'bgm', 'Warm Acoustic Sunshine', 'acoustic', 'audio/bgm/acoustic_ambient.mp3', 190.0, '{"bpm": 92, "mood": "positive", "license": "royalty_free"}', datetime('now')),
                ('bgm_deeptech', 'bgm', 'Deep Tech Minimal Pulse', 'tech', 'audio/bgm/cyber_beats.mp3', 175.0, '{"bpm": 124, "mood": "futuristic", "license": "royalty_free"}', datetime('now')),
                ('sfx_whoosh', 'sfx', 'Fast Cinematic Whoosh', 'transitions', 'audio/sfx/whoosh.wav', 0.6, '{"category": "transition"}', datetime('now')),
                ('sfx_pop', 'sfx', 'Crisp Notification Pop', 'ui', 'audio/sfx/pop.wav', 0.3, '{"category": "emphasis"}', datetime('now')),
                ('sfx_ding', 'sfx', 'Success Bell Chime', 'ui', 'audio/sfx/ding.wav', 0.8, '{"category": "achievement"}', datetime('now')),
                ('sfx_shutter', 'sfx', 'Camera Snapshot Shutter', 'camera', 'audio/sfx/shutter.wav', 0.5, '{"category": "flashback"}', datetime('now')),
                ('stk_sub', 'sticker', 'YouTube Subscribe Pill', 'call_to_action', 'stickers/subscribe_pill.png', 0.0, '{"type": "badge", "animated": true}', datetime('now')),
                ('stk_fire', 'sticker', 'Fire Emoji Glow', 'emojis', 'stickers/fire_glow.png', 0.0, '{"type": "emoji", "animated": true}', datetime('now')),
                ('stk_rocket', 'sticker', 'Rocket Launch Booster', 'emojis', 'stickers/rocket.png', 0.0, '{"type": "emoji", "animated": true}', datetime('now')),
                ('stk_warning', 'sticker', 'Caution Warning Triangle', 'badges', 'stickers/warning.png', 0.0, '{"type": "badge", "animated": false}', datetime('now'));
            """)

        # Seed Built-in Thumbnail Templates if empty (Prompt 12)
        tt_cur = conn.cursor()
        tt_cur.execute("SELECT COUNT(*) FROM thumbnail_templates;")
        if tt_cur.fetchone()[0] == 0:
            conn.execute("""
                INSERT INTO thumbnail_templates (id, name, category, aspect_ratio, description, preview_image_url, canvas_data, is_builtin, created_at, updated_at) VALUES
                (
                    'tpl_viral_shorts', 'Viral Hormozi / MrBeast High-CTR', 'viral_shorts', '9:16',
                    'Massive yellow and white bold text with thick dark stroke, high-contrast red arrow and warning accent.',
                    '/media/thumbnails/templates/tpl_viral_shorts.jpg',
                    '{"theme": "viral_shorts", "background": {"type": "frame", "overlay_opacity": 0.25, "vignette": true}, "adjustments": {"brightness": 1.08, "contrast": 1.25, "saturation": 1.2, "blur": 0}, "text_layers": [{"id": "t1", "text": "DO NOT DO THIS!", "font_family": "Impact", "font_size": 96, "color": "#FACC15", "stroke_color": "#000000", "stroke_width": 12, "shadow_color": "#000000", "shadow_offset": [6, 8], "position_x": 50, "position_y": 18, "rotation": -2, "uppercase": true, "bg_banner": true, "bg_color": "#000000", "bg_opacity": 0.8}, {"id": "t2", "text": "100X MISTAKE", "font_family": "Impact", "font_size": 104, "color": "#FFFFFF", "stroke_color": "#EF4444", "stroke_width": 10, "position_x": 50, "position_y": 30, "rotation": 1, "uppercase": true}], "arrows": [{"id": "a1", "start_x": 84, "start_y": 68, "end_x": 58, "end_y": 50, "color": "#EF4444", "width": 16, "curved": true}], "stickers": [{"id": "stk1", "emoji": "⚠️", "position_x": 15, "position_y": 16, "scale": 1.2}]}',
                    1, datetime('now'), datetime('now')
                ),
                (
                    'tpl_gaming', 'High-Octane Gaming Hype', 'gaming', '9:16',
                    'Cyberpunk electric cyan and magenta, angled diagonal badge, bold impact text with fire badge.',
                    '/media/thumbnails/templates/tpl_gaming.jpg',
                    '{"theme": "gaming", "background": {"type": "frame", "overlay_opacity": 0.3, "vignette": true}, "adjustments": {"brightness": 1.05, "contrast": 1.3, "saturation": 1.35, "blur": 0}, "text_layers": [{"id": "t1", "text": "GAME OVER?", "font_family": "Impact", "font_size": 100, "color": "#FACC15", "stroke_color": "#000000", "stroke_width": 12, "position_x": 50, "position_y": 20, "rotation": -3, "uppercase": true, "bg_banner": true, "bg_color": "#000000", "bg_opacity": 0.85}, {"id": "t2", "text": "UNREAL CLUTCH!", "font_family": "Montserrat", "font_size": 72, "color": "#00F0FF", "stroke_color": "#000000", "stroke_width": 8, "position_x": 50, "position_y": 80, "rotation": 2, "uppercase": true}], "shapes": [{"id": "s1", "type": "pill", "color": "#9333EA", "position_x": 50, "position_y": 92, "width": 360, "height": 60, "opacity": 0.9}], "arrows": [{"id": "a1", "start_x": 82, "start_y": 72, "end_x": 54, "end_y": 52, "color": "#00F0FF", "width": 14, "curved": true}], "stickers": [{"id": "stk1", "emoji": "🔥", "position_x": 16, "position_y": 18, "scale": 1.25}]}',
                    1, datetime('now'), datetime('now')
                ),
                (
                    'tpl_football', 'Football & Sports Climax', 'football', '9:16',
                    'High voltage sports red and gold, bold angled kicker, dynamic arrow pointing to winning action.',
                    '/media/thumbnails/templates/tpl_football.jpg',
                    '{"theme": "football", "background": {"type": "frame", "overlay_opacity": 0.25, "vignette": true}, "adjustments": {"brightness": 1.02, "contrast": 1.22, "saturation": 1.25, "blur": 0}, "text_layers": [{"id": "t1", "text": "WHAT A GOAL!", "font_family": "Impact", "font_size": 96, "color": "#FFFFFF", "stroke_color": "#DC2626", "stroke_width": 12, "position_x": 50, "position_y": 18, "rotation": -2, "uppercase": true}, {"id": "t2", "text": "90+4 MINUTE", "font_family": "Montserrat", "font_size": 68, "color": "#FACC15", "stroke_color": "#000000", "stroke_width": 8, "position_x": 50, "position_y": 28, "rotation": 1, "uppercase": true}], "shapes": [{"id": "s1", "type": "badge", "color": "#DC2626", "position_x": 50, "position_y": 88, "width": 420, "height": 70, "opacity": 0.95}], "arrows": [{"id": "a1", "start_x": 80, "start_y": 66, "end_x": 55, "end_y": 48, "color": "#FACC15", "width": 15, "curved": true}], "stickers": [{"id": "stk1", "emoji": "⚽", "position_x": 15, "position_y": 16, "scale": 1.2}]}',
                    1, datetime('now'), datetime('now')
                ),
                (
                    'tpl_podcast', 'Deep Podcast Thought Provoker', 'podcast', '9:16',
                    'Midnight studio ambiance, warm amber quote card with quotation marks, speaker focus.',
                    '/media/thumbnails/templates/tpl_podcast.jpg',
                    '{"theme": "podcast", "background": {"type": "frame", "overlay_opacity": 0.35, "vignette": true}, "adjustments": {"brightness": 0.98, "contrast": 1.15, "saturation": 1.05, "blur": 0}, "text_layers": [{"id": "t1", "text": "THE SECRET IS OUT", "font_family": "Montserrat", "font_size": 78, "color": "#FFFFFF", "stroke_color": "#000000", "stroke_width": 8, "position_x": 50, "position_y": 20, "rotation": 0, "uppercase": true, "bg_banner": true, "bg_color": "#0F172A", "bg_opacity": 0.9}, {"id": "t2", "text": "I was warned...", "font_family": "Georgia", "font_size": 60, "color": "#F59E0B", "stroke_color": "#000000", "stroke_width": 4, "position_x": 50, "position_y": 82, "rotation": 0, "uppercase": false}], "shapes": [{"id": "s1", "type": "pill", "color": "#D97706", "position_x": 50, "position_y": 92, "width": 320, "height": 50, "opacity": 0.9}], "stickers": [{"id": "stk1", "emoji": "🎙️", "position_x": 15, "position_y": 18, "scale": 1.15}]}',
                    1, datetime('now'), datetime('now')
                ),
                (
                    'tpl_reactions', 'Shock & Expressive Reaction', 'reactions', '9:16',
                    'Expressive subject cutout focus, bright yellow shock banner, shock emoji, bold question mark.',
                    '/media/thumbnails/templates/tpl_reactions.jpg',
                    '{"theme": "reactions", "background": {"type": "frame", "overlay_opacity": 0.2, "vignette": true}, "adjustments": {"brightness": 1.06, "contrast": 1.2, "saturation": 1.2, "blur": 0}, "text_layers": [{"id": "t1", "text": "NO WAY...", "font_family": "Impact", "font_size": 104, "color": "#FACC15", "stroke_color": "#000000", "stroke_width": 14, "position_x": 50, "position_y": 18, "rotation": -4, "uppercase": true, "bg_banner": true, "bg_color": "#000000", "bg_opacity": 0.9}, {"id": "t2", "text": "WAIT FOR IT!", "font_family": "Impact", "font_size": 90, "color": "#FFFFFF", "stroke_color": "#EF4444", "stroke_width": 10, "position_x": 50, "position_y": 82, "rotation": 3, "uppercase": true}], "arrows": [{"id": "a1", "start_x": 86, "start_y": 68, "end_x": 52, "end_y": 48, "color": "#EF4444", "width": 18, "curved": true}], "stickers": [{"id": "stk1", "emoji": "😱", "position_x": 16, "position_y": 16, "scale": 1.3}]}',
                    1, datetime('now'), datetime('now')
                ),
                (
                    'tpl_educational', 'Educational Modern Explainer', 'educational', '9:16',
                    'Clean dark slate card, electric blue accent pill, crisp bold sans typography and clarity score.',
                    '/media/thumbnails/templates/tpl_educational.jpg',
                    '{"theme": "educational", "background": {"type": "frame", "overlay_opacity": 0.3, "vignette": false}, "adjustments": {"brightness": 1.0, "contrast": 1.1, "saturation": 1.05, "blur": 0}, "text_layers": [{"id": "t1", "text": "HOW IT WORKS", "font_family": "Inter", "font_size": 84, "color": "#FFFFFF", "stroke_color": "#0284C7", "stroke_width": 8, "position_x": 50, "position_y": 20, "rotation": 0, "uppercase": true, "bg_banner": true, "bg_color": "#0369A1", "bg_opacity": 0.9}, {"id": "t2", "text": "10X FASTER", "font_family": "Inter", "font_size": 72, "color": "#38BDF8", "stroke_color": "#000000", "stroke_width": 6, "position_x": 50, "position_y": 30, "rotation": 0, "uppercase": true}], "shapes": [{"id": "s1", "type": "pill", "color": "#0284C7", "position_x": 50, "position_y": 88, "width": 340, "height": 55, "opacity": 0.95}], "stickers": [{"id": "stk1", "emoji": "💡", "position_x": 16, "position_y": 18, "scale": 1.2}]}',
                    1, datetime('now'), datetime('now')
                ),
                (
                    'tpl_entertainment', 'Cinematic Drama & Entertainment', 'entertainment', '9:16',
                    'Cinematic drama, warm gold highlights, bold punchy kicker text, rich dark vignette.',
                    '/media/thumbnails/templates/tpl_entertainment.jpg',
                    '{"theme": "entertainment", "background": {"type": "frame", "overlay_opacity": 0.35, "vignette": true}, "adjustments": {"brightness": 0.95, "contrast": 1.25, "saturation": 1.15, "blur": 0}, "text_layers": [{"id": "t1", "text": "THE DARK TRUTH", "font_family": "Impact", "font_size": 92, "color": "#FBBF24", "stroke_color": "#000000", "stroke_width": 10, "position_x": 50, "position_y": 20, "rotation": -1, "uppercase": true, "bg_banner": true, "bg_color": "#18181B", "bg_opacity": 0.85}, {"id": "t2", "text": "FINALE", "font_family": "Montserrat", "font_size": 70, "color": "#FFFFFF", "stroke_color": "#B45309", "stroke_width": 6, "position_x": 50, "position_y": 82, "rotation": 0, "uppercase": true}], "arrows": [{"id": "a1", "start_x": 82, "start_y": 70, "end_x": 54, "end_y": 50, "color": "#FBBF24", "width": 14, "curved": true}], "stickers": [{"id": "stk1", "emoji": "🎬", "position_x": 15, "position_y": 18, "scale": 1.15}]}',
                    1, datetime('now'), datetime('now')
                ),
                (
                    'tpl_interviews', 'Intimate Interview Spotlight', 'interviews', '9:16',
                    'Side-by-side or speaker portrait banner, topic card, high-contrast dialogue vibe.',
                    '/media/thumbnails/templates/tpl_interviews.jpg',
                    '{"theme": "interviews", "background": {"type": "frame", "overlay_opacity": 0.3, "vignette": true}, "adjustments": {"brightness": 1.0, "contrast": 1.15, "saturation": 1.05, "blur": 0}, "text_layers": [{"id": "t1", "text": "INSIDE THE MIND", "font_family": "Montserrat", "font_size": 76, "color": "#FFFFFF", "stroke_color": "#000000", "stroke_width": 8, "position_x": 50, "position_y": 20, "rotation": 0, "uppercase": true, "bg_banner": true, "bg_color": "#3B82F6", "bg_opacity": 0.9}, {"id": "t2", "text": "UNFILTERED", "font_family": "Impact", "font_size": 84, "color": "#FACC15", "stroke_color": "#000000", "stroke_width": 8, "position_x": 50, "position_y": 80, "rotation": 1, "uppercase": true}], "shapes": [{"id": "s1", "type": "pill", "color": "#1E40AF", "position_x": 50, "position_y": 90, "width": 320, "height": 50, "opacity": 0.9}], "stickers": [{"id": "stk1", "emoji": "🎯", "position_x": 15, "position_y": 18, "scale": 1.15}]}',
                    1, datetime('now'), datetime('now')
                );
            """)

        # 26. Users Table (Prompt 13 - SaaS Multi-user Auth)
        conn.execute("""
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
        """)

        # 27. Subscription Plans Table (Prompt 13 - Configurable Plans)
        conn.execute("""
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
        """)

        # 28. User Subscriptions Table (Prompt 13)
        conn.execute("""
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
        """)

        # 29. User Usage Meters Table (Prompt 13)
        conn.execute("""
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
        """)

        # 30. Usage Logs Table (Prompt 13 - Auditable Ledger)
        conn.execute("""
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
        """)

        # 31. Payment Transactions Table (Prompt 13)
        conn.execute("""
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
        """)

        # 32. Account Notifications Table (Prompt 13)
        conn.execute("""
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
        """)

        # Multi-tenant migration: Add user_id column to existing tenant resources
        for table in ["projects", "connected_channels", "thumbnail_designs", "studio_projects", "video_analytics"]:
            try:
                cursor = conn.cursor()
                cursor.execute(f"PRAGMA table_info({table});")
                tbl_cols = [r["name"] for r in cursor.fetchall()]
                if "user_id" not in tbl_cols:
                    conn.execute(f"ALTER TABLE {table} ADD COLUMN user_id TEXT DEFAULT 'usr_default_alex';")
            except Exception:
                pass

        # Seed Configurable Subscription Plans
        conn.execute("""
            INSERT OR IGNORE INTO subscription_plans (
                id, slug, name, description, price_monthly, price_yearly, currency,
                monthly_video_minutes, monthly_clips_limit, monthly_ai_analysis_limit,
                monthly_thumbnails_limit, monthly_exports_limit, included_features,
                is_active, sort_order, created_at, updated_at
            ) VALUES
            (
                'plan_free', 'free', 'Free Starter',
                'Perfect for getting started with AI-generated Shorts and testing the editing suite.',
                0.0, 0.0, 'USD',
                15, 10, 5, 15, 10,
                '["basic_editing", "standard_exports", "ai_subtitles", "auto_reframing_basic"]',
                1, 1, datetime('now'), datetime('now')
            ),
            (
                'plan_creator', 'creator', 'Creator Pro',
                'Ideal for growing channels needing high processing volumes and direct YouTube distribution.',
                29.0, 290.0, 'USD',
                120, 100, 50, 100, 80,
                '["basic_editing", "standard_exports", "ai_subtitles", "auto_reframing_basic", "advanced_editing", "youtube_publishing", "hd_60fps_export", "custom_branding", "cloud_presets"]',
                1, 2, datetime('now'), datetime('now')
            ),
            (
                'plan_pro', 'pro', 'Viral Agency / Pro',
                'Engineered for serious YouTubers & agencies demanding deep AI intelligence and multi-channel scale.',
                79.0, 790.0, 'USD',
                500, 400, 250, 400, 350,
                '["basic_editing", "standard_exports", "ai_subtitles", "auto_reframing_basic", "advanced_editing", "youtube_publishing", "hd_60fps_export", "custom_branding", "cloud_presets", "4k_export", "ai_intelligence", "competitor_analysis", "advanced_analytics", "priority_processing", "dynamic_face_tracking"]',
                1, 3, datetime('now'), datetime('now')
            ),
            (
                'plan_enterprise', 'enterprise', 'Studio Enterprise',
                'Custom processing capacity, dedicated API infrastructure, SLA guarantees, and team collaboration.',
                249.0, 2490.0, 'USD',
                2000, 1500, 1000, 1500, 1500,
                '["all_features", "priority_support", "custom_limits", "team_management", "dedicated_queue", "white_label_exports"]',
                1, 4, datetime('now'), datetime('now')
            );
        """)

        # Seed Default User 'usr_default_alex' (Creator Pro tier)
        # Hash for 'CreatorPro2026!' using PBKDF2-HMAC-SHA256 with 100,000 rounds
        import hashlib
        salt_hex = "616c657876616e636573616c74313233"
        key_hex = hashlib.pbkdf2_hmac('sha256', b'CreatorPro2026!', bytes.fromhex(salt_hex), 100000).hex()
        pw_hash = f"pbkdf2_sha256$100000${salt_hex}${key_hex}"

        conn.execute("""
            INSERT OR IGNORE INTO users (
                id, email, password_hash, full_name, username, avatar_url,
                is_verified, verification_token, role, is_active,
                onboarding_completed, onboarding_data, created_at, updated_at
            ) VALUES (
                'usr_default_alex', 'adhrit@shortsfactory.io', ?, 'Adhrit Chopdekar', 'adhrit',
                NULL,
                1, NULL, 'creator', 1, 1,
                '{"niche": "AI & Tech", "primary_goal": "Grow subscriber base", "target_duration_sec": 45}',
                datetime('now'), datetime('now')
            );
        """, (pw_hash,))

        # Seed Subscription for Default User
        now_iso = datetime.utcnow().isoformat()
        next_month_iso = (datetime.utcnow() + timedelta(days=30)).isoformat()
        conn.execute("""
            INSERT OR IGNORE INTO user_subscriptions (
                id, user_id, plan_id, status, billing_interval,
                current_period_start, current_period_end, cancel_at_period_end,
                payment_method_brand, payment_method_last4,
                provider_customer_id, provider_subscription_id,
                created_at, updated_at
            ) VALUES (
                'sub_alex_creator', 'usr_default_alex', 'plan_pro', 'active', 'monthly',
                ?, ?, 0, 'visa', '4242',
                'cus_stripe_alex_123', 'sub_stripe_alex_123', ?, ?
            );
        """, (now_iso, next_month_iso, now_iso, now_iso))

        # Ensure demo user has plan_pro and active status
        conn.execute("UPDATE user_subscriptions SET plan_id = 'plan_pro', status = 'active' WHERE user_id = 'usr_default_alex';")

        # Seed Usage Meter for Default User
        conn.execute("""
            INSERT OR IGNORE INTO user_usage_meters (
                id, user_id, period_start, period_end,
                video_processing_minutes_used, ai_clips_generated_used,
                ai_analysis_requests_used, thumbnails_generated_used,
                exports_count_used, credits_balance, updated_at
            ) VALUES (
                'usage_alex_current', 'usr_default_alex', ?, ?,
                32.5, 24, 12, 18, 14, 120, ?
            );
        """, (now_iso, next_month_iso, now_iso))

        # Seed Initial Payment Transaction for Default User
        conn.execute("""
            INSERT OR IGNORE INTO payment_transactions (
                id, user_id, subscription_id, plan_id, amount, currency,
                provider, transaction_ref, status, billing_interval,
                invoice_number, invoice_pdf_url, payment_method_summary,
                created_at
            ) VALUES (
                'tx_alex_initial_1', 'usr_default_alex', 'sub_alex_creator', 'plan_creator',
                29.0, 'USD', 'stripe', 'ch_stripe_alex_initial_001', 'succeeded', 'monthly',
                'INV-2026-0001', '/api/v1/billing/invoices/tx_alex_initial_1/download',
                'Visa ending in 4242', ?
            );
        """, (now_iso,))

        # Seed Welcome Notification for Default User
        conn.execute("""
            INSERT OR IGNORE INTO account_notifications (
                id, user_id, type, title, message, action_url, is_read, created_at
            ) VALUES (
                'notif_alex_welcome', 'usr_default_alex', 'subscription_activated',
                'Welcome to Creator Pro!',
                'Your subscription has been activated with 120 monthly processing minutes and full YouTube publishing.',
                '/account', 0, ?
            );
        """, (now_iso,))

        # 33. Ensure Users Table Columns for Account Status & Suspension
        try:
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(users);")
            u_cols = [r["name"] for r in cursor.fetchall()]
            if "account_status" not in u_cols:
                conn.execute("ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT 'active';")
            if "suspension_reason" not in u_cols:
                conn.execute("ALTER TABLE users ADD COLUMN suspension_reason TEXT;")
        except Exception:
            pass

        # 34. Admin Audit Logs Table (Prompt 14)
        conn.execute("""
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
        """)

        # 35. Credit Adjustments Ledger (Prompt 14)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS credit_adjustments (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                admin_id TEXT NOT NULL,
                admin_email TEXT NOT NULL,
                adjustment_type TEXT NOT NULL,
                amount INTEGER NOT NULL,
                balance_before INTEGER NOT NULL,
                balance_after INTEGER NOT NULL,
                reason TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)

        # 36. Platform Announcements Table (Prompt 14)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS platform_announcements (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'general',
                priority TEXT DEFAULT 'normal',
                target_audience TEXT DEFAULT 'all',
                is_active INTEGER DEFAULT 1,
                start_date TEXT,
                expires_at TEXT,
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
            );
        """)

        # 37. Platform Settings Table (Prompt 14 - Singleton)
        conn.execute("""
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
        """)

        # 38. AI Services Configuration Table (Prompt 14)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ai_services_config (
                id TEXT PRIMARY KEY,
                service_key TEXT UNIQUE NOT NULL,
                service_name TEXT NOT NULL,
                provider TEXT NOT NULL,
                model_name TEXT NOT NULL,
                status TEXT DEFAULT 'active',
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
        """)

        # Seed Super Admin User 'usr_super_admin_root'
        salt_admin_hex = "61646d696e73616c7439393938383737"
        key_admin_hex = hashlib.pbkdf2_hmac('sha256', b'SuperAdmin2026!', bytes.fromhex(salt_admin_hex), 100000).hex()
        pw_admin_hash = f"pbkdf2_sha256$100000${salt_admin_hex}${key_admin_hex}"

        conn.execute("""
            INSERT OR IGNORE INTO users (
                id, email, password_hash, full_name, username, avatar_url,
                is_verified, verification_token, role, is_active, account_status,
                onboarding_completed, onboarding_data, created_at, updated_at
            ) VALUES (
                'usr_super_admin_root', 'admin@shortsfactory.io', ?, 'System Administrator', 'superadmin',
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                1, NULL, 'super_admin', 1, 'active', 1, '{}', datetime('now'), datetime('now')
            );
        """, (pw_admin_hash,))

        # Seed Support Agent User 'usr_support_agent_1'
        salt_agent_hex = "737570706f727473616c743132333435"
        key_agent_hex = hashlib.pbkdf2_hmac('sha256', b'SupportAgent2026!', bytes.fromhex(salt_agent_hex), 100000).hex()
        pw_agent_hash = f"pbkdf2_sha256$100000${salt_agent_hex}${key_agent_hex}"

        conn.execute("""
            INSERT OR IGNORE INTO users (
                id, email, password_hash, full_name, username, avatar_url,
                is_verified, verification_token, role, is_active, account_status,
                onboarding_completed, onboarding_data, created_at, updated_at
            ) VALUES (
                'usr_support_agent_1', 'support@shortsfactory.io', ?, 'Support Specialist', 'supportagent',
                'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
                1, NULL, 'support_agent', 1, 'active', 1, '{}', datetime('now'), datetime('now')
            );
        """, (pw_agent_hash,))

        # Seed Platform Settings Singleton
        conn.execute("""
            INSERT OR IGNORE INTO platform_settings (
                id, platform_name, logo_url, support_email, maintenance_mode,
                maintenance_message, registration_enabled, default_free_credits,
                feature_flags, supported_resolutions, supported_framerates,
                ai_costs_config, updated_by, updated_at
            ) VALUES (
                'singleton_settings', 'AI Shorts Factory', '/logo.svg', 'support@shortsfactory.io',
                0, 'AI Shorts Factory is undergoing brief scheduled maintenance. Please check back shortly.',
                1, 100,
                '{"auto_reframing": true, "ai_thumbnails": true, "competitor_analysis": true, "bulk_publishing": true, "dynamic_subtitles": true, "high_fps_exports": true}',
                '["720p", "1080p", "4k"]', '["30", "60"]',
                '{"whisper_per_minute": 0.006, "claude_highlight_per_call": 0.015, "cv_reframe_per_minute": 0.008, "thumbnail_ai_per_call": 0.02}',
                'usr_super_admin_root', datetime('now')
            );
        """)

        # Seed AI Services Config
        conn.execute("""
            INSERT OR IGNORE INTO ai_services_config (
                id, service_key, service_name, provider, model_name, status,
                daily_request_budget, monthly_spend_limit_usd, latency_ms,
                total_requests_count, failed_requests_count, estimated_spend_usd,
                api_key_masked, is_enabled, updated_at
            ) VALUES
            (
                'ai_srv_whisper', 'whisper_transcription', 'OpenAI Whisper High-Precision ASR',
                'openai', 'whisper-large-v3', 'active', 10000, 600.0, 185.0, 1420, 3, 8.52,
                'sk-proj-...8a12', 1, datetime('now')
            ),
            (
                'ai_srv_highlight', 'highlight_detector', 'Anthropic Claude 3.5 Moment Detector',
                'anthropic', 'claude-3-5-sonnet-20241022', 'active', 5000, 750.0, 320.0, 890, 1, 13.35,
                'sk-ant-...99bc', 1, datetime('now')
            ),
            (
                'ai_srv_reframing', 'visual_reframer', 'OpenCV & MediaPipe Visual Tracker',
                'local_opencv_ffmpeg', 'mediapipe-face-mesh-v2', 'active', 15000, 200.0, 95.0, 2140, 0, 0.0,
                'local-engine', 1, datetime('now')
            ),
            (
                'ai_srv_thumbnail', 'thumbnail_generator', 'SDXL / Canvas Visual Synthesizer',
                'stability_ai', 'stable-diffusion-xl-turbo', 'active', 3000, 450.0, 420.0, 640, 2, 12.80,
                'sk-stab-...431e', 1, datetime('now')
            ),
            (
                'ai_srv_strategy', 'content_strategist', 'DeepMind Content Intelligence Agent',
                'google', 'gemini-1.5-pro', 'active', 2500, 300.0, 260.0, 410, 0, 4.10,
                'AIzaSy-...38df', 1, datetime('now')
            );
        """)

        # Seed Platform Announcement
        conn.execute("""
            INSERT OR IGNORE INTO platform_announcements (
                id, title, message, type, priority, target_audience,
                is_active, start_date, expires_at, created_by, created_at, updated_at
            ) VALUES (
                'ann_welcome_v2',
                '🚀 AI Shorts Factory 2.0 Super Studio Released',
                'Welcome to the upgraded AI Shorts Factory! Now featuring 9:16 Smart Auto-Reframing, Multi-Track Editing Studio, AI Thumbnail Designer, and YouTube 1-Click Publishing.',
                'release', 'high', 'all', 1, datetime('now', '-1 day'), datetime('now', '+30 days'),
                'usr_super_admin_root', datetime('now', '-1 day'), datetime('now', '-1 day')
            );
        """)

        # Seed Initial Audit Log
        conn.execute("""
            INSERT OR IGNORE INTO admin_audit_logs (
                id, admin_id, admin_email, admin_role, action, resource_type,
                resource_id, details_json, ip_address, created_at
            ) VALUES (
                'audit_init_001', 'usr_super_admin_root', 'admin@shortsfactory.io', 'super_admin',
                'platform_initialized', 'system', 'singleton_settings',
                '{"version": "2.4.0", "status": "operational", "modules_active": 14}',
                '127.0.0.1', datetime('now')
            );
        """)

        # Production Database Performance Indexes
        production_indexes = [
            "CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);",
            "CREATE INDEX IF NOT EXISTS idx_source_videos_project_id ON source_videos(project_id);",
            "CREATE INDEX IF NOT EXISTS idx_transcriptions_source_id ON transcriptions(source_video_id);",
            "CREATE INDEX IF NOT EXISTS idx_analysis_jobs_project_id ON analysis_jobs(project_id);",
            "CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);",
            "CREATE INDEX IF NOT EXISTS idx_highlight_candidates_source_id ON highlight_candidates(source_video_id);",
            "CREATE INDEX IF NOT EXISTS idx_generated_clips_project_id ON generated_clips(project_id);",
            "CREATE INDEX IF NOT EXISTS idx_generated_clips_source_id ON generated_clips(source_video_id);",
            "CREATE INDEX IF NOT EXISTS idx_export_jobs_clip_id ON export_jobs(clip_id);",
            "CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);",
            "CREATE INDEX IF NOT EXISTS idx_connected_channels_user_id ON connected_channels(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_publishing_jobs_channel_id ON publishing_jobs(connected_channel_id);",
            "CREATE INDEX IF NOT EXISTS idx_publishing_jobs_status ON publishing_jobs(status);",
            "CREATE INDEX IF NOT EXISTS idx_publishing_jobs_scheduled_at ON publishing_jobs(scheduled_at);",
            "CREATE INDEX IF NOT EXISTS idx_video_analytics_channel_id ON video_analytics(channel_id);",
            "CREATE INDEX IF NOT EXISTS idx_video_analytics_video_id ON video_analytics(video_id);",
            "CREATE INDEX IF NOT EXISTS idx_analytics_alerts_channel_id ON analytics_alerts(channel_id);",
            "CREATE INDEX IF NOT EXISTS idx_channel_niche_profiles_channel_id ON channel_niche_profiles(channel_id);",
            "CREATE INDEX IF NOT EXISTS idx_competitor_channels_user_channel ON competitor_channels(user_channel_id);",
            "CREATE INDEX IF NOT EXISTS idx_content_gap_records_channel_id ON content_gap_records(channel_id);",
            "CREATE INDEX IF NOT EXISTS idx_ai_shorts_ideas_channel_id ON ai_shorts_ideas(channel_id);",
            "CREATE INDEX IF NOT EXISTS idx_content_strategy_plans_channel_id ON content_strategy_plans(channel_id);",
            "CREATE INDEX IF NOT EXISTS idx_studio_projects_project_id ON studio_projects(project_id);",
            "CREATE INDEX IF NOT EXISTS idx_studio_projects_clip_id ON studio_projects(clip_id);",
            "CREATE INDEX IF NOT EXISTS idx_studio_projects_user_id ON studio_projects(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_thumbnail_designs_clip_id ON thumbnail_designs(clip_id);",
            "CREATE INDEX IF NOT EXISTS idx_thumbnail_designs_user_id ON thumbnail_designs(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_thumbnail_candidate_frames_clip ON thumbnail_candidate_frames(clip_id);",
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",
            "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);",
            "CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);",
            "CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);",
            "CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);",
            "CREATE INDEX IF NOT EXISTS idx_user_usage_meters_user_id ON user_usage_meters(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);",
            "CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_payment_transactions_ref ON payment_transactions(transaction_ref);",
            "CREATE INDEX IF NOT EXISTS idx_account_notifications_user_id ON account_notifications(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);",
            "CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);",
            "CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);",
            "CREATE INDEX IF NOT EXISTS idx_credit_adjustments_user_id ON credit_adjustments(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_credit_adjustments_created_at ON credit_adjustments(created_at);",
            "CREATE INDEX IF NOT EXISTS idx_platform_announcements_active ON platform_announcements(is_active);",
            "CREATE INDEX IF NOT EXISTS idx_ai_services_config_key ON ai_services_config(service_key);"
        ]
        for idx_sql in production_indexes:
            try:
                conn.execute(idx_sql)
            except Exception:
                pass

    conn.close()

# Auto-initialize database on import
init_db()

