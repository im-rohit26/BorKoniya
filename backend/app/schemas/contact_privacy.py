from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class ContactPermissionUpdate(BaseModel):
    phone_shared: bool = False
    email_shared: bool = False


class ContactPermissionResponse(BaseModel):
    connection_id: str
    owner_user_id: str
    recipient_user_id: str
    phone_shared: bool
    email_shared: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ConnectionPrivacyItem(BaseModel):
    connection_id: str
    other_profile_id: str
    other_user_id: str
    first_name: str
    last_name: str
    gender: Optional[str] = None
    photo_url: Optional[str] = None
    community: Optional[str] = None
    occupation: Optional[str] = None
    current_city: Optional[str] = None
    current_state: Optional[str] = None
    connected_at: Optional[datetime] = None
    my_sharing: ContactPermissionUpdate
    their_sharing: ContactPermissionUpdate
    revealed_phone: Optional[str] = None
    revealed_email: Optional[str] = None


class SharedContactDetailsResponse(BaseModel):
    user_id: str
    profile_id: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    phone_shared: bool = False
    email_shared: bool = False
    message: str
