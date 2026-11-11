from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from ..config.database import Base


class Workspace(Base):
    """A creator-owned collection of forms."""

    __tablename__ = "workspaces"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    is_private = Column(Boolean, nullable=False, default=False)
    order_index = Column(Integer, nullable=False, default=0)
    last_visited_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    inquiries = relationship("Inquiry", back_populates="workspace")


class UserPreference(Base):
    """Creator global preferences, e.g. the last visited/active workspace."""

    __tablename__ = "user_preferences"
    id = Column(Integer, primary_key=True)
    user_key = Column(String(50), default="default", unique=True, index=True)
    active_workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
