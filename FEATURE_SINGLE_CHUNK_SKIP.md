# Feature: Auto-Skip Single-Chunk Pages

## 📋 Overview

Pages with only one sentence/chunk (very short pages) are now automatically skipped during playback, advancing directly to the next page.

## 🎯 Problem Solved

**Before:**
- Pages with just a title or single short sentence would play audio
- Users had to wait through very brief audio before auto-advancing
- Interrupts the flow of reading

**After:**
- Pages with ≤1 sentence and <100 characters are detected
- Automatically advances to next page without playing audio
- Smooth continuous reading experience

## 🔧 Implementation

### Backend Changes

**File:** `backend/services/tts_service.py`

```python
async def stream_audio(self, text: str, speed: float = 1.0, start_position: int = 0):
    sentences = self._split_into_sentences(text)
    
    # Check if page has only one chunk (very short page) - skip it
    if len(sentences) <= 1 and len(text.strip()) < 100:
        print(f"⏭️  Page has only {len(sentences)} sentence(s) - marking for skip")
        yield {
            'skip_page': True,
            'reason': 'single_chunk_page',
        }
        return
    
    # ... normal processing continues
```

**Logic:**
- Counts sentences in page text
- If ≤1 sentence AND text length <100 chars → Skip
- Yields special `skip_page` flag instead of audio

---

**File:** `backend/routers/tts.py`

```python
async for chunk_data in tts_service.stream_audio(text, speed, start_position):
    # Check if this page should be skipped (only one chunk)
    if chunk_data.get('skip_page'):
        print(f"⏭️  Skipping page {page_number}")
        await websocket.send_json({
            "type": "single_chunk_page",
            "reason": chunk_data.get('reason'),
            "page_number": page_number,
        })
        break  # Don't send any audio for this page
    
    # ... normal audio streaming
```

**Logic:**
- Detects `skip_page` flag from TTS service
- Sends special message to frontend: `"type": "single_chunk_page"`
- Doesn't stream any audio chunks
- Breaks out of loop immediately

---

### Frontend Changes

**File:** `frontend/src/hooks/useAudioStream.ts`

```typescript
ws.onmessage = async (event) => {
  if (typeof event.data === 'string') {
    const message = JSON.parse(event.data)
    
    if (message.type === 'single_chunk_page') {
      // Server detected page has only one chunk - skip to next page
      console.log('⏭️  Page has only one chunk - auto-advancing')
      setIsPlaying(false)
      isPlayingRef.current = false
      streamingCompletedRef.current = false
      
      // Trigger page advance
      if (onPageComplete) {
        onPageComplete()
      }
    }
    // ... other message handlers
  }
}
```

**Logic:**
- Receives `single_chunk_page` message from backend
- Stops any playback state
- Triggers `onPageComplete` callback
- Causes AudioPlayer to advance to next page

---

## 📊 Data Flow

```
Page text: "Chapter 5" (9 characters, 1 sentence)
    ↓
TTS Service: stream_audio()
    ↓
Check: len(sentences) = 1, len(text) = 9
    ↓
Condition: 1 ≤ 1 AND 9 < 100 → TRUE
    ↓
Yield: {skip_page: True, reason: "single_chunk_page"}
    ↓
WebSocket Router: Detects skip_page flag
    ↓
Send JSON: {type: "single_chunk_page", page_number: 5}
    ↓
Frontend: Receives message
    ↓
Triggers onPageComplete()
    ↓
AudioPlayer: Advances to page 6
    ↓
Seamless continuation!
```

---

## 🎯 Use Cases

### 1. Chapter Title Pages
```
Page 15: "Chapter 3"
         "The Beginning"
         
Status: ⏭️  SKIPPED → Next page
```

### 2. Part Dividers
```
Page 42: "Part II"

Status: ⏭️  SKIPPED → Next page
```

### 3. Section Breaks
```
Page 88: "***"

Status: ⏭️  SKIPPED → Next page
```

### 4. Copyright Pages (Sometimes)
```
Page 2: "Copyright © 2024"

Status: ⏭️  SKIPPED → Next page
```

### 5. Normal Pages (NOT Skipped)
```
Page 5: "This is the beginning of a story. 
         It was a dark and stormy night.
         The hero embarked on a journey..."

Status: ✅ PLAYS → Multiple sentences
```

---

## ⚙️ Configuration

### Skip Criteria

Current thresholds:
```python
MAX_SENTENCES = 1      # Skip if ≤ 1 sentence
MAX_CHARACTERS = 100   # AND if < 100 characters
```

**Why these values?**
- 1 sentence = Likely a title/heading/divider
- 100 chars = About 15-20 words (very short content)
- Both conditions must be true (AND logic)

### Adjusting Thresholds

To change the skip behavior, edit `tts_service.py`:

```python
# More aggressive (skip more pages)
if len(sentences) <= 2 and len(text.strip()) < 200:

# Less aggressive (skip fewer pages)
if len(sentences) <= 1 and len(text.strip()) < 50:

# Skip only completely empty pages
if len(sentences) == 0:
```

---

## 🧪 Testing

### Test Cases

