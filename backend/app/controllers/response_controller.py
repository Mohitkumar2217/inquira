from fastapi import Depends
from sqlalchemy.orm import Session

from ..config.database import get_db
from ..schemas import ReplyIn
from ..services import response_service


def list_replies(iid: int, db: Session = Depends(get_db)):
    return response_service.list_inquiry_replies(db, iid)


def export_csv(iid: int, db: Session = Depends(get_db)):
    return response_service.export_inquiry_csv(db, iid)


def generate_test_response(iid: int, db: Session = Depends(get_db)):
    return response_service.generate_test_response(db, iid)


def public_inquiry(slug: str, db: Session = Depends(get_db)):
    return response_service.get_public_inquiry(db, slug)


def submit_reply(slug: str, data: ReplyIn, db: Session = Depends(get_db)):
    return response_service.submit_public_reply(db, slug, data)
