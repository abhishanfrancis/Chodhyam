# Chodhyam

Chodhyam is a highly secure, ephemeral document intelligence workspace. It allows users to upload PDF documents and ask natural-language questions about them. The system leverages a **Retrieval-Augmented Generation (RAG)** pipeline to find relevant information in the uploaded PDFs and synthesize an accurate answer with exact citations.

## Features

- **Ephemeral Sessions:** Designed as a temporary workspace. Once a session expires or is closed, documents and embeddings are cleared.
- **Exact Citations & Auto-Highlighting:** When the AI answers, it provides clickable source badges. The UI automatically displays an image of the exact PDF page with the relevant text highlighted.
- **Cloud LLM Integration:** Powered by Google's Gemini API for lightning-fast and intelligent generation.
- **Interactive UI:** A custom, vanilla HTML/JS/CSS Single Page Application (SPA) with a responsive 3-column design (Upload, Chat, PDF Preview).

## Tech Stack

### Backend
- **Framework:** FastAPI
- **LLM API:** Google Gemini API
- **Embeddings:** SentenceTransformers (`all-MiniLM-L6-v2`)
- **Vector Database:** ChromaDB
- **PDF Processing:** PyMuPDF (`fitz`)

### Frontend
- Vanilla HTML, CSS, JavaScript (Single Page Application)

## Prerequisites

- Python 3.9+
- A Google Gemini API key

## Installation and Setup

1. **Navigate to the project directory:**
   ```bash
   cd Chodhyam
   ```

2. **Create a virtual environment (optional but recommended):**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

5. **Run the backend server:**
   ```bash
   uvicorn server:app --reload
   ```

6. **Access the application:**
   The frontend is served as static files by the FastAPI backend. Open your browser and navigate to:
   ```
   http://127.0.0.1:8000
   ```

## System Architecture Overview

- **Backend (`server.py`):** Handles API requests, including ephemeral session creation, document uploads, and chat queries. It dynamically generates PDF page images with highlights for citations.
- **RAG Pipeline:** Documents are chunked and vectorized using local `SentenceTransformer` embeddings, stored in `ChromaDB`. Queries use vector search to retrieve context, which is then fed into the Gemini API to generate responses.
- **Frontend (`frontend/`):** Manages state and interacts with backend APIs, displaying a 3-column layout for documents, chat, and highlighted PDF previews.

## Roadmap & Future Improvements

- **Memory Optimization:** Migrate from local `SentenceTransformer` to cloud embedding APIs (e.g., Gemini Embeddings) to reduce memory usage on low-tier cloud deployments.
- **Vector Database:** Connect to a managed cloud vector database for persistent sessions across server restarts.
- **Highlighting:** Improve highlighting by using bounding-box coordinates directly from the text extraction phase instead of text-matching at render time.
- **UI Enhancements:** Add PDF zoom controls and support for multiple chat threads.
