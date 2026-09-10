import os
from typing import Dict, Any, List
from app.services.storage_service import IStorageService

class LocalStorageAdapter(IStorageService):
    def __init__(self, base_dir: str = "/tmp/chodhyam_storage"):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)
        
    async def upload_document(self, session_id: str, document_id: str, file_content: bytes, filename: str) -> str:
        session_dir = os.path.join(self.base_dir, session_id)
        os.makedirs(session_dir, exist_ok=True)
        
        file_path = os.path.join(session_dir, f"{document_id}_{filename}")
        with open(file_path, "wb") as f:
            f.write(file_content)
            
        return file_path
        
    async def get_document(self, storage_key: str) -> bytes:
        if os.path.exists(storage_key):
            with open(storage_key, "rb") as f:
                return f.read()
        raise FileNotFoundError("Document not found in local storage.")
        
    async def delete_session_documents(self, session_id: str):
        session_dir = os.path.join(self.base_dir, session_id)
        if os.path.exists(session_dir):
            for file in os.listdir(session_dir):
                os.remove(os.path.join(session_dir, file))
            os.rmdir(session_dir)
