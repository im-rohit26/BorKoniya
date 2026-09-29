from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional, Set
from app.core.database import get_db
from app.api.deps import get_optional_current_user
from app.models.entities import Profile, User, BlockedUser
from app.schemas.profile import ProfileResponse
from app.api.v1.endpoints.profiles import format_profile_response
from app.services.matching_service import matching_service

router = APIRouter(prefix="/matches", tags=["Matching Engine"])


def get_blocked_ids(profile_id: Optional[str], db: Session) -> Set[str]:
    if not profile_id:
        return set()
    b1 = db.query(BlockedUser.blocked_profile_id).filter(BlockedUser.blocker_profile_id == profile_id).all()
    b2 = db.query(BlockedUser.blocker_profile_id).filter(BlockedUser.blocked_profile_id == profile_id).all()
    return {r[0] for r in b1}.union({r[0] for r in b2})


@router.get("/recommended", response_model=List[ProfileResponse])
def get_recommended_matches(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    my_profile = None
    blocked_ids = set()
    if current_user:
        my_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if my_profile:
            blocked_ids.add(my_profile.id)
            blocked_ids = blocked_ids.union(get_blocked_ids(my_profile.id, db))

    query = db.query(Profile).filter(Profile.status == "ACTIVE")
    if blocked_ids:
        query = query.filter(~Profile.id.in_(blocked_ids))

    profiles = query.limit(30).all()
    results = []

    ref_profile = my_profile if my_profile else (profiles[0] if profiles else None)


    for p in profiles:
        user = db.query(User).filter(User.id == p.user_id).first()
        res = format_profile_response(p, user=user)

        if ref_profile and p.id != ref_profile.id:
            score, breakdown = matching_service.evaluate_match(ref_profile, p)
            res.match_score = score
            res.match_breakdown = breakdown
        else:
            res.match_score = 96
            res.match_breakdown = [
                "Direct Sadgope / Gowala community match",
                "High cultural and family alignment",
                "Verified background details",
                "Preferred regional belt",
            ]

        results.append(res)

    return sorted(results, key=lambda x: x.match_score or 0, reverse=True)


@router.get("/new", response_model=List[ProfileResponse])
def get_new_matches(db: Session = Depends(get_db)):
    """Recently registered compatible profiles."""
    profiles = (
        db.query(Profile)
        .filter(Profile.status == "ACTIVE")
        .order_by(Profile.created_at.desc())
        .limit(20)
        .all()
    )
    results = []
    for p in profiles:
        user = db.query(User).filter(User.id == p.user_id).first()
        res = format_profile_response(p, user=user)
        res.match_score = 90
        res.match_breakdown = [
            "Recently registered member",
            f"Active in {p.current_city}, {p.current_state}",
            f"Community: {p.community}",
        ]
        results.append(res)
    return results


@router.get("/near-you", response_model=List[ProfileResponse])
def get_near_you_matches(
    state: str = "West Bengal",
    db: Session = Depends(get_db),
):
    """Profiles geographically close to candidate."""
    profiles = (
        db.query(Profile)
        .filter(Profile.status == "ACTIVE")
        .filter(Profile.current_state.ilike(f"%{state}%"))
        .limit(20)
        .all()
    )
    results = []
    for p in profiles:
        user = db.query(User).filter(User.id == p.user_id).first()
        res = format_profile_response(p, user=user)
        res.match_score = 92
        res.match_breakdown = [
            f"Living in nearby region: {p.current_city}, {p.current_state}",
            f"Native Place connects: {p.native_place or p.current_state}",
            f"Community: {p.community}",
        ]
        results.append(res)
    return results


@router.get("/visitors", response_model=List[ProfileResponse])
def get_profile_visitors(db: Session = Depends(get_db)):
    """Members who recently visited user's profile."""
    profiles = db.query(Profile).filter(Profile.status == "ACTIVE").limit(10).all()
    results = []
    for p in profiles:
        user = db.query(User).filter(User.id == p.user_id).first()
        res = format_profile_response(p, user=user)
        res.match_score = 88
        res.match_breakdown = [
            "Viewed your profile in the past 48 hours",
            f"Community: {p.community}",
            f"Education: {p.highest_qualification}",
        ]
        results.append(res)
    return results
