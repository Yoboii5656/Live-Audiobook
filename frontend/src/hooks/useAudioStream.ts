import { useEffect, useRef, useState, useCallback } from 'react'

interface WordTiming {
  word: string
  start: number
  duration: number
}

interface UseAudioStreamProps {
  bookId: string
  currentPage: number
  pageText: string
  speed: number
  volume: number
  startPosition?: number  // Character position to start from
  onPageComplete?: () => void  // Callback when current page audio finishes
  onWordUpdate?: (wordIndex: number, words: string[]) => void  // Callback when current word changes
}

interface UseAudioStreamReturn {
  isPlaying: boolean
  isConnected: boolean
  currentTime: number
  currentSentence: number
  totalSentences: number
  currentWordIndex: number
  allWords: string[]
  isBuffering: boolean
  play: (startPos?: number) => void
  pause: () => void
  stop: () => void
  error: string | null
}

export function useAudioStream({
  bookId,
  currentPage,
  pageText,
  speed,
  volume,
  startPosition: _startPosition = 0,
  onPageComplete,
  onWordUpdate,
}: UseAudioStreamProps): UseAudioStreamReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [currentSentence, setCurrentSentence] = useState(0)
  const [totalSentences, setTotalSentences] = useState(0)
  const [isBuffering, setIsBuffering] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [allWords, setAllWords] = useState<string[]>([])
  
  // Word timing tracking
  const wordTimingsRef = useRef<WordTiming[]>([])
  const sentenceWordOffsetsRef = useRef<number[]>([])  // Track word offset for each sentence
  const currentSentenceStartTimeRef = useRef<number>(0)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBuffersRef = useRef<AudioBuffer[]>([])
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const startTimeRef = useRef<number>(0)
  const pauseTimeRef = useRef<number>(0)
  const animationFrameRef = useRef<number>(0)
  const sentenceCountRef = useRef<number>(0)
  // Ref mirror of isPlaying so WebSocket/async closures always see the current value
  const isPlayingRef = useRef<boolean>(false)
  // Buffering: wait for N chunks before starting playback
  const MIN_BUFFER_CHUNKS = 2
  const hasStartedPlaybackRef = useRef<boolean>(false)
  // Track when server has finished streaming all chunks for this page
  const streamingCompletedRef = useRef<boolean>(false)

  // Keep isPlayingRef in sync with state
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  // Lazily create the AudioContext on first play (browser autoplay policy requires a user gesture)
  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
      gainNodeRef.current = audioContextRef.current.createGain()
      gainNodeRef.current.gain.value = volume / 100
      gainNodeRef.current.connect(audioContextRef.current.destination)
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
  }, [volume])

  useEffect(() => {
    return () => {
      audioContextRef.current?.close()
    }
  }, [])

  // Update gain whenever volume changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100
    }
  }, [volume])

  // Stop all audio and clear buffers
  const stopAudio = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop()
      } catch {
        // Already stopped
      }
      currentSourceRef.current = null
    }
    audioBuffersRef.current = []
    hasStartedPlaybackRef.current = false  // Reset buffering state
    streamingCompletedRef.current = false  // Reset completion tracking
    setIsBuffering(false)
    setCurrentTime(0)
    pauseTimeRef.current = 0
  }, [])

  // Play the next decoded buffer from the queue
  const playNextBuffer = useCallback(() => {
    if (!audioContextRef.current || !gainNodeRef.current) return
    if (audioBuffersRef.current.length === 0) return

    const audioBuffer = audioBuffersRef.current.shift()!
    const source = audioContextRef.current.createBufferSource()
    source.buffer = audioBuffer
    source.connect(gainNodeRef.current)

    // Track the start time for word highlighting
    const bufferStartTime = audioContextRef.current.currentTime
    currentSentenceStartTimeRef.current = bufferStartTime

    source.onended = () => {
      currentSourceRef.current = null
      if (audioBuffersRef.current.length > 0 && isPlayingRef.current) {
        // More buffers in queue, play next
        playNextBuffer()
      } else if (streamingCompletedRef.current && audioBuffersRef.current.length === 0) {
        // All done: server finished streaming AND all buffers played
        console.log('🎉 Page playback completed — triggering onPageComplete')
        setIsPlaying(false)
        isPlayingRef.current = false
        setCurrentTime(0)
        streamingCompletedRef.current = false  // Reset for next page
        // Trigger callback to advance to next page
        if (onPageComplete) {
          onPageComplete()
        }
      } else if (isPlayingRef.current) {
        // Queue empty but streaming might still be in progress — wait for more chunks
      } else {
        // Stopped manually
        setIsPlaying(false)
        setCurrentTime(0)
      }
    }

    source.start()
    currentSourceRef.current = source
    startTimeRef.current = audioContextRef.current.currentTime
  }, [onPageComplete])

  // Handle a raw WAV ArrayBuffer arriving from the WebSocket
  const handleAudioData = useCallback(async (arrayBuffer: ArrayBuffer) => {
    if (!audioContextRef.current) return

    try {
      // slice(0) copies the buffer so decodeAudioData can own it
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer.slice(0))
      audioBuffersRef.current.push(audioBuffer)

      console.log(`📦 Buffered chunk ${audioBuffersRef.current.length} (started: ${hasStartedPlaybackRef.current})`)

      // Wait for MIN_BUFFER_CHUNKS before starting playback the first time
      if (isPlayingRef.current && !currentSourceRef.current && !hasStartedPlaybackRef.current) {
        if (audioBuffersRef.current.length >= MIN_BUFFER_CHUNKS) {
          console.log(`🎬 Starting playback with ${audioBuffersRef.current.length} buffered chunks`)
          hasStartedPlaybackRef.current = true
          setIsBuffering(false)
          playNextBuffer()
        } else {
          console.log(`⏳ Waiting for ${MIN_BUFFER_CHUNKS - audioBuffersRef.current.length} more chunks before starting...`)
          setIsBuffering(true)
        }
      } else if (isPlayingRef.current && hasStartedPlaybackRef.current && !currentSourceRef.current) {
        // Already started, just resume immediately
        playNextBuffer()
      }
    } catch (err) {
      console.error('Error decoding audio chunk:', err)
      setIsBuffering(false)
    }
  }, [playNextBuffer])

  // Connect (or reuse) the WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.hostname}:8000/api/tts/stream`)
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      setError(null)
    }

    ws.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        const message = JSON.parse(event.data)
        if (message.error) {
          setError(message.error)
          setIsPlaying(false)
          isPlayingRef.current = false
        } else if (message.type === 'timing') {
          // Received word timing information for a sentence
          const words = message.words || []
          const timings = message.word_timings || []
          const sentenceIndex = message.sentence_index || 0
          
          console.log(`📝 Received timing for sentence ${sentenceIndex + 1}:`, {
            words: words,
            wordCount: words.length,
            timings: timings.length
          })
          
          // Store word offset for this sentence
          const wordOffset = wordTimingsRef.current.length
          sentenceWordOffsetsRef.current[sentenceIndex] = wordOffset
          
          // Append words and timings
          setAllWords(prev => {
            const updated = [...prev, ...words]
            console.log(`📚 Total words now: ${updated.length}`)
            return updated
          })
          wordTimingsRef.current.push(...timings)
          
          console.log(`⏱️  Word timings stored:`, timings.slice(0, 3))  // Log first 3 for debugging
          
        } else if (message.type === 'single_chunk_page') {
          // Server detected page has only one chunk - skip to next page
          console.log('⏭️  Page has only one chunk - auto-advancing to next page')
          setIsPlaying(false)
          isPlayingRef.current = false
          streamingCompletedRef.current = false
          // Trigger page advance
          if (onPageComplete) {
            onPageComplete()
          }
        } else if (message.status === 'completed') {
          console.log('Audio streaming completed — draining remaining buffers')
          streamingCompletedRef.current = true
          // Don't touch isPlaying; let playNextBuffer drain the queue and trigger onPageComplete
        } else if (message.status === 'paused') {
          setIsPlaying(false)
          isPlayingRef.current = false
        } else if (message.status === 'stopped') {
          setIsPlaying(false)
          isPlayingRef.current = false
          stopAudio()
        }
      } else {
        // Binary audio chunk
        sentenceCountRef.current += 1
        setCurrentSentence(sentenceCountRef.current)
        await handleAudioData(event.data as ArrayBuffer)
      }
    }

    ws.onerror = (err) => {
      console.error('WebSocket error:', err)
      setError('Connection error')
      setIsConnected(false)
    }

    ws.onclose = () => {
      console.log('WebSocket closed')
      setIsConnected(false)
    }

    wsRef.current = ws
  }, [handleAudioData, stopAudio])

  // Play
  const play = useCallback((startPos: number = 0) => {
    if (!pageText.trim()) {
      setError('No text to read on this page')
      return
    }

    // Must call inside a user-gesture handler — this is triggered by a button click
    ensureAudioContext()

    const sentences = pageText.split(/[.!?]+/).filter(s => s.trim().length > 0)
    setTotalSentences(sentences.length)
    sentenceCountRef.current = 0
    setCurrentSentence(0)
    
    // Reset word tracking
    setAllWords([])
    setCurrentWordIndex(0)
    wordTimingsRef.current = []
    sentenceWordOffsetsRef.current = []

    connectWebSocket()

    const checkConnection = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        clearInterval(checkConnection)

        stopAudio() // clear leftovers from previous play

        // Reset completion tracking for new page
        streamingCompletedRef.current = false

        // Set playing BEFORE sending — so the first chunk triggers playback
        setIsPlaying(true)
        isPlayingRef.current = true

        wsRef.current.send(
          JSON.stringify({
            action: 'start',
            book_id: bookId,
            page_number: currentPage,
            speed: speed,
            text: pageText,
            start_position: startPos,  // Add start position
          })
        )

        setError(null)
      }
    }, 100)

    setTimeout(() => {
      clearInterval(checkConnection)
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        setError('Failed to connect to server')
      }
    }, 5000)
  }, [bookId, currentPage, pageText, speed, connectWebSocket, ensureAudioContext, stopAudio])

  // Pause
  const pause = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'pause' }))
    }

    isPlayingRef.current = false

    if (currentSourceRef.current && audioContextRef.current) {
      try { currentSourceRef.current.stop() } catch { /* already stopped */ }
      currentSourceRef.current = null
      pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current
    }

    setIsPlaying(false)
  }, [])

  // Stop
  const stop = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'stop' }))
    }

    isPlayingRef.current = false
    stopAudio()
    setIsPlaying(false)
  }, [stopAudio])

  // Animate the elapsed-time counter and word highlighting
  useEffect(() => {
    if (!isPlaying || !audioContextRef.current) return

    const updateTime = () => {
      if (audioContextRef.current && startTimeRef.current > 0) {
        const elapsed = audioContextRef.current.currentTime - startTimeRef.current
        setCurrentTime(elapsed)
        
        // Update current word based on timings
        if (wordTimingsRef.current.length > 0) {
          const currentSentenceIdx = sentenceCountRef.current - 1
          
          if (currentSentenceIdx >= 0 && sentenceWordOffsetsRef.current[currentSentenceIdx] !== undefined) {
            const wordOffset = sentenceWordOffsetsRef.current[currentSentenceIdx]
            const sentenceTimings = wordTimingsRef.current.slice(
              wordOffset,
              sentenceWordOffsetsRef.current[currentSentenceIdx + 1] || wordTimingsRef.current.length
            )
            
            // Calculate time since this sentence started
            const sentenceStartTime = currentSentenceStartTimeRef.current
            const timeSinceSentenceStart = audioContextRef.current.currentTime - sentenceStartTime
            
            // Find which word in THIS sentence we're on
            for (let i = 0; i < sentenceTimings.length; i++) {
              const timing = sentenceTimings[i]
              if (timing.start <= timeSinceSentenceStart && timeSinceSentenceStart < timing.start + timing.duration) {
                const globalWordIndex = wordOffset + i
                if (currentWordIndex !== globalWordIndex) {
                  console.log(`🎯 Word ${globalWordIndex}: "${timing.word}" at ${timeSinceSentenceStart.toFixed(2)}s`)
                  setCurrentWordIndex(globalWordIndex)
                  if (onWordUpdate) {
                    onWordUpdate(globalWordIndex, allWords)
                  }
                }
                break
              }
            }
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(updateTime)
    }

    animationFrameRef.current = requestAnimationFrame(updateTime)
    return () => cancelAnimationFrame(animationFrameRef.current)
  }, [isPlaying, allWords, onWordUpdate, currentWordIndex])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stop()
      wsRef.current?.close()
    }
  }, [stop])

  // Note: Removed auto-restart on page change — now handled by onPageComplete callback
  // which allows continuous reading across pages without interruption

  // Restart narration when speed changes mid-play
  useEffect(() => {
    if (isPlaying) {
      stop()
      const t = setTimeout(play, 100)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed])

  return {
    isPlaying,
    isConnected,
    currentTime,
    currentSentence,
    totalSentences,
    currentWordIndex,
    allWords,
    isBuffering,
    play,
    pause,
    stop,
    error,
  }
}
