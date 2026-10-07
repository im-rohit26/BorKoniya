import random
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date, timezone, timedelta
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_refresh_token
from app.api.deps import get_current_user
from app.models.entities import User, Profile, ProfilePrivacy, Subscription, OTPStore
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
    RefreshRequest,
)

from app.services.email_service import email_service

router = APIRouter(prefix="/auth", tags=["Authentication & OTP"])


@router.post("/send-otp", response_model=SendOtpResponse)
def send_otp(payload: SendOtpRequest, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower() if payload.email else None
    clean_phone = payload.phone_number.strip() if payload.phone_number else None

    if not clean_phone and not clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid mobile number or email address.",
        )

    # If email provided, check if already in use
    if clean_email:
        existing_user_email = db.query(User).filter(User.email == clean_email).first()
        if existing_user_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists. Please log in.",
            )

    # If phone provided, check if already in use
    if clean_phone:
        existing_user_phone = db.query(User).filter(User.phone_number == clean_phone).first()
        if existing_user_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this mobile number already exists. Please log in.",
            )

    now = datetime.now(timezone.utc)
    cooldown_secs = settings.OTP_RESEND_COOLDOWN_SECONDS or 60
    identifiers = [x for x in [clean_email, clean_phone] if x]

    # Rate limiting & resend cooldown
    recent_otp = (
        db.query(OTPStore)
        .filter(
            OTPStore.identifier.in_(identifiers),
            OTPStore.purpose == "VERIFY",
            OTPStore.is_used == False,
        )
        .order_by(OTPStore.created_at.desc())
        .first()
    )

    if recent_otp and recent_otp.created_at:
        created_at = (
            recent_otp.created_at.replace(tzinfo=timezone.utc)
            if recent_otp.created_at.tzinfo is None
            else recent_otp.created_at
        )
        elapsed = (now - created_at).total_seconds()
        if elapsed < cooldown_secs:
            wait_remaining = max(1, int(cooldown_secs - elapsed))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {wait_remaining} seconds before requesting a new verification code.",
            )

    otp = f"{random.randint(100000, 999999)}"

    # Deliver OTP via Email if email is present
    if clean_email:
        success, error_msg = email_service.send_otp_email(
            to_email=clean_email,
            otp_code=otp,
            recipient_name="Member",
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=error_msg or "Unable to send verification email. Please verify your email and try again.",
            )

    expiry = now + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    # Invalidate previous unused verification OTPs for these identifiers
    db.query(OTPStore).filter(
        OTPStore.identifier.in_(identifiers),
        OTPStore.purpose == "VERIFY",
        OTPStore.is_used == False,
    ).update({"is_used": True}, synchronize_session=False)

    # Store new OTP for each identifier provided
    for ident in identifiers:
        new_otp = OTPStore(
            identifier=ident,
            otp_code=otp,
            purpose="VERIFY",
            expires_at=expiry,
        )
        db.add(new_otp)
    db.commit()

    is_dev = settings.DEBUG or settings.ENVIRONMENT == "development"
    return SendOtpResponse(
        message="Verification code sent successfully." + (" Check your email inbox and spam folder." if clean_email else ""),
        phone_number=clean_phone,
        email=clean_email,
        demo_otp=otp if is_dev else None,
    )


@router.post("/verify-otp")
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower() if payload.email else None
    clean_phone = payload.phone_number.strip() if payload.phone_number else None
    identifiers = [x for x in [clean_email, clean_phone] if x]
    if not identifiers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a mobile number or email address.",
        )

    now = datetime.now(timezone.utc)
    otp_entry = db.query(OTPStore).filter(
        OTPStore.identifier.in_(identifiers),
        OTPStore.purpose == "VERIFY",
        OTPStore.is_used == False,
    ).order_by(OTPStore.created_at.desc()).first()

    if not otp_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new code.",
        )

    exp = otp_entry.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new code.",
        )

    if otp_entry.otp_code != payload.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Please check and try again.",
        )

    otp_entry.is_used = True
    db.commit()

    return {
        "status": "VERIFIED",
        "phone_number": payload.phone_number,
        "email": payload.email,
        "message": "Verification completed successfully.",
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
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid date format for date_of_birth. Expected YYYY-MM-DD.",
        )

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
    refresh_token = create_refresh_token(new_user.id)
    return TokenResponse(
        access_token=token,
        user_id=new_user.id,
        profile_id=new_profile.id,
        first_name=new_profile.first_name,
        profile_status=new_profile.status,
        refresh_token=refresh_token,
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
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=token,
        user_id=user.id,
        profile_id=profile.id if profile else None,
        first_name=profile.first_name if profile else None,
        profile_status=profile.status if profile else "INCOMPLETE",
        refresh_token=refresh_token,
    )

