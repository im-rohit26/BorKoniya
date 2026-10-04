import re
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional


def validate_digits_only_phone(v: str) -> str:
    cleaned = v.strip().replace(" ", "").replace("-", "")
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    if not cleaned.isdigit():
        raise ValueError("Mobile number must contain numbers only.")
    if len(cleaned) < 10 or len(cleaned) > 15:
        raise ValueError("Mobile number must be between 10 and 15 digits.")
    return cleaned


class SendOtpRequest(BaseModel):
    phone_number: Optional[str] = None
    phone_country_code: str = "+91"
    email: Optional[EmailStr] = None

    @field_validator("phone_number")
    def check_phone_digits(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return validate_digits_only_phone(v)
        return v


class SendOtpResponse(BaseModel):
    message: str
    phone_number: Optional[str] = None
    email: Optional[str] = None
    demo_otp: Optional[str] = None


class VerifyOtpRequest(BaseModel):
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    otp_code: str = Field(..., min_length=4, max_length=6)

    @field_validator("phone_number")
    def check_phone_digits(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return validate_digits_only_phone(v)
        return v


class RegisterRequest(BaseModel):
    profile_for: str = "MYSELF"
    first_name: str
    last_name: str
    gender: str  # MALE, FEMALE
    date_of_birth: str  # YYYY-MM-DD
    phone_number: str
    password: str
    community: str = "Sadgope"
    sub_community: Optional[str] = None
    native_place: Optional[str] = None
    current_state: str = "West Bengal"
    current_city: str = "Kolkata"
    email: EmailStr  # Mandatory email per Requirement 10

    @field_validator("phone_number")
    def check_phone_digits(cls, v: str) -> str:
        return validate_digits_only_phone(v)


class LoginRequest(BaseModel):
    phone_or_email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    profile_id: Optional[str] = None
    first_name: Optional[str] = None
    profile_status: str = "ACTIVE"
    refresh_token: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    phone_or_email: str


class ResetPasswordRequest(BaseModel):
    phone_or_email: str
    otp_code: str = Field(..., min_length=4, max_length=6)
    new_password: str = Field(..., min_length=8)


class AuthMeResponse(BaseModel):
    user_id: str
    email: Optional[str] = None
    phone_number: str
    role: str = "MEMBER"
    profile_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    community: Optional[str] = None
    photo_url: Optional[str] = None
    profile_status: str = "ACTIVE"
    profile_completion_pct: Optional[int] = 0
    is_premium: bool = False
