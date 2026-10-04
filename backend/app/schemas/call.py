from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime


FORBIDDEN_PHONE_FIELDS = {
    "phone_number",
    "mobile_number",
    "personal_contact_number",
    "phone",
    "mobile",
    "contact_number",
}


class CallInitiatePayload(BaseModel):
    receiver_id: str
    call_type: str = Field(default="VOICE", description="VOICE or VIDEO")
    conversation_id: Optional[str] = None

    @field_validator("call_type")
    @classmethod
    def validate_call_type(cls, v: str) -> str:
        val = (v or "VOICE").upper().strip()
        if val not in ("VOICE", "VIDEO"):
            raise ValueError("call_type must be VOICE or VIDEO")
        return val


class CallSignalMessage(BaseModel):
    type: str
    call_id: Optional[str] = None
    receiver_id: Optional[str] = None
    conversation_id: Optional[str] = None
    call_type: Optional[str] = None
    sdp: Optional[Dict[str, Any]] = None
    candidate: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    audio_enabled: Optional[bool] = None
    video_enabled: Optional[bool] = None


class CallHistoryItemResponse(BaseModel):
    id: str
    caller_id: str
    receiver_id: str
    conversation_id: Optional[str] = None
    call_type: str
    status: str
    is_outgoing: bool
    other_profile_id: str
    other_name: str
    other_photo_url: Optional[str] = None
    other_gender: Optional[str] = None
    started_at: datetime
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration: int = 0
    created_at: datetime


class ICEServerItem(BaseModel):
    urls: Union[str, List[str]]
    username: Optional[str] = None
    credential: Optional[str] = None


class WebRTCConfigResponse(BaseModel):
    iceServers: List[ICEServerItem]
    ttl: int = 3600


def sanitize_signaling_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Security guard: Ensures no phone/mobile/contact numbers are ever present
    in outgoing or incoming signaling payloads.
    """
    return {
        k: v
        for k, v in data.items()
        if k.lower() not in FORBIDDEN_PHONE_FIELDS
    }
