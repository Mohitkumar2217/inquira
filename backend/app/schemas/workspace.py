from typing import Optional
from pydantic import BaseModel, Field


class WorkspaceIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class WorkspaceMoveIn(BaseModel):
    workspace_id: int


class ActiveWorkspaceIn(BaseModel):
    workspace_id: int


class UserPreferencesIn(BaseModel):
    active_workspace_id: Optional[int] = None
