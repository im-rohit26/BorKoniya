from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional, Set
from app.core.database import get_db
from app.api.deps import get_optional_current_user
from app.models.entities import Profile, User, BlockedUser, MatchScore
from sqlalchemy import or_, and_
from app.schemas.profile import ProfileResponse
from app.api.v1.endpoints.profiles import format_profile_response
from app.services.matching_service import matching_service, get_match_score

router = APIRouter(prefix="/matches", tags=["Matching Engine"])


def get_blocked_ids(profile_id: Optional[str], db: Session) -> Set[str]:
    if not profile_id:
        return set()
    b1 = db.query(BlockedUser.blocked_profile_id).filter(BlockedUser.blocker_profile_id == profile_id).all()
    b2 = db.query(BlockedUser.blocker_profile_id).filter(BlockedUser.blocked_profile_id == profile_id).all()
    return {r[0] for r in b1}.union({r[0] for r in b2})


@router.get("/recommended", response_model=List[ProfileResponse])
def get_recommended_matches(
    limit: int = 3,
    gender: Optional[str] = None,
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

    if my_profile:
        query = query.outerjoin(
            MatchScore,
            or_(
                and_(MatchScore.profile_a_id == my_profile.id, MatchScore.profile_b_id == Profile.id),
                and_(MatchScore.profile_b_id == my_profile.id, MatchScore.profile_a_id == Profile.id)
            )
        ).order_by(MatchScore.score.desc().nulls_last())

    # Opposite-gender filtering rule
    if my_profile and my_profile.gender:
        if my_profile.gender.upper() == "FEMALE":
            query = query.filter(Profile.gender == "MALE")
        elif my_profile.gender.upper() == "MALE":
            query = query.filter(Profile.gender == "FEMALE")
    elif gender:
        query = query.filter(Profile.gender == gender.upper())

    profiles = query.limit(30).all()
    results = []

    ref_profile = my_profile if my_profile else (profiles[0] if profiles else None)

    for p in profiles:
        user = db.query(User).filter(User.id == p.user_id).first()
        res = format_profile_response(p, user=user)

        if ref_profile and p.id != ref_profile.id:
            db_score = get_match_score(db, ref_profile.id, p.id)
            if db_score is not None:
                res.match_score = db_score
                _, res.match_breakdown = matching_service.evaluate_match(ref_profile, p)
            else:
                score, breakdown = matching_service.evaluate_match(ref_profile, p)
                res.match_score = score
                res.match_breakdown = breakdown
        else:
            res.match_score = 0
            res.match_breakdown = []

        results.append(res)

    return results[:limit]


@router.get("/new", response_model=List[ProfileResponse])
def get_new_matches(
    limit: int = 3,
    gender: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Recently registered compatible profiles."""
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

    if my_profile and my_profile.gender:
        if my_profile.gender.upper() == "FEMALE":
            query = query.filter(Profile.gender == "MALE")
        elif my_profile.gender.upper() == "MALE":
            query = query.filter(Profile.gender == "FEMALE")
    elif gender:
        query = query.filter(Profile.gender == gender.upper())

    profiles = (
        query
        .order_by(Profile.created_at.desc())
        .limit(20)
        .all()
    )
    results = []
    ref_profile = my_profile
    for p in profiles:
        user = db.query(User).filter(User.id == p.user_id).first()
        res = format_profile_response(p, user=user)
        if ref_profile and p.id != ref_profile.id:
            db_score = get_match_score(db, ref_profile.id, p.id)
            if db_score is not None:
                res.match_score = db_score
                _, res.match_breakdown = matching_service.evaluate_match(ref_profile, p)
            else:
                score, breakdown = matching_service.evaluate_match(ref_profile, p)
                res.match_score = score
                res.match_breakdown = breakdown
        else:
            res.match_score = 0
            res.match_breakdown = []
        results.append(res)
    return results[:limit]


@router.get("/near-you", response_model=List[ProfileResponse])
def get_near_you_matches(
    state: str = "West Bengal",
    limit: int = 3,
    gender: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Profiles geographically close to candidate."""
    my_profile = None
    blocked_ids = set()
    if current_user:
        my_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if my_profile:
            blocked_ids.add(my_profile.id)
            blocked_ids = blocked_ids.union(get_blocked_ids(my_profile.id, db))

    query = (
        db.query(Profile)
        .filter(Profile.status == "ACTIVE")
        .filter(Profile.current_state == state)
    )
    if blocked_ids:
        query = query.filter(~Profile.id.in_(blocked_ids))

    if my_profile and my_profile.gender:
        if my_profile.gender.upper() == "FEMALE":
            query = query.filter(Profile.gender == "MALE")
        elif my_profile.gender.upper() == "MALE":
            query = query.filter(Profile.gender == "FEMALE")
    elif gender:
        query = query.filter(Profile.gender == gender.upper())

    profiles = query.limit(20).all()
    results = []
    ref_profile = my_profile
    for p in profiles:
        user = db.query(User).filter(User.id == p.user_id).first()
        res = format_profile_response(p, user=user)
        if ref_profile and p.id != ref_profile.id:
            db_score = get_match_score(db, ref_profile.id, p.id)
            if db_score is not None:
                res.match_score = db_score
                _, res.match_breakdown = matching_service.evaluate_match(ref_profile, p)
            else:
                score, breakdown = matching_service.evaluate_match(ref_profile, p)
                res.match_score = score
                res.match_breakdown = breakdown
        else:
            res.match_score = 0
            res.match_breakdown = []
        results.append(res)
    return results[:limit]


@router.get("/visitors", response_model=List[ProfileResponse])
def get_profile_visitors(
    limit: int = 3,
    gender: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Members who recently visited user's profile."""
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

    if my_profile and my_profile.gender:
        if my_profile.gender.upper() == "FEMALE":
            query = query.filter(Profile.gender == "MALE")
        elif my_profile.gender.upper() == "MALE":
            query = query.filter(Profile.gender == "FEMALE")
    elif gender:
        query = query.filter(Profile.gender == gender.upper())

    profiles = query.limit(10).all()
    results = []
    ref_profile = my_profile
    for p in profiles:
        user = db.query(User).filter(User.id == p.user_id).first()
        res = format_profile_response(p, user=user)
        if ref_profile and p.id != ref_profile.id:
            db_score = get_match_score(db, ref_profile.id, p.id)
            if db_score is not None:
                res.match_score = db_score
                _, res.match_breakdown = matching_service.evaluate_match(ref_profile, p)
            else:
                score, breakdown = matching_service.evaluate_match(ref_profile, p)
                res.match_score = score
                res.match_breakdown = breakdown
        else:
            res.match_score = 0
            res.match_breakdown = []
        results.append(res)
    return results[:limit]
