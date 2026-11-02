import { useState, useEffect, useRef } from 'react'
import './AudioPlayer.css'
import { useAudioStream } from '../../hooks/useAudioStream'
import { usePDFText } from '../../hooks/usePDFText'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface AudioPlayerProps {
  bookId: string
  totalPages: number
  currentPage: number
  onPageChange: (page: number) => void
  pages: Array<{ page: number; text: string }>
  startPosition?: number
  onWordUpdate?: (wordIndex: number, words: string[]) => void
}

export default function AudioPlayer({ 
  bookId, 
  totalPages, 
  currentPage, 
  onPageChange, 
  pages,
  startPosition = 0,
  onWordUpdate 
}: AudioPlayerProps) {
  const [volume, setVolume] = useState(80)
  const [speed, setSpeed] = useState(1.0)

  const speedOptions = [0.75, 1.0, 1.25, 1.5, 2.0]

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
    isConnected,
    currentTime,
    currentSentence,
    totalSentences,
    isBuffering,
    play,
    pause,
    stop,
    error,
  } = useAudioStream({
    bookId,
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
            <span className="now-reading-label">Now Reading</span>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>

          <button 
            className="control-btn control-btn-primary"
            onClick={handlePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>

          <button 
            className="control-btn control-btn-stop"
            onClick={handleStop}
            title="Stop"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-info">
            <span className="progress-label">Progress</span>
            {totalSentences > 0 && (
              <span className="sentence-counter">
                Sentence {currentSentence} of {totalSentences}
              </span>
            )}
          </div>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            <span>Volume</span>
          </div>
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

        {/* Speed Control */}
        <div className="control-section">
          <div className="control-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
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

        {/* Page Navigation */}
        <div className="page-navigation">
          <div className="control-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span>Current Page</span>
          </div>
          <div className="page-display">
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          <div className="page-buttons">
            <button
              className="page-btn"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
            >
              ← Prev
            </button>
            <button
              className="page-btn"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Status Message */}
        <div className="status-message">
          {error && (
            <p style={{ color: '#ef4444' }}>❌ {error}</p>
          )}
          {isBuffering && (
            <p style={{ color: '#3b82f6' }}>⏳ Buffering audio (preparing speech)...</p>
          )}
          {isConnected && !error && !isBuffering && (
            <p style={{ color: '#10b981' }}>✅ Connected to TTS Server</p>
          )}
          {!isConnected && !error && !isBuffering && (
            <p style={{ color: '#f59e0b' }}>⏳ Connecting to server...</p>
          )}
          {isPlaying && !isBuffering && (
            <p>🎧 Now reading page {currentPage}</p>
          )}
          {!isPlaying && currentPage > 1 && totalPages > 0 && (
            <p style={{ color: '#6366f1', fontSize: '0.875rem' }}>
              ℹ️  Starting from page {currentPage} (skipped front matter)
            </p>
          )}
        </div>

        {/* Keyboard Shortcuts */}
        <div className="keyboard-shortcuts">
          <div className="control-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>
            </svg>
            <span>Keyboard Shortcuts</span>
          </div>
          <div className="shortcuts-list">
            <div className="shortcut-item">
              <kbd>Space</kbd> or <kbd>K</kbd>
              <span>Play/Pause</span>
            </div>
            <div className="shortcut-item">
              <kbd>S</kbd>
              <span>Stop</span>
            </div>
            <div className="shortcut-item">
              <kbd>→</kbd> or <kbd>N</kbd>
              <span>Next Page</span>
            </div>
            <div className="shortcut-item">
              <kbd>←</kbd> or <kbd>P</kbd>
              <span>Previous Page</span>
            </div>
            <div className="shortcut-item">
              <kbd>↑</kbd> or <kbd>+</kbd>
              <span>Speed Up</span>
            </div>
            <div className="shortcut-item">
              <kbd>↓</kbd> or <kbd>-</kbd>
              <span>Speed Down</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
