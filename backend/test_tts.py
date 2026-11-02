"""
Test script for Kokoro TTS integration
Run this to verify TTS service is working
"""

import asyncio
from services.tts_service import TTSService

async def test_tts():
    print("=" * 60)
    print("Testing TTS Service")
    print("=" * 60)
    
    tts = TTSService()
    
    # Check if Kokoro is available
    if tts.kokoro_available:
        print("✅ Kokoro-82M is available and initialized")
    else:
        print("⚠️  Kokoro not available - will use placeholder audio")
        print("   Install espeak-ng to enable Kokoro TTS")
        print("   See PHASE3_SETUP.md for instructions")
    
    print()
    
    # Test sentence splitting
    text = "Hello world. This is a test of the TTS system. Can you hear me? Great!"
    sentences = tts._split_into_sentences(text)
    print(f"📝 Test text: {text}")
    print(f"📊 Split into {len(sentences)} sentences:")
    for i, sentence in enumerate(sentences, 1):
        print(f"   {i}. {sentence}")
    
    print()
    print("🎤 Generating audio chunks...")
    
    # Test audio generation
    chunk_count = 0
    total_bytes = 0
    
    async for audio_chunk in tts.stream_audio(text, speed=1.0):
        chunk_count += 1
        chunk_size = len(audio_chunk)
        total_bytes += chunk_size
        print(f"   Chunk {chunk_count}: {chunk_size:,} bytes")
    
    print()
    print(f"✅ Generated {chunk_count} audio chunks")
    print(f"📦 Total audio data: {total_bytes:,} bytes ({total_bytes / 1024:.2f} KB)")
    
    if tts.kokoro_available:
        print()
        print("🎉 Success! Kokoro TTS is working correctly.")
        print("   You can now start the servers and test the full app.")
    else:
        print()
        print("⚠️  Using placeholder audio (silence)")
        print("   Install espeak-ng for real TTS functionality")
    
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_tts())
