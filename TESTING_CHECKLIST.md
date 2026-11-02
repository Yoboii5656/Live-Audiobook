# Testing Checklist

## Pre-Testing Setup

- [ ] Backend running: `cd backend && python -m uvicorn main:app --reload`
- [ ] Frontend running: `cd frontend && npm run dev`
- [ ] Test PDF uploaded successfully
- [ ] Text extraction completed

---

## Feature 1: Start Audio from User Position

### Test Cases

- [ ] **TC1.1**: Click word in middle of page
  - Expected: Audio starts from that word
  - Actual: ___________

- [ ] **TC1.2**: Click first word
  - Expected: Audio starts from beginning
  - Actual: ___________

- [ ] **TC1.3**: Click last word
  - Expected: Audio starts from last word, then advances to next page
  - Actual: ___________

- [ ] **TC1.4**: Click word while audio is playing
  - Expected: Current audio stops, new audio starts from clicked word
  - Actual: ___________

- [ ] **TC1.5**: Click same word twice
  - Expected: Audio restarts from that word
  - Actual: ___________

### Edge Cases

- [ ] **EC1.1**: Click on punctuation
  - Expected: Should work (punctuation is part of word)
  - Actual: ___________

- [ ] **EC1.2**: Click on whitespace
  - Expected: No action (whitespace not clickable)
  - Actual: ___________

- [ ] **EC1.3**: Page with very long text (>1000 words)
  - Expected: Clicking word near end starts correctly
  - Actual: ___________

---

## Feature 2: PDF Shows Correct Page

### Test Cases

- [ ] **TC2.1**: Manual page navigation
  - Expected: PDF scrolls to show selected page
  - Actual: ___________

- [ ] **TC2.2**: Auto page advance during audio
  - Expected: PDF scrolls to new page automatically
  - Actual: ___________

- [ ] **TC2.3**: Click next/previous page buttons
  - Expected: PDF scrolls smoothly to new page
  - Actual: ___________

- [ ] **TC2.4**: Jump from page 1 to page 20
  - Expected: PDF scrolls to page 20
  - Actual: ___________

### Edge Cases

- [ ] **EC2.1**: Very long PDF (100+ pages)
  - Expected: Scrolling works smoothly
  - Actual: ___________

- [ ] **EC2.2**: PDF with different page sizes
  - Expected: Each page displays correctly
  - Actual: ___________

---

## Feature 3: Word-Level Highlighting

### Test Cases

- [ ] **TC3.1**: Normal playback at 1.0x speed
  - Expected: Yellow highlight moves word-by-word
  - Actual: ___________

- [ ] **TC3.2**: Fast playback at 2.0x speed
  - Expected: Highlight moves faster but stays in sync
  - Actual: ___________

- [ ] **TC3.3**: Slow playback at 0.75x speed
  - Expected: Highlight moves slower
  - Actual: ___________

- [ ] **TC3.4**: Pause during playback
  - Expected: Highlight stops on current word
  - Actual: ___________

- [ ] **TC3.5**: Resume after pause
  - Expected: Highlight continues from paused word
  - Actual: ___________

- [ ] **TC3.6**: Auto-scroll keeps word visible
  - Expected: Current word always visible in viewport
  - Actual: ___________

### Edge Cases

- [ ] **EC3.1**: Very long words (>15 characters)
  - Expected: Highlight timing proportional to length
  - Actual: ___________

- [ ] **EC3.2**: Short words (1-2 characters)
  - Expected: Brief highlight
  - Actual: ___________

- [ ] **EC3.3**: Page with 500+ words
  - Expected: Highlight works throughout entire page
  - Actual: ___________

- [ ] **EC3.4**: Speed change during playback
  - Expected: Audio restarts with new speed, highlight continues
  - Actual: ___________

---

## Feature 4: View Toggle

### Test Cases

- [ ] **TC4.1**: Toggle from PDF to Text
  - Expected: Text view shows with word highlighting ready
  - Actual: ___________

- [ ] **TC4.2**: Toggle from Text to PDF
  - Expected: PDF view shows at current page
  - Actual: ___________

- [ ] **TC4.3**: Toggle during playback
  - Expected: Audio continues, view changes
  - Actual: ___________

