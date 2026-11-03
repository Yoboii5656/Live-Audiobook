import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import './AudioPlayer.css'
import { useAudioStream } from '../../hooks/useAudioStream'
import { usePDFText } from '../../hooks/usePDFText'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { ttsService } from '../../services/ttsService'

interface AudioPlayerProps {
  totalPages: number
  currentPage: number
  onPageChange: (page: number) => void
  pages: Array<{ page: number; text: string }>
  startPosition?: number
  onWordUpdate?: (wordIndex: number, words: string[]) => void
}

// Approximate one-time download (model + speech runtime) per device
const MODEL_DOWNLOAD_MB = { webgpu: 330, wasm: 110 } as const

export default function AudioPlayer({ 
  totalPages, 
  currentPage, 
  onPageChange, 
  pages,
  startPosition = 0,
  onWordUpdate 
}: AudioPlayerProps) {
  const [volume, setVolume] = useState(80)
  const [speed, setSpeed] = useState(1.0)

  // The voice model runs in this browser; start downloading it as soon as a book is open
  const voiceModel = useSyncExternalStore(ttsService.subscribe, ttsService.getState)
  useEffect(() => {
    ttsService.load()
  }, [])

  const speedOptions = [0.75, 1.0, 1.25, 1.5, 2.0]

  // Text typed in the "Jump to Page" box; applied on Enter or blur
  const [pageInput, setPageInput] = useState(String(currentPage))
  useEffect(() => {
    setPageInput(String(currentPage))
  }, [currentPage])

  const commitPageInput = () => {
    const page = parseInt(pageInput, 10)
    if (Number.isNaN(page)) {
      setPageInput(String(currentPage))
      return
    }
    const clamped = Math.min(Math.max(page, 1), totalPages)
    setPageInput(String(clamped))
    if (clamped !== currentPage) {
      onPageChange(clamped)
    }
  }

  // Track if we're in continuous reading mode (auto-advancing pages)
  const continuousReadingRef = useRef(false)

  // Get current page text
  const { currentPageText } = usePDFText({ pages, currentPage })

  // Handle automatic page advancement when audio completes
  const handlePageComplete = () => {
    console.log(`📖 Page ${currentPage} completed`)
    if (currentPage < totalPages) {
      console.log(`➡️  Auto-advancing to page ${currentPage + 1}`)
      continuousReadingRef.current = true  // Mark that we're auto-advancing
      onPageChange(currentPage + 1)
      // Play will be triggered automatically via useEffect when page updates
    } else {
      console.log('📕 Reached end of book')
      continuousReadingRef.current = false
      // Book finished — stop playback
    }
  }

  // Audio streaming hook
  const {
    isPlaying,
    isBuffering,
    currentTime,
    currentSentence,
    totalSentences,
    play,
    pause,
    stop,
    error,
  } = useAudioStream({
    currentPage,
    pageText: currentPageText,
    speed,
    volume,
    startPosition,
    onPageComplete: handlePageComplete,
    onWordUpdate,
  })

  // Auto-play when page changes during continuous reading (MUST be after useAudioStream)
  useEffect(() => {
    if (continuousReadingRef.current && currentPageText !== undefined) {
      const trimmedText = currentPageText.trim()
      
      // If page has no text or very little text, skip to next page
      if (!trimmedText || trimmedText.length < 20) {
        console.log(`⏭️  Auto-skipping page ${currentPage} (empty or image-only)`)
        if (currentPage < totalPages) {
          // Skip to next page
          setTimeout(() => {
            onPageChange(currentPage + 1)
          }, 100)
        } else {
          // End of book
          console.log('📕 Reached end of book')
          continuousReadingRef.current = false
        }
        return
      }
      
      // Page has content, play it
      console.log(`▶️  Auto-playing page ${currentPage} (continuous reading)`)
      const timer = setTimeout(() => {
        play()
        continuousReadingRef.current = false  // Reset flag after starting play
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [currentPage, currentPageText, play, totalPages, onPageChange])

  const handlePlayPause = () => {
    if (isPlaying) {
      pause()
    } else {
      // Check if current page has text before playing
      const trimmedText = currentPageText?.trim() || ''
      if (!trimmedText || trimmedText.length < 20) {
        // Current page is empty/image-only, find next page with text
        console.log(`⏭️  Skipping page ${currentPage} (no text)`)
        let nextPage = currentPage + 1
        while (nextPage <= totalPages) {
          const nextPageData = pages.find(p => p.page === nextPage)
          const nextText = nextPageData?.text?.trim() || ''
          if (nextText && nextText.length >= 20) {
            console.log(`➡️  Moving to page ${nextPage} (has text)`)
            onPageChange(nextPage)
            continuousReadingRef.current = true
            break
          }
          nextPage++
        }
        if (nextPage > totalPages) {
          console.log('❌ No pages with text found')
        }
      } else {
        play(startPosition)  // Pass start position
      }
    }
  }

  const handleStop = () => {
    stop()
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  const handleSpeedUp = () => {
    const currentIndex = speedOptions.indexOf(speed)
    if (currentIndex < speedOptions.length - 1) {
      setSpeed(speedOptions[currentIndex + 1])
    }
  }

  const handleSpeedDown = () => {
    const currentIndex = speedOptions.indexOf(speed)
    if (currentIndex > 0) {
      setSpeed(speedOptions[currentIndex - 1])
    }
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onPlayPause: handlePlayPause,
    onStop: handleStop,
    onNextPage: handleNextPage,
    onPrevPage: handlePrevPage,
    onSpeedUp: handleSpeedUp,
    onSpeedDown: handleSpeedDown,
    isEnabled: true,
  })

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="audio-player">
      <div className="audio-player-content">
        {/* Now Reading Section */}
        <div className="now-reading">
          <div className="now-reading-icon">🎧</div>
          <div className="now-reading-info">
            <span className="now-reading-label">NOW READING</span>
            <h3 className="now-reading-chapter">Page {currentPage}</h3>
            <span className="now-reading-page">of {totalPages} pages</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="playback-controls">
          <button 
            className="control-btn control-btn-secondary"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            title="Previous Page"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
          </button>

          <button 
            className="control-btn control-btn-primary"
            onClick={handlePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          <button 
            className="control-btn control-btn-secondary"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            title="Next Page"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
            </svg>
          </button>

          <button 
            className="control-btn control-btn-stop"
            onClick={handleStop}
            title="Stop"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1"/>
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-bar-container">
            <input
              type="range"
              className="progress-bar"
              min="0"
              max="100"
              value={totalSentences > 0 ? (currentSentence / totalSentences) * 100 : 0}
              readOnly
            />
          </div>
          <div className="progress-time">
            <span>{formatTime(currentTime)}</span>
            <span>{totalSentences > 0 ? `${Math.round((currentSentence / totalSentences) * 100)}%` : '0%'}</span>
          </div>
        </div>

        {/* Volume Control */}
        <div className="control-section">
          <div className="control-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            <span>Volume</span>
          </div>
          <div className="slider-container">
            <input
              type="range"
              className="slider"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
            <span className="slider-value">{volume}%</span>
          </div>
        </div>

        {/* Speed Control */}
        <div className="control-section">
          <div className="control-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44zm-9.79 6.84a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z"/>
            </svg>
            <span>Speed</span>
          </div>
          <div className="speed-options">
            {speedOptions.map((option) => (
              <button
                key={option}
                className={`speed-btn ${speed === option ? 'active' : ''}`}
                onClick={() => setSpeed(option)}
              >
                {option}x
              </button>
            ))}
          </div>
        </div>

        {/* Jump to Page */}
        <div className="page-navigation">
          <div className="control-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
            <span>Jump to Page</span>
          </div>
          <div className="page-jump-container">
            <input
              type="number"
              min="1"
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitPageInput()
                  e.currentTarget.blur()
                }
              }}
              onBlur={commitPageInput}
              className="page-input"
            />
            <span className="page-total">of {totalPages}</span>
          </div>
          <div className="page-buttons">
            <button
              className="page-btn page-btn-prev"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
            >
              ← Prev
            </button>
            <button
              className="page-btn page-btn-next"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Voice model and generation status */}
        {voiceModel.status === 'loading' && (
          <div className="status-info">
            <span>
              {voiceModel.progress > 0 && voiceModel.progress < 1
                ? `Loading voice model… ${Math.round(voiceModel.progress * 100)}%`
                : 'Preparing voice model…'}
            </span>
            <div className="status-progress">
              <div
                className="status-progress-fill"
                style={{ width: `${Math.round(voiceModel.progress * 100)}%` }}
              />
            </div>
            {voiceModel.device && (
              <span className="status-hint">
                One-time download of about {MODEL_DOWNLOAD_MB[voiceModel.device]} MB.
                Later visits load it from your browser.
              </span>
            )}
          </div>
        )}
        {voiceModel.status === 'ready' && isPlaying && isBuffering && (
          <div className="status-info">Generating audio…</div>
        )}

        {/* Errors */}
        {(error || voiceModel.status === 'error') && (
          <div className="status-error">
            ⚠️ {error ?? `Could not load the voice model: ${voiceModel.error}`}
          </div>
        )}
      </div>
    </div>
  )
}
