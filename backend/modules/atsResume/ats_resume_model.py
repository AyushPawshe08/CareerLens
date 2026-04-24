"""
SQLAlchemy model for the ATS Resume Rewriter module.

One row per career_input_id.
The rewritten resume is stored as plain text in the `rewritten_resume` column.
"""

import uuid

from sqlalchemy import Column, DateTime, Integer, String, Text, ForeignKey
from sqlalchemy.sql import func

from config.database import Base


class ATSResumeModel(Base):
    __tablename__ = "ats_resumes"

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
        unique=True,   # one rewrite per career input
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    # The full ATS-optimized plain-text resume
    rewritten_resume = Column(Text, nullable=False)

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
