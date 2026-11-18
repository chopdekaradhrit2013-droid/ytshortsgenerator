import os
import shutil
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings

def resolve_binary(bin_name: str) -> str:
    """Find binary from environment, venv, static_ffmpeg, or PATH."""
    env_bin = os.getenv(f"{bin_name.upper()}_BIN")
    if env_bin and shutil.which(env_bin):
        return env_bin
    
    # Check venv/bin
    venv_bin = Path(__file__).resolve().parents[3] / "venv" / "bin" / bin_name
    if venv_bin.exists():
        return str(venv_bin)
        
    # Check static_ffmpeg
    try:
        import static_ffmpeg
        static_ffmpeg.add_paths()
        found = shutil.which(bin_name)
        if found:
            return found
    except Exception:
        pass
        
    # Fallback to system which
    system_found = shutil.which(bin_name)
    return system_found or bin_name

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
    
    # Database Configuration (SQLite default for reliable zero-loss local state, Supabase if configured)
    DATABASE_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../shorts_factory.db"))
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: Optional[str] = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # Redis & Celery
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
    
    # Media Storage & Directories
    MEDIA_STORAGE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../media_storage"))
    FFMPEG_BIN: str = resolve_binary("ffmpeg")
    FFPROBE_BIN: str = resolve_binary("ffprobe")
    
    # YouTube Data API Credentials
    YOUTUBE_CLIENT_ID: Optional[str] = os.getenv("YOUTUBE_CLIENT_ID", "")
    YOUTUBE_CLIENT_SECRET: Optional[str] = os.getenv("YOUTUBE_CLIENT_SECRET", "")
    YOUTUBE_REDIRECT_URI: str = os.getenv("YOUTUBE_REDIRECT_URI", "http://localhost:3000/api/auth/youtube/callback")
    
    # AI & Speech-to-Text Services
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", "")
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY", "")
    STABILITY_API_KEY: Optional[str] = os.getenv("STABILITY_API_KEY", "")

    # SaaS Authentication & Payment Security
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "shorts_factory_jwt_secret_key_secure_2026_xyz987")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "43200")) # 30 days
    PAYMENT_WEBHOOK_SECRET: str = os.getenv("PAYMENT_WEBHOOK_SECRET", "whsec_shorts_factory_secret_2026_safe")

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure media directory exists
os.makedirs(settings.MEDIA_STORAGE_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.MEDIA_STORAGE_DIR, "uploads"), exist_ok=True)
os.makedirs(os.path.join(settings.MEDIA_STORAGE_DIR, "audio"), exist_ok=True)
os.makedirs(os.path.join(settings.MEDIA_STORAGE_DIR, "clips"), exist_ok=True)
os.makedirs(os.path.join(settings.MEDIA_STORAGE_DIR, "thumbnails"), exist_ok=True)
os.makedirs(os.path.join(settings.MEDIA_STORAGE_DIR, "keyframes"), exist_ok=True)
os.makedirs(os.path.join(settings.MEDIA_STORAGE_DIR, "exports"), exist_ok=True)
os.makedirs(os.path.join(settings.MEDIA_STORAGE_DIR, "captions"), exist_ok=True)
os.makedirs(os.path.join(settings.MEDIA_STORAGE_DIR, "music"), exist_ok=True)
