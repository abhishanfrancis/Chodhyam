from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Chodhyam API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Provider configurations
    CLOUD_PROVIDER: str = "local" # local, oci, azure
    STORAGE_PROVIDER: str = "local"
    VECTOR_STORE: str = "chroma"
    INFERENCE_PROVIDER: str = "mock"
    
    # Ephemeral config
    SESSION_TIMEOUT_MINUTES: int = 45
    
    class Config:
        env_file = ".env"

settings = Settings()