- [ ] **TC4.4**: Toggle with highlight active
  - Expected: Switching to PDF stops highlight, switching back resumes
  - Actual: ___________

### Edge Cases

- [ ] **EC4.1**: Rapid toggling (5+ times quickly)
  - Expected: No crashes, smooth transitions
  - Actual: ___________

- [ ] **EC4.2**: Toggle on page 1, then page 50
  - Expected: Works consistently
  - Actual: ___________

---

## Integration Tests

### Audio + Highlighting

- [ ] **IT1**: Play page 1, let it auto-advance to page 2
  - Expected: Highlight works on both pages
  - Actual: ___________

- [ ] **IT2**: Click word on page 5, play until page 10
  - Expected: Continuous highlight through all pages
  - Actual: ___________

- [ ] **IT3**: Stop in middle, click different word, play again
  - Expected: New highlight starts from new position
  - Actual: ___________

### Navigation + Highlighting

- [ ] **IT4**: Navigate to page 10, click word, play
  - Expected: Audio and highlight start from clicked word
  - Actual: ___________

- [ ] **IT5**: Use keyboard shortcuts during playback
  - Expected: All shortcuts work, highlight updates accordingly
  - Actual: ___________

### View + Highlighting

- [ ] **IT6**: Start in Text view, play, toggle to PDF
  - Expected: Audio continues in PDF view (no highlight)
  - Actual: ___________

- [ ] **IT7**: Start in PDF view, click play, toggle to Text
  - Expected: Highlight appears and syncs with audio
  - Actual: ___________

---

## Cross-Browser Testing

### Chrome/Edge
- [ ] All features work
- [ ] No console errors
- [ ] Performance good

### Firefox
- [ ] All features work
- [ ] No console errors
- [ ] Performance good

### Safari (if available)
- [ ] All features work
- [ ] No console errors
- [ ] Performance good

---

## Mobile Testing (if available)

### Portrait Mode
- [ ] Words clickable with touch
- [ ] Highlight visible
- [ ] View toggle works
- [ ] Auto-scroll works

### Landscape Mode
- [ ] Layout adapts correctly
- [ ] All features work

---

## Performance Testing

- [ ] **P1**: CPU usage during playback
  - Expected: <30% CPU
  - Actual: ___________

- [ ] **P2**: Memory usage during long playback (30+ min)
  - Expected: <500 MB
  - Actual: ___________

- [ ] **P3**: Page load time
  - Expected: <3 seconds
  - Actual: ___________

- [ ] **P4**: PDF rendering time (50 pages)
  - Expected: <10 seconds
  - Actual: ___________

---

## Error Handling

- [ ] **E1**: Network disconnection during playback
  - Expected: Error message, graceful failure
  - Actual: ___________

- [ ] **E2**: Invalid PDF upload
  - Expected: Error message, no crash
  - Actual: ___________

- [ ] **E3**: Click word on empty page
  - Expected: No action or skip to next page with content
  - Actual: ___________

- [ ] **E4**: Backend server down
  - Expected: Connection error message
  - Actual: ___________

---

## Regression Testing

Ensure existing features still work:

- [ ] Upload PDF
- [ ] Extract text from all pages
- [ ] Play/pause audio
- [ ] Stop audio
- [ ] Volume control
- [ ] Speed control
- [ ] Keyboard shortcuts
- [ ] Page navigation (next/prev)
- [ ] Auto-advance pages
- [ ] Skip empty pages
- [ ] Start from meaningful content page

---

## Accessibility Testing

- [ ] **A1**: Keyboard navigation works
- [ ] **A2**: Focus indicators visible
- [ ] **A3**: Text readable (color contrast)
- [ ] **A4**: Buttons have clear labels
- [ ] **A5**: Touch targets large enough (mobile)

---

## Notes

### Issues Found:
1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

### Observations:
1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

### Suggestions:
1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

---

## Sign-Off

- [ ] All critical tests passed
- [ ] No blocking bugs found
- [ ] Performance acceptable
- [ ] Ready for user acceptance testing

**Tester**: ___________  
**Date**: ___________  
**Build Version**: ___________