@router.post("/refresh", response_model=TokenResponse)
def refresh_endpoint(payload: RefreshRequest, db: Session = Depends(get_db)):
    user_id = decode_refresh_token(payload.refresh_token)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    new_access_token = create_access_token(user.id)
    new_refresh_token = create_refresh_token(user.id)
    
    return TokenResponse(
        access_token=new_access_token,
        user_id=user.id,
        profile_id=profile.id if profile else None,
        first_name=profile.first_name if profile else None,
        profile_status=profile.status if profile else "INCOMPLETE",
        refresh_token=new_refresh_token,
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

    photo_url = None
    if profile:
        from app.models.entities import ProfilePhoto
        primary_photo = db.query(ProfilePhoto).filter(ProfilePhoto.profile_id == profile.id, ProfilePhoto.is_primary == True).first()
        if not primary_photo:
            primary_photo = db.query(ProfilePhoto).filter(ProfilePhoto.profile_id == profile.id).first()
        if primary_photo:
            photo_url = primary_photo.storage_path

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
        photo_url=photo_url,
        profile_status=profile.status if profile else "INCOMPLETE",
        profile_completion_pct=profile.profile_completion_pct if profile else 0,
        is_premium=bool(sub),
    )


@router.delete("/me")
def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently delete the authenticated user's account and all associated data.
    Foreign key cascading will remove the associated profile, photos, messages,
    conversations memberships, subscriptions, interests, and shortlists.
    """
    db.delete(current_user)
    db.commit()
    return {"status": "SUCCESS", "message": "Account deleted permanently."}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    clean_target = payload.phone_or_email.strip()
    clean_identifier = clean_target.lower() if "@" in clean_target else clean_target
    now = datetime.now(timezone.utc)
    cooldown_secs = settings.OTP_RESEND_COOLDOWN_SECONDS or 60

    # Rate limiting & cooldown
    recent_otp = (
        db.query(OTPStore)
        .filter(
            OTPStore.identifier == clean_identifier,
            OTPStore.purpose == "RESET_PASSWORD",
            OTPStore.is_used == False,
        )
        .order_by(OTPStore.created_at.desc())
        .first()
    )

    if recent_otp and recent_otp.created_at:
        created_at = (
            recent_otp.created_at.replace(tzinfo=timezone.utc)
            if recent_otp.created_at.tzinfo is None
            else recent_otp.created_at
        )
        elapsed = (now - created_at).total_seconds()
        if elapsed < cooldown_secs:
            wait_remaining = max(1, int(cooldown_secs - elapsed))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {wait_remaining} seconds before requesting a new password reset code.",
            )

    otp = f"{random.randint(100000, 999999)}"

    # Try to find user to get email for OTP
    user = db.query(User).filter(
        (User.phone_number == clean_identifier) | (User.email == clean_identifier)
    ).first()

    if user and user.email:
        recipient_name = user.profile.first_name if user.profile else "Member"
        success, error_msg = email_service.send_password_reset_email(
            to_email=user.email,
            otp_code=otp,
            recipient_name=recipient_name,
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=error_msg or "Unable to send password reset email. Please try again shortly.",
            )

    expiry = now + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    # Invalidate previous unused reset OTPs for this identifier
    db.query(OTPStore).filter(
        OTPStore.identifier == clean_identifier,
        OTPStore.purpose == "RESET_PASSWORD",
        OTPStore.is_used == False,
    ).update({"is_used": True}, synchronize_session=False)

    new_otp = OTPStore(
        identifier=clean_identifier,
        otp_code=otp,
        purpose="RESET_PASSWORD",
        expires_at=expiry,
    )
    db.add(new_otp)
    db.commit()

    is_dev = settings.DEBUG or settings.ENVIRONMENT == "development"
    res = {
        "status": "OTP_SENT",
        "message": "If an account exists with this mobile number or email, a verification code has been sent.",
    }
    if is_dev:
        res["demo_otp"] = otp
    return res


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 8 characters.",
        )

    now = datetime.now(timezone.utc)
    otp_entry = db.query(OTPStore).filter(
        OTPStore.identifier == payload.phone_or_email,
        OTPStore.purpose == "RESET_PASSWORD",
        OTPStore.is_used == False,
    ).order_by(OTPStore.created_at.desc()).first()

    if not otp_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code.",
        )

    exp = otp_entry.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code.",
        )

    if otp_entry.otp_code != payload.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code.",
        )
        
    otp_entry.is_used = True

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


@router.get("/smtp-status")
def check_smtp_status():
    """
    Diagnostic endpoint to test and verify SMTP email delivery status.
    Never exposes passwords.
    """
    return email_service.test_connection()

