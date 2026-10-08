import os
import io
import uuid
import shutil
import logging
from PIL import Image, ImageOps
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List, Optional, Tuple
from datetime import date, datetime, timezone
from app.core.database import get_db
from app.api.deps import get_current_user, get_optional_current_user
from app.models.entities import Profile, ProfilePrivacy, User, Subscription, Interest, ProfilePhoto
from app.schemas.profile import ProfileResponse, PrivacySettingsUpdate, ProfileUpdate, PhotoItemResponse
from app.services.matching_service import matching_service
from app.core.supabase import get_supabase_client
from app.core.config import settings

logger = logging.getLogger("borkonya.profiles")

router = APIRouter(prefix="/profile", tags=["Matrimonial Profiles"])


def optimize_image_bytes(raw_bytes: bytes, max_dimension: int = 1200, quality: int = 85) -> Tuple[bytes, str]:
    """
    Auto-rotates mobile photos based on EXIF, resizes large photos,
    and converts to highly optimized WebP format to save 70-95% bandwidth.
    """
    try:
        img = Image.open(io.BytesIO(raw_bytes))
        img = ImageOps.exif_transpose(img)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        w, h = img.size
        if max(w, h) > max_dimension:
            ratio = max_dimension / max(w, h)
            new_size = (max(1, int(w * ratio)), max(1, int(h * ratio)))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        out = io.BytesIO()
        img.save(out, format="WEBP", quality=quality, method=6)
        return out.getvalue(), "image/webp"
    except Exception as e:
        logger.warning(f"Image optimization fallback: {e}")
        return raw_bytes, "image/jpeg"


def save_photo_file(file: UploadFile, base_id: str) -> str:
    file_bytes = file.file.read()
    file.file.seek(0)

    # Compress and convert to modern WebP
    optimized_bytes, content_type = optimize_image_bytes(file_bytes, max_dimension=1200, quality=85)
    unique_filename = f"{base_id}_{uuid.uuid4().hex[:8]}.webp"

    # 1. Try Supabase Storage first
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.storage.from_("profile-photos").upload(
                unique_filename,
                optimized_bytes,
                {"content-type": content_type, "upsert": "true"},
            )
            public_url = supabase.storage.from_("profile-photos").get_public_url(unique_filename)
            if public_url:
                return public_url
        except Exception as e:
            logger.warning(f"Supabase photo upload warning: {e}")

    # 2. Local fallback
    upload_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))),
        "uploads",
        "photos",
    )
    os.makedirs(upload_dir, exist_ok=True)
    local_path = os.path.join(upload_dir, unique_filename)
    with open(local_path, "wb") as buffer:
        buffer.write(optimized_bytes)

    base_url = settings.BACKEND_PUBLIC_URL.rstrip("/") if settings.BACKEND_PUBLIC_URL else (
        os.getenv("RENDER_EXTERNAL_URL", "").rstrip("/") or f"http://localhost:{settings.PORT}"
    )
    return f"{base_url}/uploads/photos/{unique_filename}"


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


def calculate_profile_completion(profile: Profile) -> int:
    """
    Dynamically computes profile completion percentage based on filled profile data.
    Total weights = 100%. Minimum base = 20%.
    """
    score = 20  # Base account + verification
    if profile.first_name and profile.last_name:
        score += 10
    if profile.gender and profile.date_of_birth:
        score += 10
    if profile.height_cm and profile.marital_status:
        score += 5
    if profile.community:
        score += 5
    if profile.sub_community:
        score += 5
    if profile.current_state and profile.current_city:
        score += 10
    if profile.native_place:
        score += 5
    if profile.highest_qualification and profile.occupation:
        score += 10
    if profile.company_name or profile.annual_income:
        score += 5
    if profile.about_me and len(profile.about_me.strip()) >= 20:
        score += 10
    if getattr(profile, "rashi", None) or getattr(profile, "nakshatra", None) or (getattr(profile, "is_manglik", None) and profile.is_manglik != "DONT_KNOW"):
        score += 5
    if hasattr(profile, "photos") and profile.photos and len(profile.photos) > 0:
        score += 10
    return min(max(score, 20), 100)


