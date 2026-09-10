import chromadb
from typing import List, Dict, Any
from chromadb.config import Settings
from app.services.vector_store_service import IVectorStoreService

class ChromaVectorAdapter(IVectorStoreService):
    def __init__(self, persist_directory: str = "/tmp/chodhyam_chroma"):
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(anonymized_telemetry=False)
        )
        # Using a single collection for simplicity, filtering by session_id in metadata
        self.collection = self.client.get_or_create_collection("chodhyam_sessions")

    async def add_chunks(self, session_id: str, document_id: str, chunks: List[Dict[str, Any]]):
        if not chunks:
            return
            
        ids = []
        documents = []
        metadatas = []
        
        for idx, chunk in enumerate(chunks):
            # Generate a unique ID for each chunk
            chunk_id = f"{session_id}_{document_id}_{idx}"
            ids.append(chunk_id)
            documents.append(chunk.get("text", ""))
            
            # Store session_id and document_id for isolation
            metadatas.append({
                "session_id": session_id,
                "document_id": document_id,
                "page": chunk.get("page", 1)
            })
            
        self.collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )

    async def search(self, session_id: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        # Query the collection, applying a filter so a user only sees their own session's data
        results = self.collection.query(
            query_texts=[query],
            n_results=top_k,
            where={"session_id": session_id}
        )
        
        formatted_results = []
        
        # Chroma returns lists of lists for queries
        if results and results["documents"] and len(results["documents"]) > 0:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
            
            for doc, meta in zip(docs, metas):
                formatted_results.append({
                    "text": doc,
                    "session_id": meta.get("session_id"),
                    "document_id": meta.get("document_id"),
                    "page": meta.get("page")
                })
                
        return formatted_results

    async def delete_session_vectors(self, session_id: str):
        # Delete all records matching the session_id
        self.collection.delete(
            where={"session_id": session_id}
        )
