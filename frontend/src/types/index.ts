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
  virality_score?: number;
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
  caption_preset?: string;
  export_with_captions?: boolean;
  caption_placement?: string;
  caption_language?: string;
  export_status?: string;
  export_video_url?: string;
  is_edited?: boolean;
  moment_type?: string;
  ranking_badge?: string;
  hook_style?: string;
  alternative_hooks?: Array<{
    hook_text: string;
    hook_style: string;
    timestamp_offset: number;
    absolute_start_time: number;
    why_it_works: string;
  }>;
  speaker_analysis?: Record<string, any>;
  context_analysis?: Record<string, any>;
  explanation_breakdown?: Record<string, any>;
  similarity_info?: Record<string, any>;
  is_duplicate_or_similar?: boolean;
  hook_suggestions?: Array<any>;
  selected_hook?: string;
  reframing_config?: ReframingConfig;
  created_at: string;
}

export type ReframingMode =
  | 'auto'
  | 'smart_face'
  | 'motion_action'
  | 'split_screen'
  | 'manual_center'
  | 'manual_left'
  | 'manual_right'
  | 'custom';

export type TrackingQualityMode = 'standard' | 'smart' | 'precision';

export interface ReframingTrajectoryPoint {
  time: number;
  center_x: number;
  center_y: number;
  secondary_x?: number;
  secondary_y?: number;
  face_count?: number;
  motion_energy?: number;
}

export interface ReframingConfig {
  mode: ReframingMode;
  quality_mode: TrackingQualityMode;
  center_x_ratio: number;
  center_y_ratio: number;
  zoom_scale: number;
  smoothness: number;
  safe_headroom: number;
  face_detected?: boolean;
  face_count?: number;
  detection_confidence?: number;
  split_screen_recommended?: boolean;
  split_layout?: 'stacked_top_bottom' | 'dynamic_switch' | 'single_focus';
  split_divider_color?: string;
  speaker1_x_ratio?: number;
  speaker2_x_ratio?: number;
  scene_cuts?: number[];
  crop_box?: {
    crop_x: number;
    crop_y: number;
    crop_w: number;
    crop_h: number;
    zoom_scale?: number;
    layout?: string;
    speaker1?: any;
    speaker2?: any;
    split_h?: number;
    split_w?: number;
  };
  filter_string?: string;
  trajectory?: ReframingTrajectoryPoint[];
  sample_count?: number;
}

export interface TimelineTrackItem {
  id: string;
  title?: string;
  start_time: number;
  end_time?: number;
  duration?: number;
  source_start?: number;
  source_end?: number;
  color?: string;
  text?: string;
  text_content?: string;
  track_id?: string;
  type?: string;
  properties?: Record<string, any>;
}

export interface TimelineTrack {
  id: string;
  type: 'video' | 'audio' | 'captions' | 'text' | 'sticker';
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
  upload_speed_mbps?: number;
  estimated_time_remaining_seconds?: number;
  audience_made_for_kids?: boolean;
  thumbnail_url?: string;
  channel_name?: string;
  channel_id?: string;
  platform_video_id?: string;
  platform_url?: string;
  error_message?: string;
  created_at: string;
  updated_at?: string;
}

export interface SEOMetadataSuggestion {
  suggested_titles: string[];
  suggested_description: string;
  hashtags: string[];
  tags: string[];
  visibility: VisibilityType;
  made_for_kids: boolean;
}

export interface CalendarDayEntry {
  date: string;
  count: number;
  items: PublishingJob[];
}

export interface MetricOverviewItem {
  value: number;
  change_pct?: number;
  is_positive?: boolean;
  gained_in_period?: number;
}

export interface ChannelAnalyticsOverview {
  channel_id: string;
  channel_name: string;
  avatar_url: string;
  time_range: string;
  metrics: {
    total_views: MetricOverviewItem;
    total_subscribers: MetricOverviewItem;
    total_likes: MetricOverviewItem;
    total_comments: MetricOverviewItem;
    total_shares: MetricOverviewItem;
    total_shorts_published: MetricOverviewItem;
    avg_views_per_short: MetricOverviewItem;
    avg_engagement_rate: MetricOverviewItem;
  };
}

export interface TimeSeriesPoint {
  date: string;
  views: number;
  subscribers_gained: number;
  likes: number;
  comments: number;
  shares: number;
  shorts_published: number;
}

