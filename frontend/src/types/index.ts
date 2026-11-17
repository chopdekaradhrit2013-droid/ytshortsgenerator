export type ProjectStatus = 'draft' | 'uploading' | 'analysing' | 'processing' | 'completed' | 'failed';
export type VideoCategory = 'automatic' | 'gaming' | 'podcast' | 'entertainment' | 'interview' | 'other';
export type ClipStatus = 'detected' | 'rendering' | 'ready' | 'failed';
export type PublishingStatus = 'waiting' | 'uploading' | 'processing' | 'published' | 'failed';
export type VisibilityType = 'public' | 'unlisted' | 'private';

export interface Project {
  id: string;
  name: string;
  description?: string;
  category: VideoCategory;
  status: ProjectStatus;
  target_clip_count: number;
  preferred_duration_seconds: number;
  tags: string[];
  clip_count: number;
  created_at: string;
  updated_at: string;
  thumbnail_url?: string;
  video_url?: string;
  source_filename?: string;
  source_file_size_mb?: number;
  source_duration_seconds?: number;
}

export interface GeneratedClip {
  id: string;
  project_id: string;
  source_video_id: string;
  title: string;
  summary: string;
  hook_sentence: string;
  start_time: number;
  end_time: number;
  duration_seconds: number;
  engagement_score: number;
  virality_reasons: string[];
  tags: string[];
  aspect_ratio: string;
  resolution_width: number;
  resolution_height: number;
  video_url: string;
  thumbnail_url: string;
  status: ClipStatus;
  captions_style: {
    fontFamily: string;
    fontSize: number;
    color: string;
    highlightColor: string;
    animation: string;
    position: 'bottom' | 'middle' | 'top';
  };
  created_at: string;
}

export interface TimelineTrackItem {
  id: string;
  title: string;
  start_time: number;
  end_time: number;
  source_start: number;
  source_end: number;
  color?: string;
  text_content?: string;
  properties?: Record<string, any>;
}

export interface TimelineTrack {
  id: string;
  type: 'video' | 'audio' | 'text';
  name: string;
  muted: boolean;
  locked: boolean;
  items: TimelineTrackItem[];
}

export interface PublishingJob {
  id: string;
  project_id: string;
  clip_id: string;
  platform: 'youtube';
  video_title: string;
  video_description: string;
  tags: string[];
  visibility: VisibilityType;
  scheduled_at?: string;
  published_at?: string;
  status: PublishingStatus;
  progress_percentage: number;
  platform_video_id?: string;
  platform_url?: string;
  error_message?: string;
  created_at: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  role: string;
  storage_used_bytes: number;
  storage_limit_bytes: number;
}

export interface ConnectedChannel {
  connected: boolean;
  channel_name: string;
  channel_id: string;
  subscribers: number;
  avatar_url: string;
  last_synced?: string;
}

export interface AppSettings {
  profile: UserProfile;
  youtube_account: {
    channel_name: string;
    channel_id: string;
    subscribers: number;
    auto_publish_approved: boolean;
    default_visibility: VisibilityType;
    default_tags: string;
  };
  editing_preferences: {
    default_aspect_ratio: string;
    default_clip_duration: number;
    default_target_clips: number;
    auto_silence_removal: boolean;
    background_music_ducking: boolean;
  };
  caption_style: {
    preset: string;
    font_family: string;
    font_size: number;
    primary_color: string;
    highlight_color: string;
    animation: string;
    casing: string;
  };
  export_settings: {
    resolution: string;
    framerate: number;
    codec: string;
    bitrate: string;
    audio_bitrate: string;
  };
  storage: {
    used_bytes: number;
    limit_bytes: number;
    auto_cleanup_days: number;
  };
  app_preferences: {
    theme: string;
    sound_effects: boolean;
    auto_save_interval_sec: number;
  };
}
