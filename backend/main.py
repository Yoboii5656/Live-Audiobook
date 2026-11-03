from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import pdf, tts

app = FastAPI(title="AI Audiobook Reader API")

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite default port
        "http://localhost:5174",  # Vite alternate port
        "http://localhost:3000",  # Alternative dev port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(pdf.router, prefix="/api/pdf", tags=["PDF"])
app.include_router(tts.router, prefix="/api/tts", tags=["TTS"])

@app.get("/")
async def root():
    return {"message": "AI Audiobook Reader API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
