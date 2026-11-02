import { useState } from 'react'
import PDFViewer from './components/PDFViewer/PDFViewer'
import AudioPlayer from './components/AudioPlayer/AudioPlayer'
import TextReader from './components/TextReader/TextReader'
import './App.css'

interface BookInfo {
  book_id: string;
  total_pages: number;
  pages: Array<{
    page: number;
    text: string;
  }>;
}

/**
 * Find the Introduction page in books.
 * Most books have an Introduction section that's the best starting point.
 * If no Introduction found, falls back to other content detection.
 */
function findStartingPage(pages: Array<{ page: number; text: string }>): number {
  // PRIORITY 1: Look for "Introduction" (most important)
  const introductionKeywords = [
    /\bintroduction\b/i,
    /\bintroducing\b/i,
  ]
  
  for (const pageData of pages) {
    const text = pageData.text.trim()
    
    // Skip very short pages (likely just headers)
    if (text.length < 50) continue
    
    // Check for Introduction
    const hasIntroduction = introductionKeywords.some(regex => regex.test(text))
    if (hasIntroduction && text.length > 100) {  // Must have substantial content
      console.log(`📖 Found Introduction at page ${pageData.page}`)
      return pageData.page
    }
  }
  
  // PRIORITY 2: Look for Chapter 1 or Chapter One
  const chapter1Keywords = [
    /\bchapter\s+1\b/i,
    /\bchapter\s+one\b/i,
    /\bchapter\s+i\b/i,
  ]
  
  for (const pageData of pages) {
    const text = pageData.text.trim()
    if (text.length < 50) continue
    
    const hasChapter1 = chapter1Keywords.some(regex => regex.test(text))
    if (hasChapter1 && text.length > 100) {
      console.log(`📖 Found Chapter 1 at page ${pageData.page}`)
      return pageData.page
    }
  }
  
  // PRIORITY 3: Look for Preface or Prologue
  const prologueKeywords = [
    /\bpreface\b/i,
    /\bprologue\b/i,
  ]
  
  for (const pageData of pages) {
    const text = pageData.text.trim()
    if (text.length < 50) continue
    
    const hasPrologue = prologueKeywords.some(regex => regex.test(text))
    if (hasPrologue && text.length > 100) {
      console.log(`📖 Found Preface/Prologue at page ${pageData.page}`)
      return pageData.page
    }
  }
  
  // PRIORITY 4: Look for any numbered chapter
  const anyChapterKeywords = [
    /\bchapter\s+\d+/i,
    /\bpart\s+\d+/i,
    /\bpart\s+one\b/i,
    /\bpart\s+i\b/i,
  ]
  
  // Keywords that indicate front matter (skip these)
  const frontMatterKeywords = [
    /\bcopyright\b/i,
    /\ball rights reserved\b/i,
    /\bpublished by\b/i,
    /\bisbn\b/i,
    /\bedition\b/i,
    /\bprinted in\b/i,
    /\btable of contents\b/i,
    /\bcontents\b/i,
    /\bdedication\b/i,
    /\backnowledg/i,
  ]

  let firstSubstantialPage = -1

  for (const pageData of pages) {
    const text = pageData.text.trim()
    
    // Skip empty or very short pages
    if (text.length < 50) {
      console.log(`⏭️  Skipping page ${pageData.page} (too short: ${text.length} chars)`)
      continue
    }

    // Skip pages with front matter keywords
    const hasFrontMatter = frontMatterKeywords.some(regex => regex.test(text))
    if (hasFrontMatter) {
      console.log(`⏭️  Skipping page ${pageData.page} (front matter detected)`)
      continue
    }

    // Check for any chapter keyword
    const hasChapterKeyword = anyChapterKeywords.some(regex => regex.test(text))
    if (hasChapterKeyword) {
      console.log(`📖 Starting at page ${pageData.page} (found chapter)`)
      return pageData.page
    }

    // Track first page with substantial content as fallback
    if (firstSubstantialPage === -1 && text.length > 150) {
      // Make sure it's not just a table of contents (lots of numbers/dots)
      const hasLotsOfNumbers = (text.match(/\d/g) || []).length / text.length > 0.3
      const hasLotsDots = (text.match(/\./g) || []).length / text.length > 0.2
      
      if (!hasLotsOfNumbers && !hasLotsDots) {
        firstSubstantialPage = pageData.page
        console.log(`📝 Noted potential start at page ${pageData.page} (substantial content)`)
      }
    }
  }

  // Use the first substantial page if we found one
  if (firstSubstantialPage !== -1) {
    console.log(`📖 Starting at page ${firstSubstantialPage} (first substantial content)`)
    return firstSubstantialPage
  }

  // Fallback: start at first page with any text
  for (const pageData of pages) {
    if (pageData.text.trim().length > 0) {
      console.log(`📖 Starting at page ${pageData.page} (first page with text)`)
      return pageData.page
    }
  }

  // Last resort: page 1
  console.log('📖 No text found, defaulting to page 1')
  return 1
}

