"""
Database model for the InterviewQuestion feature.

One row per career_input_id. Storing all three categories of questions
as JSON arrays — consistent with how AnalysisModel stores its list fields.
"""

import uuid

from sqlalchemy import Column, DateTime, Integer, String, ForeignKey, JSON
from sqlalchemy.sql import func

from config.database import Base


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

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

    # JSON arrays — each holds 5-8 question strings
    technical_questions = Column(JSON, nullable=False, default=list)
    behavioural_questions = Column(JSON, nullable=False, default=list)
    hr_questions = Column(JSON, nullable=False, default=list)

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
