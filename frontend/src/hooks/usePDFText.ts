import { useMemo } from 'react'

interface UsePDFTextProps {
  pages: Array<{ page: number; text: string }>
  currentPage: number
}

interface UsePDFTextReturn {
  currentPageText: string
  isLoading: boolean
}

export function usePDFText({ pages, currentPage }: UsePDFTextProps): UsePDFTextReturn {
  // Look the text up during render so it always belongs to currentPage.
  // Keeping it in state set by an effect left it one render behind after a page change,
  // so auto-advance could judge a page by the previous page's text.
  const currentPageText = useMemo(
    () => pages.find((p) => p.page === currentPage)?.text ?? '',
    [pages, currentPage]
  )

  return {
    currentPageText,
    isLoading: false,
  }
}
