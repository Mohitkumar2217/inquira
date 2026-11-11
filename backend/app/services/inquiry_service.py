from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..lib.formatters import inquiry_out, new_slug
from ..lib.validators import valid_kind
from ..models import Inquiry, Prompt, Reply, Workspace
from ..schemas import InquiryIn, TitleIn, WorkspaceMoveIn
from .workspace_service import get_workspace_or_404


def get_inquiry_or_404(db: Session, inquiry_id: int) -> Inquiry:
    inq = db.get(Inquiry, inquiry_id)
    if not inq:
        raise HTTPException(404, "Inquiry not found")
    return inq


def apply_payload(inq: Inquiry, data: InquiryIn) -> None:
    """Apply validated form & prompt updates to an Inquiry ORM instance."""
    inq.updated_at = datetime.utcnow()
    inq.title = data.title.strip() or "Untitled form"
    inq.accent = data.accent
    if hasattr(data, "theme") and data.theme:
        inq.theme = data.theme
    if hasattr(data, "settings") and data.settings is not None:
        inq.settings = data.settings
    inq.closing_heading = data.closing_heading
    inq.closing_text = data.closing_text

    existing = {p.id: p for p in inq.prompts}
    kept = set()
    for pos, pd in enumerate(data.prompts):
        if not valid_kind(pd.kind):
            raise HTTPException(422, f"Unknown prompt kind: {pd.kind}")
        p = existing.get(pd.id) if pd.id and pd.id > 0 else None
        if p is None:
            p = Prompt()
            inq.prompts.append(p)
        else:
            kept.add(p.id)
        p.position, p.kind, p.label, p.hint = pos, pd.kind, pd.label, pd.hint
        p.mandatory = pd.mandatory
        p.page = pd.page.model_dump() if pd.page else None
        p.choices = (
            [c for c in pd.choices if c.strip()]
            if pd.kind in ("choice", "dropdown", "checkbox", "ranking", "matrix")
            else []
        )
        p.properties = pd.properties if hasattr(pd, "properties") and pd.properties else {}
        p.logic_rules = pd.logic_rules if hasattr(pd, "logic_rules") and pd.logic_rules else {}

    for pid, p in existing.items():
        if pid not in kept:
            inq.prompts.remove(p)


def clone_prompts(src: Inquiry, dest: Inquiry) -> None:
    """Copy prompts into `dest`; every multi-field page gets a fresh key so copies never share a page."""
    keys = {}
    for p in src.prompts:
        page = dict(p.page) if p.page else None
        if page:
            page["key"] = keys.setdefault(page["key"], new_slug())
        dest.prompts.append(
            Prompt(
                position=p.position,
                kind=p.kind,
                label=p.label,
                hint=p.hint,
                mandatory=p.mandatory,
                choices=list(p.choices or []),
                page=page,
                properties=dict(getattr(p, "properties", None) or {}),
                logic_rules=dict(getattr(p, "logic_rules", None) or {}),
            )
        )


def list_inquiries(db: Session) -> list:
    counts = dict(db.query(Reply.inquiry_id, func.count(Reply.id)).group_by(Reply.inquiry_id).all())
    rows = db.query(Inquiry).order_by(Inquiry.updated_at.desc()).all()
    return [
        {**inquiry_out(i, False), "reply_count": counts.get(i.id, 0), "prompt_count": len(i.prompts)}
        for i in rows
    ]


def create_inquiry(db: Session, data: InquiryIn) -> dict:
    workspace_id = data.workspace_id
    if workspace_id is None:
        private_workspace = db.query(Workspace).filter_by(is_private=True).first()
        workspace_id = private_workspace.id if private_workspace else None
    elif db.get(Workspace, workspace_id) is None:
        raise HTTPException(404, "Workspace not found")

    inq = Inquiry(slug=new_slug(), workspace_id=workspace_id)
    apply_payload(inq, data)
    db.add(inq)
    db.commit()
    return inquiry_out(inq)


def get_inquiry(db: Session, inquiry_id: int) -> dict:
    return inquiry_out(get_inquiry_or_404(db, inquiry_id))


def save_inquiry(db: Session, inquiry_id: int, data: InquiryIn) -> dict:
    inq = get_inquiry_or_404(db, inquiry_id)
    apply_payload(inq, data)
    db.commit()
    db.refresh(inq)
    return inquiry_out(inq)


def rename_inquiry(db: Session, inquiry_id: int, data: TitleIn) -> dict:
    inq = get_inquiry_or_404(db, inquiry_id)
    inq.title = data.title.strip() or inq.title
    db.commit()
    return inquiry_out(inq, False)


def delete_inquiry(db: Session, inquiry_id: int) -> None:
    db.delete(get_inquiry_or_404(db, inquiry_id))
    db.commit()


def clone_inquiry(db: Session, inquiry_id: int, target_workspace_id: Optional[int] = None) -> dict:
    """Duplicate an inquiry into its own workspace or a target workspace."""
    src = get_inquiry_or_404(db, inquiry_id)
    workspace_id = (
        get_workspace_or_404(db, target_workspace_id).id
        if target_workspace_id is not None
        else src.workspace_id
    )
    cp = Inquiry(
        slug=new_slug(),
        workspace_id=workspace_id,
        title=f"{src.title} (copy)",
        accent=src.accent,
        theme=getattr(src, "theme", "Pearl white") or "Pearl white",
        settings=dict(getattr(src, "settings", None) or {}),
        closing_heading=src.closing_heading,
        closing_text=src.closing_text,
    )
    clone_prompts(src, cp)
    db.add(cp)
    db.commit()
    return inquiry_out(cp, False)


def move_inquiry_to_workspace(db: Session, inquiry_id: int, data: WorkspaceMoveIn) -> dict:
    inq = get_inquiry_or_404(db, inquiry_id)
    target = get_workspace_or_404(db, data.workspace_id)
    inq.workspace_id = target.id
    db.commit()
    return inquiry_out(inq, False)


def publish_inquiry(db: Session, inquiry_id: int) -> dict:
    inq = get_inquiry_or_404(db, inquiry_id)
    if not inq.prompts:
        raise HTTPException(422, "Add at least one question before publishing")
    inq.status = "published"
    db.commit()
    return inquiry_out(inq, False)


def unpublish_inquiry(db: Session, inquiry_id: int) -> dict:
    inq = get_inquiry_or_404(db, inquiry_id)
    inq.status = "draft"
    db.commit()
    return inquiry_out(inq, False)
