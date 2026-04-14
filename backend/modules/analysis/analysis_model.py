import uuid

from sqlalchemy import Column, DateTime, String, Text, ForeignKey, JSON, Integer
from sqlalchemy.sql import func

from config.database import Base


class AnalysisModel(Base):
    __tablename__ = "analysis"

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
        index=True,
    )

    user_id = Column(
        String,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    summary = Column(Text, nullable=False)

    missing_skills = Column(JSON, nullable=False)

    matched_skills = Column(JSON, nullable=False)

    perfect_job_roles = Column(JSON, nullable=False)

    resume_suggestions = Column(JSON, nullable=False)

    resume_score = Column(Integer, nullable=True)

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

