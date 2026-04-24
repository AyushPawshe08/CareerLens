"""
SQLAlchemy model for the Resources feature.

One row per career_input_id.
The full list of per-skill resource objects is stored as a JSON array
in the `resources` column — consistent with how InterviewQuestion
stores its question arrays.
"""

import uuid

from sqlalchemy import Column, DateTime, Integer, String, ForeignKey, JSON
from sqlalchemy.sql import func

from config.database import Base


class ResourceModel(Base):
    __tablename__ = "resources"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )

    career_input_id = Column(
        String,
        ForeignKey("career_inputs.id"),
        nullable=False,
        unique=True,   # one result set per career input
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    # JSON array of ResourceItem dicts
    # [{"skill": "Docker", "videos": [...], "documentation": [...],
    #   "practice": [...], "roadmap": "..."}, ...]
    resources = Column(JSON, nullable=False, default=list)

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
