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

export default function PDFViewer({ pdfUrl, pdfFile, onPageChange, currentPage = 1 }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [visiblePage, setVisiblePage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pageRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())

  // Load PDF document
  useEffect(() => {
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
        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PDF')
        setLoading(false)
      }
    }

    loadPDF()
  }, [pdfUrl, pdfFile])

  // Render all pages
  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return

    const renderPages = async () => {
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum)
        const viewport = page.getViewport({ scale: 1.5 })

        // Create canvas for this page
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) continue

        canvas.height = viewport.height
        canvas.width = viewport.width
        canvas.className = 'pdf-page-canvas'
        canvas.dataset.pageNumber = pageNum.toString()

        // Create page container
        const pageContainer = document.createElement('div')
        pageContainer.className = 'pdf-page-container'
        pageContainer.dataset.pageNumber = pageNum.toString()

        // Add page number label
        const pageLabel = document.createElement('div')
        pageLabel.className = 'pdf-page-label'
        pageLabel.textContent = `Page ${pageNum}`

        pageContainer.appendChild(pageLabel)
        pageContainer.appendChild(canvas)
        containerRef.current?.appendChild(pageContainer)

        // Render page
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise

        pageRefs.current.set(pageNum, canvas)
      }
    }

    // Clear previous renders
    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }
    pageRefs.current.clear()

    renderPages()
  }, [pdfDoc])

  // Highlight current page
  useEffect(() => {
    if (!containerRef.current) return

    // Remove previous highlights
    const allPages = containerRef.current.querySelectorAll('.pdf-page-container')
    allPages.forEach((page) => page.classList.remove('pdf-page-current'))

    // Add highlight to current page
    const currentPageContainer = containerRef.current.querySelector(
      `.pdf-page-container[data-page-number="${currentPage}"]`
    )
    if (currentPageContainer) {
      currentPageContainer.classList.add('pdf-page-current')
    }
  }, [currentPage])

  // Track visible page on scroll
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(
              (entry.target as HTMLElement).dataset.pageNumber || '1'
            )
            setVisiblePage(pageNum)
            onPageChange?.(pageNum)
          }
        })
      },
      {
        root: null,
        threshold: 0.5, // Page is considered visible when 50% is in view
      }
    )

    // Observe all page containers
    const pageContainers = containerRef.current.querySelectorAll('.pdf-page-container')
    pageContainers.forEach((page) => observer.observe(page))

    return () => observer.disconnect()
  }, [pdfDoc, onPageChange])

  // Scroll to specific page when currentPage changes
  useEffect(() => {
    if (currentPage && containerRef.current) {
      console.log(`📄 PDFViewer: Scrolling to page ${currentPage}`)
      
      // Use a small delay to ensure page is rendered
      const scrollTimer = setTimeout(() => {
        const pageContainer = containerRef.current?.querySelector(
          `.pdf-page-container[data-page-number="${currentPage}"]`
        )
        if (pageContainer) {
          pageContainer.scrollIntoView({ behavior: 'smooth', block: 'start' })
          console.log(`✅ Scrolled to page ${currentPage}`)
        } else {
          console.warn(`⚠️  Page container ${currentPage} not found in DOM yet`)
          
          // Retry after pages are rendered
          const retryTimer = setTimeout(() => {
            const retryPageContainer = containerRef.current?.querySelector(
              `.pdf-page-container[data-page-number="${currentPage}"]`
            )
            if (retryPageContainer) {
              retryPageContainer.scrollIntoView({ behavior: 'smooth', block: 'start' })
              console.log(`✅ Scrolled to page ${currentPage} (retry successful)`)
            } else {
              console.error(`❌ Failed to scroll to page ${currentPage} - page not rendered`)
            }
          }, 2000)  // Retry after 2 seconds
          
          return () => clearTimeout(retryTimer)
        }
      }, 500)  // Initial delay of 500ms
      
      return () => clearTimeout(scrollTimer)
    }
  }, [currentPage, pdfDoc])

  if (loading) {
    return (
      <div className="pdf-viewer-loading">
        <div className="spinner"></div>
        <p>Loading PDF...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pdf-viewer-error">
        <p>❌ {error}</p>
      </div>
    )
  }

  return (
    <div className="pdf-viewer">
      <div className="pdf-viewer-header">
        <span className="pdf-page-indicator">
          Page {visiblePage} of {totalPages}
        </span>
      </div>
      <div className="pdf-viewer-content" ref={containerRef}>
        {/* Pages will be rendered here */}
      </div>
    </div>
  )
}
