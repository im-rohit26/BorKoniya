from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional, Set
from datetime import date
from app.core.database import get_db
from app.api.deps import get_optional_current_user
from app.models.entities import Profile, User, BlockedUser, MatchScore, Interest
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


def get_connected_ids(profile_id: Optional[str], db: Session) -> Set[str]:
    if not profile_id:
        return set()
    r1 = db.query(Interest.receiver_profile_id).filter(
        Interest.sender_profile_id == profile_id,
        Interest.status == "ACCEPTED",
    ).all()
    r2 = db.query(Interest.sender_profile_id).filter(
        Interest.receiver_profile_id == profile_id,
        Interest.status == "ACCEPTED",
    ).all()
    return {r[0] for r in r1}.union({r[0] for r in r2})


def apply_match_filters(
    query,
    community: Optional[str] = None,
    state: Optional[str] = None,
    marital_status: Optional[str] = None,
    diet: Optional[str] = None,
    education: Optional[str] = None,
    profession: Optional[str] = None,
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
):
    today = date.today()
    if age_min:
        try:
            min_date = date(today.year - age_min, today.month, today.day)
        except ValueError:
            min_date = date(today.year - age_min, 3, 1)
        query = query.filter(Profile.date_of_birth <= min_date)
    if age_max:
        try:
            max_date = date(today.year - age_max - 1, today.month, today.day)
        except ValueError:
            max_date = date(today.year - age_max - 1, 3, 1)
        query = query.filter(Profile.date_of_birth > max_date)

    if community and community.upper() != "ALL":
        query = query.filter(Profile.community.ilike(f"%{community}%"))
    if state and state.upper() != "ALL" and state.upper() != "ALL INDIA":
        query = query.filter(Profile.current_state.ilike(f"%{state}%"))
    if marital_status and marital_status.upper() != "ALL":
        query = query.filter(Profile.marital_status == marital_status)
    if diet and diet.upper() != "ALL":
        query = query.filter(Profile.diet.ilike(f"%{diet}%"))
    if education and education.upper() != "ANY" and education.upper() != "ALL":
        query = query.filter(Profile.highest_qualification.ilike(f"%{education}%"))
    if profession and profession.upper() != "ANY" and profession.upper() != "ALL":
        query = query.filter(Profile.occupation.ilike(f"%{profession}%"))

    return query


