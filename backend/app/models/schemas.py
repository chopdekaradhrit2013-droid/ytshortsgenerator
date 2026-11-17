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
    status: Optional[ClipStatus] = None

class GeneratedClipResponse(GeneratedClipBase):
    id: str
    project_id: str
    source_video_id: str
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
    visibility: str = "public"
    scheduled_at: Optional[datetime] = None

class PublishingJobResponse(BaseModel):
    id: str
    project_id: str
    clip_id: str
    platform: str = "youtube"
    video_title: str
    video_description: Optional[str] = None
    tags: List[str] = []
    visibility: str
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    status: PublishingStatus = "waiting"
    progress_percentage: int = 0
    platform_video_id: Optional[str] = None
    platform_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime

# STATS SCHEMAS
class DashboardStatsResponse(BaseModel):
    total_projects: int
    total_clips_generated: int
    clips_ready_to_publish: int
    successfully_published: int
    storage_used_bytes: int
    connected_channel: Optional[Dict[str, Any]] = None
