import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import './PDFViewer.css'

// Set up PDF.js worker - use the worker from node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface PDFViewerProps {
  pdfUrl?: string
  pdfFile?: File
  onPageChange?: (pageNumber: number) => void
  currentPage?: number
}

const RENDER_SCALE = 1.5
// How long to ignore scroll-based page detection after a programmatic jump
const PROGRAMMATIC_SCROLL_LOCK_MS = 1000

export default function PDFViewer({ pdfUrl, pdfFile, onPageChange, currentPage = 1 }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [visiblePage, setVisiblePage] = useState(currentPage)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Incremented once all page placeholders exist in the DOM
  const [layoutVersion, setLayoutVersion] = useState(0)

  const renderedPagesRef = useRef<Set<number>>(new Set())
  const renderingPagesRef = useRef<Set<number>>(new Set())
  const scrollLockUntilRef = useRef(0)
  // Last page we reported to (or received from) the parent.
  // Starts at 0 so the first layout always scrolls to the starting page.
  const lastKnownPageRef = useRef(0)
  // Keep the latest callback without re-subscribing observers on every render
  const onPageChangeRef = useRef(onPageChange)
  useEffect(() => {
    onPageChangeRef.current = onPageChange
  }, [onPageChange])

  // Load PDF document
  useEffect(() => {
    let cancelled = false
    const loadPDF = async () => {
      setLoading(true)
      setError(null)
      try {
        let loadingTask
        if (pdfFile) {
          const arrayBuffer = await pdfFile.arrayBuffer()
          loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
        } else if (pdfUrl) {
          loadingTask = pdfjsLib.getDocument(pdfUrl)
        } else {
          throw new Error('No PDF source provided')
        }
        const pdf = await loadingTask.promise
        if (cancelled) return
        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)
        setLoading(false)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load PDF')
        setLoading(false)
      }
    }
    loadPDF()
    return () => {
      cancelled = true
    }
  }, [pdfUrl, pdfFile])

  // Create a placeholder for every page right away, so any page can be scrolled to immediately
  useEffect(() => {
    const container = containerRef.current
    if (!pdfDoc || !container) return
    let cancelled = false

    const buildLayout = async () => {
      const firstPage = await pdfDoc.getPage(1)
      const viewport = firstPage.getViewport({ scale: RENDER_SCALE })
      if (cancelled) return

      container.innerHTML = ''
      renderedPagesRef.current.clear()
      renderingPagesRef.current.clear()

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const pageContainer = document.createElement('div')
        pageContainer.className = 'pdf-page-container'
        pageContainer.dataset.pageNumber = pageNum.toString()
        // Reserve space using the first page's aspect ratio until the real page renders
        pageContainer.style.aspectRatio = `${viewport.width} / ${viewport.height}`

        const pageLabel = document.createElement('div')
        pageLabel.className = 'pdf-page-label'
        pageLabel.textContent = `Page ${pageNum}`
        pageContainer.appendChild(pageLabel)

        container.appendChild(pageContainer)
      }
      setLayoutVersion((v) => v + 1)
    }

    buildLayout()
    return () => {
      cancelled = true
    }
  }, [pdfDoc])

  // Render a single page into its placeholder
  const renderPage = async (pageNum: number) => {
    const container = containerRef.current
    if (!pdfDoc || !container) return
    if (renderedPagesRef.current.has(pageNum) || renderingPagesRef.current.has(pageNum)) return
    renderingPagesRef.current.add(pageNum)

    try {
      const page = await pdfDoc.getPage(pageNum)
      const viewport = page.getViewport({ scale: RENDER_SCALE })
      const pageContainer = container.querySelector<HTMLElement>(
        `.pdf-page-container[data-page-number="${pageNum}"]`
      )
      if (!pageContainer) return

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) return
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.className = 'pdf-page-canvas'

      await page.render({ canvasContext: context, viewport }).promise

      pageContainer.style.aspectRatio = `${viewport.width} / ${viewport.height}`
      pageContainer.appendChild(canvas)
      renderedPagesRef.current.add(pageNum)
    } catch (err) {
      console.error(`Failed to render page ${pageNum}:`, err)
    } finally {
      renderingPagesRef.current.delete(pageNum)
    }
  }

  // Lazily render pages as they come near the viewport
  useEffect(() => {
    const container = containerRef.current
    if (!container || layoutVersion === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt((entry.target as HTMLElement).dataset.pageNumber || '1')
            renderPage(pageNum)
          }
        })
      },
      { root: container, rootMargin: '1500px 0px' }
    )
    container.querySelectorAll('.pdf-page-container').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutVersion])

  // Track which page the user has scrolled to
  useEffect(() => {
    const container = containerRef.current
    if (!container || layoutVersion === 0) return

    let frame = 0
    const handleScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // The page whose area covers the middle of the viewport is the visible one
        const containerRect = container.getBoundingClientRect()
        const middle = containerRect.top + containerRect.height / 2
        const pages = container.querySelectorAll<HTMLElement>('.pdf-page-container')
        let found = 0
        for (const el of pages) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= middle && rect.bottom >= middle) {
            found = parseInt(el.dataset.pageNumber || '0')
            break
          }
        }
        if (!found) return
        setVisiblePage(found)

        // Ignore scroll events caused by our own jump to a page
        if (Date.now() < scrollLockUntilRef.current) return
        if (found !== lastKnownPageRef.current) {
          lastKnownPageRef.current = found
          onPageChangeRef.current?.(found)
        }
      })
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(frame)
    }
  }, [layoutVersion])

  // Jump to the page when it is changed from outside (buttons, input, auto-advance)
  useEffect(() => {
    const container = containerRef.current
    if (!container || layoutVersion === 0) return

    // Highlight current page
    container.querySelectorAll('.pdf-page-current').forEach((el) => el.classList.remove('pdf-page-current'))
    const target = container.querySelector<HTMLElement>(
      `.pdf-page-container[data-page-number="${currentPage}"]`
    )
    if (!target) return
    target.classList.add('pdf-page-current')

    // The user scrolled here themselves; no need to move
    if (currentPage === lastKnownPageRef.current && currentPage === visiblePage) return

    const isFirstJump = lastKnownPageRef.current === 0
    lastKnownPageRef.current = currentPage
    scrollLockUntilRef.current = Date.now() + PROGRAMMATIC_SCROLL_LOCK_MS
    renderPage(currentPage)
    container.scrollTo({ top: target.offsetTop - 16, behavior: isFirstJump ? 'auto' : 'smooth' })
    setVisiblePage(currentPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, layoutVersion])

  return (
    <div className="pdf-viewer">
      {loading && (
        <div className="pdf-viewer-loading">
          <div className="spinner"></div>
          <p>Loading PDF...</p>
        </div>
      )}
      {error && (
        <div className="pdf-viewer-error">
          <p>❌ {error}</p>
        </div>
      )}
      <div className="pdf-viewer-header" style={{ display: loading || error ? 'none' : undefined }}>
        <span className="pdf-page-indicator">
          Page {visiblePage} of {totalPages}
        </span>
      </div>
      {/* Container stays mounted so its ref is available when the document loads */}
      <div
        className="pdf-viewer-content"
        ref={containerRef}
        style={{ display: loading || error ? 'none' : undefined }}
      />
    </div>
  )
}
