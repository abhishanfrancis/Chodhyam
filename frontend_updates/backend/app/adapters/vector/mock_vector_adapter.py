from typing import List, Dict, Any
from app.services.vector_store_service import IVectorStoreService

class MockVectorAdapter(IVectorStoreService):
    def __init__(self):
        # In-memory mock storage: session_id -> list of chunks
        self.store: Dict[str, List[Dict[str, Any]]] = {}

    async def add_chunks(self, session_id: str, document_id: str, chunks: List[Dict[str, Any]]):
        if session_id not in self.store:
            self.store[session_id] = []
        
        # Attach document_id to chunks and store
        for chunk in chunks:
            chunk["document_id"] = document_id
            self.store[session_id].append(chunk)

    async def search(self, session_id: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        # Mock search: just return the first few chunks in the session
        if session_id not in self.store:
            return []
        
        chunks = self.store[session_id]
        return chunks[:top_k]

    async def delete_session_vectors(self, session_id: str):
        if session_id in self.store:
            del self.store[session_id]
