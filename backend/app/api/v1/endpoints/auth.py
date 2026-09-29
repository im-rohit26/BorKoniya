from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date, timezone
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.api.deps import get_current_user
from app.models.entities import User, Profile, ProfilePrivacy, Subscription
from app.schemas.auth import (
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    AuthMeResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication & OTP"])

# In-memory OTP storage for rapid verification in dev/demo
MOCK_OTP_STORE = {"9876543210": "749201"}


@router.post("/send-otp", response_model=SendOtpResponse)
def send_otp(payload: SendOtpRequest):
    otp = "749201"  # Deterministic demo OTP or random
    MOCK_OTP_STORE[payload.phone_number] = otp
    return SendOtpResponse(
        message="OTP sent successfully to registered mobile number.",
        phone_number=payload.phone_number,
        demo_otp=otp,
    )


@router.post("/verify-otp")
def verify_otp(payload: VerifyOtpRequest):
    stored = MOCK_OTP_STORE.get(payload.phone_number, "749201")
    if payload.otp_code != stored and payload.otp_code != "749201":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP. Please try again.",
        )
    return {
        "status": "VERIFIED",
        "phone_number": payload.phone_number,
        "message": "Mobile number verified successfully.",
    }


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    # Password length validation
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 8 characters.",
        )

    # Check existing phone
    existing_phone = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this mobile number already exists.",
        )

    # Check existing email
    if payload.email:
        existing_email = db.query(User).filter(User.email == payload.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists.",
            )

    # Create User
    new_user = User(
        email=payload.email,
        phone_number=payload.phone_number,
        is_phone_verified=True,
        password_hash=get_password_hash(payload.password),
    )
    db.add(new_user)
    db.flush()

    # Parse birth date
    try:
        dob = datetime.strptime(payload.date_of_birth, "%Y-%m-%d").date()
    except Exception:
        dob = date(1998, 1, 1)

    # Create Profile
    new_profile = Profile(
        user_id=new_user.id,
        profile_for=payload.profile_for,
        first_name=payload.first_name,
        last_name=payload.last_name,
        gender=payload.gender,
        date_of_birth=dob,
        community=payload.community,
        sub_community=payload.sub_community,
        native_place=payload.native_place,
        current_state=payload.current_state,
        current_city=payload.current_city,
        profile_completion_pct=70,
    )
    db.add(new_profile)
    db.flush()

    # Create Default Privacy
    privacy = ProfilePrivacy(
        profile_id=new_profile.id,
        phone_visibility="PREMIUM_ONLY",
        email_visibility="PRIVATE",
    )
    db.add(privacy)
    db.commit()

    token = create_access_token(new_user.id)
    return TokenResponse(
        access_token=token,
        user_id=new_user.id,
        profile_id=new_profile.id,
        first_name=new_profile.first_name,
        profile_status=new_profile.status,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter(
            (User.phone_number == payload.phone_or_email)
            | (User.email == payload.phone_or_email)
        )
        .first()
    )
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect mobile number/email or password.",
        )

    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    token = create_access_token(user.id)

    return TokenResponse(
        access_token=token,
        user_id=user.id,
        profile_id=profile.id if profile else None,
        first_name=profile.first_name if profile else None,
        profile_status=profile.status if profile else "INCOMPLETE",
    )


@router.get("/me", response_model=AuthMeResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()

    # Check active subscription
    sub = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == current_user.id,
            Subscription.status == "ACTIVE",
            Subscription.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )

    return AuthMeResponse(
        user_id=current_user.id,
        email=current_user.email,
        phone_number=current_user.phone_number,
        role=current_user.role or "MEMBER",
        profile_id=profile.id if profile else None,
        first_name=profile.first_name if profile else None,
        last_name=profile.last_name if profile else None,
        gender=profile.gender if profile else None,
        community=profile.community if profile else None,
        profile_status=profile.status if profile else "INCOMPLETE",
        is_premium=bool(sub),
    )


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    otp = "749201"
    MOCK_OTP_STORE[payload.phone_or_email] = otp
    # Generic message prevents email/phone enumeration
    return {
        "status": "OTP_SENT",
        "message": "If an account exists with this mobile number or email, a verification code has been sent.",
        "demo_otp": otp,
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 8 characters.",
        )

    stored = MOCK_OTP_STORE.get(payload.phone_or_email, "749201")
    if payload.otp_code != stored and payload.otp_code != "749201":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code.",
        )

    user = (
        db.query(User)
        .filter(
            (User.phone_number == payload.phone_or_email)
            | (User.email == payload.phone_or_email)
        )
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found associated with this mobile number or email.",
        )

    user.password_hash = get_password_hash(payload.new_password)
    user.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "status": "SUCCESS",
        "message": "Password updated successfully. You may now log in with your new password.",
    }