function App() {
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'pdf' | 'text'>('pdf')
  const [startPosition, setStartPosition] = useState(0)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [currentWords, setCurrentWords] = useState<string[]>([])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file')
      return
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      setError('PDF file is too large. Maximum size is 100MB.')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Store the PDF file for PDF.js viewer
      setPdfFile(file)
      setUploadProgress(20)

      // Upload to backend for text extraction
      const formData = new FormData()
      formData.append('file', file)

      setUploadProgress(40)

      const response = await fetch('http://localhost:8000/api/pdf/upload', {
        method: 'POST',
        body: formData,
      })

      setUploadProgress(60)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to upload PDF')
      }

      const data = await response.json()
      setUploadProgress(80)
      
      // Find the first meaningful content page (skip front matter)
      const startPage = findStartingPage(data.pages)
      
      console.log(`📖 Auto-detected starting page: ${startPage}`)
      if (startPage > 1) {
        console.log(`ℹ️  Skipped pages 1-${startPage - 1} (front matter/titles)`)
      }
      
      setBookInfo(data)
      setCurrentPage(startPage)
      setUploadProgress(100)
      
      // Clear progress after a short delay
      setTimeout(() => setUploadProgress(0), 500)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload file')
      setPdfFile(null)
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  const handleReset = () => {
    setBookInfo(null)
    setPdfFile(null)
    setCurrentPage(1)
    setError(null)
  }

  const handlePageChange = (page: number) => {
    console.log(`📄 Page change requested: ${page}`)
    setCurrentPage(page)
  }

  const handleWordClick = (charPosition: number) => {
    console.log(`🎯 Start reading from position: ${charPosition}`)
    setStartPosition(charPosition)
  }

  const handleWordUpdate = (wordIndex: number, words: string[]) => {
    setCurrentWordIndex(wordIndex)
    setCurrentWords(words)
  }

  // Get current page text
  const currentPageText = bookInfo?.pages.find(p => p.page === currentPage)?.text || ''

  return (
    <div className="app">
      {/* Top Navigation */}
      <header className="app-header">
        <div className="header-content">
          <h1>📚 AI Audiobook Reader</h1>
          <div className="header-actions">
            {bookInfo && (
              <>
                <div className="view-toggle">
                  <button 
                    className={`view-btn ${viewMode === 'pdf' ? 'active' : ''}`}
                    onClick={() => setViewMode('pdf')}
                  >
                    📄 PDF
                  </button>
                  <button 
                    className={`view-btn ${viewMode === 'text' ? 'active' : ''}`}
                    onClick={() => setViewMode('text')}
                  >
                    📖 Text
                  </button>
                </div>
                <button className="upload-btn" onClick={handleReset}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload New
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        {!bookInfo ? (
          /* Upload Screen */
          <div className="upload-screen">
            <div className="upload-container">
              <div className="upload-icon">📚</div>
              <h2>Upload a PDF</h2>
              <p className="upload-description">
                Drag & drop a PDF file here or click to browse
              </p>
              
              <label htmlFor="file-upload" className="upload-button">
                {isUploading ? (
                  <>
                    <div className="upload-spinner"></div>
                    {uploadProgress > 0 ? `Processing... ${uploadProgress}%` : 'Processing...'}
                  </>
                ) : (
                  'Choose PDF File'
                )}
              </label>
              
              <input
                id="file-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
                style={{ display: 'none' }}
              />
              
              {isUploading && uploadProgress > 0 && (
                <div className="upload-progress-bar">
                  <div 
                    className="upload-progress-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
              
              <p className="upload-hint">Supported: PDF files up to 100MB</p>
              
              {error && (
                <div className="upload-error">
                  <p>❌ {error}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Reader Layout */
          <div className="reader-layout">
            <AudioPlayer
              bookId={bookInfo.book_id}
              totalPages={bookInfo.total_pages}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              pages={bookInfo.pages}
              startPosition={startPosition}
              onWordUpdate={handleWordUpdate}
            />
            <div className="reader-content">
              {viewMode === 'pdf' ? (
                <PDFViewer
                  pdfFile={pdfFile || undefined}
                  onPageChange={handlePageChange}
                  currentPage={currentPage}
                />
              ) : (
                <TextReader
                  text={currentPageText}
                  currentWordIndex={currentWordIndex}
                  words={currentWords}
                  onWordClick={handleWordClick}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
