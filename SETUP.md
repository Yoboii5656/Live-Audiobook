# Setup Guide - AI Audiobook Reader

## Prerequisites

- **Python 3.9 - 3.12** (Python 3.13+ is not yet supported by Kokoro)
- **Node.js 18+** and npm
- **espeak-ng** (required for Kokoro TTS)

---

## Step 1: Install espeak-ng (Windows)

Kokoro TTS requires espeak-ng for phoneme generation.

### Windows Installation:

1. Go to [espeak-ng releases](https://github.com/espeak-ng/espeak-ng/releases)
2. Click on the **Latest release**
3. Download the appropriate `*.msi` file:
   - For 64-bit Windows: `espeak-ng-X-x64.msi`
   - For 32-bit Windows: `espeak-ng-X-x86.msi`
4. Run the downloaded installer
5. Follow the installation wizard (use default settings)

### Verify Installation:

```powershell
espeak-ng --version
```

You should see version information if installed correctly.

---

## Step 2: Backend Setup

### 1. Navigate to backend folder:
```powershell
cd backend
```

### 2. Create a virtual environment:
```powershell
python -m venv venv
```

### 3. Activate the virtual environment:
```powershell
.\venv\Scripts\activate
```

You should see `(venv)` in your terminal prompt.

### 4. Install Python dependencies:
```powershell
pip install -r requirements.txt
```

This will install:
- FastAPI (web framework)
- uvicorn (ASGI server)
- PyMuPDF (PDF text extraction)
- **Kokoro 0.9.4+** (TTS model - ~86MB)
- soundfile, numpy (audio processing)
- websockets (real-time streaming)

**Note:** The first time Kokoro runs, it will download the model weights (~340MB total). This happens automatically.

### 5. Start the backend server:
```powershell
uvicorn main:app --reload --port 8000
```

Backend will be available at: **http://localhost:8000**

API documentation: **http://localhost:8000/docs**

---

## Step 3: Frontend Setup

### 1. Open a NEW terminal and navigate to frontend folder:
```powershell
cd frontend
```

### 2. Install Node.js dependencies:
```powershell
npm install
```

This will install:
- React + TypeScript
- Vite (build tool)
- PDF.js (PDF rendering)
- Other frontend dependencies

### 3. Start the development server:
```powershell
npm run dev
```

Frontend will be available at: **http://localhost:5173**

---

## Step 4: Test the Application

1. Open **http://localhost:5173** in your browser
2. Click "Choose PDF File" and upload any PDF
3. Wait for text extraction to complete
4. You should see the book information displayed

**Phase 1 Status:** ✅ PDF upload and text extraction working!

---

## Troubleshooting

### Issue: `espeak-ng` not found

**Solution:** Make sure espeak-ng is installed and added to your system PATH.

After installation, restart your terminal and verify:
```powershell
espeak-ng --version
```

### Issue: `kokoro` installation fails

**Solution:** Check your Python version:
```powershell
python --version
```

Kokoro requires **Python 3.9 - 3.12**. Python 3.13+ is not yet supported.

### Issue: Port 8000 or 5173 already in use

**Solution:** Change the port:

For backend:
```powershell
uvicorn main:app --reload --port 8001
```

For frontend (edit `vite.config.ts`):
```typescript
server: {
  port: 5174,
}
```

### Issue: CORS errors in browser console

**Solution:** Make sure both frontend and backend are running, and the backend is on port 8000 (or update the frontend API URL in `App.tsx`).

---

## Project Structure

```
book-reader/
├── backend/              # Python FastAPI backend
│   ├── venv/            # Virtual environment (created by you)
│   ├── main.py          # FastAPI entry point
│   ├── routers/         # API endpoints
│   ├── services/        # Business logic
│   └── requirements.txt
│
├── frontend/            # React TypeScript frontend
│   ├── node_modules/   # Dependencies (created by npm)
│   ├── src/            # Source code
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── project.md          # Full project specification
├── README.md           # Project overview
└── SETUP.md            # This file
```

---

## Next Development Phases

- **Phase 2:** PDF Viewer with PDF.js (page rendering, navigation)
- **Phase 3:** TTS Integration (Kokoro-82M narration)
- **Phase 4:** Playback Controls (play/pause/speed)
- **Phase 5:** Polish & Stability

---

## System Requirements

| Requirement | Minimum | Recommended |
|------------|---------|-------------|
| RAM | 4 GB | 8 GB |
| CPU | Dual-core | Quad-core |
| Storage | 2 GB free | 5 GB free |
| OS | Windows 10+ | Windows 10/11 |
| Python | 3.9 - 3.12 | 3.11 |
| Node.js | 18+ | 20+ |

---

## Quick Commands Reference

### Start Backend:
```powershell
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload
```

### Start Frontend:
```powershell
cd frontend
npm run dev
```

### Stop Servers:
Press `Ctrl + C` in the terminal

---

Need help? Check the [project.md](project.md) for the complete technical specification.
