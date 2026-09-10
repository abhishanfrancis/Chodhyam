from abc import ABC, abstractmethod
from typing import List, Dict, Any

class IStorageService(ABC):
    @abstractmethod
    async def upload_document(self, session_id: str, document_id: str, file_content: bytes, filename: str) -> str:
        """Upload a temporary document for a session, returns the storage key or URI."""
        pass
        
    @abstractmethod
    async def get_document(self, storage_key: str) -> bytes:
        """Retrieve a document's content."""
        pass
        
    @abstractmethod
    async def delete_session_documents(self, session_id: str):
        """Delete all documents associated with a session."""
        pass
