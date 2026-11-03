/**
 * Text preparation for narration: sentence splitting, word extraction and word timings.
 * Ported from the former Python backend (backend/services/tts_service.py) so it runs in the browser.
 */

export interface WordTiming {
  word: string
  start: number
  duration: number
}

export interface NarrationPlan {
  sentences: string[]
  /** Index of the sentence that contains the requested start position */
  startIndex: number
  /** Very short pages (one short sentence) are skipped instead of read */
  skipPage: boolean
  /** Every word on the page, in reading order */
  words: string[]
  /** Index in `words` of the first word of each sentence */
  wordOffsets: number[]
}

// Abbreviations whose period must not end a sentence
const ABBREVIATIONS: Array<[string, string]> = [
  ['Mr.', 'Mr<abbr>'],
  ['Mrs.', 'Mrs<abbr>'],
  ['Ms.', 'Ms<abbr>'],
  ['Dr.', 'Dr<abbr>'],
  ['Prof.', 'Prof<abbr>'],
  ['Sr.', 'Sr<abbr>'],
  ['Jr.', 'Jr<abbr>'],
  ['vs.', 'vs<abbr>'],
  ['etc.', 'etc<abbr>'],
  ['Inc.', 'Inc<abbr>'],
  ['Corp.', 'Corp<abbr>'],
  ['Ltd.', 'Ltd<abbr>'],
]

// Sentences longer than this are split on ; : or , so each audio chunk stays short
const MAX_SENTENCE_CHARS = 300
const SPLIT_CHUNK_CHARS = 200
// A page with at most one sentence and fewer characters than this is skipped
const MIN_PAGE_CHARS = 100

/**
 * Split text into sentences for smooth streaming.
 * Handles paragraphs, incomplete sentences, and various punctuation.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text || !text.trim()) {
    return []
  }

  // Normalize whitespace
  let normalized = text.split(/\s+/).filter(Boolean).join(' ')

  // Hide abbreviation periods to avoid false splits
  for (const [abbr, placeholder] of ABBREVIATIONS) {
    normalized = normalized.split(abbr).join(placeholder)
  }

  // Split on sentence boundaries: .!? followed by space and a capital letter
  let sentences = normalized.split(/(?<=[.!?])\s+(?=[A-Z])/)

  // Restore abbreviations
  for (const [abbr, placeholder] of ABBREVIATIONS) {
    sentences = sentences.map((s) => s.split(placeholder).join(abbr))
  }

  sentences = sentences.map((s) => s.trim()).filter(Boolean)
  if (sentences.length === 0) {
    sentences = [normalized]
  }

  // Split very long sentences on natural pauses
  const result: string[] = []
  for (const sentence of sentences) {
    if (sentence.length <= MAX_SENTENCE_CHARS) {
      result.push(sentence)
      continue
    }
    const parts = sentence.split(/([;:,])\s+/)
    let chunk = ''
    for (const part of parts) {
      if (';:,'.includes(part)) {
        chunk += part
      } else if (chunk && chunk.length > SPLIT_CHUNK_CHARS) {
        result.push(chunk.trim())
        chunk = part
      } else {
        chunk += (chunk ? ' ' : '') + part
      }
    }
    if (chunk) {
      result.push(chunk.trim())
    }
  }

  return result
}

/** Split text into words, keeping punctuation attached */
export function extractWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

/**
 * Spread the real audio duration of a sentence over its words,
 * giving longer words proportionally more time.
 */
export function calculateWordTimings(words: string[], audioDuration: number): WordTiming[] {
  const totalChars = words.reduce((sum, word) => sum + word.length, 0)
  const secondsPerChar = totalChars > 0 ? audioDuration / totalChars : 0

  let currentTime = 0
  return words.map((word) => {
    const duration = word.length * secondsPerChar
    const timing = { word, start: currentTime, duration }
    currentTime += duration
    return timing
  })
}

/** Work out what to read on a page, starting at a character position */
export function planNarration(text: string, startPosition = 0): NarrationPlan {
  const sentences = splitIntoSentences(text)
  const skipPage = sentences.length <= 1 && text.trim().length < MIN_PAGE_CHARS

  // Find the sentence that contains the start position
  let startIndex = 0
  let charCount = 0
  for (let i = 0; i < sentences.length; i++) {
    if (charCount + sentences[i].length > startPosition) {
      startIndex = i
      break
    }
    charCount += sentences[i].length + 1 // +1 for the space between sentences
  }

  const words: string[] = []
  const wordOffsets: number[] = []
  for (const sentence of sentences) {
    wordOffsets.push(words.length)
    words.push(...extractWords(sentence))
  }

  return { sentences, startIndex, skipPage, words, wordOffsets }
}
