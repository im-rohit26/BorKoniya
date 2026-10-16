from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Union
from datetime import date


class ProfileBase(BaseModel):
    first_name: str
    last_name: str
    gender: str
    date_of_birth: date
    height_cm: int = 165
    marital_status: str = "NEVER_MARRIED"
    has_children: Optional[str] = "NO"
    mother_tongue: str = "Bengali"
    community: str = "Sadgope"
    sub_community: Optional[str] = None
    gotra: Optional[str] = None
    native_place: Optional[str] = None
    family_origin_state: Optional[str] = None
    current_state: str = "West Bengal"
    current_city: str = "Kolkata"
    highest_qualification: str = "Bachelor’s Degree"
    college: Optional[str] = None
    occupation: str = "Private Sector"
    company_name: Optional[str] = None
    annual_income: Optional[str] = None
    work_location: Optional[str] = None
    father_occupation: Optional[str] = None
    mother_occupation: Optional[str] = None
    brothers_count: Optional[str] = "0"
    sisters_count: Optional[str] = "0"
    family_type: Optional[str] = "NUCLEAR"
    family_values: Optional[str] = "TRADITIONAL"
    family_location: Optional[str] = None
    diet: str = "NON_VEGETARIAN"
    about_me: Optional[str] = None
    smoking: Optional[str] = "NO"
    drinking: Optional[str] = "NO"
    hobbies: Optional[Union[List[str], str]] = None
    time_of_birth: Optional[str] = None
    place_of_birth: Optional[str] = None
    rashi: Optional[str] = None
    nakshatra: Optional[str] = None
    is_manglik: Optional[str] = "DONT_KNOW"


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
    phone_shared: bool = False
    email_shared: bool = False

    # Subscription access lock flag
    is_locked: bool = False

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
    date_of_birth: Optional[Union[date, str]] = None
    height_cm: Optional[int] = None
    marital_status: Optional[str] = None
    has_children: Optional[str] = None
    mother_tongue: Optional[str] = None
    community: Optional[str] = None
    sub_community: Optional[str] = None
    gotra: Optional[str] = None
    native_place: Optional[str] = None
    family_origin_state: Optional[str] = None
    current_state: Optional[str] = None
    current_city: Optional[str] = None
    highest_qualification: Optional[str] = None
    college: Optional[str] = None
    occupation: Optional[str] = None
    company_name: Optional[str] = None
    annual_income: Optional[str] = None
    work_location: Optional[str] = None
    father_occupation: Optional[str] = None
    mother_occupation: Optional[str] = None
    brothers_count: Optional[str] = None
    sisters_count: Optional[str] = None
    family_type: Optional[str] = None
    family_values: Optional[str] = None
    family_location: Optional[str] = None
    diet: Optional[str] = None
    smoking: Optional[str] = None
    drinking: Optional[str] = None
    hobbies: Optional[Union[List[str], str]] = None
    time_of_birth: Optional[str] = None
    place_of_birth: Optional[str] = None
    rashi: Optional[str] = None
    nakshatra: Optional[str] = None
    is_manglik: Optional[str] = None
    about_me: Optional[str] = None
    profile_for: Optional[str] = None
    status: Optional[str] = None
    photo_url: Optional[str] = None
    profile_completion_pct: Optional[int] = None
