# 🎬 AI Shorts Factory

> **Personal AI-powered YouTube Shorts generation, editing and publishing platform.**
> Turn long videos (podcasts, gaming streams, interviews, and masterclasses) into high-retention viral YouTube Shorts, edit them in a built-in multi-track video studio, and publish them with one click.

---

## ⚡ Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │    AI Shorts Factory Web Application         │
                      │  Next.js 14 (App Router) + TypeScript        │
                      │  Tailwind CSS + Lucide Icons + Dark Theme    │
                      └──────────────────────┬───────────────────────┘
                                             │ REST / WebSocket
                      ┌──────────────────────▼───────────────────────┐
                      │    FastAPI Python Video Engine               │
                      │  Pydantic Schemas + Modular API Routers      │
                      └──────┬───────────────────────────────┬───────┘
                             │                               │
              ┌──────────────▼───────────────┐ ┌─────────────▼───────────────┐
              │ FFmpeg / FFprobe Media Core  │ │ Celery + Redis Async Tasks  │
              │ - 9:16 Smart Vertical Crop   │ │ - Whisper Speech-to-Text    │
              │ - Subtitle / Caption Burner  │ │ - AI Virality Hook Scorer   │
              │ - Audio Denoise & Ducking    │ │ - YouTube Publishing Queue  │
              └──────────────────────────────┘ └─────────────────────────────┘
                             │                               │
              ┌──────────────▼───────────────┐ ┌─────────────▼───────────────┐
              │ Supabase PostgreSQL DB       │ │ YouTube Data API v3         │
              │ - RLS security policies      │ │ - OAuth 2.0 Auth Flow       │
              │ - Projects, Clips, Timeline  │ │ - Direct Shorts Uploader    │
              └──────────────────────────────┘ └─────────────────────────────┘
```

---

## 🚀 Key Features

1. **Dashboard:**
   - Real-time statistics: Total projects, clips generated, ready to publish, and published shorts.
   - Hero banner with quick start actions.
   - Processing activity feed and recent projects shelf.

2. **Project Creation Workflow:**
   - Drag-and-drop source video upload (MP4, MOV, WebM).
   - Category-specific hook extraction (Podcast, Gaming, Interview, Entertainment).
   - Target clip count and duration sliders.
   - Source validation and instant video preview.

3. **My Projects Library:**
   - Grid and List views with search and multi-status filtering.
   - Project lifecycle states (`draft`, `uploading`, `analysing`, `processing`, `completed`, `failed`).

4. **AI Clip Generator & Moments Analyzer:**
   - Multi-step pipeline tracker: Audio Transcription (Whisper), Hook & Virality Analysis, 9:16 Framing, Render Engine.
   - AI engagement score badges (e.g. 96% Viral tier).
   - Detailed virality reasoning for every detected segment.
   - Bulk selection and batch publish actions.

5. **Dedicated Video Editing Studio:**
   - **Left Panel:** Media library, imported videos, generated clips, trending background audio, and caption presets.
   - **Center Canvas:** 9:16 mobile canvas frame, live video player synced with playhead, kinetic Hormozi caption overlay, resolution switchers, and speed controls.
   - **Right Panel:** Framing and crop modes (Center, Blurred BG, Fit), video scale/opacity, caption typography & animation, audio denoise/ducking, and LUT color filters.
   - **Multi-Track Timeline:** Video track, Audio track, and Text track with trim handles, playhead scrubbing, split tool (`S`), and zoom ruler.
   - **Render Engine:** FFmpeg pipeline compilation modal.

6. **Publishing Centre:**
   - Connect YouTube Account button with live status badge and subscriber count.
   - Video title and description formatting (with automatic `#Shorts` tagging).
   - Visibility settings (Public, Unlisted, Private).
   - Scheduled release calendar.
   - Individual upload and batch upload queue with progressive status tracking (`Waiting` → `Uploading` → `Processing` → `Published`).

7. **Upload History:**
   - Chronological audit log of published Shorts with live view count, likes, comments, and direct YouTube links.

8. **Settings & Preferences:**
   - Profile, YouTube OAuth settings, editing defaults, Hormozi caption customization, FFmpeg export profile, and storage quota manager.

---

## 🛠️ Technology Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide Icons, clsx, tailwind-merge
- **Backend:** Python 3.11+, FastAPI, Uvicorn, Pydantic v2
- **Database:** Supabase / PostgreSQL 15 with Row-Level Security (RLS)
- **Background Jobs:** Celery, Redis
- **Media Engine:** FFmpeg & FFprobe

---

## 📦 Getting Started

### 1. Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- FFmpeg installed (`brew install ffmpeg` on macOS, or `apt install ffmpeg` on Linux)
- Redis (optional for background workers)

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will start at **http://localhost:3000**.

### 3. Backend Setup
```bash
# In the root directory or backend directory
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# Run the FastAPI server
uvicorn backend.app.main:app --reload --port 8000
```
The backend API docs will be available at **http://localhost:8000/docs**.

### 4. Database Setup (Supabase)
Run the provided SQL migrations in your Supabase SQL Editor:
1. `supabase/migrations/20261117_initial_schema.sql` (Creates tables, triggers, enums, RLS policies)
2. `supabase/seed.sql` (Inserts realistic demo profile, projects, and connected channel)

---

## 🔐 Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend URL for client-side API requests (`http://localhost:8000/api/v1`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase Anon Key |
| `YOUTUBE_CLIENT_ID` | Google OAuth Client ID for YouTube Data API v3 |
| `YOUTUBE_CLIENT_SECRET` | Google OAuth Client Secret |
| `REDIS_URL` | Redis instance connection string |
| `FFMPEG_BIN` | Path to FFmpeg executable (default: `ffmpeg`) |

---

## 📜 Database Schema

The database consists of 7 interconnected tables with Row-Level Security enabled:

- `profiles` — User account, tier preferences, storage quota.
- `connected_accounts` — YouTube OAuth credentials, channel ID, subscribers.
- `projects` — Long-form video source projects, category, status.
- `source_videos` — Raw video file metadata, transcription status, Whisper JSON.
- `generated_clips` — AI-detected segments, engagement scores, virality reasons, 9:16 framing.
- `editing_sessions` — Studio multi-track timeline states, cuts, text items, canvas settings.
- `publishing_jobs` — YouTube upload queue, visibility, schedule timestamps, platform IDs.

---

## 📝 License
Proprietary & Confidential — Built for personal creator studio use.
