# UI/UX Design - AI Audiobook Reader

## Design Philosophy

**Clean, Focused, Distraction-Free Reading Experience**

The interface should feel like a premium e-reader with built-in audio narration. Think Kindle meets Audible - minimal chrome, maximum content, with intuitive audio controls that don't interrupt the reading flow.

---

## Color Palette

### Light Mode (Default)
```
Background:       #F5F5F7 (Soft gray)
Surface:          #FFFFFF (Pure white)
Primary:          #007AFF (Apple blue)
Secondary:        #5856D6 (Purple)
Text Primary:     #1D1D1F (Near black)
Text Secondary:   #86868B (Medium gray)
Border:           #D2D2D7 (Light gray)
Accent Success:   #34C759 (Green)
Accent Warning:   #FF9500 (Orange)
```

### Dark Mode (Future)
```
Background:       #000000 (True black)
Surface:          #1C1C1E (Dark gray)
Primary:          #0A84FF (Brighter blue)
Text Primary:     #F5F5F7 (Off white)
```

---

## Typography

```
Font Family:      
  - Body: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
  - Reading: Georgia, 'Times New Roman', serif (for PDF content)

Font Sizes:
  - Page Title: 28px (bold)
  - Section Header: 20px (semibold)
  - Body Text: 16px (regular)
  - Reading Text: 18px (regular, 1.6 line-height)
  - Caption: 14px (regular)
  - Small: 12px (regular)
```

---

## Layout Structure

### 1. Top Navigation Bar
```
┌─────────────────────────────────────────────────────────┐
│  📚 AI Audiobook Reader          [Settings] [Upload]    │
└─────────────────────────────────────────────────────────┘
Height: 64px
Background: White with subtle shadow
Sticky: Yes (always visible on scroll)
```

**Components:**
- Logo/Title (left)
- Settings icon (right)
- Upload new book button (right)

---

### 2. Main Layout (Two-Column Split)

```
┌──────────────────────────────────────────────────────────┐
│                    Top Navigation                         │
├─────────────────────────────────┬─────────────────────────┤
│                                 │                         │
│                                 │    PDF Viewer           │
│      Audio Controls             │    (Scrollable)         │
│      (Sticky Left Panel)        │                         │
│                                 │    Page 1 content...    │
│  🎧 Now Reading:                │    Page 2 content...    │
│     "Chapter 1"                 │    ...                  │
│                                 │                         │
│  ▶️  ⏸️  ⏹️                      │                         │
│                                 │                         │
│  ━━━━━━━━━━○────                │                         │
│  12:34 / 45:00                  │                         │
│                                 │                         │
│  🔊 Volume: ────○────           │                         │
│  🎚️ Speed: 1.0x                 │                         │
│                                 │                         │
│  📄 Page: 5 / 120               │                         │
│                                 │                         │
└─────────────────────────────────┴─────────────────────────┘
    Left Panel: 360px                Right Panel: Flexible
    (Fixed width)                    (Grows with screen)
```

---

## Component Specifications

### A. Audio Control Panel (Left Sidebar)

**Dimensions:**
- Width: 360px (fixed)
- Background: White
- Border-right: 1px solid #D2D2D7
- Padding: 32px 24px
- Sticky: Yes (scroll with page)

**Elements:**

1. **Now Reading Section**
   ```
   🎧 Now Reading
   ─────────────
   Chapter 1: Introduction
   Page 5 of 120
   ```
   - Icon: 🎧 (28px)
   - Label: "Now Reading" (14px, gray)
   - Chapter: 18px, semibold, black
   - Page info: 14px, gray

2. **Playback Controls**
   ```
   [Previous] [Play/Pause] [Next] [Stop]
   ```
   - Size: 48px × 48px buttons
   - Border-radius: 12px
   - Play button: Larger (56px), primary color
   - Hover: Subtle scale (1.05)
   - Active state: Pressed effect

3. **Progress Bar**
   ```
   ━━━━━━━━━━○────────────
   12:34              45:00
   ```
   - Height: 6px track, 18px thumb
   - Track color: #D2D2D7
   - Progress color: #007AFF
   - Time format: MM:SS
   - Font: Monospace, 14px

4. **Volume Control**
   ```
   🔊 Volume
   ────────○──────
   ```
   - Icon + Slider
   - Same styling as progress bar
   - Range: 0-100%

5. **Speed Control**
   ```
   🎚️ Speed
   [0.75x] [1.0x] [1.25x] [1.5x] [2.0x]
   ```
   - Segmented control
   - Active: Filled with primary color
   - Inactive: Outlined

6. **Page Navigation**
   ```
   📄 Current Page
   ┌──────────────────┐
   │  Page 5 of 120   │
   └──────────────────┘
   [← Prev]    [Next →]
   ```
   - Current page indicator
   - Previous/Next buttons

---

### B. PDF Viewer (Right Side)

**Dimensions:**
- Width: Flexible (remaining space)
- Max-width: 900px (for comfortable reading)
- Margin: 0 auto (centered)
- Background: White
- Padding: 48px 64px

**Rendering:**
- PDF.js canvas rendering
- One page at a time OR continuous scroll
- Page indicators (subtle)
- Smooth scrolling
- Text selection enabled

