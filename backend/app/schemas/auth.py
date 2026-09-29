from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class SendOtpRequest(BaseModel):
    phone_number: str = Field(..., min_length=10, max_length=15)
    phone_country_code: str = "+91"


class SendOtpResponse(BaseModel):
    message: str
    phone_number: str
    demo_otp: Optional[str] = None  # Included in development mode for easy testing


class VerifyOtpRequest(BaseModel):
    phone_number: str
    otp_code: str = Field(..., min_length=4, max_length=6)


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
    email: Optional[EmailStr] = None


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
    profile_status: str = "ACTIVE"
    is_premium: bool = False
