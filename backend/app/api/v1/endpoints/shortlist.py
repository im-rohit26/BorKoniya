from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_profile
from app.models.entities import Profile, Shortlist, User
from app.schemas.interaction import ShortlistItemResponse
from app.api.v1.endpoints.profiles import format_profile_response

router = APIRouter(prefix="/shortlist", tags=["Shortlist & Bookmarks"])


@router.post("/{profile_id}")
def add_to_shortlist(
    profile_id: str,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    if current_profile.id == profile_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot shortlist your own profile.",
        )

    target = db.query(Profile).filter(Profile.id == profile_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target profile not found.",
        )

    existing = (
        db.query(Shortlist)
        .filter(
            Shortlist.user_profile_id == current_profile.id,
            Shortlist.target_profile_id == target.id,
        )
        .first()
    )

    if existing:
        return {
            "status": "ALREADY_SHORTLISTED",
            "message": f"{target.first_name} is already in your shortlist.",
            "shortlist_id": existing.id,
        }

    new_entry = Shortlist(
        user_profile_id=current_profile.id,
        target_profile_id=target.id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_entry)
    db.commit()

    return {
        "status": "SUCCESS",
        "message": f"{target.first_name} has been added to your shortlist.",
        "shortlist_id": new_entry.id,
    }


@router.delete("/{profile_id}")
def remove_from_shortlist(
    profile_id: str,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Shortlist)
        .filter(
            Shortlist.user_profile_id == current_profile.id,
            Shortlist.target_profile_id == profile_id,
        )
        .first()
    )

    if not existing:
        return {
            "status": "NOT_FOUND",
            "message": "Profile is not currently in your shortlist.",
        }

    db.delete(existing)
    db.commit()

    return {
        "status": "SUCCESS",
        "message": "Removed profile from your shortlist.",
    }


@router.get("", response_model=List[ShortlistItemResponse])
def get_shortlist(
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    items = (
        db.query(Shortlist)
        .filter(Shortlist.user_profile_id == current_profile.id)
        .order_by(Shortlist.created_at.desc())
        .all()
    )

    results = []
    for item in items:
        target = db.query(Profile).filter(Profile.id == item.target_profile_id).first()
        if not target:
            continue
        user = db.query(User).filter(User.id == target.user_id).first()
        formatted = format_profile_response(target, user=user)

        results.append(
            ShortlistItemResponse(
                id=item.id,
                target_profile_id=item.target_profile_id,
                created_at=item.created_at,
                profile=formatted,
            )
        )

    return results


@router.get("/ids", response_model=List[str])
def get_shortlisted_ids(
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Shortlist.target_profile_id)
        .filter(Shortlist.user_profile_id == current_profile.id)
        .all()
    )
    return [r[0] for r in rows]
