import fitz  # PyMuPDF
from typing import Dict, List
import io

class PDFService:
    def __init__(self):
        # In-memory storage for uploaded books
        # In production, use a proper database
        self.books: Dict[str, Dict] = {}
    
    def process_pdf(self, book_id: str, pdf_content: bytes) -> Dict:
        """
        Extract text from PDF page by page
        """
        try:
            # Open PDF from bytes
            pdf_document = fitz.open(stream=pdf_content, filetype="pdf")
            
            pages = []
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                text = page.get_text("text")
                
                pages.append({
                    "page": page_num + 1,
                    "text": text.strip()
                })
            
            pdf_document.close()
            
            # Store book info
            book_info = {
                "book_id": book_id,
                "total_pages": len(pages),
                "pages": pages
            }
            
            self.books[book_id] = book_info
            
            return book_info
            
        except Exception as e:
            raise Exception(f"Failed to process PDF: {str(e)}")
    
    def get_book(self, book_id: str) -> Dict:
        """
        Retrieve stored book information
        """
        return self.books.get(book_id)
