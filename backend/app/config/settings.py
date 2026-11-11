import os
from dataclasses import dataclass, field
from typing import List


def _resolve_database_url() -> str:
    """Resolve DATABASE_URL with writable SQLite fallback for container deployments."""
    raw_url = os.getenv("DATABASE_URL", "").strip()

    if not raw_url:
        backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        return f"sqlite:///{os.path.join(backend_dir, 'inquira.db')}"

    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql://", 1)

    if raw_url.startswith("sqlite"):
        clean_path = raw_url.replace("sqlite:////", "/").replace("sqlite:///", "")
        db_dir = os.path.dirname(os.path.abspath(clean_path))
        try:
            if db_dir and not os.path.exists(db_dir):
                os.makedirs(db_dir, exist_ok=True)
            with open(os.path.abspath(clean_path), "a"):
                pass
            return raw_url
        except OSError:
            fallback_dir = "/tmp" if os.path.exists("/tmp") else os.path.abspath(
                os.path.join(os.path.dirname(__file__), "..", "..")
            )
            return f"sqlite:///{os.path.join(fallback_dir, 'inquira.db')}"

    return raw_url


def _parse_cors_origins() -> List[str]:
    raw = os.getenv("CORS_ORIGINS", "*").strip()
    if not raw or raw == "*":
        return ["*"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    """Application configuration loaded from environment variables."""

    app_title: str = os.getenv("APP_TITLE", "Inquira API")
    app_version: str = os.getenv("APP_VERSION", "1.0.0")
    database_url: str = field(default_factory=_resolve_database_url)
    cors_origins: List[str] = field(default_factory=_parse_cors_origins)
    seed_demo_data: bool = os.getenv("SEED_DEMO_DATA", "true").lower() in {"1", "true", "yes"}


settings = Settings()
