import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.api.v1 import health, projects, clips, studio, publishing, settings as settings_api

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="High-performance backend API for AI Shorts Factory: video segmentation, timeline editing, and YouTube publishing.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows dev and prod frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(health.router, prefix=settings.API_V1_STR, tags=["Health"])
app.include_router(projects.router, prefix=f"{settings.API_V1_STR}/projects", tags=["Projects"])
app.include_router(clips.router, prefix=f"{settings.API_V1_STR}/clips", tags=["Clips"])
app.include_router(studio.router, prefix=f"{settings.API_V1_STR}/studio", tags=["Studio"])
app.include_router(publishing.router, prefix=f"{settings.API_V1_STR}/publishing", tags=["Publishing"])
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
