# Chodhyam - Document Intelligence Workspace
**Project Documentation & Architecture Reference**

This document serves as a comprehensive guide to what has been implemented in this project. It is intended for future developers or AI agents to quickly understand the architecture, technical decisions, and potential areas for improvement.

---

## 1. Project Overview
Chodhyam is a highly secure, ephemeral document intelligence workspace. It allows users to upload PDF documents and ask natural-language questions about them. The system uses a **Retrieval-Augmented Generation (RAG)** pipeline to find relevant information in the uploaded PDFs and synthesize an accurate answer with exact citations.

**Key Features:**
*   **Ephemeral Sessions:** Designed as a temporary workspace. Once a session expires or is closed, documents and embeddings are cleared.
*   **Exact Citations & Auto-Highlighting:** When the AI answers, it provides clickable source badges. The UI automatically displays an image of the exact PDF page with the relevant text highlighted.
*   **Cloud LLM Integration:** Powered by Google's Gemini API for lightning-fast and intelligent generation.

---

## 2. System Architecture

The project has transitioned from a monolithic Streamlit script to a modern separated Backend/Frontend architecture.

### A. Backend (`server.py`)
Built with **FastAPI** for high performance and asynchronous request handling.
*   **API Endpoints:**
    *   `POST /api/auth/login`: Initializes an ephemeral session ID.
    *   `POST /api/documents/upload`: Accepts PDFs, extracts text (`document_processor.py`), generates vector embeddings, saves them to ChromaDB, and persists the raw PDF file in the `uploads/` directory for later viewing.
    *   `POST /api/chat/query`: The core RAG endpoint. Vector-searches ChromaDB for relevant chunks, constructs a prompt, queries the **Gemini 3.6 Flash** API, and returns the answer alongside source metadata.
    *   `GET /api/documents/session/.../page/...`: A custom server-side rendering endpoint. Uses `PyMuPDF` (`fitz`) to open the raw PDF, search for the exact quote the AI used, draw a yellow highlight annotation, and return the page as a PNG image to the frontend.

### B. Machine Learning Pipeline
*   **Text Splitting:** Custom chunking logic in `document_processor.py`.
*   **Embeddings:** `SentenceTransformer("all-MiniLM-L6-v2")` running locally in-memory.
*   **Vector Database:** `ChromaDB` running persistently in the `./chroma_fastapi_db` folder.
*   **Generation (LLM):** `google-generativeai` package hitting the Gemini API. (Previously `Ollama`, but migrated to cloud API for deployment stability).

### C. Frontend (`frontend/`)
A completely custom, vanilla HTML/JS/CSS Single Page Application (SPA).
*   **Layout:** A responsive 3-column design:
    1.  *Left:* Upload Zone & Document List.
    2.  *Center:* Chat Interface.
    3.  *Right:* PDF Preview & Highlight Viewer.
*   **Interactivity (`app.js`):** Handles file uploads, manages the countdown timer, manages chat state, and updates the PDF preview `<img>` source whenever the AI replies or a citation is clicked.

---

## 3. Deployment Configuration
The project is configured for seamless deployment to cloud providers like **Microsoft Azure App Service** or **Render**.
*   **`requirements.txt`**: Stripped down to only the essential dependencies (FastAPI, ChromaDB, SentenceTransformers, PyMuPDF, GenAI).
*   **Dynamic Ports**: `server.py` listens to the `PORT` environment variable provided by the cloud host.
*   **Ignored Files**: The `.gitignore` is set to ignore `.env`, `uploads/`, and `chroma_fastapi_db/` to prevent polluting the codebase with temporary user data.

---

## 4. Roadmap & Future Improvements (For Agents/Devs)

If you are continuing work on this project, consider the following improvements:

1.  **Memory Optimization for Cloud:** Currently, the `SentenceTransformer` runs locally on the server. On cheap/free cloud tiers (under 1GB RAM), this can cause Out-Of-Memory (OOM) crashes.
    *   *Improvement:* Swap local `SentenceTransformer` with a cloud embedding API (e.g., OpenAI `text-embedding-3-small` or Gemini Embeddings) to drastically reduce server memory usage.
2.  **Vector Database Upgrade:** Local `ChromaDB` with ephemeral cloud storage means sessions reset when the server goes to sleep.
    *   *Improvement:* Connect to a managed cloud vector database (like Pinecone, Weaviate Cloud, or Neon Postgres pgvector) if persistent, cross-restart sessions become a requirement.
3.  **Advanced Highlighting:** The current `fitz` highlighting searches for exact text strings. If the text extraction had slight formatting differences, the highlight might fail to draw.
    *   *Improvement:* Use bounding-box coordinates directly from the text extraction phase and pass those through the pipeline, rather than text-matching at render time.
4.  **UI Enhancements:**
    *   Add PDF Zoom In/Out controls in the right panel.
    *   Support for multiple chat threads/history.
