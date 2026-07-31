import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database. Defaults to a local SQLite file so the app boots with zero setup
    # for local development; production (docker-compose / Render) sets this to a
    # real Postgres URL.
    database_url: str = "sqlite:///./dev.db"

    # WarcraftLogs API credentials (previously hardcoded in pull_logs.py).
    wcl_client_id: str = ""
    wcl_client_secret: str = ""

    # Discord OAuth (see https://discord.com/developers/applications).
    discord_client_id: str = ""
    discord_client_secret: str = ""
    discord_redirect_uri: str = "http://localhost:8000/api/auth/discord/callback"

    # Signing secret for our own session JWTs (NOT a Discord secret).
    jwt_secret: str = "dev-insecure-secret-change-me"
    jwt_expires_days: int = 14

    # Where to send the browser back to after login.
    frontend_url: str = "http://localhost:3000"

    # Comma-separated list of allowed CORS origins.
    cors_origins: str = "https://wow-website.onrender.com,http://localhost:3000"

    # Local LLM used by the compare-summary feature.
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