**Page Layout:**
```
┌────────────────────────────────┐
│                                │
│   [PDF Page 1 Rendered]        │
│                                │
│   Lorem ipsum dolor sit...     │
│   consectetur adipiscing...    │
│   ...                          │
│                                │
├────────────────────────────────┤ ← Page divider
│                                │
│   [PDF Page 2 Rendered]        │
│                                │
└────────────────────────────────┘
```

**Features:**
- Current sentence highlighting (Phase 4)
- Auto-scroll following narration (Phase 4)
- Zoom controls (Phase 5)

---

### C. Upload Screen (Initial State)

**When no book is loaded:**

```
┌──────────────────────────────────────────────────────────┐
│                    Top Navigation                         │
├───────────────────────────────────────────────────────────┤
│                                                           │
│                     ┌─────────────┐                       │
│                     │   📚        │                       │
│                     │   Upload    │                       │
│                     │   PDF       │                       │
│                     └─────────────┘                       │
│                                                           │
│              Drag & drop a PDF file here                  │
│                      or click to browse                   │
│                                                           │
│              Supported: PDF files up to 100MB             │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Upload Zone:**
- Centered vertically and horizontally
- Dashed border on drag-over
- Icon: 64px book emoji
- Drag & drop support
- Click to open file picker
- Loading state with spinner during upload

---

### D. Loading States

**Processing PDF:**
```
┌─────────────────────────┐
│  ⏳ Processing PDF...   │
│  ▓▓▓▓▓▓░░░░ 60%        │
│  Extracting text...     │
└─────────────────────────┘
```

**Loading TTS Model:**
```
┌─────────────────────────┐
│  🎙️ Loading AI voice... │
│  Please wait...          │
└─────────────────────────┘
```

---

## Interactions & Animations

### Hover States
- **Buttons:** Scale 1.05, shadow increase
- **Controls:** Brightness increase
- **Links:** Underline fade-in

### Active States
- **Buttons:** Scale 0.98 (press effect)
- **Sliders:** Thumb scale 1.2

### Transitions
- **Default:** 200ms ease-out
- **Smooth scroll:** 400ms ease-in-out
- **Fade:** 300ms ease

### Microinteractions
- Play button: Morph to pause icon
- Progress bar: Smooth thumb movement
- Page turn: Subtle fade
- Volume: Icon changes with level

---

## Responsive Breakpoints

### Desktop (1200px+)
- Two-column layout as shown above
- Full controls visible

### Tablet (768px - 1199px)
- Left panel: 300px width
- Reduced padding
- Smaller buttons (40px)

### Mobile (< 768px)
- **Stacked layout** (single column)
- Audio controls: Bottom drawer
- Collapsible controls
- Swipe gestures for page navigation
- Floating play button

```
Mobile Layout:
┌────────────────────┐
│   Top Nav Bar      │
├────────────────────┤
│                    │
│   PDF Viewer       │
│   (Full Width)     │
│                    │
├────────────────────┤
│  [▶] Audio         │  ← Drawer (expandable)
└────────────────────┘
```

---

## Accessibility

### ARIA Labels
- All controls have descriptive labels
- Live regions for narration status
- Keyboard navigation support

### Keyboard Shortcuts
- `Space` - Play/Pause
- `←/→` - Previous/Next sentence
- `↑/↓` - Volume up/down
- `[/]` - Speed decrease/increase
- `Esc` - Stop narration

### Screen Reader Support
- Current page announced
- Playback state changes announced
- Time updates (throttled)

---

## Visual States

### Reading States
1. **Idle** - No audio playing
2. **Playing** - Active narration, current sentence highlighted
3. **Paused** - Gray overlay on play button
4. **Loading** - Spinner on audio controls
5. **Error** - Red border, error message

### Page States
1. **Loading** - Skeleton/placeholder
2. **Loaded** - Rendered PDF
3. **Active** - Currently being narrated
4. **Completed** - Gray checkmark

---

## Design Tokens (CSS Variables)

```css
:root {
  /* Colors */
  --color-bg: #F5F5F7;
  --color-surface: #FFFFFF;
  --color-primary: #007AFF;
  --color-secondary: #5856D6;
  --color-text: #1D1D1F;
  --color-text-secondary: #86868B;
  --color-border: #D2D2D7;
  --color-success: #34C759;
  --color-warning: #FF9500;
  --color-error: #FF3B30;
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  
  /* Radius */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;
  
  /* Shadow */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  
  /* Layout */
  --sidebar-width: 360px;
  --content-max-width: 900px;
  --nav-height: 64px;
}
```

---

## Icon Set

Use a consistent icon library: **Lucide Icons** or **Heroicons**

Required icons:
- `Play`, `Pause`, `Stop`
- `SkipForward`, `SkipBack`
- `Volume2`, `VolumeX`
- `Gauge` (speed)
- `FileText` (page)
- `Upload`, `Settings`
- `ChevronLeft`, `ChevronRight`
- `Book`, `Headphones`

---

## Future Enhancements (Phase 5)

- Dark mode toggle
- Custom color themes
- Font size adjustment
- Reading width adjustment
- Bookmark system
- Reading progress tracking
- Multi-book library view
- Voice selection UI

---

This design creates a **premium, professional reading experience** that feels modern and intuitive while keeping the focus on the content and audio narration.
