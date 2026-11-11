from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from ..config.database import Base


class Form(Base):
    """Relational form schema matching the Typeform specification."""

    __tablename__ = "forms"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), index=True, default="Untitled form")
    is_published = Column(Boolean, default=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    theme = Column(String(50), default="Pearl white")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    questions = relationship("Question", back_populates="form", cascade="all, delete-orphan", order_by="Question.order")
    responses = relationship("FormResponse", back_populates="form", cascade="all, delete-orphan")


class Question(Base):
    """Question item inside a Form, ordered by `order`."""

    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(500), default="")
    hint = Column(Text, default="")
    question_type = Column(String(50), default="short_text")
    is_required = Column(Boolean, default=False)
    order = Column(Integer, default=0)
    choices = Column(JSON, default=list)
    properties = Column(JSON, default=dict)
    logic_rules = Column(JSON, default=dict)

    form = relationship("Form", back_populates="questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")


class FormResponse(Base):
    """Response submission for a Form."""

    __tablename__ = "form_responses"
    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"), index=True, nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    form = relationship("Form", back_populates="responses")
    answers = relationship("Answer", back_populates="response", cascade="all, delete-orphan")


class Answer(Base):
    """Answer for a specific question within a form response."""

    __tablename__ = "answers"
    id = Column(Integer, primary_key=True, index=True)
    response_id = Column(Integer, ForeignKey("form_responses.id", ondelete="CASCADE"), index=True, nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), index=True, nullable=False)
    value = Column(Text, default="")

    response = relationship("FormResponse", back_populates="answers")
    question = relationship("Question", back_populates="answers")
