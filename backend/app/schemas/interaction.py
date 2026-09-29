from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.schemas.profile import ProfileResponse


class InterestCreate(BaseModel):
    receiver_profile_id: str


class InterestActionResponse(BaseModel):
    id: str
    sender_profile_id: str
    receiver_profile_id: str
    status: str
    sent_at: datetime
    responded_at: Optional[datetime] = None
    message: str


class InterestItemResponse(BaseModel):
    id: str
    sender_profile_id: str
    receiver_profile_id: str
    status: str
    sent_at: datetime
    responded_at: Optional[datetime] = None
    profile: ProfileResponse


class ShortlistToggleRequest(BaseModel):
    target_profile_id: str


class ShortlistItemResponse(BaseModel):
    id: str
    target_profile_id: str
    created_at: datetime
    profile: ProfileResponse


class ConversationMemberInfo(BaseModel):
    profile_id: str
    first_name: str
    last_name: str
    photo_url: Optional[str] = None
    community: Optional[str] = None
    current_city: Optional[str] = None
    current_state: Optional[str] = None
    occupation: Optional[str] = None
    is_online: bool = True


class ConversationSummaryResponse(BaseModel):
    id: str
    other_profile: ConversationMemberInfo
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0
    can_chat: bool = True
    created_at: datetime


class MessageSendRequest(BaseModel):
    content: str


class MessageItemResponse(BaseModel):
    id: str
    conversation_id: str
    sender_profile_id: str
    sender_name: str
    content: str
    is_mine: bool
    is_read: bool
    created_at: datetime


class StartConversationRequest(BaseModel):
    target_profile_id: str
    initial_message: Optional[str] = None


class BlockProfileRequest(BaseModel):
    blocked_profile_id: str


class BlockedProfileResponse(BaseModel):
    blocked_profile_id: str
    blocked_profile: ProfileResponse
    created_at: datetime


class ReportProfileRequest(BaseModel):
    reported_profile_id: str
    reason: str
    description: Optional[str] = None


class ReportProfileResponse(BaseModel):
    id: str
    reported_profile_id: str
    reason: str
    status: str
    created_at: datetime
    message: str
