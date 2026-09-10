from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

class IInferenceService(ABC):
    @abstractmethod
    async def generate_answer(self, question: str, context: str, session_id: str) -> Dict[str, Any]:
        """
        Generate an answer using the provided question and context.
        Should return a dict like {"answer": "...", "model": "...", "latency_ms": 123}
        """
        pass
