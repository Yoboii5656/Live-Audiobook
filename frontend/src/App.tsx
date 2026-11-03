import { useState } from 'react'
import PDFViewer from './components/PDFViewer/PDFViewer'
import AudioPlayer from './components/AudioPlayer/AudioPlayer'
import TextReader from './components/TextReader/TextReader'
import { extractBook, type BookInfo } from './services/pdfService'
import './App.css'

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

      // Extract the text of every page in the browser; the file never leaves this device
      const data = await extractBook(file, (pagesDone, totalPages) => {
        setUploadProgress(Math.round((pagesDone / totalPages) * 100))
      })
      
      // Open the book at its Introduction (detected from heading font size)
      setBookInfo(data)
      setCurrentPage(data.start_page)
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
