from fastapi import APIRouter, UploadFile, File, HTTPException
from services.pdf_service import PDFService
import uuid

router = APIRouter()
pdf_service = PDFService()

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF file and extract text from all pages
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        # Generate unique book ID
        book_id = str(uuid.uuid4())
        
        # Read file content
        content = await file.read()
        
        # Extract text from PDF
        result = pdf_service.process_pdf(book_id, content)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@router.get("/books/{book_id}")
async def get_book_info(book_id: str):
    """
    Get information about a previously uploaded book
    """
    book_info = pdf_service.get_book(book_id)
    if not book_info:
        raise HTTPException(status_code=404, detail="Book not found")
    return book_info