export interface VideoAnalyticsRecord {
  id: string;
  video_id: string;
  publishing_job_id?: string;
  channel_id: string;
  title: string;
  thumbnail_url?: string;
  published_at: string;
  duration_seconds: number;
  category: string;
  hook_style: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  subscribers_gained: number;
  watch_time_minutes: number;
  avg_view_duration_seconds: number;
  avg_percentage_viewed: number;
  engagement_rate: number;
  performance_badge: 'viral_outlier' | 'above_average' | 'average' | 'underperforming';
  platform_url?: string;
  retention_curve?: Array<{ second: number; retention_pct: number }>;
  daily_views_trajectory?: Array<{ day: number; views: number }>;
  diagnostics?: {
    hook_retention_3s: number;
    retention_status: string;
    viewer_swipe_away_rate: number;
    like_to_view_ratio: number;
    comment_velocity: string;
    primary_traffic_source: string;
  };
}

export interface AudienceInsights {
  time_range: string;
  channel_id: string;
  age_distribution: Array<{ range: string; percentage: number }>;
  gender_distribution: { male: number; female: number; other: number };
  top_geographies: Array<{ country_code: string; country_name: string; percentage: number; views: number }>;
  viewers_breakdown: { new_viewers_pct: number; returning_viewers_pct: number; description: string };
  subscription_source: { non_subscribed_views_pct: number; subscribed_views_pct: number; description: string };
  traffic_sources: Array<{ source: string; percentage: number }>;
}

export interface ContentPerformanceInsights {
  topic_insights: Array<{ category: string; video_count: number; avg_views: number; avg_engagement: number; avg_retention: number }>;
  hook_insights: Array<{ hook_style: string; count: number; avg_views: number; avg_engagement: number }>;
  duration_insights: Array<{ duration_bracket: string; count: number; avg_views: number; avg_retention_pct: number; avg_engagement: number }>;
  best_publishing_days: Array<{ day: string; rating: string; score: number; reason: string }>;
  best_publishing_times: Array<{ time_slot: string; status: string; avg_views_multiplier: number }>;
  actionable_recommendations: Array<{ type: string; title: string; observation: string; action: string }>;
}

export interface PerformanceAlert {
  id: string;
  channel_id: string;
  video_id?: string;
  alert_type: string;
  title: string;
  message: string;
  metric_value: number;
  is_read: boolean | number;
  created_at: string;
}

export interface AlertSettings {
  channel_id: string;
  milestone_1k_enabled: boolean | number;
  milestone_10k_enabled: boolean | number;
  milestone_100k_enabled: boolean | number;
  velocity_spike_threshold_pct: number;
  retention_drop_threshold_pct: number;
  subscriber_milestone_interval: number;
  email_notifications_enabled: boolean | number;
}

export interface ChannelNicheProfile {
  id?: string;
  channel_id: string;
  niche_name: string;
  core_topics: string[];
  target_audience: string;
  brand_voice: string;
  preferred_duration_seconds: number;
  top_performing_hook_styles: string[];
  manual_overrides?: Record<string, any>;
  updated_at?: string;
}

export interface CandidateSourceVideo {
  title: string;
  source_creator: string;
  duration_minutes: number;
  estimated_shorts_count: number;
  opportunity_score: number;
}

export interface TrendingTopic {
  id: string;
  topic: string;
  niche: string;
  growth_velocity_pct: number;
  search_volume_index: number;
  competition_level: string;
  primary_format: string;
  sample_candidates: CandidateSourceVideo[];
}

export interface CompetitorChannel {
  id: string;
  user_channel_id: string;
  competitor_channel_id: string;
  channel_name: string;
  avatar_url?: string;
  subscribers: number;
  total_videos: number;
  avg_shorts_views: number;
  upload_frequency_per_week: number;
  top_topics: string[];
  recent_top_videos: Array<{ title: string; views: number; url: string }>;
  created_at?: string;
}

export interface ContentGapRecord {
  id: string;
  channel_id: string;
  topic_name: string;
  competitor_coverage_score: number;
  user_coverage_score: number;
  opportunity_score: number;
  suggested_angle: string;
  potential_views_multiplier: number;
  created_at?: string;
}