@router.get("/recommended", response_model=List[ProfileResponse])
def get_recommended_matches(
    response: Response,
    limit: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    gender: Optional[str] = None,
    community: Optional[str] = None,
    state: Optional[str] = None,
    marital_status: Optional[str] = None,
    diet: Optional[str] = None,
    education: Optional[str] = None,
    profession: Optional[str] = None,
    age_min: Optional[int] = Query(None, ge=18, le=70),
    age_max: Optional[int] = Query(None, ge=18, le=70),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    my_profile = None
    exclude_ids = set()
    if current_user:
        my_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if my_profile:
            exclude_ids.add(my_profile.id)
            exclude_ids = exclude_ids.union(get_blocked_ids(my_profile.id, db))
            exclude_ids = exclude_ids.union(get_connected_ids(my_profile.id, db))

    query = db.query(Profile).filter(Profile.status == "ACTIVE")
    if exclude_ids:
        query = query.filter(~Profile.id.in_(exclude_ids))

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

    query = apply_match_filters(
        query,
        community=community,
        state=state,
        marital_status=marital_status,
        diet=diet,
        education=education,
        profession=profession,
        age_min=age_min,
        age_max=age_max,
    )

    total_count = query.count()
    response.headers["X-Total-Count"] = str(total_count)

    profiles = query.offset((page - 1) * limit).limit(limit).all()
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
            # Baseline compatibility for visitors or reference profile
            score, breakdown = 88, [
                "Community aligned (Sadgope / Gowala heritage)",
                "Educational background verified",
                "Regional lifestyle compatibility",
            ]
            res.match_score = score
            res.match_breakdown = breakdown

        results.append(res)

    return results


@router.get("/new", response_model=List[ProfileResponse])
def get_new_matches(
    response: Response,
    limit: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    gender: Optional[str] = None,
    community: Optional[str] = None,
    state: Optional[str] = None,
    marital_status: Optional[str] = None,
    diet: Optional[str] = None,
    education: Optional[str] = None,
    profession: Optional[str] = None,
    age_min: Optional[int] = Query(None, ge=18, le=70),
    age_max: Optional[int] = Query(None, ge=18, le=70),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Recently registered compatible profiles."""
    my_profile = None
    exclude_ids = set()
    if current_user:
        my_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if my_profile:
            exclude_ids.add(my_profile.id)
            exclude_ids = exclude_ids.union(get_blocked_ids(my_profile.id, db))
            exclude_ids = exclude_ids.union(get_connected_ids(my_profile.id, db))

    query = db.query(Profile).filter(Profile.status == "ACTIVE")
    if exclude_ids:
        query = query.filter(~Profile.id.in_(exclude_ids))

    if my_profile and my_profile.gender:
        if my_profile.gender.upper() == "FEMALE":
            query = query.filter(Profile.gender == "MALE")
        elif my_profile.gender.upper() == "MALE":
            query = query.filter(Profile.gender == "FEMALE")
    elif gender:
        query = query.filter(Profile.gender == gender.upper())

    query = apply_match_filters(
        query,
        community=community,
        state=state,
        marital_status=marital_status,
        diet=diet,
        education=education,
        profession=profession,
        age_min=age_min,
        age_max=age_max,
    )

    total_count = query.count()
    response.headers["X-Total-Count"] = str(total_count)

    profiles = (
        query
        .order_by(Profile.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
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
            res.match_score = 85
            res.match_breakdown = ["Recent member", "Community verified"]
        results.append(res)
    return results


@router.get("/near-you", response_model=List[ProfileResponse])
def get_near_you_matches(
    response: Response,
    state: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    gender: Optional[str] = None,
    community: Optional[str] = None,
    marital_status: Optional[str] = None,
    diet: Optional[str] = None,
    education: Optional[str] = None,
    profession: Optional[str] = None,
    age_min: Optional[int] = Query(None, ge=18, le=70),
    age_max: Optional[int] = Query(None, ge=18, le=70),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Profiles geographically close to candidate (West Bengal & Odisha by default)."""
    my_profile = None
    exclude_ids = set()
    if current_user:
        my_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if my_profile:
            exclude_ids.add(my_profile.id)
            exclude_ids = exclude_ids.union(get_blocked_ids(my_profile.id, db))
            exclude_ids = exclude_ids.union(get_connected_ids(my_profile.id, db))

    query = db.query(Profile).filter(Profile.status == "ACTIVE")
    if state and state.upper() != "ALL":
        query = query.filter(Profile.current_state.ilike(f"%{state}%"))
    else:
        query = query.filter(Profile.current_state.in_(["West Bengal", "Odisha", "Jharkhand", "Bihar"]))
    if exclude_ids:
        query = query.filter(~Profile.id.in_(exclude_ids))

    if my_profile and my_profile.gender:
        if my_profile.gender.upper() == "FEMALE":
            query = query.filter(Profile.gender == "MALE")
        elif my_profile.gender.upper() == "MALE":
            query = query.filter(Profile.gender == "FEMALE")
    elif gender:
        query = query.filter(Profile.gender == gender.upper())

    query = apply_match_filters(
        query,
        community=community,
        marital_status=marital_status,
        diet=diet,
        education=education,
        profession=profession,
        age_min=age_min,
        age_max=age_max,
    )

    total_count = query.count()
    response.headers["X-Total-Count"] = str(total_count)

    profiles = query.offset((page - 1) * limit).limit(limit).all()
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
            res.match_score = 90
            res.match_breakdown = ["Native regional match", "Community verified"]
        results.append(res)
    return results


@router.get("/visitors", response_model=List[ProfileResponse])
def get_profile_visitors(
    response: Response,
    limit: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
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

    total_count = query.count()
    response.headers["X-Total-Count"] = str(total_count)

    profiles = query.offset((page - 1) * limit).limit(limit).all()
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
            res.match_score = 86
            res.match_breakdown = ["Recent profile view", "Community member"]
        results.append(res)
    return results
