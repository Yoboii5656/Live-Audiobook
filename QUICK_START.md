# Quick Start Guide - AI Audiobook Reader

## Current Status: Phase 3 Complete ✅

The app now has full TTS (Text-to-Speech) narration powered by Kokoro-82M!

## 🚀 Quick Start (5 minutes)

### 1. Start Backend
```powershell
cd backend
.\venv312\Scripts\uvicorn.exe main:app --reload
```

### 2. Start Frontend (new terminal)
```powershell
cd frontend
npm run dev
```

### 3. Use the App
1. Open http://localhost:5173 in your browser
2. Upload a PDF file
3. Click the **Play ▶️** button
4. Hear your book read aloud! 🎧

## 🎮 Controls

### Mouse Controls

| Button | Action |
|--------|--------|
| ▶️ Play | Start narration of current page |
| ⏸️ Pause | Pause narration (can resume) |
| ⏹️ Stop | Stop completely (resets to start) |
| ← Prev | Go to previous page |
| → Next | Go to next page |
| 0.75x - 2x | Adjust reading speed |
| Volume | Adjust audio volume |

### Keyboard Shortcuts ⌨️

| Shortcut | Action |
|----------|--------|
| `Space` or `K` | Play/Pause toggle |
| `S` | Stop narration |
| `→` or `N` | Next page |
| `←` or `P` | Previous page |
| `↑` or `+` | Speed up |
| `↓` or `-` | Speed down |

**Tip**: Use keyboard shortcuts for hands-free control!

## 📋 What's Implemented

### ✅ Phase 1 - Project Setup
- React + Vite frontend
- FastAPI backend
- Project structure

### ✅ Phase 2 - PDF Handling
- PDF upload and text extraction
- PDF.js viewer in browser
- Page tracking and navigation

### ✅ Phase 3 - TTS Narration
- Kokoro-82M AI voice integration
- Real-time audio streaming
- Play/Pause/Stop controls
- Speed adjustment (0.75x to 2.0x)
- Volume control
- Sentence-by-sentence streaming

### ✅ Phase 4 - Playback Controls
- Automatic page-change detection
- Real-time progress tracking
- Sentence counter display
- Elapsed time tracking
- Complete keyboard shortcuts
- Speed increment/decrement
- Smooth audio transitions

### 🔜 Phase 5 - Coming Soon
- Loading state improvements
- Enhanced error handling
- UI polish and animations
- End-to-end testing

## 🔧 Tech Stack

**Frontend:**
- React + TypeScript
- Vite (dev server)
- PDF.js (PDF rendering)
- Web Audio API (audio playback)

**Backend:**
- FastAPI (Python)
- Kokoro-82M (TTS engine)
- PyMuPDF (PDF text extraction)
- WebSocket (streaming)

**AI Model:**
- Kokoro-82M (82M parameters)
- Apache 2.0 license
- Runs on CPU
- ~86 MB model size

## 📁 Project Structure

```
book-reader/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── routers/
│   │   ├── pdf.py           # PDF upload endpoint
│   │   └── tts.py           # WebSocket TTS streaming
│   ├── services/
│   │   ├── pdf_service.py   # PDF text extraction
│   │   └── tts_service.py   # Kokoro TTS integration
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AudioPlayer/  # Audio controls
│   │   │   └── PDFViewer/    # PDF display
│   │   ├── hooks/
│   │   │   ├── useAudioStream.ts  # WebSocket streaming
│   │   │   └── usePDFText.ts      # Page text extraction
│   │   └── App.tsx
│   └── package.json
│
└── project.md               # Full project plan
```

## 🧪 Testing

### Test Backend TTS
```powershell
cd backend
.\venv312\Scripts\python.exe test_tts.py
```

Expected output:
```
✅ Kokoro-82M is available and initialized
✅ Generated 4 audio chunks
🎉 Success! Kokoro TTS is working correctly.
```

### Test Full App
1. Start both servers (see Quick Start above)
2. Upload a sample PDF
3. Click Play
4. Verify audio plays
5. Test all controls (pause, speed, volume)

## 🐛 Common Issues

### "Kokoro not available"
**Fix:** The Kokoro package is installed but may need espeak-ng
- See `PHASE3_SETUP.md` for installation instructions

### "WebSocket connection failed"
**Fix:**
- Ensure backend is running on port 8000
- Check browser console for errors
- Restart both servers

### "No text to read on this page"
**Fix:**
- Some PDFs have images instead of text
- Try a different page
- Try a different PDF with selectable text

### Audio is choppy
**Fix:**
- Close other CPU-intensive apps
- Try lowering the speed setting
- System may be slow (Kokoro needs decent CPU)

## 📚 Documentation

| File | Description |
|------|-------------|
| `project.md` | Full project plan and architecture |
| `DESIGN.md` | Technical design decisions |
| `PHASE3_SETUP.md` | Detailed Phase 3 setup instructions |
| `PHASE3_COMPLETE.md` | Phase 3 completion report |
| `QUICK_START.md` | This file |

## 🔗 Important Endpoints

### Backend (http://localhost:8000)
- `POST /api/pdf/upload` - Upload PDF, get text
- `WS /api/tts/stream` - WebSocket for audio streaming
- `GET /docs` - FastAPI interactive API docs

### Frontend (http://localhost:5173)
- Main app interface

## ⚙️ Configuration

### Change TTS Voice
Edit `backend/services/tts_service.py` line 75:
```python
# Current: American female
generator = self.pipeline(text, voice='af_sky', speed=speed)

# Try: American male
generator = self.pipeline(text, voice='am_michael', speed=speed)

# Try: British female
generator = self.pipeline(text, voice='bf_emma', speed=speed)
```

### Adjust Speed Options
Edit `frontend/src/components/AudioPlayer/AudioPlayer.tsx` line 14:
```typescript
const speedOptions = [0.75, 1.0, 1.25, 1.5, 2.0]
// Add more: [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5]
```

## 💡 Tips

1. **First run**: Model downloads take a few seconds
2. **Best performance**: Use PDFs with clean, selectable text
3. **Speed**: Start at 1.0x, adjust to preference
4. **Volume**: Browser volume + app volume both affect output
5. **Pages**: Navigate freely - narration restarts on new page

## 🎯 Phase 3 Features Delivered

- ✅ Real-time AI narration
- ✅ Natural, human-like voice
- ✅ Smooth sentence-by-sentence streaming
- ✅ Full playback controls
- ✅ Speed adjustment (5 options)
- ✅ Volume control
- ✅ Page navigation during playback
- ✅ Connection status indicators
- ✅ Error handling and fallbacks

## 🌟 What Makes This Special

- **100% Local**: No API keys, no cloud, no subscriptions
- **Open Source**: Apache 2.0 licensed model
- **Fast**: Near real-time narration start
- **Quality**: Natural-sounding voice despite small size
- **Lightweight**: Only 86 MB model, runs on CPU
- **Privacy**: All processing on your machine

## 📞 Support

For issues, check:
1. This Quick Start guide
2. `PHASE3_SETUP.md` for detailed troubleshooting
3. `PHASE3_COMPLETE.md` for technical details
4. Browser console for error messages
5. Backend terminal for server errors

---

**Ready to build?** Start the servers and enjoy your AI audiobook reader! 📚🎧✨
