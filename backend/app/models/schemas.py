from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# ENUMS & CONSTANTS
ProjectStatus = str  # 'draft', 'uploading', 'analysing', 'processing', 'completed', 'failed'
VideoCategory = str  # 'automatic', 'gaming', 'podcast', 'entertainment', 'interview', 'other'
ClipStatus = str     # 'detected', 'rendering', 'ready', 'failed'
PublishingStatus = str # 'waiting', 'uploading', 'processing', 'published', 'failed'

# PROJECT SCHEMAS
class ProjectBase(BaseModel):
    name: str = Field(..., example="AI Tech Trends Breakdown")
    description: Optional[str] = None
    category: VideoCategory = "automatic"
    target_clip_count: int = Field(default=10, ge=1, le=30)
    preferred_duration_seconds: int = Field(default=45, ge=15, le=60)
    tags: List[str] = []

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    category: Optional[VideoCategory] = None
    target_clip_count: Optional[int] = None
    preferred_duration_seconds: Optional[int] = None
    tags: Optional[List[str]] = None

class ProjectResponse(ProjectBase):
    id: str
    user_id: Optional[str] = None
    status: ProjectStatus = "draft"
    created_at: datetime
    updated_at: datetime
    source_video_id: Optional[str] = None
    clip_count: int = 0
    metadata: Dict[str, Any] = {}

    class Config:
        from_attributes = True

# SOURCE VIDEO SCHEMAS
class SourceVideoBase(BaseModel):
    original_filename: str
    file_size_bytes: int
    duration_seconds: Optional[float] = None
    resolution_width: Optional[int] = None
    resolution_height: Optional[int] = None
    mime_type: str = "video/mp4"
    thumbnail_url: Optional[str] = None

class SourceVideoCreate(SourceVideoBase):
    project_id: str
    storage_path: str

class SourceVideoResponse(SourceVideoBase):
    id: str
    project_id: str
    storage_path: str
    transcription_status: str = "pending"
    created_at: datetime

# GENERATED CLIP SCHEMAS
class GeneratedClipBase(BaseModel):
    title: str
    summary: Optional[str] = None
    hook_sentence: Optional[str] = None
    start_time: float
    end_time: float
    engagement_score: int = Field(default=85, ge=0, le=100)
    virality_reasons: List[str] = []
    tags: List[str] = []
    aspect_ratio: str = "9:16"
    resolution_width: int = 1080
    resolution_height: int = 1920
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    captions_style: Dict[str, Any] = {}
    caption_preset: Optional[str] = "bold_pop"
    export_with_captions: Optional[bool] = True
    caption_placement: Optional[str] = "auto"
    caption_language: Optional[str] = "en"
    export_status: Optional[str] = "draft"
    export_video_url: Optional[str] = None
    is_edited: Optional[bool] = False
    moment_type: Optional[str] = "interesting_fact"
    ranking_badge: Optional[str] = "Best Overall"
    hook_style: Optional[str] = "Curiosity Gap"
    alternative_hooks: Optional[List[Dict[str, Any]]] = []
    speaker_analysis: Optional[Dict[str, Any]] = {}
    context_analysis: Optional[Dict[str, Any]] = {}
    explanation_breakdown: Optional[Dict[str, Any]] = {}
    similarity_info: Optional[Dict[str, Any]] = {}
    is_duplicate_or_similar: Optional[bool] = False
    hook_suggestions: Optional[List[Dict[str, Any]]] = []
    selected_hook: Optional[str] = None
    reframing_config: Optional[Dict[str, Any]] = {}

class GeneratedClipCreate(GeneratedClipBase):
    project_id: str
    source_video_id: str

class GeneratedClipUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    hook_sentence: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    captions_style: Optional[Dict[str, Any]] = None
    caption_preset: Optional[str] = None
    export_with_captions: Optional[bool] = None
    caption_placement: Optional[str] = None
    caption_language: Optional[str] = None
    aspect_ratio: Optional[str] = None
    is_edited: Optional[bool] = None
    status: Optional[ClipStatus] = None

class BulkClipsActionRequest(BaseModel):
    clip_ids: List[str]

class BulkClipsActionResponse(BaseModel):
    success: bool
    affected_count: int
    message: str
    job_ids: Optional[List[str]] = []

# CAPTIONS & SUBTITLES SCHEMAS
class CaptionWord(BaseModel):
    id: str
    word: str
    start: float
    end: float
    emphasis: bool = False
    speaker: Optional[str] = "Speaker 1"

