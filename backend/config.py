"""
Application configuration.

Loads settings from environment variables / .env file using Pydantic Settings.

Supports both PostgreSQL (production) and SQLite (local development).
When DATABASE_URL is not set or PostgreSQL is unavailable, falls back to SQLite.
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database — defaults to SQLite for local development (no setup needed)
    database_url: str = ""

    # Application
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    model_version: str = "v1"

    # Paths
    base_dir: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    @property
    def model_dir(self) -> str:
        return os.path.join(self.base_dir, "ml", "saved_models")

    @property
    def effective_database_url(self) -> str:
        """Return the database URL, defaulting to SQLite if not configured."""
        if self.database_url and self.database_url.startswith("postgresql"):
            return self.database_url
        # Fall back to SQLite — no installation needed
        db_path = os.path.join(self.base_dir, "playervalue.db")
        return f"sqlite:///{db_path}"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()
