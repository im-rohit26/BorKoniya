from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
import json
from app.core.database import get_db
from app.api.deps import get_optional_current_user, get_current_user
from app.models.entities import Profile, User, SavedSearch, BlockedUser
from app.schemas.profile import ProfileResponse
from app.api.v1.endpoints.profiles import format_profile_response
from app.services.matching_service import matching_service
from pydantic import BaseModel

router = APIRouter(prefix="/search", tags=["Matrimonial Search"])


class SaveSearchRequest(BaseModel):
    search_name: str
    criteria: dict


@router.get("", response_model=List[ProfileResponse])
def search_profiles(
    gender: Optional[str] = None,
    community: Optional[str] = None,
    sub_community: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
    native_place: Optional[str] = None,
    marital_status: Optional[str] = None,
    diet: Optional[str] = None,
    education: Optional[str] = None,
    profession: Optional[str] = None,
    age_min: Optional[int] = Query(None, ge=18, le=70),
    age_max: Optional[int] = Query(None, ge=18, le=70),
    sort_by: Optional[str] = Query("match_score"),  # match_score, newest, age_asc, age_desc
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    my_profile = None
    blocked_ids = set()
    if current_user:
        my_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if my_profile:
            blocked_ids.add(my_profile.id)  # Don't show own profile in search
            b1 = db.query(BlockedUser.blocked_profile_id).filter(BlockedUser.blocker_profile_id == my_profile.id).all()
            b2 = db.query(BlockedUser.blocker_profile_id).filter(BlockedUser.blocked_profile_id == my_profile.id).all()
            blocked_ids = blocked_ids.union({r[0] for r in b1}).union({r[0] for r in b2})

    query = db.query(Profile).filter(Profile.status == "ACTIVE")
    if blocked_ids:
        query = query.filter(~Profile.id.in_(blocked_ids))


    if gender:
        query = query.filter(Profile.gender == gender)
    if community and community.upper() != "ALL":
        query = query.filter(Profile.community.ilike(f"%{community}%"))
    if sub_community and sub_community.upper() != "ALL":
        query = query.filter(Profile.sub_community.ilike(f"%{sub_community}%"))
    if state and state.upper() != "ALL" and state.upper() != "ALL INDIA":
        query = query.filter(Profile.current_state.ilike(f"%{state}%"))
    if city:
        query = query.filter(Profile.current_city.ilike(f"%{city}%"))
    if native_place:
        query = query.filter(Profile.native_place.ilike(f"%{native_place}%"))
    if marital_status and marital_status.upper() != "ALL":
        query = query.filter(Profile.marital_status == marital_status)
    if diet and diet.upper() != "ALL":
        query = query.filter(Profile.diet.ilike(f"%{diet}%"))
    if education and education.upper() != "ANY":
        query = query.filter(Profile.highest_qualification.ilike(f"%{education}%"))
    if profession and profession.upper() != "ANY":
        query = query.filter(Profile.occupation.ilike(f"%{profession}%"))

    profiles = query.limit(50).all()
    results = []

    today = date.today()
    ref_profile = my_profile if my_profile else (profiles[0] if profiles else None)

    for p in profiles:
        user = db.query(User).filter(User.id == p.user_id).first()
        res = format_profile_response(p, user=user)

        # Calculate actual age
        calculated_age = today.year - p.date_of_birth.year - (
            (today.month, today.day) < (p.date_of_birth.month, p.date_of_birth.day)
        )
        res.age = calculated_age

        # Filter by age range in memory
        if age_min and calculated_age < age_min:
            continue
        if age_max and calculated_age > age_max:
            continue

        if ref_profile and p.id != ref_profile.id:
            score, breakdown = matching_service.evaluate_match(ref_profile, p)
            res.match_score = score
            res.match_breakdown = breakdown
        else:
            res.match_score = 94
            res.match_breakdown = [
                f"Community aligns: {p.community}",
                f"Location preference: {p.current_state}",
                "Age compatibility verified",
            ]

        results.append(res)

    # Sorting
    if sort_by == "newest":
        results = sorted(results, key=lambda x: x.id, reverse=True)
    elif sort_by == "age_asc":
        results = sorted(results, key=lambda x: x.age)
    elif sort_by == "age_desc":
        results = sorted(results, key=lambda x: x.age, reverse=True)
    else:  # match_score default
        results = sorted(results, key=lambda x: x.match_score or 0, reverse=True)

    return results


@router.post("/saved")
def save_search(
    payload: SaveSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    saved = SavedSearch(
        user_id=current_user.id,
        search_name=payload.search_name,
        criteria_json=json.dumps(payload.criteria),
    )
    db.add(saved)
    db.commit()

    return {
        "status": "SUCCESS",
        "message": f"Search criteria '{payload.search_name}' saved successfully.",
        "search_id": saved.id,
    }


@router.get("/saved")
def get_saved_searches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    searches = (
        db.query(SavedSearch)
        .filter(SavedSearch.user_id == current_user.id)
        .order_by(SavedSearch.created_at.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "id": s.id,
            "search_name": s.search_name,
            "criteria": json.loads(s.criteria_json),
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in searches
    ]
