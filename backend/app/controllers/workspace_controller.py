from fastapi import Depends
from sqlalchemy.orm import Session

from ..config.database import get_db
from ..schemas import ActiveWorkspaceIn, UserPreferencesIn, WorkspaceIn
from ..services import workspace_service


def list_workspaces(db: Session = Depends(get_db)):
    return workspace_service.list_workspaces(db)


def create_workspace(data: WorkspaceIn, db: Session = Depends(get_db)):
    return workspace_service.create_workspace(db, data)


def move_workspace_up(workspace_id: int, db: Session = Depends(get_db)):
    return workspace_service.move_workspace(db, workspace_id, "up")


def move_workspace_down(workspace_id: int, db: Session = Depends(get_db)):
    return workspace_service.move_workspace(db, workspace_id, "down")


def rename_workspace(workspace_id: int, data: WorkspaceIn, db: Session = Depends(get_db)):
    return workspace_service.rename_workspace(db, workspace_id, data)


def get_active_workspace(db: Session = Depends(get_db)):
    return workspace_service.get_active_workspace(db)


def set_active_workspace(data: ActiveWorkspaceIn, db: Session = Depends(get_db)):
    return workspace_service.set_active_workspace(db, data)


def get_user_preferences(db: Session = Depends(get_db)):
    return workspace_service.get_user_preferences(db)


def update_user_preferences(data: UserPreferencesIn, db: Session = Depends(get_db)):
    return workspace_service.update_user_preferences(db, data)


def leave_workspace(workspace_id: int, db: Session = Depends(get_db)):
    return workspace_service.remove_workspace(db, workspace_id)


def delete_workspace(workspace_id: int, db: Session = Depends(get_db)):
    return workspace_service.remove_workspace(db, workspace_id)
