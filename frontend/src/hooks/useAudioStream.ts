import { useEffect, useRef, useState, useCallback } from 'react'
import { ttsService } from '../services/ttsService'
import {
  calculateWordTimings,
  extractWords,
  planNarration,
  type NarrationPlan,
  type WordTiming,
} from '../services/narration'

interface UseAudioStreamProps {
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

// A generated sentence waiting to be played
interface QueuedSentence {
  buffer: AudioBuffer
  sentenceIndex: number
  wordOffset: number  // Index of the sentence's first word in the page's word list
  timings: WordTiming[]
}

// Buffering: wait for N generated sentences before starting playback
const MIN_BUFFER_CHUNKS = 2

/**
 * Reads a page aloud. Sentences are generated on this device by the speech worker
 * and played back to back with the Web Audio API, highlighting the current word.
 */
export function useAudioStream({
  currentPage,
  pageText,
  speed,
  volume,
  startPosition: _startPosition = 0,
  onPageComplete,
  onWordUpdate,
}: UseAudioStreamProps): UseAudioStreamReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [currentSentence, setCurrentSentence] = useState(0)
  const [totalSentences, setTotalSentences] = useState(0)
  const [isBuffering, setIsBuffering] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [allWords, setAllWords] = useState<string[]>([])

  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const volumeRef = useRef(volume)
  // Incrementing the session cancels sentences that are still being generated
  const sessionRef = useRef(0)
  const queueRef = useRef<QueuedSentence[]>([])
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const currentItemRef = useRef<QueuedSentence | null>(null)
  // AudioContext time when the current sentence started playing
  const itemStartTimeRef = useRef(0)
  // Seconds of audio fully played on this page
  const playedSecondsRef = useRef(0)
  // Ref mirror of isPlaying so async callbacks always see the current value
  const isPlayingRef = useRef(false)
  const hasStartedPlaybackRef = useRef(false)
  // Every sentence of the page has been generated
  const generationDoneRef = useRef(false)
  const wordsRef = useRef<string[]>([])
  const wordIndexRef = useRef(-1)
  const animationFrameRef = useRef(0)

  // Audio events fire later, so they read the latest callbacks from refs
  const onPageCompleteRef = useRef(onPageComplete)
  const onWordUpdateRef = useRef(onWordUpdate)
  useEffect(() => {
    onPageCompleteRef.current = onPageComplete
    onWordUpdateRef.current = onWordUpdate
  }, [onPageComplete, onWordUpdate])

