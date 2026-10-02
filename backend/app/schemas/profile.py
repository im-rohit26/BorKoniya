from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date


class ProfileBase(BaseModel):
    first_name: str
    last_name: str
    gender: str
    date_of_birth: date
    height_cm: int = 165
    marital_status: str = "NEVER_MARRIED"
    mother_tongue: str = "Bengali"
    community: str = "Sadgope"
    sub_community: Optional[str] = None
    native_place: Optional[str] = None
    current_state: str = "West Bengal"
    current_city: str = "Kolkata"
    highest_qualification: str = "Bachelor’s Degree"
    occupation: str = "Private Sector"
    company_name: Optional[str] = None
    annual_income: Optional[str] = None
    diet: str = "NON_VEGETARIAN"
    about_me: Optional[str] = None


class PhotoItemResponse(BaseModel):
    id: str
    storage_path: str
    is_primary: bool
    privacy: str = "REGISTERED_ONLY"

    model_config = ConfigDict(from_attributes=True)


class ProfileResponse(ProfileBase):
    id: str
    user_id: str
    age: int
    profile_for: str
    status: str
    profile_completion_pct: int
    is_mobile_verified: bool = True
    is_email_verified: bool = True
    match_score: Optional[int] = 90
    match_breakdown: Optional[List[str]] = None
    photo_url: Optional[str] = None
    photos: Optional[List[PhotoItemResponse]] = None

    # Sensitive contact details are masked by default!
    contact_phone_masked: Optional[str] = None
    contact_email_masked: Optional[str] = None
    is_contact_revealed: bool = False
    revealed_phone: Optional[str] = None
    revealed_email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PrivacySettingsUpdate(BaseModel):
    name_display: Optional[str] = None
    photo_visibility: Optional[str] = None
    phone_visibility: Optional[str] = None
    email_visibility: Optional[str] = None


class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    height_cm: Optional[int] = None
    marital_status: Optional[str] = None
    mother_tongue: Optional[str] = None
    community: Optional[str] = None
    sub_community: Optional[str] = None
    native_place: Optional[str] = None
    current_state: Optional[str] = None
    current_city: Optional[str] = None
    highest_qualification: Optional[str] = None
    occupation: Optional[str] = None
    company_name: Optional[str] = None
    annual_income: Optional[str] = None
    diet: Optional[str] = None
    about_me: Optional[str] = None
    profile_for: Optional[str] = None
    photo_url: Optional[str] = None
    profile_completion_pct: Optional[int] = None
