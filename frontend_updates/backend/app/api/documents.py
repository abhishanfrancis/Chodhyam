from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import List
import uuid

from app.api.dependencies import get_storage_service, get_vector_service, get_document_processor

router = APIRouter()

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

@router.post("/upload")
async def upload_documents(
    session_id: str = Form(...),
    files: List[UploadFile] = File(...),
    storage_service = Depends(get_storage_service),
    vector_service = Depends(get_vector_service),
    doc_processor = Depends(get_document_processor)
):
    results = []
    
    for file in files:
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail=f"File {file.filename} is not a PDF.")
            
        content = await file.read()
        
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=400, detail=f"File {file.filename} exceeds 10MB limit.")
            
        doc_id = str(uuid.uuid4())
        
        # 1. Store the original document (Ephemeral Storage)
        storage_key = await storage_service.upload_document(
            session_id=session_id,
            document_id=doc_id,
            file_content=content,
            filename=file.filename
        )
        
        # 2. Process the document (Extract text, chunk)
        try:
            chunks = doc_processor.process_pdf(content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process PDF {file.filename}: {str(e)}")
            
        if not chunks:
            # Handle empty PDF
            chunks = [{"text": "Empty document", "page": 1}]
        
        # 3. Store in Vector DB
        await vector_service.add_chunks(session_id=session_id, document_id=doc_id, chunks=chunks)
        
        results.append({
            "document_id": doc_id,
            "filename": file.filename,
            "status": "processed",
            "chunks_created": len(chunks)
        })
        
    return {"uploaded_documents": results}

@router.delete("/session/{session_id}")
async def cleanup_session(
    session_id: str,
    storage_service = Depends(get_storage_service),
    vector_service = Depends(get_vector_service)
):
    await storage_service.delete_session_documents(session_id)
    await vector_service.delete_session_vectors(session_id)
    return {"message": f"Session {session_id} cleaned up successfully."}
