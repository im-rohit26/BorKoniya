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

router = APIRouter(prefix="/auth", tags=["Authentication & OTP"])


@router.post("/send-otp", response_model=SendOtpResponse)
def send_otp(payload: SendOtpRequest, db: Session = Depends(get_db)):
    otp = f"{random.randint(100000, 999999)}"
    
    if payload.email and settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart()
            msg['From'] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
            msg['To'] = payload.email
            msg['Subject'] = "Your BorKonya OTP Code"
            body = (
                f"Dear User,\n\n"
                f"Your one-time password (OTP) for BorKonya is:\n\n"
                f"  {otp}\n\n"
                f"This code is valid for {settings.OTP_EXPIRY_MINUTES} minutes.\n"
                f"Do not share this code with anyone.\n\n"
                f"- Team BorKonya"
            )
            msg.attach(MIMEText(body, 'plain'))
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            logging.info(f"OTP email sent successfully to {payload.email}")
        except Exception as e:
            logging.warning(f"Failed to send OTP email to {payload.email}: {e}")
    elif payload.email:
        logging.warning("SMTP not configured. OTP stored in DB but not emailed.")
    else:
        logging.warning("No email provided. OTP stored in DB but not sent.")

    new_otp = OTPStore(
        identifier=payload.phone_number,
        otp_code=otp,
        purpose="VERIFY",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
    )
    db.add(new_otp)
    db.commit()

    return SendOtpResponse(
        message="OTP sent successfully.",
        phone_number=payload.phone_number,
    )


@router.post("/verify-otp")
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    otp_entry = db.query(OTPStore).filter(
        OTPStore.identifier == payload.phone_number,
        OTPStore.purpose == "VERIFY",
        OTPStore.is_used == False,
        OTPStore.expires_at > datetime.now(timezone.utc)
    ).order_by(OTPStore.created_at.desc()).first()

    if not otp_entry or otp_entry.otp_code != payload.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP. Please try again.",
        )
    
    otp_entry.is_used = True
    db.commit()
    
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
        is_premium=bool(sub),
    )


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    otp = f"{random.randint(100000, 999999)}"
    
    # Try to find user to get email for OTP
    user = db.query(User).filter(
        (User.phone_number == payload.phone_or_email) | (User.email == payload.phone_or_email)
    ).first()
    
    if user and user.email and settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart()
            msg['From'] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
            msg['To'] = user.email
            msg['Subject'] = "BorKonya Password Reset OTP"
            body = (
                f"Dear {user.profile.first_name if user.profile else 'User'},\n\n"
                f"We received a request to reset your BorKonya password.\n\n"
                f"Your OTP is:\n\n"
                f"  {otp}\n\n"
                f"This code is valid for {settings.OTP_EXPIRY_MINUTES} minutes.\n"
                f"If you did not request this, please ignore this email.\n\n"
                f"- Team BorKonya"
            )
            msg.attach(MIMEText(body, 'plain'))
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            logging.info(f"Password reset OTP email sent to {user.email}")
        except Exception as e:
            logging.warning(f"Failed to send password reset email to {user.email}: {e}")
    elif user and user.email:
        logging.warning("SMTP not configured. Password reset OTP stored in DB but not emailed.")
            
    new_otp = OTPStore(
        identifier=payload.phone_or_email,
        otp_code=otp,
        purpose="RESET_PASSWORD",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
    )
    db.add(new_otp)
    db.commit()
    
    return {
        "status": "OTP_SENT",
        "message": "If an account exists with this mobile number or email, a verification code has been sent.",
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 8 characters.",
        )

    otp_entry = db.query(OTPStore).filter(
        OTPStore.identifier == payload.phone_or_email,
        OTPStore.purpose == "RESET_PASSWORD",
        OTPStore.is_used == False,
        OTPStore.expires_at > datetime.now(timezone.utc)
    ).order_by(OTPStore.created_at.desc()).first()

    if not otp_entry or otp_entry.otp_code != payload.otp_code:
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