class CaptionSegment(BaseModel):
    id: str
    start: float
    end: float
    text: str
    speaker: Optional[str] = "Speaker 1"
    words: List[CaptionWord] = []

class ClipCaptionsResponse(BaseModel):
    clip_id: str
    language: str = "en"
    caption_preset: str = "bold_pop"
    caption_placement: str = "auto"
    export_with_captions: bool = True
    custom_overrides: Dict[str, Any] = {}
    segments: List[CaptionSegment] = []

class ClipCaptionsUpdate(BaseModel):
    caption_preset: Optional[str] = None
    caption_placement: Optional[str] = None
    export_with_captions: Optional[bool] = None
    custom_overrides: Optional[Dict[str, Any]] = None
    segments: Optional[List[CaptionSegment]] = None

class ClipCaptionsRegenerateRequest(BaseModel):
    language: str = "en"
    words_per_line: Optional[int] = 4

class GeneratedClipResponse(GeneratedClipBase):
    id: str
    project_id: str
    source_video_id: Optional[str] = None
    duration_seconds: float
    status: ClipStatus = "ready"
    created_at: datetime
    updated_at: datetime

# STUDIO EDITING SCHEMAS
class TimelineTrackItem(BaseModel):
    id: str
    clip_id: Optional[str] = None
    title: str
    start_time: float
    end_time: float
    source_start: float = 0
    source_end: float = 0
    text_content: Optional[str] = None
    properties: Dict[str, Any] = {}

class TimelineTrack(BaseModel):
    id: str
    type: str # 'video', 'audio', 'text'
    name: str
    muted: bool = False
    locked: bool = False
    items: List[TimelineTrackItem] = []

class TimelineData(BaseModel):
    zoom: float = 1.0
    current_time: float = 0.0
    duration: float = 60.0
    tracks: List[TimelineTrack] = []

class EditingSessionSave(BaseModel):
    clip_id: Optional[str] = None
    timeline_data: TimelineData
    canvas_settings: Dict[str, Any] = {}

class EditingSessionResponse(BaseModel):
    id: str
    project_id: str
    clip_id: Optional[str] = None
    version: int = 1
    timeline_data: Dict[str, Any]
    canvas_settings: Dict[str, Any]
    updated_at: datetime

# PUBLISHING SCHEMAS
class PublishingJobCreate(BaseModel):
    project_id: str
    clip_id: str
    connected_account_id: Optional[str] = None
    video_title: str
    video_description: Optional[str] = None
    tags: List[str] = []
    hashtags: List[str] = []
    visibility: str = "public"
    made_for_kids: bool = False
    thumbnail_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None

class PublishingJobUpdate(BaseModel):
    video_title: Optional[str] = None
    video_description: Optional[str] = None
    tags: Optional[List[str]] = None
    hashtags: Optional[List[str]] = None
    visibility: Optional[str] = None
    made_for_kids: Optional[bool] = None
    scheduled_at: Optional[datetime] = None
    status: Optional[str] = None

class PublishingJobResponse(BaseModel):
    id: str
    project_id: str
    clip_id: str
    connected_channel_id: Optional[str] = None
    platform: str = "youtube"
    video_title: str
    video_description: Optional[str] = None
    tags: List[str] = []
    hashtags: List[str] = []
    visibility: str = "public"
    made_for_kids: bool = False
    thumbnail_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    status: str = "waiting"
    progress_percentage: int = 0
    upload_speed_mbps: float = 0.0
    estimated_remaining_seconds: float = 0.0
    platform_video_id: Optional[str] = None
    platform_url: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

class ConnectedChannelResponse(BaseModel):
    id: str
    platform: str = "youtube"
    channel_title: str
    channel_id: str
    subscriber_count: int = 0
    avatar_url: Optional[str] = None
    is_connected: bool = True
    created_at: datetime

class ConnectHandleRequest(BaseModel):
    channel_identifier: str
    custom_title: Optional[str] = None
    custom_subscribers: Optional[int] = None
    custom_avatar_url: Optional[str] = None

class OAuthConfigureRequest(BaseModel):
    client_id: str
    client_secret: str

class SEOMetadataSuggestRequest(BaseModel):
    clip_id: str
    category: Optional[str] = "general"

class SEOMetadataSuggestResponse(BaseModel):
    titles: List[str]
    description: str
    hashtags: List[str]
    tags: List[str]
    category_id: str = "22"