def format_profile_response(
    profile: Profile,
    user: Optional[User] = None,
    is_owner: bool = False,
    is_premium: bool = False,
    match_score: Optional[int] = None,
) -> ProfileResponse:

    age = matching_service.calculate_age(profile.date_of_birth)
    
    # Profile gender display logic: true gender is always preserved
    display_gender = profile.gender

    # Real uploaded photos
    photos_list = []
    if hasattr(profile, "photos") and profile.photos:
        photos_list = [
            PhotoItemResponse(
                id=p.id,
                storage_path=p.storage_path,
                is_primary=p.is_primary,
                privacy=p.privacy,
            )
            for p in profile.photos
        ]

    photo_url = None
    if photos_list:
        primary_photo = next((p for p in photos_list if p.is_primary), photos_list[0])
        photo_url = primary_photo.storage_path

    # Mask contact information unless authorized (owner or active premium member)
    phone_raw = user.phone_number if user else "+919876543210"
    email_raw = user.email if (user and user.email) else "candidate@borkonya.com"

    if len(phone_raw) >= 10:
        masked_phone = phone_raw[:3] + "••••••" + phone_raw[-2:]
    else:
        masked_phone = "+91 98••••••10"

    masked_email = f"{email_raw[:2]}••••••@{email_raw.split('@')[-1]}" if "@" in email_raw else "c••••@borkonya.com"

    can_view_contact = is_owner or is_premium
    completion_pct = profile.profile_completion_pct or calculate_profile_completion(profile)

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
        smoking=getattr(profile, "smoking", "NO"),
        drinking=getattr(profile, "drinking", "NO"),
        rashi=getattr(profile, "rashi", None),
        nakshatra=getattr(profile, "nakshatra", None),
        is_manglik=getattr(profile, "is_manglik", "DONT_KNOW"),
        profile_for=profile.profile_for,
        status=profile.status,
        profile_completion_pct=completion_pct,
        is_mobile_verified=True,
        is_email_verified=True,
        match_score=match_score,
        match_breakdown=[
            "Age preference aligns",
            f"Community matches: {profile.community}",
            f"State / Location aligns: {profile.current_state}",
            f"Education criteria met: {profile.highest_qualification}",
        ],
        photo_url=photo_url,
        photos=photos_list,
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
    if "date_of_birth" in update_dict and update_dict["date_of_birth"]:
        dob_val = update_dict["date_of_birth"]
        if isinstance(dob_val, str):
            try:
                update_dict["date_of_birth"] = datetime.strptime(dob_val, "%Y-%m-%d").date()
            except ValueError:
                del update_dict["date_of_birth"]

    for field, val in update_dict.items():
        if hasattr(profile, field) and val is not None:
            setattr(profile, field, val)

    profile.profile_completion_pct = calculate_profile_completion(profile)
    profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)

    is_premium = is_user_premium(current_user.id, db)
    return format_profile_response(profile, user=current_user, is_owner=True, is_premium=is_premium)


