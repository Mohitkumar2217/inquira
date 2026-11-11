from datetime import datetime
from typing import Literal

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..lib.formatters import workspace_out
from ..models import Inquiry, UserPreference, Workspace
from ..schemas import ActiveWorkspaceIn, UserPreferencesIn, WorkspaceIn


def get_workspace_or_404(db: Session, workspace_id: int) -> Workspace:
    workspace = db.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    return workspace


def list_workspaces(db: Session) -> list:
    counts = dict(db.query(Inquiry.workspace_id, func.count(Inquiry.id)).group_by(Inquiry.workspace_id).all())
    rows = (
        db.query(Workspace)
        .order_by(Workspace.is_private.desc(), Workspace.order_index.asc(), Workspace.id.asc())
        .all()
    )
    return [workspace_out(w, counts) for w in rows]


def create_workspace(db: Session, data: WorkspaceIn) -> dict:
    name = data.name.strip()
    if not name:
        raise HTTPException(422, "Workspace name cannot be empty")
    if db.query(Workspace).filter(func.lower(Workspace.name) == name.lower()).first():
        raise HTTPException(409, "A workspace with this name already exists")
    max_order = db.query(func.max(Workspace.order_index)).scalar() or 0
    workspace = Workspace(name=name, order_index=max_order + 1)
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return workspace_out(workspace, {})


def move_workspace(db: Session, workspace_id: int, direction: Literal["up", "down"]) -> dict:
    """Swap a non-private workspace's display order with its adjacent sibling."""
    ws = get_workspace_or_404(db, workspace_id)
    workspaces = (
        db.query(Workspace)
        .filter_by(is_private=False)
        .order_by(Workspace.order_index.asc(), Workspace.id.asc())
        .all()
    )
    idx = next((i for i, w in enumerate(workspaces) if w.id == ws.id), None)
    offset = -1 if direction == "up" else 1
    if idx is not None and 0 <= idx + offset < len(workspaces):
        neighbor = workspaces[idx + offset]
        if neighbor.order_index == ws.order_index:
            neighbor.order_index = idx
            ws.order_index = idx + offset
        else:
            ws.order_index, neighbor.order_index = neighbor.order_index, ws.order_index
        db.commit()
    return {"ok": True}


def rename_workspace(db: Session, workspace_id: int, data: WorkspaceIn) -> dict:
    workspace = get_workspace_or_404(db, workspace_id)
    name = data.name.strip()
    if not name:
        raise HTTPException(422, "Workspace name cannot be empty")
    duplicate = (
        db.query(Workspace)
        .filter(func.lower(Workspace.name) == name.lower(), Workspace.id != workspace.id)
        .first()
    )
    if duplicate:
        raise HTTPException(409, "A workspace with this name already exists")
    workspace.name = name
    db.commit()
    db.refresh(workspace)
    return workspace_out(workspace, {})


def remove_workspace(db: Session, workspace_id: int) -> dict:
    workspace = get_workspace_or_404(db, workspace_id)
    if workspace.is_private:
        raise HTTPException(400, "The private workspace cannot be removed")
    private_workspace = db.query(Workspace).filter_by(is_private=True).first()
    if private_workspace is None:
        raise HTTPException(409, "The private workspace is unavailable")

    moved_count = (
        db.query(Inquiry)
        .filter_by(workspace_id=workspace.id)
        .update({Inquiry.workspace_id: private_workspace.id}, synchronize_session=False)
    )
    pref = db.query(UserPreference).filter_by(user_key="default").first()
    if pref and pref.active_workspace_id == workspace.id:
        pref.active_workspace_id = private_workspace.id
    db.delete(workspace)
    db.commit()
    return {"ok": True, "moved_forms": moved_count}


def get_active_workspace(db: Session) -> dict:
    pref = db.query(UserPreference).filter_by(user_key="default").first()
    if pref and pref.active_workspace_id:
        ws = db.get(Workspace, pref.active_workspace_id)
        if ws:
            return {"active_workspace_id": ws.id}
    private = db.query(Workspace).filter_by(is_private=True).first()
    first_ws = private or db.query(Workspace).first()
    return {"active_workspace_id": first_ws.id if first_ws else None}


def set_active_workspace(db: Session, data: ActiveWorkspaceIn) -> dict:
    ws = get_workspace_or_404(db, data.workspace_id)
    pref = db.query(UserPreference).filter_by(user_key="default").first()
    if not pref:
        pref = UserPreference(user_key="default", active_workspace_id=ws.id)
        db.add(pref)
    else:
        pref.active_workspace_id = ws.id
    ws.last_visited_at = datetime.utcnow()
    db.commit()
    return {"active_workspace_id": ws.id}


def get_user_preferences(db: Session) -> dict:
    return get_active_workspace(db)


def update_user_preferences(db: Session, data: UserPreferencesIn) -> dict:
    pref = db.query(UserPreference).filter_by(user_key="default").first()
    if not pref:
        pref = UserPreference(user_key="default")
        db.add(pref)
    if data.active_workspace_id is not None:
        ws = get_workspace_or_404(db, data.active_workspace_id)
        pref.active_workspace_id = ws.id
        ws.last_visited_at = datetime.utcnow()
    db.commit()
    return {"active_workspace_id": pref.active_workspace_id}
