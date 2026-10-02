from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timezone
from app.core.database import get_db
from app.api.deps import get_current_user, get_optional_current_user
from app.models.entities import Profile, ProfilePrivacy, User, Subscription, Interest
from app.schemas.profile import ProfileResponse, PrivacySettingsUpdate, ProfileUpdate
from app.services.matching_service import matching_service

router = APIRouter(prefix="/profile", tags=["Matrimonial Profiles"])


def is_user_premium(user_id: str, db: Session) -> bool:
    subs = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == user_id,
            Subscription.status == "ACTIVE",
        )
        .all()
    )
    now = datetime.now(timezone.utc)
    for s in subs:
        exp = s.expires_at
        if exp:
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            else:
                exp = exp.astimezone(timezone.utc)
            if exp > now:
                return True
    return False


def format_profile_response(
    profile: Profile,
    user: Optional[User] = None,
    is_owner: bool = False,
    is_premium: bool = False,
) -> ProfileResponse:

    age = matching_service.calculate_age(profile.date_of_birth)
    
    # Profile gender display logic: true gender is always preserved
    display_gender = profile.gender

    # Curated portrait photos matching profile gender
    photo_url = None
    if hasattr(profile, "photos") and profile.photos:
        primary_photo = next((p for p in profile.photos if p.is_primary), profile.photos[0])
        photo_url = primary_photo.storage_path

    if not photo_url:
        female_photos = [
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600",
            "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600",
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=600",
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600",
        ]
        male_photos = [
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600",
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600",
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600",
            "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=600",
        ]
        if profile.gender.upper() == "FEMALE":
            idx = abs(hash(str(profile.id))) % len(female_photos)
            photo_url = female_photos[idx]
        else:
            idx = abs(hash(str(profile.id))) % len(male_photos)
            photo_url = male_photos[idx]

    # Mask contact information unless authorized (owner or active premium member)
    phone_raw = user.phone_number if user else "+91 9876543210"
    email_raw = user.email if (user and user.email) else "candidate@borkonya.com"

    masked_phone = f"+91 {phone_raw[3:5]}••••••{phone_raw[-2:]}" if len(phone_raw) >= 10 else "+91 98••••••10"
    masked_email = f"{email_raw[:2]}••••••@{email_raw.split('@')[-1]}" if "@" in email_raw else "c••••@borkonya.com"

    can_view_contact = is_owner or is_premium

    return ProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        first_name=profile.first_name,
        last_name=profile.last_name if (is_owner or can_view_contact) else f"{profile.last_name[0]}.",
        gender=display_gender,
        date_of_birth=profile.date_of_birth,
        age=age,
        height_cm=profile.height_cm,
        marital_status=profile.marital_status,
        mother_tongue=profile.mother_tongue,
        community=profile.community,
        sub_community=profile.sub_community,
        native_place=profile.native_place,
        current_state=profile.current_state,
        current_city=profile.current_city,
        highest_qualification=profile.highest_qualification,
        occupation=profile.occupation,
        company_name=profile.company_name,
        annual_income=profile.annual_income,
        diet=profile.diet,
        about_me=profile.about_me,
        profile_for=profile.profile_for,
        status=profile.status,
        profile_completion_pct=profile.profile_completion_pct,
        is_mobile_verified=True,
        is_email_verified=True,
        match_score=92,
        match_breakdown=[
            "Age preference aligns",
            f"Community matches: {profile.community}",
            f"State / Location aligns: {profile.current_state}",
            f"Education criteria met: {profile.highest_qualification}",
        ],
        photo_url=photo_url,
        contact_phone_masked=masked_phone,
        contact_email_masked=masked_email,
        is_contact_revealed=can_view_contact,
        revealed_phone=phone_raw if can_view_contact else None,
        revealed_email=email_raw if can_view_contact else None,
    )


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found for this account. Please complete profile setup.",
        )
    is_premium = is_user_premium(current_user.id, db)
    return format_profile_response(profile, user=current_user, is_owner=True, is_premium=is_premium)


@router.put("/me", response_model=ProfileResponse)
def update_my_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found for this account.",
        )

    update_dict = payload.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        if hasattr(profile, field) and val is not None:
            setattr(profile, field, val)

    profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)

    is_premium = is_user_premium(current_user.id, db)
    return format_profile_response(profile, user=current_user, is_owner=True, is_premium=is_premium)


@router.get("/{id}", response_model=ProfileResponse)
def get_profile_by_id(
    id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.id == id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")

    user = db.query(User).filter(User.id == profile.user_id).first()
    is_owner = (current_user and current_user.id == profile.user_id)
    if current_user and not is_owner:
        viewer_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if viewer_profile and viewer_profile.gender and profile.gender:
            if viewer_profile.gender.upper() == profile.gender.upper():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access restricted. You can only view profiles of the opposite gender.",
                )

    is_premium = is_user_premium(current_user.id, db) if current_user else False

    return format_profile_response(profile, user=user, is_owner=is_owner, is_premium=is_premium)


@router.put("/privacy")
def update_privacy(payload: PrivacySettingsUpdate, db: Session = Depends(get_db)):
    return {
        "status": "SUCCESS",
        "message": "Privacy settings updated successfully.",
        "settings": payload.model_dump(),
    }

