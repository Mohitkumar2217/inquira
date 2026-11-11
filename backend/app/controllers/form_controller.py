from typing import List

from fastapi import Depends
from sqlalchemy.orm import Session

from ..config.database import get_db
from ..schemas import FormCreate, QuestionCreate, SubmitResponse
from ..services import form_service


def create_form(form: FormCreate, db: Session = Depends(get_db)):
    return form_service.create_form(db, form)


def list_forms(db: Session = Depends(get_db)):
    return form_service.list_forms(db)


def get_public_form(form_id: int, db: Session = Depends(get_db)):
    return form_service.get_public_form(db, form_id)


def get_form_by_id(form_id: int, db: Session = Depends(get_db)):
    return form_service.get_form_by_id(db, form_id)


def update_form_questions(form_id: int, questions_data: List[QuestionCreate], db: Session = Depends(get_db)):
    return form_service.update_form_questions(db, form_id, questions_data)


def submit_response(form_id: int, response_data: SubmitResponse, db: Session = Depends(get_db)):
    return form_service.submit_form_response(db, form_id, response_data)