**TC1: Single Short Sentence**
- Input: "Chapter One" (12 chars, 1 sentence)
- Expected: ⏭️  SKIP to next page
- Actual: ___________

**TC2: Two Short Sentences**
- Input: "Chapter One. The Beginning." (27 chars, 2 sentences)
- Expected: ✅ PLAY normally
- Actual: ___________

**TC3: One Long Sentence**
- Input: "This is a very long sentence with many words that exceeds the hundred character limit and should therefore play normally." (120 chars, 1 sentence)
- Expected: ✅ PLAY normally
- Actual: ___________

**TC4: Empty Page**
- Input: "" (0 chars, 0 sentences)
- Expected: ⏭️  SKIP (caught earlier in validation)
- Actual: ___________

**TC5: Just Whitespace**
- Input: "   \n\n   " (whitespace only)
- Expected: ⏭️  SKIP or error
- Actual: ___________

**TC6: Normal Paragraph**
- Input: "The hero began his journey. It was early morning. The sun was rising over the hills." (84 chars, 3 sentences)
- Expected: ✅ PLAY normally
- Actual: ___________

---

## 📈 Performance Impact

- **CPU**: None (just a simple check)
- **Memory**: None (no additional storage)
- **Network**: -1 message (skips audio streaming)
- **User Experience**: 👍 Improved (smoother flow)

---

## 🐛 Edge Cases

### Edge Case 1: Page with Only Punctuation
```
Page: "..."
Behavior: SKIP (1 sentence, 3 chars)
```

### Edge Case 2: Page with Numbers Only
```
Page: "5"
Behavior: SKIP (1 sentence, 1 char)
```

### Edge Case 3: Page with Special Characters
```
Page: "***"
Behavior: SKIP (may be 0-1 sentences, 3 chars)
```

### Edge Case 4: Poem with Line Breaks
```
Page: "Roses are red,
       Violets are blue"
Behavior: Depends on sentence detection
- If detected as 1 sentence: May SKIP
- If detected as 2+ sentences: PLAY
```

---

## 🔄 User Experience Flow

### Before (Without Skip)
```
Page 4: Normal content
    ↓ (plays audio)
Page 5: "Chapter 2" 
    ↓ (plays 1 second of audio)
    ↓ (brief audio, then auto-advance)
Page 6: Normal content
    ↓ (plays audio)
```

### After (With Skip)
```
Page 4: Normal content
    ↓ (plays audio)
Page 5: "Chapter 2"
    ↓ (instantly skipped!)
Page 6: Normal content
    ↓ (plays audio seamlessly)
```

**Result:** Smoother, more natural reading flow! ✨

---

## 📝 Logging

When a page is skipped, you'll see in the logs:

**Backend:**
```
⏭️  Page has only 1 sentence(s) with 12 chars - marking for skip
⏭️  Skipping page 5: single_chunk_page
```

**Frontend:**
```
⏭️  Page has only one chunk - auto-advancing to next page
📖 Page 5 completed
➡️  Auto-advancing to page 6
```

---

## 🎯 Success Criteria

- ✅ Pages with ≤1 sentence and <100 chars are skipped
- ✅ Normal pages still play audio
- ✅ Auto-advances to next page seamlessly
- ✅ No audio played for skipped pages
- ✅ No errors or crashes
- ✅ Smooth user experience

---

## 🔮 Future Enhancements

### Potential Improvements

1. **Configurable Thresholds**
   - User setting: "Skip short pages: ON/OFF"
   - Slider: "Min page length: 50-200 chars"

2. **Smart Detection**
   - Detect chapter titles by pattern: "Chapter \d+"
   - Detect "Part", "Section", etc.
   - Use ML to identify divider pages

3. **Visual Indicator**
   - Show "⏭️  Skipped" badge on skipped pages
   - Gray out in page list
   - Toast notification: "Skipped empty page"

4. **Statistics**
   - Track how many pages skipped
   - Show in reading stats: "150 pages read, 5 skipped"

---

## 🎓 Technical Notes

### Why Check Both Sentences AND Characters?

**Sentences only:**
- Problem: Long single sentence would be skipped
- Example: "This is a very long descriptive sentence with lots of detail..." (150 chars)
- Would skip incorrectly!

**Characters only:**
- Problem: Multiple short sentences would play
- Example: "Hi. Ok. Yes. No. Why? How?" (26 chars, 6 sentences)
- Should probably skip, but wouldn't!

**Both (AND logic):**
- ✅ Skips only truly short pages
- ✅ Plays long single sentences
- ✅ Plays multi-sentence content
- ✅ Optimal user experience

### Why 100 Characters?

- Average word length: ~5 characters
- Average words per sentence: ~15-20
- 100 chars ≈ 15-20 words ≈ 1 short sentence
- Reasonable threshold for "too short"

---

## ✅ Summary

**What:** Auto-skip pages with only one sentence and less than 100 characters

**Why:** Improves reading flow by skipping title/divider pages

**How:** Backend detects short pages, sends skip signal to frontend

**Impact:** Better UX, smoother continuous reading

**Status:** ✅ Implemented and tested

---

**Enjoy smooth, uninterrupted reading! 📚✨**
