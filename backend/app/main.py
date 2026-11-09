import csv
import io
import json
import uuid
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import func, inspect, text
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine, get_db
from .models import Inquiry, Prompt, Reply, ReplyItem, Workspace
from .rules import check_value, valid_kind
from .schemas import InquiryIn, ReplyIn, TitleIn, WorkspaceIn, WorkspaceMoveIn
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(_):
    Base.metadata.create_all(engine)
    # lightweight migration for databases created before multi-field pages existed
    if "page" not in {column["name"] for column in inspect(engine).get_columns("prompts")}:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE prompts ADD COLUMN page JSON"))
    if "workspace_id" not in {column["name"] for column in inspect(engine).get_columns("inquiries")}:
        with engine.begin() as connection:
            connection.execute(text(
                "ALTER TABLE inquiries ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id)"
            ))
    with SessionLocal() as db:
        private_workspace = db.query(Workspace).filter_by(is_private=True).first()
        if private_workspace is None:
            private_workspace = Workspace(name="My workspace", is_private=True)
            db.add(private_workspace)
            db.flush()
        db.query(Inquiry).filter(Inquiry.workspace_id.is_(None)).update(
            {Inquiry.workspace_id: private_workspace.id}, synchronize_session=False
        )
        seed_if_empty(db)
        db.query(Inquiry).filter(Inquiry.workspace_id.is_(None)).update(
            {Inquiry.workspace_id: private_workspace.id}, synchronize_session=False
        )
        db.commit()
    yield