  // Lazily create the AudioContext on first play (browser autoplay policy requires a user gesture)
  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const context = new AudioContext()
      const gain = context.createGain()
      gain.gain.value = volumeRef.current / 100
      gain.connect(context.destination)
      audioContextRef.current = context
      gainNodeRef.current = gain
    }
    if (audioContextRef.current.state === 'suspended') {
      void audioContextRef.current.resume()
    }
  }, [])

  useEffect(() => {
    return () => {
      void audioContextRef.current?.close()
      audioContextRef.current = null
      gainNodeRef.current = null
    }
  }, [])

  // Update gain whenever volume changes
  useEffect(() => {
    volumeRef.current = volume
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100
    }
  }, [volume])

  // Stop the playing sentence without running its "ended" handler
  const stopSource = useCallback(() => {
    const source = currentSourceRef.current
    currentSourceRef.current = null
    currentItemRef.current = null
    if (source) {
      source.onended = null
      try {
        source.stop()
      } catch {
        // Already stopped
      }
    }
  }, [])

  // Stop all audio and clear buffers
  const stopAudio = useCallback(() => {
    stopSource()
    queueRef.current = []
    hasStartedPlaybackRef.current = false
    generationDoneRef.current = false
    playedSecondsRef.current = 0
    setIsBuffering(false)
    setCurrentTime(0)
  }, [stopSource])

  // All sentences of the page have played
  const finishPage = useCallback(() => {
    console.log('🎉 Page playback completed — triggering onPageComplete')
    isPlayingRef.current = false
    setIsPlaying(false)
    setIsBuffering(false)
    setCurrentTime(0)
    onPageCompleteRef.current?.()
  }, [])

  // Play the next generated sentence if possible, or finish the page when nothing is left
  const advance = useCallback(
    function advance() {
      const context = audioContextRef.current
      const gain = gainNodeRef.current
      if (!isPlayingRef.current || currentSourceRef.current || !context || !gain) return

      const queued = queueRef.current.length
      const done = generationDoneRef.current
      const canStart = hasStartedPlaybackRef.current || queued >= MIN_BUFFER_CHUNKS || done

      if (queued > 0 && canStart) {
        const item = queueRef.current.shift()!
        const source = context.createBufferSource()
        source.buffer = item.buffer
        source.connect(gain)
        source.onended = () => {
          if (currentSourceRef.current !== source) return
          currentSourceRef.current = null
          currentItemRef.current = null
          playedSecondsRef.current += item.buffer.duration
          advance()
        }

        if (!hasStartedPlaybackRef.current) {
          console.log(`🎬 Starting playback with ${queued} buffered sentence(s)`)
          hasStartedPlaybackRef.current = true
        }
        source.start()
        currentSourceRef.current = source
        currentItemRef.current = item
        itemStartTimeRef.current = context.currentTime
        setCurrentSentence(item.sentenceIndex + 1)
        setIsBuffering(false)
      } else if (queued === 0 && done) {
        finishPage()
      } else {
        // Waiting for the next sentence to be generated
        setIsBuffering(true)
      }
    },
    [finishPage]
  )

  // Generate the page's sentences one at a time and queue them for playback
  const generateSentences = useCallback(
    async (session: number, plan: NarrationPlan, narrationSpeed: number) => {
      const isCurrentSession = () => sessionRef.current === session
      const lastIndex = plan.sentences.length - 1

      for (let i = plan.startIndex; i <= lastIndex; i++) {
        const sentence = plan.sentences[i]
        const startedAt = performance.now()
        try {
          const { samples, sampleRate } = await ttsService.generate(sentence, narrationSpeed)
          const context = audioContextRef.current
          if (!isCurrentSession() || !context) return

          const buffer = context.createBuffer(1, Math.max(1, samples.length), sampleRate)
          buffer.getChannelData(0).set(samples)
          queueRef.current.push({
            buffer,
            sentenceIndex: i,
            wordOffset: plan.wordOffsets[i],
            timings: calculateWordTimings(extractWords(sentence), buffer.duration),
          })
          const seconds = (performance.now() - startedAt) / 1000
          console.log(
            `🎤 Sentence ${i + 1}/${plan.sentences.length}: ${buffer.duration.toFixed(1)}s of audio in ${seconds.toFixed(1)}s`
          )
        } catch (err) {
          if (!isCurrentSession()) return
          const message = err instanceof Error ? err.message : String(err)
          if (ttsService.getState().status === 'error') {
            console.error('Voice model error:', err)
            setError(`Could not load the voice model: ${message}`)
            isPlayingRef.current = false
            setIsPlaying(false)
            setIsBuffering(false)
            return
          }
          // Skip a sentence the model cannot read and keep going
          console.warn(`⚠️  Skipping sentence ${i + 1}: ${message}`)
        }

        if (i === lastIndex) {
          generationDoneRef.current = true
        }
        advance()
      }
    },
    [advance]
  )

  // Play
  const play = useCallback((startPos: number = 0) => {
    if (!pageText.trim()) {
      setError('No text to read on this page')
      return
    }

    // Must call inside a user-gesture handler — this is triggered by a button click
    ensureAudioContext()

    // Cancel whatever is still playing or being generated
    const session = ++sessionRef.current
    stopAudio()

    const plan = planNarration(pageText, startPos)
    setError(null)
    setTotalSentences(plan.sentences.length)
    setCurrentSentence(plan.startIndex)
    wordsRef.current = plan.words
    wordIndexRef.current = -1
    setAllWords(plan.words)
    setCurrentWordIndex(0)

    if (plan.skipPage) {
      // Only one short chunk on this page (a title, a page number...) - move to the next page
      console.log(`⏭️  Skipping page ${currentPage}: single_chunk_page`)
      isPlayingRef.current = false
      setIsPlaying(false)
      onPageCompleteRef.current?.()
      return
    }

    console.log(`📖 Reading page ${currentPage} from sentence ${plan.startIndex + 1}/${plan.sentences.length}`)
    // Set playing BEFORE generating — so the first sentences start playback
    isPlayingRef.current = true
    setIsPlaying(true)
    setIsBuffering(true)
    void generateSentences(session, plan, speed)
  }, [pageText, speed, currentPage, ensureAudioContext, stopAudio, generateSentences])

  // Pause
  const pause = useCallback(() => {
    sessionRef.current++  // Stop generating more sentences
    isPlayingRef.current = false
    stopSource()
    setIsPlaying(false)
    setIsBuffering(false)
  }, [stopSource])

  // Stop
  const stop = useCallback(() => {
    sessionRef.current++
    isPlayingRef.current = false
    stopAudio()
    setIsPlaying(false)
  }, [stopAudio])

  // Animate the elapsed-time counter and word highlighting
  useEffect(() => {
    if (!isPlaying) return

    let shownSecond = -1
    const update = () => {
      const context = audioContextRef.current
      const item = currentItemRef.current
      if (context && item) {
        const sentenceTime = Math.min(
          Math.max(0, context.currentTime - itemStartTimeRef.current),
          item.buffer.duration
        )
        const elapsed = playedSecondsRef.current + sentenceTime
        if (Math.floor(elapsed) !== shownSecond) {
          shownSecond = Math.floor(elapsed)
          setCurrentTime(elapsed)
        }

        // Find which word of the playing sentence we're on
        const localIndex = item.timings.findIndex(
          (timing) => sentenceTime >= timing.start && sentenceTime < timing.start + timing.duration
        )
        if (localIndex !== -1) {
          const wordIndex = item.wordOffset + localIndex
          if (wordIndex !== wordIndexRef.current) {
            wordIndexRef.current = wordIndex
            setCurrentWordIndex(wordIndex)
            onWordUpdateRef.current?.(wordIndex, wordsRef.current)
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(update)
    }

    animationFrameRef.current = requestAnimationFrame(update)
    return () => cancelAnimationFrame(animationFrameRef.current)
  }, [isPlaying])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stop()
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
