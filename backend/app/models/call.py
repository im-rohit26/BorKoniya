import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Call(Base):
    """
    1-to-1 Voice & Video Call metadata record.
    Privacy rule: Never store phone numbers, audio, or video recordings.
    Identifies participants strictly by BorKonya profile_id (UUID).
    """
    __tablename__ = "calls"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    caller_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True)

    # VOICE | VIDEO
    call_type = Column(String(10), nullable=False, default="VOICE")

    # INITIATED | RINGING | ACCEPTED | REJECTED | BUSY | MISSED | CANCELLED | CONNECTED | ENDED | FAILED
    status = Column(String(20), nullable=False, default="INITIATED")

    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    answered_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    duration = Column(Integer, default=0)  # Duration in seconds
    end_reason = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    caller = relationship("Profile", foreign_keys=[caller_id])
    receiver = relationship("Profile", foreign_keys=[receiver_id])
    conversation = relationship("Conversation", foreign_keys=[conversation_id])

    __table_args__ = (
        Index("ix_calls_caller_id", "caller_id"),
        Index("ix_calls_receiver_id", "receiver_id"),
        Index("ix_calls_status", "status"),
        Index("ix_calls_conversation_id", "conversation_id"),
    )
