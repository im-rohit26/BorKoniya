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
    gender: Optional[str] = None
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
    reply_to_message_id: Optional[str] = None
    media_url: Optional[str] = None
    message_type: Optional[str] = "text"


class ReplySnippetResponse(BaseModel):
    id: str
    sender_name: str
    content: str
    message_type: Optional[str] = "text"
    media_url: Optional[str] = None


class MessageItemResponse(BaseModel):
    id: str
    conversation_id: str
    sender_profile_id: str
    sender_name: str
    sender_gender: Optional[str] = None
    content: str
    is_mine: bool
    is_read: bool
    created_at: datetime
    reply_to_message_id: Optional[str] = None
    reply_to: Optional[ReplySnippetResponse] = None
    is_forwarded: bool = False
    message_type: Optional[str] = "text"
    media_url: Optional[str] = None


class ForwardMessagesRequest(BaseModel):
    target_conversation_ids: Optional[List[str]] = None
    target_profile_ids: Optional[List[str]] = None
    message_ids: List[str]


class BatchDeleteMessagesRequest(BaseModel):
    message_ids: List[str]


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
