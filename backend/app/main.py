from contextlib import asynccontextmanager

from fastapi import FastAPI

from .config import init_db, settings
from .controllers.inquiry_controller import (
    copy_to_workspace,
    create_inquiry,
    duplicate,
    get_inquiry,
    list_inquiries,
    move_to_workspace,
    publish,
    remove,
    rename,
    save_inquiry,
    unpublish,
)
from .controllers.response_controller import (
    export_csv,
    generate_test_response,
    list_replies,
    public_inquiry,
    submit_reply,
)
from .controllers.workspace_controller import (
    create_workspace,
    delete_workspace,
    get_active_workspace,
    get_user_preferences,
    leave_workspace,
    list_workspaces,
    move_workspace_down,
    move_workspace_up,
    rename_workspace,
    set_active_workspace,
    update_user_preferences,
)
from .lib.formatters import inquiry_out
from .middleware import register_middleware
from .routes import register_routes
from .services.inquiry_service import apply_payload, clone_prompts


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Run schema setup, column migrations, and initial seeding on startup."""
    init_db()
    yield


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    application = FastAPI(
        title=settings.app_title,
        version=settings.app_version,
        lifespan=lifespan,
    )
    register_middleware(application)
    register_routes(application)
    return application


app = create_app()

__all__ = [
    "app",
    "create_app",
    "lifespan",
    "apply_payload",
    "clone_prompts",
    "inquiry_out",
    "list_workspaces",
    "create_workspace",
    "move_workspace_up",
    "move_workspace_down",
    "rename_workspace",
    "get_active_workspace",
    "set_active_workspace",
    "get_user_preferences",
    "update_user_preferences",
    "leave_workspace",
    "delete_workspace",
    "list_inquiries",
    "create_inquiry",
    "get_inquiry",
    "save_inquiry",
    "rename",
    "remove",
    "duplicate",
    "copy_to_workspace",
    "move_to_workspace",
    "publish",
    "unpublish",
    "list_replies",
    "export_csv",
    "generate_test_response",
    "public_inquiry",
    "submit_reply",
]
