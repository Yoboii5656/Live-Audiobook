# AI Audiobook Reader — Project Plan

## What We're Building

A web platform where a user uploads a PDF/book, reads it in the browser, and the AI **reads it aloud in real-time** alongside them — like a live audiobook. The narration stays in sync with whatever page the user is on. Everything runs **100% locally**, no external APIs, no subscriptions.

---

## Core Features

- Upload a PDF and render it in the browser
- AI narrates the current page automatically as the user reads
- Narration streams sentence by sentence (no waiting for full page audio)
- Play / Pause / Resume controls
- Adjustable reading speed
- Narration follows the user when they jump to a different page
- All processing happens on the user's machine — fully offline after setup

---

## AI Model: Kokoro-82M (TTS)

**Why Kokoro-82M:**
- Only ~86 MB — small enough to ship with the app
- Runs on CPU, no GPU required
- Apache 2.0 license — fully open source and free
- Natural, human-like narration voice (best quality-to-size ratio available in 2026)
- Supports streaming output — audio starts playing before the full sentence is generated

**Alternatives considered:**
| Model | Why Not Chosen |
|---|---|
| Piper TTS | Faster but sounds more robotic |
| Coqui XTTS-v2 | Great quality but non-commercial license |
| Chatterbox | Good but needs GPU, too heavy |

---

## Tech Stack

### Frontend
- **React + TypeScript** — main UI
- **PDF.js** — render PDF in browser, extract text page by page
- **Web Audio API** — play streamed TTS audio
- **WebSocket** — receive audio stream from backend in real-time

### Backend (Python)
- **FastAPI** — async API server with WebSocket support
- **Kokoro-82M** (via `kokoro` Python package) — TTS engine
- **PyMuPDF (fitz)** — extract text from PDF page by page

---

## Architecture

```
┌───────────────────────────────────────────┐
│              BROWSER (Frontend)            │
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │           PDF Viewer (PDF.js)        │  │
│  │                                     │  │
│  │   [Page 1]  [Page 2]  [Page 3] ...  │  │
│  │                                     │  │
│  │   Current page tracked on scroll    │  │
│  └──────────────────┬──────────────────┘  │
│                     │                     │
│  ┌──────────────────▼──────────────────┐  │
│  │         Audio Player Controls        │  │
│  │   ▶ Play  ⏸ Pause  🔊 Speed: 1x     │  │
│  └──────────────────┬──────────────────┘  │
│                     │ WebSocket           │
└─────────────────────┼─────────────────────┘
                      │
┌─────────────────────▼─────────────────────┐
│             BACKEND (FastAPI)              │
│                                           │
│  ┌──────────────┐    ┌─────────────────┐  │
│  │  PDF Service │    │   TTS Service   │  │
│  │  (PyMuPDF)   │───▶│  (Kokoro-82M)   │  │
│  │              │    │                 │  │
│  │  Extract     │    │  Text → Audio   │  │
│  │  text by     │    │  Streamed back  │  │
│  │  page        │    │  sentence by    │  │
│  └──────────────┘    │  sentence       │  │
│                      └─────────────────┘  │
└───────────────────────────────────────────┘
```

---

## How the Narration Works (Flow)

1. User uploads a PDF → backend extracts text for every page
2. User opens the reader → PDF renders in browser
3. User hits **Play** → frontend sends current page text to backend via WebSocket
4. Backend splits text into sentences → feeds each to Kokoro-82M
5. Kokoro streams audio chunks back through WebSocket
6. Browser plays audio continuously — smooth, real-time narration
7. When user scrolls to a new page → frontend signals backend → narration transitions to new page
8. User can pause/resume at any time; speed slider adjusts TTS rate

---

## Folder Structure

```
book-reader/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PDFViewer/         # PDF.js wrapper, page tracking
│   │   │   └── AudioPlayer/       # Play/Pause/Speed controls
│   │   ├── hooks/
│   │   │   ├── useAudioStream.ts  # WebSocket audio streaming logic
│   │   │   └── usePDFText.ts      # Extract current page text
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── main.py                    # FastAPI entry point
│   ├── routers/
│   │   ├── pdf.py                 # Upload & text extraction endpoint
│   │   └── tts.py                 # WebSocket TTS streaming endpoint
│   ├── services/
│   │   ├── pdf_service.py         # PyMuPDF logic
│   │   └── tts_service.py         # Kokoro-82M wrapper + sentence chunking
│   └── requirements.txt
│
└── project.md                     # This file
```

---

## API Design

### `POST /api/pdf/upload`
- Accepts: PDF file (multipart)
- Returns: `{ book_id, total_pages, pages: [{ page: 1, text: "..." }, ...] }`

### `WS /api/tts/stream`
- Client sends: `{ book_id, page_number, speed: 1.0 }`
- Server streams back: binary audio chunks (PCM/WAV)
- Client sends: `{ action: "pause" | "resume" | "stop" }` to control

---

## Build Phases

### Phase 1 — Project Setup (Day 1)
- [ ] Initialize React + Vite frontend
- [ ] Initialize FastAPI backend
- [ ] Basic project structure and routing
- [ ] Frontend and backend talking to each other

### Phase 2 — PDF Handling (Day 2-3)
- [ ] PDF upload endpoint (FastAPI + PyMuPDF)
- [ ] Extract and store text per page
- [ ] Render PDF in browser with PDF.js
- [ ] Track current visible page on scroll

### Phase 3 — TTS Narration (Day 4-6)
- [x] Install and test Kokoro-82M locally
- [x] Build sentence chunker (split page text into sentences)
- [x] Kokoro streams audio → WebSocket sends chunks to browser
- [x] Browser receives and plays audio chunks via Web Audio API

### Phase 4 — Playback Controls (Day 7-8)
- [x] Play / Pause / Resume controls wired to WebSocket signals
- [x] Speed control (0.75x, 1x, 1.25x, 1.5x, 2x)
- [x] Page-change detection → narration switches to new page automatically
- [x] Visual progress tracking with sentence counter
- [x] Keyboard shortcuts for all controls
- [x] Elapsed time tracking

### Phase 5 — Polish & Stability (Day 9-10)
- [x] Loading states (PDF processing, TTS model warm-up)
- [x] Error handling (bad PDF, TTS failure)
- [x] Smooth audio transitions between pages
- [x] Basic responsive UI
- [x] Progress indicators and validation
- [x] Enhanced error messages
- [ ] End-to-end test with a real book

---

## Hardware Requirements

| Spec | Minimum | Recommended |
|---|---|---|
| RAM | 4 GB | 8 GB |
| CPU | Dual-core modern | Quad-core |
| GPU | Not required | Optional (speeds up TTS) |
| Storage | 2 GB free | 5 GB |
| OS | Windows / Mac / Linux | Any |

---

## Dependencies

### Backend (`requirements.txt`)
```
fastapi
uvicorn[standard]
python-multipart
pymupdf
kokoro
websockets
numpy
soundfile
```

### Frontend (`package.json` key deps)
```
react
typescript
vite
pdfjs-dist
```

---

## Key Technical Decisions

| Decision | Reason |
|---|---|
| Kokoro-82M | Best local TTS quality on CPU, Apache 2.0, small size |
| WebSocket for audio | Enables sentence-by-sentence streaming, no buffering delay |
| PDF.js in browser | No server-side PDF rendering needed, works with any PDF |
| PyMuPDF on backend | Fast, accurate text extraction with page-level control |
| Sentence-level chunking | Smooth narration — audio starts immediately, not after full page |
| FastAPI | Async-native, easy WebSocket support, fast Python server |
