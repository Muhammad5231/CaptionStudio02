# CaptionStudio — Professional AI Caption Generator Web App

> **Powerful Engine + Extremely Simple Interface**  
> Simple Outside • Sophisticated Inside

CaptionStudio is a modern AI-powered video captioning application designed for content creators, podcasters, educators, and social media producers. It follows the principle of **Progressive Disclosure**: beginners can upload a video, generate captions with OpenAI Whisper, select an animated style preset, and export high-definition video in seconds—without needing to configure FFmpeg flags, safe zones, or typography parameters.

---

## ⚡ Core Philosophy & 3-Step Journey

```text
1. Upload Video ──────────► 2. Choose Caption Style ──────────► 3. Export
 (MP4, MOV, WebM)             (Modern, Bold, Minimal,             (Burned-in 1080p MP4
  or SRT/VTT Subtitles         Viral, Cinematic, Clean)            with Active Animations)
```

---

## 🌟 Key Capabilities

1. **AI Speech-to-Text with Frame-Accurate Word Timestamps**:
   - `TranscriptionProvider` architecture powered by `openai-whisper`.
   - Word-level timing detection and intelligent speech grouping.
2. **Subtitle Import & Normalization**:
   - Upload `.srt`, `.vtt`, or `.txt` files with automatic word-timing interpolation.
3. **Progressive Disclosure Customization**:
   - **One-Click Presets**: Modern, Bold, Minimal, Viral, Cinematic, Clean.
   - **Customize Drawer**: Fast adjustments for Text, Word Highlight (Color, Pill Box, Scale, Underline, Glow), Animation (None, Smooth, Pop, Bounce, Wave), Position (Top, Center, Bottom), and Backgrounds.
   - **Advanced Drawer**: Progressive disclosure for Letter Spacing, Line Height, Outline Thickness, Drop Shadow, and Max Words Per Line.
4. **Interactive 60fps Video Preview**:
   - Ultra-smooth requestAnimationFrame playback sync with active-word animations.
   - Clickable timeline scrub bar with caption segment cue indicators.
5. **Timeline & Transcript Editor**:
   - Inline text editing, single-click play from any segment, split segment, merge with next, and delete.
   - Full keyboard shortcut support: `Ctrl + Z` (Undo), `Ctrl + Shift + Z` (Redo), `Space` (Play/Pause).
6. **Authoritative FFmpeg & Python Render Engine**:
   - Generates Advanced SubStation Alpha (ASS) scripts matching browser styling.
   - Burns in captions with FFmpeg 7.1 `libass` and `libx264` up to 1080p Full HD.
   - Background export job manager tracking live percentage progress (`0%` → `100%`).
7. **AI Auto Style**:
   - Recommends tailored styles based on content themes (Motivational, Podcast, Gaming, Educational, Social, Cinematic).
8. **1-Click Test Drive**:
   - Bundled sample video generator allows instant test drives without requiring local video files.

---

## 🛠 Tech Stack

- **Backend**:
  - Python 3.11+
  - FastAPI & Pydantic v2
  - OpenAI Whisper & PyTorch
  - FFmpeg 7.1 + libass (bundled via `imageio_ffmpeg` or system PATH)
  - OpenCV & Pillow
  - SQLite (with easy path to PostgreSQL)
- **Frontend**:
  - React 18 / 19 + TypeScript
  - Vite
  - Tailwind CSS v4
  - Lucide Icons
  - Zustand State Management

---

## 🚀 Quick Start Guide

### 1. Requirements
- Python 3.11+ (installed)
- Node.js 18+ and npm (installed)
- FFmpeg (automatically detected via system PATH or `imageio_ffmpeg`)

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```

Open your browser to: **`http://localhost:5173`** (or **`http://127.0.0.1:8000`** when running the production bundle).

---

## 🧪 Running Automated Tests

Run backend tests:
```bash
python -m pytest backend/tests/test_api.py -v
```

Run frontend build check:
```bash
cd frontend
npm run build
```

---

## 📁 Project Structure

```text
CaptionStudio/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI entry point & routes
│   │   ├── core/                       # App settings, DB engine, FFmpeg locator
│   │   ├── models/                     # Project, ExportJob, Template models
│   │   ├── schemas/                    # Pydantic validation schemas
│   │   ├── services/
│   │   │   ├── transcription/          # WhisperProvider with word timestamps
│   │   │   ├── subtitle_parser/        # SRT, VTT, TXT parser with timing interpolation
│   │   │   ├── grouping/               # Intelligent phrase & sentence grouping
│   │   │   ├── styling/                # Presets (Modern, Viral, etc.) & Templates
│   │   │   ├── rendering/              # ASS subtitle generator
│   │   │   ├── ffmpeg/                 # Video probe & burning engine
│   │   │   └── projects/               # Project CRUD & Background Job Manager
│   │   └── api/                        # REST endpoints for projects, upload, export, demo
│   ├── storage/                        # Uploads, thumbnails, renders, samples
│   ├── tests/                          # Automated test suite
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/                 # Preview, styles, timeline, customize, export, upload
│   │   ├── pages/                      # LandingPage, DashboardPage, EditorPage
│   │   ├── store/                      # Zustand state store with undo/redo
│   │   ├── services/                   # API client
│   │   └── types/                      # TypeScript definitions
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
│
└── README.md
```

