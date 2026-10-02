from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_profile
from app.models.entities import Profile, BlockedUser, ReportedProfile, User
from app.schemas.interaction import (
    BlockProfileRequest,
    BlockedProfileResponse,
    ReportProfileRequest,
    ReportProfileResponse,
)
from app.api.v1.endpoints.profiles import format_profile_response

router = APIRouter(prefix="/safety", tags=["Safety, Trust & Moderation"])


@router.post("/block")
def block_profile(
    payload: BlockProfileRequest,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    if current_profile.id == payload.blocked_profile_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot block your own profile.",
        )

    target = db.query(Profile).filter(Profile.id == payload.blocked_profile_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found.",
        )

    existing = (
        db.query(BlockedUser)
        .filter(
            BlockedUser.blocker_profile_id == current_profile.id,
            BlockedUser.blocked_profile_id == target.id,
        )
        .first()
    )

    if existing:
        return {
            "status": "ALREADY_BLOCKED",
            "message": f"Profile {target.first_name} is already blocked.",
        }

    blocked = BlockedUser(
        blocker_profile_id=current_profile.id,
        blocked_profile_id=target.id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(blocked)
    db.commit()

    return {
        "status": "SUCCESS",
        "message": f"{target.first_name} has been blocked. They will not be able to contact you or view your profile.",
    }


@router.delete("/block/{profile_id}")
def unblock_profile(
    profile_id: str,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    record = (
        db.query(BlockedUser)
        .filter(
            BlockedUser.blocker_profile_id == current_profile.id,
            BlockedUser.blocked_profile_id == profile_id,
        )
        .first()
    )
    if not record:
        return {
            "status": "NOT_FOUND",
            "message": "This profile was not found in your blocked list.",
        }

    db.delete(record)
    db.commit()

    return {
        "status": "SUCCESS",
        "message": "Profile has been unblocked.",
    }


@router.get("/blocked", response_model=List[BlockedProfileResponse])
def get_blocked_profiles(
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    blocked_records = (
        db.query(BlockedUser)
        .filter(BlockedUser.blocker_profile_id == current_profile.id)
        .all()
    )

    if not blocked_records:
        return []
        
    blocked_ids = [rec.blocked_profile_id for rec in blocked_records]
    
    profiles_users = (
        db.query(Profile, User)
        .join(User, User.id == Profile.user_id)
        .filter(Profile.id.in_(blocked_ids))
        .all()
    )
    
    pu_map = {p.id: (p, u) for p, u in profiles_users}

    results = []
    for rec in blocked_records:
        if rec.blocked_profile_id not in pu_map:
            continue
        target, user = pu_map[rec.blocked_profile_id]
        formatted = format_profile_response(target, user=user)
        results.append(
            BlockedProfileResponse(
                blocked_profile_id=rec.blocked_profile_id,
                blocked_profile=formatted,
                created_at=rec.created_at,
            )
        )
    return results


@router.post("/report", response_model=ReportProfileResponse)
def report_profile(
    payload: ReportProfileRequest,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    if current_profile.id == payload.reported_profile_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot report your own profile.",
        )

    target = db.query(Profile).filter(Profile.id == payload.reported_profile_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reported profile not found.",
        )

    report = ReportedProfile(
        reporter_profile_id=current_profile.id,
        reported_profile_id=target.id,
        reason=payload.reason,
        description=payload.description,
        status="PENDING",
        created_at=datetime.now(timezone.utc),
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return ReportProfileResponse(
        id=report.id,
        reported_profile_id=report.reported_profile_id,
        reason=report.reason,
        status=report.status,
        created_at=report.created_at,
        message="Thank you for alerting our safety trust team. We will review this profile within 24 hours.",
    )
