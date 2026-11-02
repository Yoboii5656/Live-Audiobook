import re
import asyncio
from typing import AsyncGenerator
import numpy as np
import io
import soundfile as sf

try:
    from kokoro import KPipeline
    KOKORO_AVAILABLE = True
except ImportError:
    KOKORO_AVAILABLE = False
    print("Warning: Kokoro not available. TTS will use placeholder audio.")

class TTSService:
    def __init__(self):
        self.is_paused = False
        self.is_stopped = False
        self.kokoro_available = KOKORO_AVAILABLE
        self.pipeline = None
        
        if self.kokoro_available:
            try:
                # Initialize Kokoro pipeline with American English
                self.pipeline = KPipeline(lang_code='a')
                print("✅ Kokoro-82M TTS initialized successfully")
            except Exception as e:
                print(f"⚠️  Failed to initialize Kokoro: {e}")
                self.kokoro_available = False
        else:
            print("⚠️  Kokoro not found - using placeholder audio")
    
    def _split_into_sentences(self, text: str) -> list[str]:
        """
        Split text into sentences for smooth streaming.
        Handles paragraphs, incomplete sentences, and various punctuation.
        """
        if not text or not text.strip():
            return []
        
        # First normalize whitespace
        text = ' '.join(text.split())
        
        # Replace common abbreviations temporarily to avoid false splits
        abbreviations = {
            'Mr.': 'Mr<abbr>',
            'Mrs.': 'Mrs<abbr>',
            'Ms.': 'Ms<abbr>',
            'Dr.': 'Dr<abbr>',
            'Prof.': 'Prof<abbr>',
            'Sr.': 'Sr<abbr>',
            'Jr.': 'Jr<abbr>',
            'vs.': 'vs<abbr>',
            'etc.': 'etc<abbr>',
            'Inc.': 'Inc<abbr>',
            'Corp.': 'Corp<abbr>',
            'Ltd.': 'Ltd<abbr>',
        }
        
        for abbr, replacement in abbreviations.items():
            text = text.replace(abbr, replacement)
        
        # Split on sentence boundaries: .!? followed by space and capital letter
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
        
        # Also catch sentences ending with .!? at the end of text (no capital after)
        if sentences and not sentences[-1].endswith(('.', '!', '?')):
            # Last part doesn't end with punctuation but there might be earlier complete sentences
            pass
        
        # Restore abbreviations
        for abbr, replacement in abbreviations.items():
            sentences = [s.replace(replacement, abbr) for s in sentences]
        
        # Clean up and filter
        sentences = [s.strip() for s in sentences if s.strip()]
        
        # If we have no sentences (no punctuation), keep the whole text
        if not sentences:
            sentences = [text]
        
        # Handle very long sentences by splitting on natural pauses
        result = []
        for sentence in sentences:
            if len(sentence) > 300:
                # Try to split on semicolons, colons, or commas
                parts = re.split(r'([;:,])\s+', sentence)
                chunk = ""
                for part in parts:
                    if part in ';:,':
                        chunk += part
                    else:
                        if chunk and len(chunk) > 200:
                            result.append(chunk.strip())
                            chunk = part
                        else:
                            chunk += (" " if chunk else "") + part
                if chunk:
                    result.append(chunk.strip())
            else:
                result.append(sentence)
        
        return result
    
    async def stream_audio(self, text: str, speed: float = 1.0, start_position: int = 0) -> AsyncGenerator[dict, None]:
        """
        Stream audio chunks sentence by sentence using Kokoro-82M TTS
        Returns dict with audio bytes and word timing information
        """
        sentences = self._split_into_sentences(text)
        print(f"📖 Processing {len(sentences)} sentences from text ({len(text)} chars), starting at position {start_position}")
        
        # Check if page has only one chunk (very short page) - skip it
        if len(sentences) <= 1 and len(text.strip()) < 100:
            print(f"⏭️  Page has only {len(sentences)} sentence(s) with {len(text.strip())} chars - marking for skip")
            yield {
                'skip_page': True,
                'reason': 'single_chunk_page',
            }
            return
        
        # Find which sentence to start from based on character position
        char_count = 0
        start_sentence_idx = 0
        for idx, sentence in enumerate(sentences):
            if char_count + len(sentence) > start_position:
                start_sentence_idx = idx
                break
            char_count += len(sentence) + 1  # +1 for the punctuation/space
        
        print(f"🎯 Starting from sentence {start_sentence_idx + 1}/{len(sentences)}")
        
        for i in range(start_sentence_idx, len(sentences)):
            sentence = sentences[i]
            if self.is_stopped:
                print(f"⏹️  Stopped at sentence {i + 1}/{len(sentences)}")
                break
            
            while self.is_paused:
                # Wait while paused
                await asyncio.sleep(0.1)
                if self.is_stopped:
                    break
            
            if self.is_stopped:
                break
            
            print(f"🎤 Generating audio for sentence {i + 1}/{len(sentences)}: {sentence[:60]}...")
            
            # Generate audio for this sentence
            if self.kokoro_available:
                audio_chunk = await self._generate_kokoro_audio(sentence, speed)
            else:
                audio_chunk = self._generate_placeholder_audio(sentence, speed)
            
            # Extract words from sentence for timing
            words = self._extract_words(sentence)
            
            # Calculate approximate word timings (will be improved with actual TTS timing)
            word_timings = self._calculate_word_timings(words, sentence, speed)
            
            print(f"✅ Sent audio chunk {i + 1}/{len(sentences)} ({len(audio_chunk)} bytes) with {len(words)} words")
            
            yield {
                'audio': audio_chunk,
                'sentence': sentence,
                'sentence_index': i,
                'words': words,
                'word_timings': word_timings,
            }
        
        print(f"🎉 Completed streaming all sentences")
    
    async def _generate_kokoro_audio(self, text: str, speed: float) -> bytes:
        """
        Generate audio using Kokoro-82M TTS
        """
        try:
            if not self.pipeline:
                return self._generate_placeholder_audio(text, speed)
            
            # Run Kokoro in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            
            def generate_audio():
                # Generate audio using Kokoro pipeline
                # Using 'af_sky' voice (American female) with adjustable speed
                generator = self.pipeline(text, voice='af_sky', speed=speed)
                
                # Get the first (and typically only) audio chunk
                for _, _, audio in generator:
                    return audio
                
                return np.array([], dtype=np.float32)
            
            audio_array = await loop.run_in_executor(None, generate_audio)
            
            # Convert to WAV format for streaming
            # Kokoro outputs 24kHz audio
            sample_rate = 24000
            
            # Create WAV file in memory
            buffer = io.BytesIO()
            sf.write(buffer, audio_array, sample_rate, format='WAV', subtype='PCM_16')
            buffer.seek(0)
            
            return buffer.read()
            
        except Exception as e:
            print(f"Kokoro TTS error: {e}")
            # Fallback to placeholder
            return self._generate_placeholder_audio(text, speed)
    
    def _generate_placeholder_audio(self, text: str, speed: float) -> bytes:
        """
        Placeholder audio — returns a proper WAV file so decodeAudioData can parse it.
        """
        sample_rate = 24000
        duration = max(0.1, len(text) * 0.05 / speed)  # rough estimate
        samples = int(sample_rate * duration)
        audio = np.zeros(samples, dtype=np.float32)
        buffer = io.BytesIO()
        sf.write(buffer, audio, sample_rate, format='WAV', subtype='PCM_16')
        buffer.seek(0)
        return buffer.read()
    
    def _extract_words(self, text: str) -> list[str]:
        """Extract individual words from text, preserving punctuation"""
        # Split on whitespace but keep punctuation attached to words
        words = text.split()
        return [w.strip() for w in words if w.strip()]
    
    def _calculate_word_timings(self, words: list[str], sentence: str, speed: float) -> list[dict]:
        """
        Calculate approximate timing for each word based on text length
        This is a simple approximation - could be improved with actual phoneme timing
        """
        # Average speaking rate: ~150 words per minute at normal speed (1.0)
        # Adjusted by speed factor
        base_wpm = 150 * speed
        
        timings = []
        current_time = 0.0
        
        for word in words:
            # Estimate duration based on character count (longer words take more time)
            # Base: 60/150 = 0.4 seconds per word
            # Adjust by character count (normalized to average 5 chars per word)
            char_factor = len(word) / 5.0
            word_duration = (60.0 / base_wpm) * char_factor
            
            timings.append({
                'word': word,
                'start': current_time,
                'duration': word_duration,
            })
            
            current_time += word_duration
        
        return timings
    
    def pause(self):
        self.is_paused = True
    
    def resume(self):
        self.is_paused = False
    
    def stop(self):
        self.is_stopped = True
        self.is_paused = False
    
    def reset(self):
        """Reset state for new streaming session"""
        self.is_stopped = False
        self.is_paused = False