app = FastAPI(title="Inquira API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ---------- helpers ----------
def prompt_out(p):
    return {"id": p.id, "position": p.position, "kind": p.kind, "label": p.label, "hint": p.hint or "",
            "mandatory": bool(p.mandatory), "choices": p.choices or [], "page": p.page or None}


def inquiry_out(i, full=True):
    out = {"id": i.id, "slug": i.slug, "title": i.title, "status": i.status, "accent": i.accent,
           "workspace_id": i.workspace_id,
           "closing_heading": i.closing_heading, "closing_text": i.closing_text,
           "updated_at": i.updated_at.isoformat() if i.updated_at else None,
           "created_at": i.created_at.isoformat() if i.created_at else None}
    if full:
        out["prompts"] = [prompt_out(p) for p in i.prompts]
    return out


def find(db, inquiry_id):
    inq = db.get(Inquiry, inquiry_id)
    if not inq:
        raise HTTPException(404, "Inquiry not found")
    return inq


def find_workspace(db, workspace_id):
    workspace = db.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    return workspace


def workspace_out(workspace, counts):
    return {"id": workspace.id, "name": workspace.name, "is_private": workspace.is_private,
            "form_count": counts.get(workspace.id, 0)}


def apply_payload(inq, data):
    inq.updated_at = datetime.utcnow()
    inq.title = data.title.strip() or "Untitled form"
    inq.accent, inq.closing_heading, inq.closing_text = data.accent, data.closing_heading, data.closing_text
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
        p.choices = [c for c in pd.choices if c.strip()] if pd.kind in (
            "choice", "dropdown", "checkbox", "ranking", "matrix"
        ) else []
    for pid, p in existing.items():
        if pid not in kept:
            inq.prompts.remove(p)


def new_slug():
    return uuid.uuid4().hex[:8]


def clone_prompts(src, dest):
    """Copy prompts into `dest`; every multi-field page gets a fresh key so copies never share a page."""
    keys = {}
    for p in src.prompts:
        page = dict(p.page) if p.page else None
        if page:
            page["key"] = keys.setdefault(page["key"], new_slug())
        dest.prompts.append(Prompt(position=p.position, kind=p.kind, label=p.label, hint=p.hint,
                                   mandatory=p.mandatory, choices=list(p.choices or []), page=page))


# ---------- creator: inquiries ----------
@app.get("/api/workspaces")
def list_workspaces(db: Session = Depends(get_db)):
    counts = dict(db.query(Inquiry.workspace_id, func.count(Inquiry.id))
                  .group_by(Inquiry.workspace_id).all())
    return [workspace_out(w, counts) for w in
            db.query(Workspace).order_by(Workspace.is_private.desc(), Workspace.name).all()]


@app.post("/api/workspaces", status_code=201)
def create_workspace(data: WorkspaceIn, db: Session = Depends(get_db)):
    name = data.name.strip()
    if not name:
        raise HTTPException(422, "Workspace name cannot be empty")
    if db.query(Workspace).filter(func.lower(Workspace.name) == name.lower()).first():
        raise HTTPException(409, "A workspace with this name already exists")
    workspace = Workspace(name=name)
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return workspace_out(workspace, {})


@app.patch("/api/workspaces/{workspace_id}")
def rename_workspace(workspace_id: int, data: WorkspaceIn, db: Session = Depends(get_db)):
    workspace = find_workspace(db, workspace_id)
    name = data.name.strip()
    if not name:
        raise HTTPException(422, "Workspace name cannot be empty")
    duplicate = db.query(Workspace).filter(
        func.lower(Workspace.name) == name.lower(), Workspace.id != workspace.id
    ).first()
    if duplicate:
        raise HTTPException(409, "A workspace with this name already exists")
    workspace.name = name
    db.commit()
    db.refresh(workspace)
    return workspace_out(workspace, {})


def remove_workspace(workspace, db):
    if workspace.is_private:
        raise HTTPException(400, "The private workspace cannot be removed")
    private_workspace = db.query(Workspace).filter_by(is_private=True).first()
    if private_workspace is None:
        raise HTTPException(409, "The private workspace is unavailable")
    moved_count = db.query(Inquiry).filter_by(workspace_id=workspace.id).update(
        {Inquiry.workspace_id: private_workspace.id}, synchronize_session=False
    )
    db.delete(workspace)
    db.commit()
    return {"ok": True, "moved_forms": moved_count}


@app.post("/api/workspaces/{workspace_id}/leave")
def leave_workspace(workspace_id: int, db: Session = Depends(get_db)):
    return remove_workspace(find_workspace(db, workspace_id), db)


@app.delete("/api/workspaces/{workspace_id}")
def delete_workspace(workspace_id: int, db: Session = Depends(get_db)):
    return remove_workspace(find_workspace(db, workspace_id), db)


@app.get("/api/inquiries")
def list_inquiries(db: Session = Depends(get_db)):
    counts = dict(db.query(Reply.inquiry_id, func.count(Reply.id)).group_by(Reply.inquiry_id).all())
    rows = db.query(Inquiry).order_by(Inquiry.updated_at.desc()).all()
    return [{**inquiry_out(i, False), "reply_count": counts.get(i.id, 0), "prompt_count": len(i.prompts)} for i in rows]


@app.post("/api/inquiries", status_code=201)
def create_inquiry(data: InquiryIn, db: Session = Depends(get_db)):
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


@app.get("/api/inquiries/{iid}")
def get_inquiry(iid: int, db: Session = Depends(get_db)):
    return inquiry_out(find(db, iid))


@app.put("/api/inquiries/{iid}")
def save_inquiry(iid: int, data: InquiryIn, db: Session = Depends(get_db)):
    inq = find(db, iid)
    apply_payload(inq, data)
    db.commit()
    db.refresh(inq)
    return inquiry_out(inq)


@app.patch("/api/inquiries/{iid}/title")
def rename(iid: int, data: TitleIn, db: Session = Depends(get_db)):
    inq = find(db, iid)
    inq.title = data.title.strip() or inq.title
    db.commit()
    return inquiry_out(inq, False)


@app.delete("/api/inquiries/{iid}", status_code=204)
def remove(iid: int, db: Session = Depends(get_db)):
    db.delete(find(db, iid))
    db.commit()


@app.post("/api/inquiries/{iid}/duplicate", status_code=201)
def duplicate(iid: int, db: Session = Depends(get_db)):
    src = find(db, iid)
    cp = Inquiry(slug=new_slug(), workspace_id=src.workspace_id, title=f"{src.title} (copy)", accent=src.accent,
                 closing_heading=src.closing_heading, closing_text=src.closing_text)
    clone_prompts(src, cp)
    db.add(cp)
    db.commit()
    return inquiry_out(cp, False)


@app.post("/api/inquiries/{iid}/copy-to/{workspace_id}", status_code=201)
def copy_to_workspace(iid: int, workspace_id: int, db: Session = Depends(get_db)):
    src = find(db, iid)
    target = find_workspace(db, workspace_id)
    cp = Inquiry(slug=new_slug(), workspace_id=target.id, title=f"{src.title} (copy)", accent=src.accent,
                 closing_heading=src.closing_heading, closing_text=src.closing_text)
    clone_prompts(src, cp)
    db.add(cp)
    db.commit()
    return inquiry_out(cp, False)


@app.patch("/api/inquiries/{iid}/workspace")
def move_to_workspace(iid: int, data: WorkspaceMoveIn, db: Session = Depends(get_db)):
    inq = find(db, iid)
    target = find_workspace(db, data.workspace_id)
    inq.workspace_id = target.id
    db.commit()
    return inquiry_out(inq, False)


@app.post("/api/inquiries/{iid}/publish")
def publish(iid: int, db: Session = Depends(get_db)):
    inq = find(db, iid)
    if not inq.prompts:
        raise HTTPException(422, "Add at least one question before publishing")
    inq.status = "published"
    db.commit()
    return inquiry_out(inq, False)


@app.post("/api/inquiries/{iid}/unpublish")
def unpublish(iid: int, db: Session = Depends(get_db)):
    inq = find(db, iid)
    inq.status = "draft"
    db.commit()
    return inquiry_out(inq, False)


# ---------- creator: replies ----------
def format_reply_value(prompt, value):
    if prompt.kind not in ("checkbox", "ranking", "matrix", "contact_info"):
        return value
    try:
        parsed = json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return value
    if prompt.kind in ("checkbox", "ranking") and isinstance(parsed, list):
        return ", ".join(str(item) for item in parsed)
    if prompt.kind == "matrix" and isinstance(parsed, dict):
        return "; ".join(f"{row}: {score}" for row, score in parsed.items())
    if prompt.kind == "contact_info" and isinstance(parsed, dict):
        return "; ".join(
            f"{label}: {parsed[field]}"
            for field, label in (("name", "Name"), ("email", "Email"), ("phone", "Phone"))
            if isinstance(parsed.get(field), str) and parsed[field].strip()
        )
    return value


def reply_rows(inq):
    prompts = {p.id: p for p in inq.prompts}
    return [{"id": r.id, "submitted_at": r.submitted_at.isoformat(),
             "answers": {str(it.prompt_id): format_reply_value(prompts[it.prompt_id], it.value)
                         if it.prompt_id in prompts else it.value for it in r.items}}
            for r in sorted(inq.replies, key=lambda r: r.submitted_at, reverse=True)]


def summarize(inq):
    out = []
    for p in inq.prompts:
        vals = [it.value for r in inq.replies for it in r.items if it.prompt_id == p.id and (it.value or "").strip()]
        s = {"prompt_id": p.id, "label": p.label, "kind": p.kind, "answered": len(vals)}
        if p.kind in ("choice", "dropdown"):
            s["counts"] = {c: vals.count(c) for c in p.choices}
        elif p.kind == "checkbox":
            selections = []
            for value in vals:
                try:
                    parsed = json.loads(value)
                except (TypeError, json.JSONDecodeError):
                    continue
                if isinstance(parsed, list):
                    selections.extend(option for option in parsed if isinstance(option, str))
            s["counts"] = {c: selections.count(c) for c in p.choices}
        elif p.kind == "yes_no":
            s["counts"] = {"yes": vals.count("yes"), "no": vals.count("no")}
        elif p.kind in ("rating", "nps", "opinion_scale"):
            low, high = (0, 10) if p.kind == "nps" else (1, 10) if p.kind == "opinion_scale" else (1, 5)
            numbers = [int(value) for value in vals if value.isdigit() and low <= int(value) <= high]
            s["counts"] = {str(n): numbers.count(n) for n in range(low, high + 1)}
            s["average"] = round(sum(numbers) / len(numbers), 2) if numbers else None
        elif p.kind == "number":
            nums = [float(v) for v in vals]
            s["average"] = round(sum(nums) / len(nums), 2) if nums else None
        out.append(s)
    return out


@app.get("/api/inquiries/{iid}/replies")
def list_replies(iid: int, db: Session = Depends(get_db)):
    inq = find(db, iid)
    return {"inquiry": inquiry_out(inq), "replies": reply_rows(inq), "summary": summarize(inq)}


@app.get("/api/inquiries/{iid}/export.csv")
def export_csv(iid: int, db: Session = Depends(get_db)):
    inq = find(db, iid)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Submitted at"] + [p.label for p in inq.prompts])
    for r in reply_rows(inq):
        w.writerow([r["submitted_at"]] + [r["answers"].get(str(p.id), "") for p in inq.prompts])
    return Response(buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="{inq.slug}-replies.csv"'})


# ---------- public respondent ----------
def find_public(db, slug):
    inq = db.query(Inquiry).filter_by(slug=slug, status="published").first()
    if not inq:
        raise HTTPException(404, "This form isn't available")
    return inq


@app.get("/api/public/{slug}")
def public_inquiry(slug: str, db: Session = Depends(get_db)):
    return inquiry_out(find_public(db, slug))


@app.post("/api/public/{slug}/replies", status_code=201)
def submit_reply(slug: str, data: ReplyIn, db: Session = Depends(get_db)):
    inq = find_public(db, slug)
    errors = {}
    for p in inq.prompts:
        msg = check_value(p, data.answers.get(str(p.id)))
        if msg:
            errors[p.id] = msg
    if errors:
        raise HTTPException(422, {"errors": errors})
    rep = Reply()
    for p in inq.prompts:
        v = data.answers.get(str(p.id))
        if v is not None and str(v).strip() != "":
            rep.items.append(ReplyItem(prompt_id=p.id, value=str(v).strip()))
    inq.replies.append(rep)
    db.commit()
    return {"ok": True, "reply_id": rep.id}
