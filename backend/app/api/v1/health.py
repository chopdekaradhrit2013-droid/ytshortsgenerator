import shutil
from fastapi import APIRouter
from backend.app.core.config import settings

router = APIRouter()

@router.get("/health")
def health_check():
    ffmpeg_available = bool(shutil.which(settings.FFMPEG_BIN))
    ffprobe_available = bool(shutil.which(settings.FFPROBE_BIN))
    
    return {
        "status": "healthy",
        "service": "AI Shorts Factory Backend",
        "version": "0.1.0",
        "integrations": {
            "ffmpeg": ffmpeg_available,
            "ffprobe": ffprobe_available,
            "supabase_configured": bool(settings.SUPABASE_URL and settings.SUPABASE_KEY),
            "youtube_oauth_configured": bool(settings.YOUTUBE_CLIENT_ID and settings.YOUTUBE_CLIENT_SECRET),
            "celery_broker": settings.CELERY_BROKER_URL.split("@")[-1] if "@" in settings.CELERY_BROKER_URL else settings.CELERY_BROKER_URL
        }
    }
