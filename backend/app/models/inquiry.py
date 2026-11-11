from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from ..config.database import Base


class Inquiry(Base):
    """A form definition owned by the creator."""

    __tablename__ = "inquiries"
    id = Column(Integer, primary_key=True)
    slug = Column(String(16), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False, default="Untitled form")
    status = Column(String(12), nullable=False, default="draft")  # draft | published
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    accent = Column(String(9), nullable=False, default="#0445AF")
    theme = Column(String(50), default="Pearl white")
    settings = Column(JSON, default=dict)
    closing_heading = Column(String(200), default="Thanks for completing this")
    closing_text = Column(Text, default="Your answers have been recorded.")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    prompts = relationship("Prompt", back_populates="inquiry", cascade="all, delete-orphan", order_by="Prompt.position")
    replies = relationship("Reply", back_populates="inquiry", cascade="all, delete-orphan")
    workspace = relationship("Workspace", back_populates="inquiries")


class Prompt(Base):
    """One question inside an inquiry, ordered by `position`."""

    __tablename__ = "prompts"
    id = Column(Integer, primary_key=True)
    inquiry_id = Column(Integer, ForeignKey("inquiries.id", ondelete="CASCADE"), index=True, nullable=False)
    position = Column(Integer, nullable=False, default=0)
    kind = Column(String(50), nullable=False)
    label = Column(Text, nullable=False, default="")
    hint = Column(Text, default="")
    mandatory = Column(Boolean, default=False)
    choices = Column(JSON, default=list)
    page = Column(JSON, nullable=True)  # {key,title,hint}: prompts sharing a key form one multi-field page
    properties = Column(JSON, default=dict)
    logic_rules = Column(JSON, default=dict)

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
