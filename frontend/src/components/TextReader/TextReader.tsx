import { useEffect, useRef } from 'react'
import './TextReader.css'

interface TextReaderProps {
  text: string
  currentWordIndex: number
  words: string[]
  onWordClick?: (charPosition: number) => void
}

export default function TextReader({ 
  text, 
  currentWordIndex, 
  words,
  onWordClick 
}: TextReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const currentWordRef = useRef<HTMLSpanElement>(null)

  // Debug logging
  useEffect(() => {
    console.log(`📖 TextReader state:`, {
      textLength: text?.length || 0,
      wordsCount: words?.length || 0,
      currentWordIndex: currentWordIndex,
      currentWord: words[currentWordIndex] || 'none'
    })
  }, [text, words, currentWordIndex])

  // Auto-scroll to current word
  useEffect(() => {
    if (currentWordRef.current && containerRef.current) {
      const container = containerRef.current
      const wordElement = currentWordRef.current
      
      const containerRect = container.getBoundingClientRect()
      const wordRect = wordElement.getBoundingClientRect()
      
      // Check if word is out of view
      if (wordRect.top < containerRect.top || wordRect.bottom > containerRect.bottom) {
        wordElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentWordIndex])

  // Split text into words with their positions
  const renderTextWithHighlights = () => {
    if (!text || words.length === 0) {
      return <p className="text-content">{text}</p>
    }

    const elements: JSX.Element[] = []
    let currentPosition = 0

    // Process each word
    words.forEach((word, idx) => {
      // Find the word in the remaining text
      const wordPosition = text.indexOf(word, currentPosition)
      
      if (wordPosition === -1) {
        return // Word not found, skip
      }

      // Add any text before this word (whitespace, punctuation)
      if (wordPosition > currentPosition) {
        const beforeText = text.substring(currentPosition, wordPosition)
        elements.push(
          <span key={`before-${idx}`} className="text-spacing">
            {beforeText}
          </span>
        )
      }

      // Add the word itself
      const isCurrentWord = idx === currentWordIndex
      const handleClick = () => {
        if (onWordClick) {
          onWordClick(wordPosition)
        }
      }

      elements.push(
        <span
          key={`word-${idx}`}
          ref={isCurrentWord ? currentWordRef : null}
          className={`text-word ${isCurrentWord ? 'text-word-active' : ''}`}
          onClick={handleClick}
          data-word-index={idx}
          title="Click to start reading from here"
        >
          {word}
        </span>
      )

      currentPosition = wordPosition + word.length
    })

    // Add any remaining text after the last word
    if (currentPosition < text.length) {
      elements.push(
        <span key="after" className="text-spacing">
          {text.substring(currentPosition)}
        </span>
      )
    }

    return <div className="text-content">{elements}</div>
  }

  return (
    <div className="text-reader" ref={containerRef}>
      <div className="text-reader-header">
        <h3>📖 Text View</h3>
        <p className="text-reader-hint">Click any word to start reading from there</p>
      </div>
      <div className="text-reader-content">
        {renderTextWithHighlights()}
      </div>
    </div>
  )
}
