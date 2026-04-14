import uuid

from sqlalchemy import (
    Column,
    DateTime,
    Integer,
    String,
    Text,
    ForeignKey,
    CheckConstraint
)

from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from config.database import Base


class CareerInput(Base):
    __tablename__ = "career_inputs"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    job_description = Column(Text, nullable=False)

    self_description = Column(Text, nullable=True)

    resume_file_path = Column(String, nullable=True)

    resume_text = Column(Text, nullable=True)

    # Tracks the Celery task lifecycle for this input
    # Values: "pending" | "processing" | "completed" | "failed"
    processing_status = Column(
        String,
        nullable=False,
        default="pending",
        server_default="pending",
    )



    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime,
        onupdate=func.now()
    )

    user = relationship(
        "User",
        back_populates="career_inputs"
    )


    __table_args__ = (
        CheckConstraint(
            "(self_description IS NOT NULL) OR (resume_text IS NOT NULL)",
            name="check_self_or_resume_not_empty"
        ),
    )