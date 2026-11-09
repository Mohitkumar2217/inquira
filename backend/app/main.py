import csv
import io
import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine, get_db
from .models import Inquiry, Prompt, Reply, ReplyItem
from .rules import check_value, valid_kind
from .schemas import InquiryIn, ReplyIn, TitleIn
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(_):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_if_empty(db)
    yield


app = FastAPI(title="Inquira API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ---------- helpers ----------
def prompt_out(p):
    return {"id": p.id, "position": p.position, "kind": p.kind, "label": p.label, "hint": p.hint or "",
            "mandatory": bool(p.mandatory), "choices": p.choices or []}


def inquiry_out(i, full=True):
    out = {"id": i.id, "slug": i.slug, "title": i.title, "status": i.status, "accent": i.accent,
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


def apply_payload(inq, data):
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
        p.choices = [c for c in pd.choices if c.strip()] if pd.kind in ("choice", "dropdown") else []
    for pid, p in existing.items():
        if pid not in kept:
            inq.prompts.remove(p)


def new_slug():
    return uuid.uuid4().hex[:8]


# ---------- creator: inquiries ----------
@app.get("/api/inquiries")
def list_inquiries(db: Session = Depends(get_db)):
    counts = dict(db.query(Reply.inquiry_id, func.count(Reply.id)).group_by(Reply.inquiry_id).all())
    rows = db.query(Inquiry).order_by(Inquiry.updated_at.desc()).all()
    return [{**inquiry_out(i, False), "reply_count": counts.get(i.id, 0), "prompt_count": len(i.prompts)} for i in rows]


@app.post("/api/inquiries", status_code=201)
def create_inquiry(data: InquiryIn, db: Session = Depends(get_db)):
    inq = Inquiry(slug=new_slug())
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
    cp = Inquiry(slug=new_slug(), title=f"{src.title} (copy)", accent=src.accent,
                 closing_heading=src.closing_heading, closing_text=src.closing_text)
    for p in src.prompts:
        cp.prompts.append(Prompt(position=p.position, kind=p.kind, label=p.label, hint=p.hint,
                                 mandatory=p.mandatory, choices=list(p.choices or [])))
    db.add(cp)
    db.commit()
    return inquiry_out(cp, False)


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
def reply_rows(inq):
    return [{"id": r.id, "submitted_at": r.submitted_at.isoformat(),
             "answers": {str(it.prompt_id): it.value for it in r.items}}
            for r in sorted(inq.replies, key=lambda r: r.submitted_at, reverse=True)]


def summarize(inq):
    out = []
    for p in inq.prompts:
        vals = [it.value for r in inq.replies for it in r.items if it.prompt_id == p.id and (it.value or "").strip()]
        s = {"prompt_id": p.id, "label": p.label, "kind": p.kind, "answered": len(vals)}
        if p.kind in ("choice", "dropdown"):
            s["counts"] = {c: vals.count(c) for c in p.choices}
        elif p.kind == "yes_no":
            s["counts"] = {"yes": vals.count("yes"), "no": vals.count("no")}
        elif p.kind == "rating":
            s["counts"] = {str(n): vals.count(str(n)) for n in range(1, 6)}
            s["average"] = round(sum(int(v) for v in vals) / len(vals), 2) if vals else None
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
