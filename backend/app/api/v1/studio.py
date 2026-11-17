import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from backend.app.models.schemas import EditingSessionSave, EditingSessionResponse

router = APIRouter()

DEMO_SESSIONS: Dict[str, Dict[str, Any]] = {
    "default": {
        "id": "sess-default-1",
        "project_id": "11111111-1111-1111-1111-111111111111",
        "clip_id": "c1111111-1111-1111-1111-111111111111",
        "version": 1,
        "timeline_data": {
            "zoom": 1.0,
            "currentTime": 0.0,
            "duration": 45.5,
            "tracks": [
                {
                    "id": "v1",
                    "type": "video",
                    "name": "Video Track",
                    "muted": False,
                    "locked": False,
                    "items": [
                        {
                            "id": "item-v1",
                            "title": "Main Clip Segment",
                            "start_time": 0.0,
                            "end_time": 45.5,
                            "source_start": 142.5,
                            "source_end": 188.0,
                            "properties": {"opacity": 1.0, "scale": 1.0, "crop": "9:16"}
                        }
                    ]
                },
                {
                    "id": "a1",
                    "type": "audio",
                    "name": "Original Audio",
                    "muted": False,
                    "locked": False,
                    "items": [
                        {
                            "id": "item-a1",
                            "title": "Voice Audio",
                            "start_time": 0.0,
                            "end_time": 45.5,
                            "source_start": 142.5,
                            "source_end": 188.0,
                            "properties": {"volume": 100, "denoise": True}
                        }
                    ]
                },
                {
                    "id": "t1",
                    "type": "text",
                    "name": "Dynamic Captions",
                    "muted": False,
                    "locked": False,
                    "items": [
                        {
                            "id": "item-t1",
                            "title": "Hook Caption",
                            "start_time": 0.0,
                            "end_time": 4.5,
                            "text_content": "Most people think AGI is 20 years away...",
                            "properties": {"fontFamily": "Inter", "color": "#FFFFFF", "highlight": "#FACC15", "fontSize": 26}
                        },
                        {
                            "id": "item-t2",
                            "title": "Body Caption",
                            "start_time": 4.5,
                            "end_time": 18.0,
                            "text_content": "Here is what top researchers are really saying behind closed doors.",
                            "properties": {"fontFamily": "Inter", "color": "#FFFFFF", "highlight": "#38BDF8", "fontSize": 24}
                        }
                    ]
                }
            ]
        },
        "canvas_settings": {
            "aspectRatio": "9:16",
            "width": 1080,
            "height": 1920,
            "backgroundColor": "#000000"
        },
        "updated_at": datetime.now()
    }
}

@router.get("/session/{project_id}", response_model=EditingSessionResponse)
def get_session(project_id: str, clip_id: Optional[str] = None):
    key = f"{project_id}_{clip_id or 'main'}"
    if key in DEMO_SESSIONS:
        return DEMO_SESSIONS[key]
    
    # Return default template initialized for this project
    session = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "clip_id": clip_id,
        "version": 1,
        "timeline_data": DEMO_SESSIONS["default"]["timeline_data"],
        "canvas_settings": DEMO_SESSIONS["default"]["canvas_settings"],
        "updated_at": datetime.now()
    }
    DEMO_SESSIONS[key] = session
    return session

@router.post("/session/{project_id}", response_model=EditingSessionResponse)
def save_session(project_id: str, payload: EditingSessionSave):
    key = f"{project_id}_{payload.clip_id or 'main'}"
    existing = DEMO_SESSIONS.get(key, {})
    new_version = existing.get("version", 0) + 1
    
    saved = {
        "id": existing.get("id", str(uuid.uuid4())),
        "project_id": project_id,
        "clip_id": payload.clip_id,
        "version": new_version,
        "timeline_data": payload.timeline_data.model_dump(),
        "canvas_settings": payload.canvas_settings,
        "updated_at": datetime.now()
    }
    DEMO_SESSIONS[key] = saved
    return saved
