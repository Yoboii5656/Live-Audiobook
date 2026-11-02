import { useState, useEffect } from 'react'

interface UsePDFTextProps {
  pages: Array<{ page: number; text: string }>
  currentPage: number
}

interface UsePDFTextReturn {
  currentPageText: string
  isLoading: boolean
}

export function usePDFText({ pages, currentPage }: UsePDFTextProps): UsePDFTextReturn {
  const [currentPageText, setCurrentPageText] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    setIsLoading(true)

    // Find the text for the current page
    const pageData = pages.find((p) => p.page === currentPage)

    if (pageData) {
      setCurrentPageText(pageData.text)
    } else {
      setCurrentPageText('')
    }

    setIsLoading(false)
  }, [pages, currentPage])

  return {
    currentPageText,
    isLoading,
  }
}
