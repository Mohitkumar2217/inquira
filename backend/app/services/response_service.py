import csv
import io
import json

from fastapi import HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..lib.formatters import inquiry_out, reply_rows, summarize
from ..lib.validators import check_value
from ..models import Inquiry, Reply, ReplyItem
from ..schemas import ReplyIn
from .inquiry_service import get_inquiry_or_404


def get_public_inquiry_or_404(db: Session, slug: str) -> Inquiry:
    inq = db.query(Inquiry).filter_by(slug=slug, status="published").first()
    if not inq:
        raise HTTPException(404, "This form isn't available")
    return inq


def get_public_inquiry(db: Session, slug: str) -> dict:
    return inquiry_out(get_public_inquiry_or_404(db, slug))


def submit_public_reply(db: Session, slug: str, data: ReplyIn) -> dict:
    inq = get_public_inquiry_or_404(db, slug)
    errors = {}
    for p in inq.prompts:
        raw_val = data.answers.get(str(p.id)) if str(p.id) in data.answers else data.answers.get(p.id)
        msg = check_value(p, raw_val)
        if msg:
            errors[p.id] = msg
    if errors:
        raise HTTPException(422, {"errors": errors})

    rep = Reply()
    for p in inq.prompts:
        v = data.answers.get(str(p.id)) if str(p.id) in data.answers else data.answers.get(p.id)
        if v is not None and str(v).strip() != "":
            rep.items.append(ReplyItem(prompt_id=p.id, value=str(v).strip()))
    inq.replies.append(rep)
    db.commit()
    return {"ok": True, "reply_id": rep.id}


def list_inquiry_replies(db: Session, inquiry_id: int) -> dict:
    inq = get_inquiry_or_404(db, inquiry_id)
    return {"inquiry": inquiry_out(inq), "replies": reply_rows(inq), "summary": summarize(inq)}


def export_inquiry_csv(db: Session, inquiry_id: int) -> Response:
    inq = get_inquiry_or_404(db, inquiry_id)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Submitted at"] + [p.label for p in inq.prompts])
    for r in reply_rows(inq):
        w.writerow([r["submitted_at"]] + [r["answers"].get(str(p.id), "") for p in inq.prompts])
    return Response(
        buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{inq.slug}-replies.csv"'},
    )


def generate_test_response(db: Session, inquiry_id: int) -> dict:
    inq = get_inquiry_or_404(db, inquiry_id)
    if not inq.prompts:
        raise HTTPException(422, "Cannot generate test response for empty form")

    count = len(inq.replies) + 1
    rep = Reply()
    for p in inq.prompts:
        if p.kind == "email":
            val = f"respondent{count}@example.com"
        elif p.kind == "phone":
            val = f"+1 (555) 01{count:02d}-4321"
        elif p.kind == "short_text":
            val = f"Sample answer #{count}"
        elif p.kind == "long_text":
            val = f"This is test feedback #{count} generated to verify the responses table and completion analytics."
        elif p.kind == "number":
            val = str(10 * count)
        elif p.kind in ("choice", "dropdown"):
            val = p.choices[(count - 1) % len(p.choices)] if p.choices else "Option 1"
        elif p.kind == "checkbox":
            val = json.dumps([p.choices[0]] if p.choices else ["Option 1"])
        elif p.kind == "yes_no":
            val = "yes" if count % 2 == 1 else "no"
        elif p.kind == "rating":
            val = str(min(5, (count % 5) + 1))
        elif p.kind == "opinion_scale":
            val = str(min(10, (count % 10) + 1))
        elif p.kind == "nps":
            val = str(8 + (count % 3))
        elif p.kind == "address":
            val = f"{100 + count} Main St, Suite {count}, San Francisco, CA 94105, USA"
        elif p.kind == "url":
            val = f"https://example{count}.com"
        else:
            val = f"Answer #{count}"
        rep.items.append(ReplyItem(prompt_id=p.id, value=val))

    inq.replies.append(rep)
    db.commit()
    return {"ok": True, "reply_id": rep.id, "total_replies": len(inq.replies)}
