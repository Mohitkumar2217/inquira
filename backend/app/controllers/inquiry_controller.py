from fastapi import Depends
from sqlalchemy.orm import Session

from ..config.database import get_db
from ..schemas import InquiryIn, TitleIn, WorkspaceMoveIn
from ..services import inquiry_service


def list_inquiries(db: Session = Depends(get_db)):
    return inquiry_service.list_inquiries(db)


def create_inquiry(data: InquiryIn, db: Session = Depends(get_db)):
    return inquiry_service.create_inquiry(db, data)


def get_inquiry(iid: int, db: Session = Depends(get_db)):
    return inquiry_service.get_inquiry(db, iid)


def save_inquiry(iid: int, data: InquiryIn, db: Session = Depends(get_db)):
    return inquiry_service.save_inquiry(db, iid, data)


def rename(iid: int, data: TitleIn, db: Session = Depends(get_db)):
    return inquiry_service.rename_inquiry(db, iid, data)


def remove(iid: int, db: Session = Depends(get_db)):
    return inquiry_service.delete_inquiry(db, iid)


def duplicate(iid: int, db: Session = Depends(get_db)):
    return inquiry_service.clone_inquiry(db, iid)


def copy_to_workspace(iid: int, workspace_id: int, db: Session = Depends(get_db)):
    return inquiry_service.clone_inquiry(db, iid, workspace_id)


def move_to_workspace(iid: int, data: WorkspaceMoveIn, db: Session = Depends(get_db)):
    return inquiry_service.move_inquiry_to_workspace(db, iid, data)


def publish(iid: int, db: Session = Depends(get_db)):
    return inquiry_service.publish_inquiry(db, iid)


def unpublish(iid: int, db: Session = Depends(get_db)):
    return inquiry_service.unpublish_inquiry(db, iid)
