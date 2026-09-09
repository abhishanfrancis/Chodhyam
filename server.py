import os
import tempfile
import uuid
import time
import fitz
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
# Patch sqlite3 for ChromaDB to work on Azure/Linux where sqlite3 < 3.35.0
__import__('pysqlite3')
import sys
sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')

import chromadb
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

from document_processor import extract_pages_from_pdf, create_chunks

app = FastAPI()

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)

print("Loading embedding model...")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
print("Loading chromadb...")
client = chromadb.PersistentClient(path="./chroma_fastapi_db")
print("Done initializing models.")

class QueryRequest(BaseModel):
    session_id: str
    question: str

@app.post("/api/auth/login")
def login():
    session_id = str(uuid.uuid4())
    expires_at = int(time.time()) + 45 * 60 # 45 minutes
    return {"session_id": session_id, "expires_at": expires_at}

@app.post("/api/auth/logout")
def logout(session_id: str):
    try:
        client.delete_collection(name=session_id)
    except Exception:
        pass
    return {"status": "success"}

@app.post("/api/documents/upload")
def upload_documents(session_id: str = Form(...), files: list[UploadFile] = File(...)):
    uploaded_docs = []
    
    try:
        collection = client.get_collection(name=session_id)
    except Exception:
        collection = client.create_collection(name=session_id)
        
    for file in files:
        try:
            # Save file persistently for preview
            save_path = os.path.join("uploads", f"{session_id}_{file.filename}")
            with open(save_path, "wb") as f:
                f.write(file.file.read())
                
            pages = extract_pages_from_pdf(save_path)
            chunks = create_chunks(pages)
            
            if not chunks:
                uploaded_docs.append({"filename": file.filename, "status": "error", "error": "No text found in PDF"})
                continue
                
            texts = [chunk["text"] for chunk in chunks]
            embeddings = embedding_model.encode(texts).tolist()
            ids = [f"{file.filename}_chunk_{i}" for i in range(len(chunks))]
            metadatas = [{"page": chunk["page_number"], "source": file.filename} for chunk in chunks]
            
            collection.add(
                ids=ids,
                documents=texts,
                embeddings=embeddings,
                metadatas=metadatas
            )
            
            uploaded_docs.append({"filename": file.filename, "status": "processed"})
        except Exception as e:
            uploaded_docs.append({"filename": file.filename, "status": "error", "error": str(e)})
            
    return {"uploaded_documents": uploaded_docs}

@app.delete("/api/documents/session/{session_id}")
def delete_session(session_id: str):
    try:
        client.delete_collection(name=session_id)
    except Exception:
        pass
    return {"status": "success"}

@app.post("/api/chat/query")
def chat_query(req: QueryRequest):
    try:
        collection = client.get_collection(name=req.session_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Session not found or expired")
        
    question_embedding = embedding_model.encode(req.question).tolist()
    
    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=3
    )
    
    if not results["documents"] or not results["documents"][0]:
        return {"answer": "I couldn't find relevant information in the uploaded documents.", "sources": []}
        
    retrieved_documents = results["documents"][0]
    retrieved_metadata = results["metadatas"][0]
    
    context = ""
    sources = []
    
    seen_sources = set()
    
    for i, document in enumerate(retrieved_documents):
        page = retrieved_metadata[i]["page"]
        src = retrieved_metadata[i].get("source", "Document")
        context += f"\n\n--- {src}, Page {page} ---\n{document}"
        
        # Include the quote for highlighting
        source_key = f"{src}-{page}-{document}"
        if source_key not in seen_sources:
            sources.append({"document": src, "page": page, "quote": document})
            seen_sources.add(source_key)
        
    prompt = f"""
You are a helpful document question-answering assistant.
Answer the user's question using ONLY the information provided in the context below.
If the answer cannot be found in the context, say: "I couldn't find the answer in the document."

Context:
{context}

Question:
{req.question}

Answer:
"""
    try:
        model = genai.GenerativeModel('gemini-3.6-flash')
        response = model.generate_content(prompt)
        answer = response.text
    except Exception as e:
        answer = f"Error generating response: {str(e)}"
    
    return {"answer": answer, "sources": sources}


@app.get("/api/documents/session/{session_id}/file/{filename}/page/{page_number}")
def render_pdf_page_endpoint(session_id: str, filename: str, page_number: int, highlight_text: str = ""):
    pdf_path = os.path.join("uploads", f"{session_id}_{filename}")
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    try:
        pdf = fitz.open(pdf_path)
        if page_number < 1: page_number = 1
        if page_number > len(pdf): page_number = len(pdf)
        page = pdf[page_number - 1]
        
        if highlight_text:
            quote = highlight_text.strip()
            rectangles = []
            try:
                rectangles = page.search_for(quote)
            except Exception:
                pass
                
            if not rectangles:
                words = quote.split()
                for length in [20, 12, 8, 4]:
                    if not rectangles and len(words) >= length:
                        search_text = " ".join(words[:length])
                        try:
                            rectangles = page.search_for(search_text)
                        except Exception:
                            pass
                            
            for rect in rectangles[:10]:
                annotation = page.add_highlight_annot(rect)
                annotation.update()
                
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img_bytes = pix.tobytes("png")
        return Response(content=img_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
