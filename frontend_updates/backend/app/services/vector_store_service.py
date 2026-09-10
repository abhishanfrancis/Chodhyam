from abc import ABC, abstractmethod
from typing import List, Dict, Any

class IVectorStoreService(ABC):
    @abstractmethod
    async def add_chunks(self, session_id: str, document_id: str, chunks: List[Dict[str, Any]]):
        """Add chunks to the vector store, scoped by session."""
        pass
        
    @abstractmethod
    async def search(self, session_id: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant chunks within a session's document collection."""
        pass
        
    @abstractmethod
    async def delete_session_vectors(self, session_id: str):
        """Delete all vectors associated with a session."""
        pass
