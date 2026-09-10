from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
import time
from app.core.config import settings

router = APIRouter()

class SessionResponse(BaseModel):
    session_id: str
    expires_at: float

@router.post("/login", response_model=SessionResponse)
async def login():
    # Simplistic mock login for ephemeral session
    session_id = f"e-{uuid.uuid4().hex[:8]}"
    expires_at = time.time() + (settings.SESSION_TIMEOUT_MINUTES * 60)
    
    return SessionResponse(session_id=session_id, expires_at=expires_at)

@router.post("/logout")
async def logout(session_id: str):
    # In a real app, this would trigger the cleanup task
    return {"message": "Session logged out and cleanup triggered."}
