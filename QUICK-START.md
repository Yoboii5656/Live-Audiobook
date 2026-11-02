# 🚀 Quick Start Guide

## ✅ Your App is Running!

### Backend Server
**URL:** http://localhost:8000  
**API Docs:** http://localhost:8000/docs  
**Status:** ✅ Running

### Frontend App
**URL:** http://localhost:5174  
**Status:** ✅ Running

---

## 📖 Test the App Now!

1. **Open your browser** and go to: **http://localhost:5174**

2. **Upload a PDF:**
   - Click the "Choose PDF File" button
   - Select any PDF file from your computer
   - Wait for it to process (a few seconds)

3. **Explore the UI:**
   - ✅ PDF renders with continuous scroll
   - ✅ Audio player sidebar on the left
   - ✅ Page navigation buttons work
   - ✅ Scroll to change pages automatically
   - ✅ Beautiful modern design

4. **Try the Controls:**
   - Click Previous/Next page buttons
   - Adjust volume slider
   - Change speed (0.75x to 2.0x)
   - Click play button (UI responds, no audio yet - Phase 3)

---

## 🎯 What Works (Phase 2)

✅ PDF upload and text extraction  
✅ PDF.js viewer with all pages  
✅ Page tracking on scroll  
✅ Audio player UI complete  
✅ Page navigation  
✅ Modern design system  
✅ Responsive layout  

---

## 🔜 Coming in Phase 3

🔜 Real TTS narration (Kokoro-82M)  
🔜 WebSocket audio streaming  
🔜 Play/Pause actually plays audio  
🔜 Live sentence highlighting  
🔜 Auto-scroll following narration  

---

## ⚙️ Server Management

### Stop Servers
Press **Ctrl + C** in each terminal window

### Restart Backend
```powershell
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

### Restart Frontend
```powershell
cd frontend
npm run dev
```

---

## ⚠️ Important Note

**Python 3.14 Limitation:**  
You have Python 3.14, but Kokoro TTS (Phase 3) requires Python 3.9-3.12.

**For Phase 3**, you'll need to:
1. Install Python 3.12 from python.org
2. Create a new virtual environment with Python 3.12
3. Install full requirements including Kokoro

For now, enjoy testing Phase 2! 🎉

---

## 🐛 Troubleshooting

### Backend not responding?
- Check if running: http://localhost:8000/health
- Should return: `{"status":"healthy"}`

### Frontend can't upload PDFs?
- Make sure backend is running first
- Check browser console for errors (F12)

### Port already in use?
- Frontend auto-switched to port 5174
- Update URL in browser if needed

---

**Enjoy your AI Audiobook Reader!** 📚🎧
