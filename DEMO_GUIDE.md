# 🎬 Demo Guide - Word Highlighting Feature

## 🚀 Quick Start

### Option 1: Automated Startup
**Windows:**
```bash
# Double-click one of these:
START_APP.bat        # Batch file
START_APP.ps1        # PowerShell (recommended)
```

### Option 2: Manual Startup
**Terminal 1 - Backend:**
```bash
cd backend
python -m uvicorn main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Then open: http://localhost:5173

---

## 🎯 Demo Walkthrough

### Part 1: Setup (30 seconds)

1. **Open the app** in your browser
2. **Upload a test PDF** (use any text-based PDF)
   - Click "Choose PDF File"
   - Select a PDF with substantial text (10+ pages recommended)
   - Wait for processing (shows progress: 0% → 100%)

**Expected Result:**
- ✅ PDF loads successfully
- ✅ Pages extracted and displayed
- ✅ Audio player appears on the left
- ✅ PDF viewer shows on the right

---

### Part 2: View Toggle (15 seconds)

3. **Look at the top-right header**
   - You'll see two buttons: **📄 PDF** and **📖 Text**
   - PDF view is active by default (blue highlight)

4. **Click the "📖 Text" button**

**Expected Result:**
- ✅ View switches from PDF to Text
- ✅ Clean, readable text appears
- ✅ Text is formatted with proper spacing
- ✅ Words are individually styled

---

### Part 3: Click-to-Start Audio (30 seconds)

5. **Hover over words** in the Text View
   - Notice they turn blue when hovering
   - Cursor changes to pointer (clickable)

6. **Scroll down** to find an interesting paragraph

7. **Click on any word** in the middle of that paragraph
   - Click directly on the word itself

**Expected Result:**
- ✅ Audio starts playing immediately
- ✅ Audio starts from the sentence containing that word
- ✅ Yellow highlight appears on words
- ✅ Page indicator updates

**Demo Tip:** Try clicking the 5th word in a long sentence to see it start from there!

---

### Part 4: Word Highlighting (60 seconds)

8. **Watch the yellow highlight** move across words
   - Each word lights up in yellow as it's spoken
   - Bold text emphasizes the current word
   - Smooth transitions between words

9. **Let it play** for 10-20 seconds
   - Observe the auto-scroll feature
   - Current word stays visible in viewport
   - Smooth scrolling keeps up with audio

**Expected Result:**
- ✅ Yellow highlight moves word-by-word
- ✅ Timing roughly matches audio (±0.5s)
- ✅ Auto-scroll keeps current word visible
- ✅ Previous words return to normal color

**Demo Tip:** The highlight should feel like karaoke-style following!

---

### Part 5: Speed Adjustment (30 seconds)

10. **Try different speeds** while playing:
    - Click **1.25x** button
    - Watch highlight move faster
    - Click **2.0x** for very fast
    - Try **0.75x** for slower

**Expected Result:**
- ✅ Audio speed changes immediately
- ✅ Highlight speed adjusts accordingly
- ✅ Playback restarts briefly (expected)
- ✅ Still synchronized

---

### Part 6: Pause & Resume (20 seconds)

11. **Click Pause** (⏸️ button)
    - Or press **Spacebar**

**Expected Result:**
- ✅ Audio stops
- ✅ Yellow highlight stays on last word
- ✅ No movement

12. **Click Play** (▶️ button) again
    - Or press **Spacebar**

**Expected Result:**
- ✅ Audio resumes from same position
- ✅ Highlight continues from paused word
- ✅ Smooth continuation

---

### Part 7: Page Auto-Advance (60 seconds)

13. **Let audio play** until end of page
    - Don't interrupt
    - Watch the page counter

**Expected Result:**
- ✅ When page ends, automatically advances to next page
- ✅ New page text loads
- ✅ Audio continues seamlessly
- ✅ Highlight starts on new page
- ✅ Skips empty/image-only pages

**Demo Tip:** This shows continuous reading across pages!

---

### Part 8: Navigation (30 seconds)

14. **Click "Next Page"** button (→)
    - Or press **Right Arrow** key

**Expected Result:**
- ✅ Moves to next page
- ✅ Text updates
- ✅ Audio stops (new page loaded)

15. **Click a word** on the new page
    - Start audio again

**Expected Result:**
- ✅ Audio plays from clicked word on new page
- ✅ Highlight works on new page too

---

### Part 9: View Switching During Playback (30 seconds)

16. **While audio is playing with highlights:**
    - Click **"📄 PDF"** button

**Expected Result:**
- ✅ Switches to PDF view
- ✅ Audio continues playing
- ✅ No highlight (PDF doesn't support it)
- ✅ PDF scrolls to current page

17. **Click "📖 Text"** again

**Expected Result:**
- ✅ Switches back to Text view
- ✅ Audio still playing
- ✅ Highlight reappears and syncs
- ✅ Shows current word

---

### Part 10: Multiple Click Tests (45 seconds)

18. **Try rapid clicking:**
    - Click word 1
    - Wait 2 seconds
    - Click word 10 (far ahead)
    - Wait 2 seconds
    - Click word 5 (backwards)

**Expected Result:**
- ✅ Each click restarts audio from that word
- ✅ Previous audio stops cleanly
- ✅ No audio overlap or glitches
- ✅ Highlight follows each restart

---

## 🎭 Advanced Demo Scenarios

### Scenario A: Language Learner
**Goal:** Show how highlighting helps language learning

1. Find text with unfamiliar words
2. Click first word of a sentence
3. Watch and listen simultaneously
4. Pause on difficult words
5. Click that word to replay it

**Highlight:** Visual + audio = better learning!

---

### Scenario B: Speed Reader
**Goal:** Train faster reading with visual guide

1. Set speed to 1.5x or 2.0x
2. Let audio play
3. Force eyes to follow yellow highlight
4. Practice reading at that speed

**Highlight:** Paces your reading speed!

---

### Scenario C: Casual Reader
**Goal:** Comfortable, hands-free experience

1. Start from beginning
2. Let it auto-advance through pages
3. Watch highlights for engagement
4. Relax and enjoy

**Highlight:** Enhanced passive listening!

---

### Scenario D: Research/Study
**Goal:** Jump to specific sections quickly

1. Scan text in Text View
2. Find relevant paragraph
3. Click first word of that paragraph
4. Listen to that section
5. Jump to another section

**Highlight:** Quick navigation!

---

## 🐛 Common Issues & Solutions

### Issue 1: Highlight Not Moving
**Symptoms:** Yellow highlight stuck on one word

**Checks:**
- [ ] Is audio actually playing? (check audio icon)
- [ ] Are you in Text View? (not PDF)
- [ ] Is page loaded? (text visible)

**Solutions:**
1. Stop and replay audio
2. Refresh page
3. Check browser console for errors

---

### Issue 2: Audio Not Starting
**Symptoms:** Click word, nothing happens

**Checks:**
- [ ] Is backend running? (check terminal)
- [ ] Is WebSocket connected? (check status message)
- [ ] Does page have text? (not empty/image-only)

**Solutions:**
1. Check backend terminal for errors
2. Reload frontend page
3. Try different word

---

### Issue 3: Highlight Out of Sync
**Symptoms:** Highlight 1-2 words behind audio

**Note:** This is expected behavior!
- Timing is estimated, not exact
- Typically ±0.5 seconds accuracy
- More noticeable at higher speeds

**Not a bug:** Future versions will improve accuracy

---

### Issue 4: Words Not Clickable
**Symptoms:** Can't click words in Text View

**Checks:**
- [ ] Are you in Text View? (not PDF)
- [ ] Is text loaded? (not loading state)
- [ ] Is cursor changing to pointer on hover?

**Solutions:**
1. Toggle to PDF and back to Text
2. Refresh page
3. Check if CSS loaded properly

---

## 📊 Performance Monitoring

### What to Watch During Demo

**CPU Usage:**
- Should be: <30% during playback
- Red flag: >50% consistently

**Memory:**
- Should be: <500 MB total
- Red flag: Growing continuously (memory leak)

**Network:**
- Initial: Large (PDF upload)
- During play: Small chunks (timing + audio)
- Red flag: Continuous large transfers

**Browser Console:**
- Should see: TTS logs, timing messages
- Red flag: Red errors, warnings

---

## 🎓 Explaining to Others

### For Non-Technical Users:
> "You can now click any word and the audiobook starts reading from exactly that spot. Plus, each word lights up in yellow as it's being spoken, like karaoke! You can switch between seeing the original PDF or a clean text version."

### For Technical Users:
> "We've implemented word-level timing and highlighting using WebSocket streaming. The backend calculates approximate word durations based on character count and speech rate, streams timing data alongside audio chunks, and the frontend uses requestAnimationFrame to track current word position and update the UI in real-time."

### For Product Managers:
> "Three key features: (1) Click-to-start from any position increases engagement, (2) Word highlighting improves comprehension and accessibility, (3) View toggle offers flexibility. Competitive advantage: most audiobook apps don't offer word-level interaction."

---

## 🎬 Recording a Demo Video

### Script Outline (3 minutes)

**00:00 - 00:15 - Introduction**
- "Today I'll show you the new word highlighting feature"
- Show the main screen

**00:15 - 00:30 - Upload & Setup**
- Upload a PDF
- Show extraction progress
- PDF loads

**00:30 - 01:00 - View Toggle**
- Show PDF view
- Toggle to Text view
- Explain the difference

**01:00 - 01:30 - Click-to-Start**
- Scroll to middle of page
- Click a word
- Audio starts from there

**01:30 - 02:15 - Word Highlighting**
- Let it play for 30 seconds
- Point out yellow highlight moving
- Show auto-scroll feature

**02:15 - 02:45 - Features**
- Change speed
- Pause/resume
- Click different words

**02:45 - 03:00 - Conclusion**
- Summarize benefits
- Show both views side-by-side

---

## ✅ Demo Checklist

Before presenting:
- [ ] Backend server running
- [ ] Frontend server running
- [ ] Test PDF ready (interesting content)
- [ ] Browser window sized properly
- [ ] Audio output working
- [ ] Internet connection stable
- [ ] No other tabs making noise
- [ ] Demo script reviewed

During demo:
- [ ] Speak clearly and pace yourself
- [ ] Point out visual feedback
- [ ] Emphasize unique features
- [ ] Handle errors gracefully
- [ ] Take questions at end

After demo:
- [ ] Get feedback
- [ ] Note any issues found
- [ ] Update documentation
- [ ] Thank participants

---

## 🌟 Wow Factor Moments

These are the "aha!" moments in your demo:

1. **The Click** - When you click a word and audio instantly starts there
2. **The Highlight** - First time yellow follows the voice
3. **The Sync** - Realizing it's perfectly following along
4. **The Auto-scroll** - Watching it intelligently scroll
5. **The Speed** - Seeing highlight keep up at 2.0x
6. **The Toggle** - Seamlessly switching between views

**Demo Tip:** Build up to these moments for maximum impact!

---

**Good luck with your demo! 🚀✨**
