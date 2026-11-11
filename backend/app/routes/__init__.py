from fastapi import FastAPI

from .form_routes import router as form_router
from .health_routes import router as health_router
from .inquiry_routes import router as inquiry_router
from .public_routes import router as public_router
from .workspace_routes import router as workspace_router


def register_routes(app: FastAPI) -> None:
    """Attach all domain routers to the FastAPI application."""
    app.include_router(health_router)
    app.include_router(workspace_router)
    app.include_router(inquiry_router)
    app.include_router(public_router)
    app.include_router(form_router)


__all__ = ["register_routes"]