class BatchPublishRequest(BaseModel):
    clip_ids: List[str]
    visibility: str = "public"
    made_for_kids: bool = False
    schedule_interval_minutes: Optional[int] = None
    start_schedule_at: Optional[datetime] = None

# STATS SCHEMAS
class DashboardStatsResponse(BaseModel):
    total_projects: int
    total_clips_generated: int
    clips_ready_to_publish: int
    successfully_published: int
    storage_used_bytes: int
    connected_channel: Optional[Dict[str, Any]] = None

# =============================================================================
# PROMPT 12: THUMBNAIL STUDIO & PACKAGING SCHEMAS
# =============================================================================

class ExtractFramesRequest(BaseModel):
    video_path: Optional[str] = None
    clip_id: Optional[str] = None
    project_id: Optional[str] = None
    start_time: float = 0.0
    duration: float = 15.0
    count: int = 6

class SuggestThumbnailTextRequest(BaseModel):
    title: Optional[str] = ""
    hook: Optional[str] = ""
    transcript: Optional[str] = ""
    niche: Optional[str] = "general"
    count: int = 6

class RenderThumbnailRequest(BaseModel):
    base_image_path: Optional[str] = None
    canvas_data: Dict[str, Any]
    aspect_ratio: str = "9:16"
    width: Optional[int] = 1080
    height: Optional[int] = 1920
    output_filename: Optional[str] = None

class AnalyzeThumbnailQualityRequest(BaseModel):
    image_path: Optional[str] = None
    image_url: Optional[str] = None
    canvas_data: Dict[str, Any]
    context_title: Optional[str] = ""
    context_transcript: Optional[str] = ""

class ThumbnailDesignSaveRequest(BaseModel):
    id: Optional[str] = None
    project_id: Optional[str] = None
    clip_id: Optional[str] = None
    title: str = "Untitled Thumbnail"
    aspect_ratio: str = "9:16"
    width: int = 1080
    height: int = 1920
    source_frame_path: Optional[str] = None
    rendered_image_url: Optional[str] = None
    template_id: Optional[str] = None
    canvas_data: Dict[str, Any]
    quality_score: int = 85
    quality_report: Optional[Dict[str, Any]] = None
    is_favorite: bool = False

class ThumbnailTemplateSaveRequest(BaseModel):
    id: Optional[str] = None
    name: str
    category: str = "viral_shorts"
    aspect_ratio: str = "9:16"
    description: Optional[str] = None
    preview_image_url: Optional[str] = None
    canvas_data: Dict[str, Any]

class ApplyThumbnailToClipRequest(BaseModel):
    rendered_image_url: str
    design_id: Optional[str] = None

# =============================================================================
# PROMPT 13: SAAS USER ACCOUNTS, SUBSCRIPTIONS & USAGE MANAGEMENT
# =============================================================================

class UserRegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    username: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: str
    password: str

class GoogleAuthRequest(BaseModel):
    email: str
    name: str
    avatar_url: Optional[str] = None
    id_token: Optional[str] = None

class VerifyEmailRequest(BaseModel):
    token: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    username: Optional[str] = None

class OnboardingRequest(BaseModel):
    niche: str
    primary_goal: Optional[str] = "Grow YouTube Shorts channel"
    target_duration_sec: Optional[int] = 45
    preferred_caption_style: Optional[str] = "hormozi"
    topics: Optional[List[str]] = []

class CreateCheckoutRequest(BaseModel):
    plan_id: str
    billing_interval: Optional[str] = "monthly"

class ConfirmPaymentRequest(BaseModel):
    session_id: str
    signature: str
    plan_id: str
    billing_interval: str
    amount: float
    timestamp: int
    payment_method_last4: Optional[str] = "4242"
    payment_method_brand: Optional[str] = "visa"

class AdminUpdatePlanRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_monthly: Optional[float] = None
    price_yearly: Optional[float] = None
    monthly_video_minutes: Optional[int] = None
    monthly_clips_limit: Optional[int] = None
    monthly_ai_analysis_limit: Optional[int] = None
    monthly_thumbnails_limit: Optional[int] = None
    monthly_exports_limit: Optional[int] = None
    included_features: Optional[List[str]] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None

class CheckPermissionRequest(BaseModel):
    feature: Optional[str] = None
    metric: Optional[str] = None
    amount: Optional[float] = 1.0

class CancelSubscriptionRequest(BaseModel):
    at_period_end: Optional[bool] = True



