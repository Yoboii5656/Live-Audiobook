import { useEffect } from 'react'

interface KeyboardShortcutsProps {
  onPlayPause: () => void
  onStop: () => void
  onNextPage: () => void
  onPrevPage: () => void
  onSpeedUp: () => void
  onSpeedDown: () => void
  isEnabled?: boolean
}

export function useKeyboardShortcuts({
  onPlayPause,
  onStop,
  onNextPage,
  onPrevPage,
  onSpeedUp,
  onSpeedDown,
  isEnabled = true,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    if (!isEnabled) return

    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      switch (event.key.toLowerCase()) {
        case ' ':
        case 'k':
          // Space or K - Play/Pause
          event.preventDefault()
          onPlayPause()
          break

        case 's':
          // S - Stop
          event.preventDefault()
          onStop()
          break

        case 'arrowright':
        case 'n':
          // Right arrow or N - Next page
          event.preventDefault()
          onNextPage()
          break

        case 'arrowleft':
        case 'p':
          // Left arrow or P - Previous page
          event.preventDefault()
          onPrevPage()
          break

        case 'arrowup':
        case '+':
        case '=':
          // Up arrow, + or = - Speed up
          event.preventDefault()
          onSpeedUp()
          break

        case 'arrowdown':
        case '-':
          // Down arrow or - - Speed down
          event.preventDefault()
          onSpeedDown()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)

    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [
    onPlayPause,
    onStop,
    onNextPage,
    onPrevPage,
    onSpeedUp,
    onSpeedDown,
    isEnabled,
  ])
}