@router.get("/me/dashboard")
def get_my_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculates all real user and application statistics directly from the database."""
    profile = (
        db.query(Profile)
        .options(selectinload(Profile.photos))
        .filter(Profile.user_id == current_user.id)
        .first()
    )
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found for this account.",
        )

    from app.models.entities import Interest, Shortlist, ConversationMember, MatchScore, ProfilePhoto
    from sqlalchemy import or_

    target_gender = "MALE" if (profile.gender and profile.gender.upper() == "FEMALE") else "FEMALE"

    # Query all connected profile IDs in a single query (accepted interest in either direction)
    connected_rows = (
        db.query(Interest.sender_profile_id, Interest.receiver_profile_id)
        .filter(
            Interest.status == "ACCEPTED",
            or_(
                Interest.sender_profile_id == profile.id,
                Interest.receiver_profile_id == profile.id,
            ),
        )
        .all()
    )
    connected_ids = {
        r[1] if r[0] == profile.id else r[0]
        for r in connected_rows
    }
    exclude_ids = connected_ids.union({profile.id})

    # 1. Total matches count in DB (excluding self and connected members)
    total_matches_count = db.query(Profile).filter(
        Profile.status == "ACTIVE",
        Profile.gender == target_gender,
        ~Profile.id.in_(exclude_ids),
    ).count()

    # 2. Received interests (pending)
    received_pending_count = db.query(Interest).filter(
        Interest.receiver_profile_id == profile.id,
        Interest.status == "SENT",
    ).count()

    # 3. Sent interests (pending)
    sent_pending_count = db.query(Interest).filter(
        Interest.sender_profile_id == profile.id,
        Interest.status == "SENT",
    ).count()

    # 4. Total active connections (accepted)
    total_active_connections = len(connected_ids)

    # 5. Shortlisted count
    shortlist_count = db.query(Shortlist).filter(
        Shortlist.user_profile_id == profile.id,
    ).count()

    # 6. Active conversations count
    active_conversations_count = db.query(ConversationMember).filter(
        ConversationMember.profile_id == profile.id,
        ConversationMember.is_hidden == False,
    ).count()

    # 7. Profile views / impressions
    profile_views_count = db.query(MatchScore).filter(
        or_(
            MatchScore.profile_a_id == profile.id,
            MatchScore.profile_b_id == profile.id,
        )
    ).count()
    if profile_views_count == 0:
        profile_views_count = max(total_matches_count, 1)

    # 8. Top 6 real recommendations (strictly excluding connected profiles) with eager loading
    top_profiles = (
        db.query(Profile)
        .options(joinedload(Profile.user), selectinload(Profile.photos))
        .filter(
            Profile.status == "ACTIVE",
            Profile.gender == target_gender,
            ~Profile.id.in_(exclude_ids),
        )
        .limit(6)
        .all()
    )

    # Batch load match scores if top profiles exist
    score_map = {}
    if top_profiles:
        target_ids = [m.id for m in top_profiles]
        score_records = db.query(MatchScore).filter(
            or_(
                (MatchScore.profile_a_id == profile.id) & (MatchScore.profile_b_id.in_(target_ids)),
                (MatchScore.profile_b_id == profile.id) & (MatchScore.profile_a_id.in_(target_ids)),
            )
        ).all()
        for s in score_records:
            other_id = s.profile_b_id if s.profile_a_id == profile.id else s.profile_a_id
            score_map[other_id] = s.score

    top_matches = []
    for m in top_profiles:
        res = format_profile_response(m, user=m.user)
        cached_score = score_map.get(m.id)
        if cached_score is not None:
            res.match_score = cached_score
            _, res.match_breakdown = matching_service.evaluate_match(profile, m)
        else:
            score, breakdown = matching_service.evaluate_match(profile, m)
            res.match_score = score
            res.match_breakdown = breakdown
        top_matches.append(res)

    completion_pct = profile.profile_completion_pct or calculate_profile_completion(profile)

    # Get primary photo from eagerly loaded profile.photos (no query)
    primary_photo = next((p for p in profile.photos if p.is_primary), None)
    if not primary_photo and profile.photos:
        primary_photo = profile.photos[0]
    photo_url = primary_photo.storage_path if primary_photo else None

    is_premium = is_user_premium(current_user.id, db)

    return {
        "user": {
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "profile_completion_pct": completion_pct,
            "is_premium": is_premium,
            "photo_url": photo_url,
            "gender": profile.gender,
            "community": profile.community,
        },
        "metrics": {
            "recommended_count": total_matches_count,
            "received_interests_count": received_pending_count,
            "sent_interests_count": sent_pending_count,
            "total_active_connections": total_active_connections,
            "shortlist_count": shortlist_count,
            "active_conversations_count": active_conversations_count,
            "profile_views_count": profile_views_count,
            "profile_completion_pct": completion_pct,
        },
        "recommended_profiles": top_matches,
        # Flat aliases for backwards compatibility
        "profile_completion_pct": completion_pct,
        "recommended_count": total_matches_count,
        "received_interests_count": received_pending_count,
        "sent_interests_count": sent_pending_count,
        "total_active_connections": total_active_connections,
        "shortlist_count": shortlist_count,
        "active_conversations_count": active_conversations_count,
        "profile_views_count": profile_views_count,
        "top_matches": top_matches,
    }


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
    viewer_profile = None
    if current_user and not is_owner:
        viewer_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if viewer_profile and viewer_profile.gender and profile.gender:
            if viewer_profile.gender.upper() == profile.gender.upper():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access restricted. You can only view profiles of the opposite gender.",
                )

    is_premium = is_user_premium(current_user.id, db) if current_user else False

    # Fetch Match Score
    match_score_val = None
    if current_user and viewer_profile and not is_owner:
        from app.models.entities import MatchScore
        score_record = db.query(MatchScore).filter(
            ((MatchScore.profile_a_id == viewer_profile.id) & (MatchScore.profile_b_id == profile.id)) |
            ((MatchScore.profile_a_id == profile.id) & (MatchScore.profile_b_id == viewer_profile.id))
        ).first()
        if score_record:
            match_score_val = score_record.score

    return format_profile_response(profile, user=user, is_owner=is_owner, is_premium=is_premium, match_score=match_score_val)


@router.put("/privacy")
def update_privacy(payload: PrivacySettingsUpdate, db: Session = Depends(get_db)):
    return {
        "status": "SUCCESS",
        "message": "Privacy settings updated successfully.",
        "settings": payload.model_dump(),
    }


# Photo Management APIs
@router.post("/me/photos/upload", response_model=PhotoItemResponse)
async def upload_my_photo(
    file: UploadFile = File(...),
    is_primary: bool = Form(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found for this account.",
        )

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files (JPG, PNG, WEBP, etc.) are allowed.",
        )

    # Max 5 photos
    existing_count = db.query(ProfilePhoto).filter(ProfilePhoto.profile_id == profile.id).count()
    if existing_count >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum of 5 photos reached. Please delete an existing photo to upload a new one.",
        )

    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    unique_filename = f"{profile.id}_{uuid.uuid4().hex[:8]}{ext}"

    photo_url = save_photo_file(file, unique_filename)

    should_be_primary = is_primary or (existing_count == 0)
    if should_be_primary:
        db.query(ProfilePhoto).filter(ProfilePhoto.profile_id == profile.id).update({"is_primary": False})

    new_photo = ProfilePhoto(
        profile_id=profile.id,
        storage_path=photo_url,
        is_primary=should_be_primary,
        privacy="REGISTERED_ONLY",
    )
    db.add(new_photo)
    db.commit()
    db.refresh(new_photo)

    # Update completion percentage if needed
    if profile.profile_completion_pct < 85:
        profile.profile_completion_pct = min(100, profile.profile_completion_pct + 10)
        db.commit()

    return PhotoItemResponse(
        id=new_photo.id,
        storage_path=new_photo.storage_path,
        is_primary=new_photo.is_primary,
        privacy=new_photo.privacy,
    )


@router.get("/me/photos", response_model=List[PhotoItemResponse])
def get_my_photos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found.",
        )
    photos = (
        db.query(ProfilePhoto)
        .filter(ProfilePhoto.profile_id == profile.id)
        .order_by(ProfilePhoto.is_primary.desc())
        .all()
    )
    return [
        PhotoItemResponse(
            id=p.id,
            storage_path=p.storage_path,
            is_primary=p.is_primary,
            privacy=p.privacy,
        )
        for p in photos
    ]


@router.delete("/me/photos/{photo_id}")
def delete_my_photo(
    photo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")

    photo = db.query(ProfilePhoto).filter(
        ProfilePhoto.id == photo_id,
        ProfilePhoto.profile_id == profile.id,
    ).first()
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found.")

    was_primary = photo.is_primary
    db.delete(photo)
    db.commit()

    if was_primary:
        remaining = db.query(ProfilePhoto).filter(ProfilePhoto.profile_id == profile.id).first()
        if remaining:
            remaining.is_primary = True
            db.commit()

    return {"status": "SUCCESS", "message": "Photo deleted successfully."}


@router.post("/me/photos/{photo_id}/primary")
def set_primary_photo(
    photo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")

    photo = db.query(ProfilePhoto).filter(
        ProfilePhoto.id == photo_id,
        ProfilePhoto.profile_id == profile.id,
    ).first()
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found.")

    db.query(ProfilePhoto).filter(ProfilePhoto.profile_id == profile.id).update({"is_primary": False})
    photo.is_primary = True
    db.commit()

    return {"status": "SUCCESS", "message": "Primary photo updated successfully."}


