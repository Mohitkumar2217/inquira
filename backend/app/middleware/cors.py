from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ..config.settings import settings


def configure_cors(app: FastAPI) -> None:
    """Configure Cross-Origin Resource Sharing policy from settings."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