export interface AIShortsIdea {
  id: string;
  channel_id: string;
  title: string;
  hook_sentence: string;
  concept_summary: string;
  suggested_structure: string[];
  recommended_duration_seconds: number;
  caption_style_preset: string;
  keywords: string[];
  why_it_works: string;
  opportunity_score: number;
  score_breakdown: {
    hook_strength: number;
    topic_relevance: number;
    originality: number;
    audience_fit: number;
    storytelling: number;
    competition_level: number;
  };
  source_type: string;
  is_converted_to_project?: boolean | number;
  project_id?: string;
  created_at?: string;
}

export interface ViralPotentialEvaluation {
  title: string;
  opportunity_score: number;
  score_breakdown: {
    hook_strength: number;
    topic_relevance: number;
    originality: number;
    audience_fit: number;
    storytelling: number;
    competition_level: number;
  };
  recommended_duration_seconds: number;
  diagnostic_feedback: string;
}

export interface StrategyDailyItem {
  day: number;
  title: string;
  hook: string;
  topic: string;
  duration: number;
  format: string;
  publish_date: string;
  status: string;
}

export interface ContentStrategyPlan {
  id: string;
  channel_id: string;
  plan_name: string;
  timeframe_days: number;
  daily_schedule: StrategyDailyItem[];
  status: string;
  updated_at?: string;
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

// -----------------------------------------------------------------------------
// PROMPT 9: ADVANCED SHORTS STUDIO & EDITING SUITE TYPES
// -----------------------------------------------------------------------------

export interface CanvasSettings {
  width: number;
  height: number;
  bg_color: string;
  bg_blur: boolean;
  fit_mode: 'contain_blur' | 'cover' | 'fill' | 'contain_black';
  show_safe_guides: boolean;
}

export interface VideoAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  speed: number;
  flip_h: boolean;
  flip_v: boolean;
  rotate: number;
  crop_mode: 'smart_face' | 'center' | 'left' | 'right' | 'contain_blur';
  scale: number;
  fade_in: number;
  fade_out: number;
  transition: 'none' | 'cut' | 'dissolve' | 'fade_black' | 'slide_left' | 'slide_right' | 'zoom_in' | 'wipe';
}

export interface CaptionsState {
  preset: string;
  font_family: string;
  font_size: number;
  font_weight: number;
  primary_color: string;
  highlight_color: string;
  bg_color: string;
  bg_opacity: number;
  outline_width: number;
  shadow_offset: number;
  placement: 'bottom' | 'middle' | 'top' | 'auto';
  animation: 'pop' | 'karaoke' | 'bounce' | 'wave' | 'fade' | 'none';
  uppercase: boolean;
  words_per_line: number;
  segments?: any[];
}

export interface AudioState {
  video_audio_volume: number;
  video_audio_muted: boolean;
  bgm_track: string;
  bgm_volume: number;
  bgm_fade_in: number;
  bgm_fade_out: number;
  loudnorm: boolean;
  denoise: boolean;
  speech_boost: boolean;
  voiceover_volume: number;
  voiceover_file?: string | null;
}

export interface TitleOverlayItem {
  id: string;
  text: string;
  start_time: number;
  duration: number;
  position_y?: number;
  position_x?: number;
  font_family?: string;
  font_size?: number;
  font_weight?: number;
  color?: string;
  bg_color?: string;
  bg_opacity?: number;
  animation?: string;
}

