/**
 * Reads the text of a PDF in the browser and finds the page where the book's
 * Introduction starts. Ported from the former Python backend
 * (backend/services/pdf_service.py); the file never leaves the user's device.
 */
import * as pdfjsLib from 'pdfjs-dist'
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export interface BookPage {
  page: number
  text: string
}

export interface BookInfo {
  total_pages: number
  start_page: number
  pages: BookPage[]
}

// A heading must be at least this much larger than the body text
const HEADING_SIZE_RATIO = 1.2
// Lines longer than this are sentences mentioning "introduction", not a heading
const MAX_HEADING_CHARS = 60
// Matches "Introduction", "INTRODUCTION", "1. Introduction", "Chapter 1: Introduction", etc.
const INTRODUCTION_LINE =
  /^(?:(?:chapter|part)\s+[\p{L}\p{N}_]+\s*[:.\-–—]?\s*|\d+\s*[:.\-–—]?\s*)?introduction\b/iu

interface TextLine {
  text: string
  /** Largest font size used in the line */
  size: number
}

/**
 * Extract the text of every page and detect the Introduction page.
 * `onProgress` is called after each page with (pages done, total pages).
 */
export async function extractBook(
  file: File,
  onProgress?: (pagesDone: number, totalPages: number) => void
): Promise<BookInfo> {
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjsLib.getDocument({ data })

  try {
    const pdf = await loadingTask.promise
    const pages: BookPage[] = []
    const pageLines: TextLine[][] = []
    // Characters per font size across the whole book, to find the body text size
    const sizeCounts = new Map<number, number>()

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const { text, lines } = readPage(content.items, sizeCounts)
      pages.push({ page: pageNumber, text })
      pageLines.push(lines)
      page.cleanup()
      onProgress?.(pageNumber, pdf.numPages)
    }

    return {
      total_pages: pdf.numPages,
      start_page: findIntroductionPage(pageLines, sizeCounts),
      pages,
    }
  } catch (err) {
    throw new Error(`Failed to process PDF: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    await loadingTask.destroy()
  }
}

/** Build the page text (one line per text line) and collect font sizes */
function readPage(
  items: Array<TextItem | TextMarkedContent>,
  sizeCounts: Map<number, number>
): { text: string; lines: TextLine[] } {
  let text = ''
  const lines: TextLine[] = []
  let lineText = ''
  let lineSize = 0

  const endLine = () => {
    const trimmed = lineText.trim()
    if (trimmed) {
      lines.push({ text: trimmed, size: lineSize })
    }
    lineText = ''
    lineSize = 0
  }

  for (const item of items) {
    if (!('str' in item)) continue

    text += item.str
    lineText += item.str

    const visibleText = item.str.trim()
    if (visibleText) {
      const size = fontSize(item)
      const roundedSize = Math.round(size * 10) / 10
      sizeCounts.set(roundedSize, (sizeCounts.get(roundedSize) ?? 0) + visibleText.length)
      lineSize = Math.max(lineSize, size)
    }

    if (item.hasEOL) {
      text += '\n'
      endLine()
    }
  }
  endLine()

  return { text: text.trim(), lines }
}

/** Font size of a text item, taken from its text transformation matrix */
function fontSize(item: TextItem): number {
  const [, , c, d] = item.transform as number[]
  return Math.hypot(c, d) || item.height
}

/**
 * Return the first page whose "Introduction" heading is set in a larger
 * font than the body text. Table-of-contents entries use body-size text,
 * so they are skipped. Falls back to page 1 when no such heading exists.
 */
function findIntroductionPage(pageLines: TextLine[][], sizeCounts: Map<number, number>): number {
  if (sizeCounts.size === 0) {
    return 1
  }

  // The most used font size is the body text size
  let bodySize = 0
  let bodyChars = -1
  for (const [size, chars] of sizeCounts) {
    if (chars > bodyChars) {
      bodySize = size
      bodyChars = chars
    }
  }
  const minHeadingSize = bodySize * HEADING_SIZE_RATIO

  for (let pageIndex = 0; pageIndex < pageLines.length; pageIndex++) {
    for (const { text, size } of pageLines[pageIndex]) {
      if (text.length > MAX_HEADING_CHARS || size < minHeadingSize) continue

      // Collapse letter-spaced headings like "I N T R O D U C T I O N"
      let compact = text.replace(/\s+/g, ' ')
      if (compact.includes(' ') && compact.split(' ').every((part) => part.length === 1)) {
        compact = compact.split(' ').join('')
      }
      if (INTRODUCTION_LINE.test(compact)) {
        console.log(
          `Introduction found on page ${pageIndex + 1} ` +
            `(heading ${size.toFixed(1)}pt vs body ${bodySize.toFixed(1)}pt)`
        )
        return pageIndex + 1
      }
    }
  }

  console.log(`No Introduction heading found (body ${bodySize.toFixed(1)}pt); starting at page 1`)
  return 1
}
