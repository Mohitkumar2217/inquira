from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base


class Workspace(Base):
    """A creator-owned collection of forms."""
    __tablename__ = "workspaces"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    is_private = Column(Boolean, nullable=False, default=False)
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    inquiries = relationship("Inquiry", back_populates="workspace")


class Inquiry(Base):
    """A form definition owned by the (default) creator."""
    __tablename__ = "inquiries"
    id = Column(Integer, primary_key=True)
    slug = Column(String(16), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False, default="Untitled form")
    status = Column(String(12), nullable=False, default="draft")  # draft | published
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    accent = Column(String(9), nullable=False, default="#0445AF")
    closing_heading = Column(String(200), default="Thanks for completing this")
    closing_text = Column(Text, default="Your answers have been recorded.")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    prompts = relationship("Prompt", back_populates="inquiry", cascade="all, delete-orphan",
                           order_by="Prompt.position")
    replies = relationship("Reply", back_populates="inquiry", cascade="all, delete-orphan")
    workspace = relationship("Workspace", back_populates="inquiries")


class Prompt(Base):
    """One question inside an inquiry, ordered by `position`."""
    __tablename__ = "prompts"
    id = Column(Integer, primary_key=True)
    inquiry_id = Column(Integer, ForeignKey("inquiries.id", ondelete="CASCADE"), index=True, nullable=False)
    position = Column(Integer, nullable=False, default=0)
    kind = Column(String(20), nullable=False)
    label = Column(Text, nullable=False, default="")
    hint = Column(Text, default="")
    mandatory = Column(Boolean, default=False)
    choices = Column(JSON, default=list)
    page = Column(JSON, nullable=True)  # {key,title,hint}: prompts sharing a key form one multi-field page
    inquiry = relationship("Inquiry", back_populates="prompts")
    items = relationship("ReplyItem", back_populates="prompt", cascade="all, delete-orphan")


class Reply(Base):
    """One submission by a respondent."""
    __tablename__ = "replies"
    id = Column(Integer, primary_key=True)
    inquiry_id = Column(Integer, ForeignKey("inquiries.id", ondelete="CASCADE"), index=True, nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    inquiry = relationship("Inquiry", back_populates="replies")
    items = relationship("ReplyItem", back_populates="reply", cascade="all, delete-orphan")


class ReplyItem(Base):
    """A single answer: one value for one prompt within one reply."""
    __tablename__ = "reply_items"
    __table_args__ = (UniqueConstraint("reply_id", "prompt_id"),)
    id = Column(Integer, primary_key=True)
    reply_id = Column(Integer, ForeignKey("replies.id", ondelete="CASCADE"), index=True, nullable=False)
    prompt_id = Column(Integer, ForeignKey("prompts.id", ondelete="CASCADE"), index=True, nullable=False)
    value = Column(Text, default="")
    reply = relationship("Reply", back_populates="items")
    prompt = relationship("Prompt", back_populates="items")


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

    questions = relationship("Question", back_populates="form", cascade="all, delete-orphan",
                             order_by="Question.order")
    responses = relationship("FormResponse", back_populates="form", cascade="all, delete-orphan")


class Question(Base):
    """Question item inside a Form, ordered by `order`."""
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(500), default="")
    question_type = Column(String(50), default="short_text")  # short_text, long_text, multiple_choice, etc.
    is_required = Column(Boolean, default=False)
    order = Column(Integer, default=0)
    properties = Column(JSON, nullable=True)
    logic_rules = Column(JSON, nullable=True)

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

