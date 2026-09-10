import asyncio
from typing import Dict, Any
from app.services.inference_service import IInferenceService

class MockSLMAdapter(IInferenceService):
    async def generate_answer(self, question: str, context: str, session_id: str) -> Dict[str, Any]:
        # Simulate network delay for SLM inference
        await asyncio.sleep(1.5)
        
        return {
            "answer": f"This is a mock generated answer for the question: '{question}'. Context provided was {len(context)} characters long.",
            "model": "mock-slm-0.1",
            "latency_ms": 1500
        }