export interface StickerOverlayItem {
  id: string;
  asset_id: string;
  asset_url: string;
  name: string;
  start_time: number;
  duration: number;
  position_x: number;
  position_y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface ShapeOverlayItem {
  id: string;
  shape_type: 'rectangle' | 'circle' | 'badge' | 'arrow';
  start_time: number;
  duration: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
}

export interface WatermarkSettings {
  enabled: boolean;
  text: string;
  opacity: number;
  position: 'top_right' | 'top_left' | 'bottom_right' | 'bottom_left';
}

export interface OverlaysState {
  titles: TitleOverlayItem[];
  stickers: StickerOverlayItem[];
  shapes: ShapeOverlayItem[];
  watermark: WatermarkSettings;
}

export interface ExportSettings {
  resolution: '720p' | '1080p' | '1440p' | '4k';
  width: number;
  height: number;
  fps: 24 | 30 | 60;
  format: 'mp4' | 'webm' | 'mov';
  quality: 'ultra' | 'high' | 'standard' | 'web';
  crf: number;
  bitrate: string;
  audio_bitrate: string;
}

export interface StudioTimelineData {
  duration: number;
  playhead: number;
  zoom_level: number;
  tracks: TimelineTrack[];
}

export interface StudioProject {
  id: string;
  project_id: string;
  clip_id: string;
  name: string;
  aspect_ratio: '9:16' | '16:9' | '1:1' | '4:5' | 'custom';
  canvas_settings: CanvasSettings;
  timeline_data: StudioTimelineData;
  video_adjustments: VideoAdjustments;
  captions_state: CaptionsState;
  audio_state: AudioState;
  overlays_state: OverlaysState;
  export_settings: ExportSettings;
  reframing_settings?: ReframingConfig;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface StudioPreset {
  id: string;
  name: string;
  category: string;
  description?: string;
  is_builtin: boolean;
  config: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface StudioAsset {
  id: string;
  asset_type: 'bgm' | 'sfx' | 'sticker' | 'shape';
  name: string;
  category?: string;
  file_path: string;
  duration_seconds: number;
  metadata?: Record<string, any>;
}

export interface AIAssistModification {
  target: string;
  field?: string;
  action: string;
  old_value?: any;
  new_value?: any;
  description: string;
}

export interface AIAssistResponse {
  command: string;
  explanation: string;
  modifications_count: number;
  modifications: AIAssistModification[];
  updated_state: StudioProject;
}

// -----------------------------------------------------------------------------
// PROMPT 12: THUMBNAIL STUDIO & VISUAL PACKAGING TYPES
// -----------------------------------------------------------------------------

export interface ThumbnailCandidateFrame {
  id: string;
  clip_id?: string;
  timestamp_sec: number;
  image_url: string;
  file_path?: string;
  sharpness_score: number;
  face_score: number;
  face_detected: boolean;
  face_count: number;
  has_expression: boolean;
  composition_score: number;
  total_score: number;
  is_recommended: boolean;
}

export interface ThumbnailTextLayer {
  id: string;
  text: string;
  font_family: string;
  font_size: number;
  color: string;
  stroke_color?: string;
  stroke_width?: number;
  shadow_color?: string;
  shadow_offset?: [number, number];
  position_x: number;
  position_y: number;
  rotation?: number;
  uppercase?: boolean;
  bg_banner?: boolean;
  bg_color?: string;
  bg_opacity?: number;
}

export interface ThumbnailShapeLayer {
  id: string;
  type: 'pill' | 'badge' | 'rectangle';
  color: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  opacity?: number;
}

export interface ThumbnailArrowLayer {
  id: string;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  color: string;
  width: number;
  curved?: boolean;
}

export interface ThumbnailStickerLayer {
  id: string;
  emoji: string;
  position_x: number;
  position_y: number;
  scale: number;
}

export interface ThumbnailImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
}

export interface ThumbnailCanvasData {
  theme?: string;
  background?: {
    type?: 'frame' | 'solid' | 'gradient';
    color?: string;
    gradient?: string[];
    overlay_opacity?: number;
    vignette?: boolean;
  };
  adjustments?: ThumbnailImageAdjustments;
  text_layers: ThumbnailTextLayer[];
  shapes?: ThumbnailShapeLayer[];
  arrows?: ThumbnailArrowLayer[];
  stickers?: ThumbnailStickerLayer[];
}

export interface ThumbnailQualityReport {
  overall_score: number;
  rating_tier: string;
  summary: string;
  metrics: {
    readability: number;
    contrast: number;
    clarity: number;
    subject_visibility: number;
    clutter_management: number;
    word_count: number;
    element_count: number;
  };
  suggestions: string[];
  analyzed_at?: string;
}

export interface ThumbnailTemplate {
  id: string;
  name: string;
  category: 'gaming' | 'football' | 'podcast' | 'reactions' | 'educational' | 'entertainment' | 'interviews' | 'viral_shorts' | 'custom';
  aspect_ratio: '9:16' | '16:9';
  description?: string;
  preview_image_url?: string;
  canvas_data: ThumbnailCanvasData;
  is_builtin: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ThumbnailDesign {
  id: string;
  project_id?: string;
  clip_id?: string;
  title: string;
  aspect_ratio: '9:16' | '16:9';
  width: number;
  height: number;
  source_frame_path?: string;
  rendered_image_url?: string;
  template_id?: string;
  canvas_data: ThumbnailCanvasData;
  quality_score: number;
  quality_report?: ThumbnailQualityReport;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// PROMPT 13: SAAS USER ACCOUNTS, SUBSCRIPTIONS & USAGE MANAGEMENT
// =============================================================================

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  is_verified: boolean;
  role: 'super_admin' | 'admin' | 'support_agent' | 'creator' | 'enterprise';
  plan_id?: string;
  plan_slug?: string;
  plan_name?: string;
  subscription_status?: string;
  onboarding_completed: boolean;
  onboarding_data?: Record<string, any>;
  access_token?: string;
  token_type?: string;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  description?: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  monthly_video_minutes: number;
  monthly_clips_limit: number;
  monthly_ai_analysis_limit: number;
  monthly_thumbnails_limit: number;
  monthly_exports_limit: number;
  included_features: string[];
  is_active: boolean;
  sort_order: number;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  plan_slug: string;
  plan_description?: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
  billing_interval: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  payment_method_brand: string;
  payment_method_last4: string;
  price_monthly?: number;
  price_yearly?: number;
  monthly_video_minutes?: number;
  monthly_clips_limit?: number;
  monthly_ai_analysis_limit?: number;
  monthly_thumbnails_limit?: number;
  monthly_exports_limit?: number;
  included_features?: string[];
}

export interface UsageMetricItem {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  unit: string;
  is_depleted: boolean;
}

export interface UsageSummary {
  user_id: string;
  plan: {
    id: string;
    name: string;
    slug: string;
    status: string;
    billing_interval: string;
  };
  cycle: {
    period_start: string;
    period_end: string;
    days_remaining: number;
  };
  credits_balance: number;
  metrics: {
    video_processing_minutes: UsageMetricItem;
    ai_clip_generations: UsageMetricItem;
    ai_analysis_requests: UsageMetricItem;
    thumbnail_generations: UsageMetricItem;
    export_operations: UsageMetricItem;
  };
  features: string[];
  any_depleted: boolean;
  needs_upgrade: boolean;
}

export interface UsageLog {
  id: string;
  metric_type: string;
  amount: number;
  credits_deducted: number;
  balance_after: number;
  resource_id?: string;
  description?: string;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  subscription_id?: string;
  plan_id: string;
  plan_name?: string;
  amount: number;
  currency: string;
  provider: string;
  transaction_ref: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  billing_interval: string;
  invoice_number: string;
  invoice_pdf_url?: string;
  payment_method_summary?: string;
  error_message?: string;
  created_at: string;
}

export interface InvoiceDetail {
  invoice_number: string;
  invoice_date: string;
  status: string;
  customer: {
    name: string;
    email: string;
    user_id: string;
  };
  seller: {
    company_name: string;
    address: string;
    tax_id: string;
    support_email: string;
  };
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  payment_method: string;
  transaction_ref: string;
}

export interface AccountNotification {
  id: string;
  user_id: string;
  type: 'subscription_activated' | 'upcoming_renewal' | 'payment_failed' | 'low_credit_balance' | 'usage_reset' | 'subscription_expired' | 'subscription_upgraded' | 'subscription_cancelled';
  title: string;
  message: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface CheckoutSessionData {
  session_id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  plan_slug: string;
  billing_interval: string;
  amount: number;
  currency: string;
  timestamp: number;
  signature: string;
  checkout_url: string;
  success_url: string;
  cancel_url: string;
}

// ====================================================================
// PROMPT 14: SUPER ADMIN & PLATFORM MANAGEMENT TYPES
// ====================================================================

export interface AdminOverviewMetrics {
  users: {
    total: number;
    active: number;
    suspended: number;
    disabled: number;
    new_today: number;
    new_this_month: number;
    free_count: number;
    paid_count: number;
  };
  content: {
    total_shorts: number;
    total_projects: number;
    total_processing_minutes: number;
    total_exports: number;
    storage_used_mb: number;
  };
  revenue: {
    monthly_recurring_revenue: number;
    total_revenue_collected: number;
    total_transactions: number;
    active_subscriptions: number;
  };
  jobs: {
    total: number;
    queued: number;
    active: number;
    completed: number;
    failed: number;
  };
  system: {
    status: 'operational' | 'degraded';
    backend_version: string;
    database_engine: string;
    ai_status: string;
  };
  recent_users: Array<{
    id: string;
    email: string;
    full_name: string;
    role: string;
    account_status: string;
    created_at: string;
    plan_name?: string;
  }>;
  recent_audit_logs: Array<{
    id: string;
    admin_email: string;
    admin_role: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    created_at: string;
  }>;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  role: 'super_admin' | 'admin' | 'support_agent' | 'creator';
  is_active: boolean;
  account_status: 'active' | 'suspended' | 'disabled';
  suspension_reason?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  plan: {
    id: string;
    name: string;
    slug: string;
    status: string;
    billing_interval: string;
  };
  usage: {
    credits_balance: number;
    video_minutes_used: number;
    clips_generated: number;
  };
  project_count: number;
  connected_channel?: string;
}

export interface AdminUserDetails {
  user: {
    id: string;
    email: string;
    full_name: string;
    username: string;
    avatar_url?: string;
    role: string;
    is_active: boolean;
    account_status: string;
    suspension_reason?: string;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
  };
  subscription: {
    plan_id: string;
    plan_name: string;
    plan_slug: string;
    status: string;
    billing_interval: string;
    current_period_start: string;
    current_period_end: string;
    card: string;
  };
  usage: {
    credits_balance: number;
    video_minutes_used: number;
    clips_generated: number;
    analyses_used: number;
    thumbnails_used: number;
    exports_used: number;
  };
  connected_channel?: {
    id: string;
    platform: string;
    channel_title: string;
    channel_id: string;
    subscriber_count: number;
    is_connected: boolean;
    created_at: string;
  };
  recent_projects: Array<{
    id: string;
    name: string;
    status: string;
    clip_count: number;
    created_at: string;
  }>;
  credit_adjustments: Array<{
    id: string;
    admin_email: string;
    adjustment_type: string;
    amount: number;
    balance_before: number;
    balance_after: number;
    reason: string;
    created_at: string;
  }>;
  recent_transactions: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    invoice_number: string;
    created_at: string;
  }>;
}

export interface AdminCreditAdjustment {
  id: string;
  user_id: string;
  admin_id: string;
  admin_email: string;
  adjustment_type: 'add' | 'deduct' | 'correction' | 'promotional';
  amount: number;
  balance_before: number;
  balance_after: number;
  reason: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export interface AdminAIService {
  id: string;
  service_key: string;
  service_name: string;
  provider: string;
  model_name: string;
  status: 'active' | 'degraded' | 'maintenance' | 'disabled';
  daily_request_budget: number;
  monthly_spend_limit_usd: number;
  latency_ms: number;
  total_requests_count: number;
  failed_requests_count: number;
  estimated_spend_usd: number;
  api_key_masked: string;
  is_enabled: boolean;
  updated_at: string;
}

export interface AdminProcessingJob {
  id: string;
  project_id: string;
  source_video_id?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  stage: string;
  progress_percentage: number;
  target_clip_count: number;
  preferred_duration_seconds: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  project_name: string;
  user_id?: string;
  owner_email?: string;
  owner_name?: string;
}

export interface PlatformAnnouncement {
  id: string;
  title: string;
  message: string;
  type: 'general' | 'maintenance' | 'release' | 'service_update';
  priority: 'low' | 'normal' | 'high' | 'critical';
  target_audience: 'all' | 'free_only' | 'paid_only' | 'enterprise_only';
  is_active: boolean;
  start_date?: string;
  expires_at?: string;
  created_by?: string;
  author_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_email: string;
  admin_role: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address: string;
  created_at: string;
}

export interface PlatformSettings {
  id?: string;
  platform_name: string;
  logo_url: string;
  support_email: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  registration_enabled: boolean;
  default_free_credits: number;
  feature_flags: Record<string, boolean>;
  supported_resolutions: string[];
  supported_framerates: string[];
  ai_costs_config?: Record<string, number>;
  updated_by?: string;
  updated_at?: string;
}

export interface SystemHealthReport {
  overall_status: 'healthy' | 'degraded';
  checked_at: string;
  services: {
    database: {
      status: string;
      engine: string;
      latency_ms: number;
      integrity: string;
      table_counts: Record<string, number>;
    };
    storage: {
      status: string;
      path?: string;
      total_gb?: number;
      used_gb?: number;
      free_gb?: number;
      percent_free?: number;
      error?: string;
    };
    queue: {
      status: string;
      active_workers: number;
      processing_jobs: number;
      queued_jobs: number;
      failed_24h: number;
    };
    ai_pipelines: {
      status: string;
      total_configured: number;
      active_services: number;
      avg_latency_ms: number;
    };
    youtube_api: {
      status: string;
      api_version: string;
      oauth_configured: boolean;
      daily_quota_used_pct: number;
    };
  };
}





