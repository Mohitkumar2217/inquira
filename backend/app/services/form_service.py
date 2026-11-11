from typing import List

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models import Answer, Form, FormResponse, Inquiry, Question, Reply, ReplyItem
from ..schemas import FormCreate, QuestionCreate, SubmitResponse


def _serialize_relational_form(form: Form, questions: List[Question]) -> dict:
    return {
        "form": {
            "id": form.id,
            "title": form.title,
            "is_published": form.is_published,
            "theme": getattr(form, "theme", "Pearl white"),
        },
        "questions": [
            {
                "id": q.id,
                "form_id": q.form_id,
                "title": q.title,
                "question_type": q.question_type,
                "is_required": q.is_required,
                "order": q.order,
                "choices": getattr(q, "choices", None) or [],
                "hint": getattr(q, "hint", "") or "",
                "properties": getattr(q, "properties", None) or {},
                "logic_rules": getattr(q, "logic_rules", None) or {},
            }
            for q in questions
        ],
    }


def _serialize_inquiry_as_form(inq: Inquiry) -> dict:
    return {
        "form": {
            "id": inq.id,
            "title": inq.title,
            "is_published": inq.status == "published",
            "theme": getattr(inq, "theme", inq.accent),
            "accent": inq.accent,
            "closing_heading": inq.closing_heading,
            "closing_text": inq.closing_text,
        },
        "questions": [
            {
                "id": p.id,
                "form_id": inq.id,
                "title": p.label or p.kind,
                "question_type": p.kind,
                "is_required": bool(p.mandatory),
                "order": p.position,
                "choices": p.choices or [],
                "hint": p.hint or "",
                "page": p.page,
                "properties": getattr(p, "properties", None) or {},
                "logic_rules": getattr(p, "logic_rules", None) or {},
            }
            for p in inq.prompts
        ],
    }


def create_form(db: Session, form: FormCreate) -> Form:
    db_form = Form(title=form.title, is_published=form.is_published)
    db.add(db_form)
    db.commit()
    db.refresh(db_form)
    return db_form


def list_forms(db: Session) -> list:
    rows = db.query(Form).order_by(Form.updated_at.desc()).all()
    return [
        {
            "id": f.id,
            "title": f.title,
            "is_published": f.is_published,
            "question_count": len(f.questions),
            "response_count": len(f.responses),
        }
        for f in rows
    ]


def get_public_form(db: Session, form_id: int) -> dict:
    form = db.query(Form).filter(Form.id == form_id, Form.is_published == True).first()  # noqa: E712
    if form:
        questions = db.query(Question).filter(Question.form_id == form_id).order_by(Question.order).all()
        return _serialize_relational_form(form, questions)

    inq = db.query(Inquiry).filter(Inquiry.id == form_id, Inquiry.status == "published").first()
    if inq:
        return _serialize_inquiry_as_form(inq)

    raise HTTPException(status_code=404, detail="Form not found or not published")


def get_form_by_id(db: Session, form_id: int) -> dict:
    db_form = db.query(Form).filter(Form.id == form_id).first()
    if db_form:
        questions = db.query(Question).filter(Question.form_id == form_id).order_by(Question.order).all()
        return _serialize_relational_form(db_form, questions)

    inq = db.query(Inquiry).filter(Inquiry.id == form_id).first()
    if inq:
        return _serialize_inquiry_as_form(inq)

    raise HTTPException(status_code=404, detail="Form not found")


def update_form_questions(db: Session, form_id: int, questions_data: List[QuestionCreate]) -> dict:
    db_form = db.query(Form).filter(Form.id == form_id).first()
    if not db_form:
        raise HTTPException(status_code=404, detail="Form not found")

    db.query(Question).filter(Question.form_id == form_id).delete()
    for idx, qd in enumerate(questions_data):
        db_q = Question(
            form_id=form_id,
            title=qd.title,
            hint=qd.hint or "",
            question_type=qd.question_type,
            is_required=qd.is_required,
            order=qd.order if qd.order is not None else idx,
            choices=qd.choices or [],
            properties=qd.properties or {},
            logic_rules=qd.logic_rules or {},
        )
        db.add(db_q)
    db.commit()
    db.refresh(db_form)
    return {"message": "Questions updated successfully"}


def submit_form_response(db: Session, form_id: int, response_data: SubmitResponse) -> dict:
    db_form = db.query(Form).filter(Form.id == form_id).first()
    inq = db.query(Inquiry).filter(Inquiry.id == form_id).first()
    if not db_form and not inq:
        raise HTTPException(status_code=404, detail="Form not found")

    if db_form:
        db_response = FormResponse(form_id=form_id)
        db.add(db_response)
        db.commit()
        db.refresh(db_response)

        for ans in response_data.answers:
            db.add(Answer(response_id=db_response.id, question_id=ans.question_id, value=ans.value))
        db.commit()

    if inq:
        rep = Reply(inquiry_id=inq.id)
        for ans in response_data.answers:
            rep.items.append(ReplyItem(prompt_id=ans.question_id, value=ans.value))
        db.add(rep)
        db.commit()

    return {"message": "Response submitted successfully"}
