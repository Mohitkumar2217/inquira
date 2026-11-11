from fastapi import FastAPI

from .cors import configure_cors
from .logging import request_timing_middleware


def register_middleware(app: FastAPI) -> None:
    """Attach HTTP middleware layers to the FastAPI application."""
    configure_cors(app)
    app.middleware("http")(request_timing_middleware)


__all__ = ["register_middleware", "configure_cors", "request_timing_middleware"]
