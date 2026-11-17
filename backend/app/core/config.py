import os
from typing import List, Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Shorts Factory"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]
    
    # Supabase Configuration
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: Optional[str] = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # Redis & Celery
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
    
    # FFmpeg & Media Storage
    MEDIA_STORAGE_DIR: str = os.getenv("MEDIA_STORAGE_DIR", "/tmp/shorts_factory_media")
    FFMPEG_BIN: str = os.getenv("FFMPEG_BIN", "ffmpeg")
    FFPROBE_BIN: str = os.getenv("FFPROBE_BIN", "ffprobe")
    
    # YouTube Data API Credentials
    YOUTUBE_CLIENT_ID: Optional[str] = os.getenv("YOUTUBE_CLIENT_ID", "")
    YOUTUBE_CLIENT_SECRET: Optional[str] = os.getenv("YOUTUBE_CLIENT_SECRET", "")
    YOUTUBE_REDIRECT_URI: str = os.getenv("YOUTUBE_REDIRECT_URI", "http://localhost:3000/api/auth/youtube/callback")
    
    # AI & Speech-to-Text Services (e.g. OpenAI Whisper / Gemini 1.5)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", "")

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()
