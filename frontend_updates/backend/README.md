# Chodhyam Backend

This is the FastAPI backend for the Chodhyam ephemeral document intelligence workspace.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the application (development mode):
```bash
uvicorn app.main:app --reload
```

## Structure
- `app/api`: FastAPI routes (auth, documents, chat)
- `app/core`: Configuration and security
- `app/services`: Abstract interfaces for Cloud Provider agnostic behavior (`IStorageService`, `IVectorStoreService`, `IInferenceService`)
- `app/adapters`: Concrete implementations of the services (e.g. `ChromaVectorAdapter`, `LocalStorageAdapter`, `MockSLMAdapter`)

## Providers
Currently, the backend uses mock adapters for storage and inference so that local development is seamless before a specific SLM provider is chosen. The vector database is configured to use ChromaDB.
