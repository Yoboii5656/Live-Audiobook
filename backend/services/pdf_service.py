import fitz  # PyMuPDF
from collections import Counter
from typing import Dict, List, Optional
import re

# A heading must be at least this much larger than the body text
HEADING_SIZE_RATIO = 1.2
# Lines longer than this are sentences mentioning "introduction", not a heading
MAX_HEADING_CHARS = 60
# Matches "Introduction", "INTRODUCTION", "1. Introduction", "Chapter 1: Introduction", etc.
INTRODUCTION_LINE = re.compile(
    r"^(?:(?:chapter|part)\s+\w+\s*[:.\-–—]?\s*|\d+\s*[:.\-–—]?\s*)?introduction\b",
    re.IGNORECASE,
)


class PDFService:
    def __init__(self):
        # In-memory storage for uploaded books
        # In production, use a proper database
        self.books: Dict[str, Dict] = {}

    def process_pdf(self, book_id: str, pdf_content: bytes) -> Dict:
        """
        Extract text from PDF page by page and find the Introduction page
        """
        try:
            pdf_document = fitz.open(stream=pdf_content, filetype="pdf")

            pages = []
            # Per page: list of (line text, largest font size in the line)
            page_lines: List[List[tuple]] = []
            # Characters per font size across the whole book, to find the body text size
            size_counts: Counter = Counter()

            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                text = page.get_text("text")
                pages.append({
                    "page": page_num + 1,
                    "text": text.strip()
                })

                lines = []
                for block in page.get_text("dict").get("blocks", []):
                    for line in block.get("lines", []):
                        spans = line.get("spans", [])
                        line_text = "".join(span.get("text", "") for span in spans).strip()
                        if not line_text:
                            continue
                        for span in spans:
                            span_text = span.get("text", "").strip()
                            if span_text:
                                size_counts[round(span.get("size", 0), 1)] += len(span_text)
                        lines.append((line_text, max(span.get("size", 0) for span in spans)))
                page_lines.append(lines)

            pdf_document.close()

            start_page = self._find_introduction_page(page_lines, size_counts)

            book_info = {
                "book_id": book_id,
                "total_pages": len(pages),
                "start_page": start_page,
                "pages": pages
            }

            self.books[book_id] = book_info
            return book_info

        except Exception as e:
            raise Exception(f"Failed to process PDF: {str(e)}")

    def _find_introduction_page(self, page_lines: List[List[tuple]], size_counts: Counter) -> int:
        """
        Return the first page whose "Introduction" heading is set in a larger
        font than the body text. Table-of-contents entries use body-size text,
        so they are skipped. Falls back to page 1 when no such heading exists.
        """
        if not size_counts:
            return 1

        body_size = size_counts.most_common(1)[0][0]
        min_heading_size = body_size * HEADING_SIZE_RATIO

        for page_index, lines in enumerate(page_lines):
            for line_text, size in lines:
                if len(line_text) > MAX_HEADING_CHARS or size < min_heading_size:
                    continue
                # Collapse letter-spaced headings like "I N T R O D U C T I O N"
                compact = re.sub(r"\s+", " ", line_text)
                if " " in compact and all(len(part) == 1 for part in compact.split(" ")):
                    compact = compact.replace(" ", "")
                if INTRODUCTION_LINE.match(compact):
                    print(
                        f"Introduction found on page {page_index + 1} "
                        f"(heading {size:.1f}pt vs body {body_size:.1f}pt)"
                    )
                    return page_index + 1

        print(f"No Introduction heading found (body {body_size:.1f}pt); starting at page 1")
        return 1

    def get_book(self, book_id: str) -> Optional[Dict]:
        """
        Retrieve stored book information
        """
        return self.books.get(book_id)
