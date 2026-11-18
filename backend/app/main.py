import os
import time
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.core.config import settings
from backend.app.api.v1 import (
    health, projects, clips, studio, publishing,
    settings as settings_api, analysis, exports, analytics, intelligence, reframing, thumbnails,
    auth, billing, usage, users, admin
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="High-performance backend API for AI Shorts Factory: video ingestion, Whisper transcription, AI highlight detection, and YouTube publishing.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_and_maintenance_middleware(request: Request, call_next):
    start_time = time.time()
    
    # Check maintenance mode for API routes (bypass health, admin, docs, static media)
    path = request.url.path
    is_exempt = (
        path.startswith(f"{settings.API_V1_STR}/health") or
        path.startswith(f"{settings.API_V1_STR}/admin") or
        path.startswith("/docs") or
        path.startswith("/redoc") or
        path.startswith("/openapi.json") or
        path.startswith("/media") or
        path == "/"
    )
    
    if not is_exempt:
        try:
            from backend.app.core.database import get_db_connection
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("SELECT maintenance_mode, maintenance_message FROM platform_settings WHERE id = 'singleton_settings';")
            row = cur.fetchone()
            conn.close()
            if row and row["maintenance_mode"] == 1:
                msg = row["maintenance_message"] or "System is under maintenance. Please try again later."
                return JSONResponse(
                    status_code=503,
                    content={"detail": msg, "maintenance": True}
                )
        except Exception:
            pass
            
    response = await call_next(request)
    
    # Production Security & Performance Headers
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    return response

# Serve rendered video previews, thumbnails and keyframes
os.makedirs(settings.MEDIA_STORAGE_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.MEDIA_STORAGE_DIR), name="media")

# API Routers
app.include_router(health.router, prefix=settings.API_V1_STR, tags=["Health"])
app.include_router(projects.router, prefix=f"{settings.API_V1_STR}/projects", tags=["Projects"])
app.include_router(clips.router, prefix=f"{settings.API_V1_STR}/clips", tags=["Clips"])
app.include_router(analysis.router, prefix=f"{settings.API_V1_STR}/analysis", tags=["Analysis"])
app.include_router(exports.router, prefix=f"{settings.API_V1_STR}/exports", tags=["Exports"])
app.include_router(studio.router, prefix=f"{settings.API_V1_STR}/studio", tags=["Studio"])
app.include_router(publishing.router, prefix=f"{settings.API_V1_STR}/publishing", tags=["Publishing"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Analytics"])
app.include_router(intelligence.router, prefix=f"{settings.API_V1_STR}/intelligence", tags=["Content Intelligence"])
app.include_router(reframing.router, prefix=f"{settings.API_V1_STR}/reframing", tags=["Auto Reframing & Tracking"])
app.include_router(thumbnails.router, prefix=settings.API_V1_STR, tags=["Thumbnail Studio & Packaging"])
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication & Accounts"])
app.include_router(billing.router, prefix=f"{settings.API_V1_STR}/billing", tags=["Billing & Subscriptions"])
app.include_router(usage.router, prefix=f"{settings.API_V1_STR}/usage", tags=["Usage & Credits"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["User Profiles & Notifications"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Super Admin & Platform Operations"])
app.include_router(settings_api.router, prefix=f"{settings.API_V1_STR}/settings", tags=["Settings"])

@app.get("/")
def root():
    return {
        "message": "Welcome to AI Shorts Factory API",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health"
    }

if __name__ == "__main__":
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
