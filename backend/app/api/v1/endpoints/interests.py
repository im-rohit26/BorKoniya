from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Optional
from app.core.database import get_db
from app.api.deps import get_current_profile
from app.models.entities import (
    Profile,
    Interest,
    BlockedUser,
    Conversation,
    ConversationMember,
    User,
)
from app.schemas.interaction import (
    InterestCreate,
    InterestActionResponse,
    InterestItemResponse,
)
from app.api.v1.endpoints.profiles import format_profile_response

router = APIRouter(prefix="/interests", tags=["Express Interest"])


@router.post("", response_model=InterestActionResponse)
def send_interest(
    payload: InterestCreate,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    if current_profile.id == payload.receiver_profile_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot send an interest to your own profile.",
        )

    # Check recipient profile exists
    receiver = db.query(Profile).filter(Profile.id == payload.receiver_profile_id).first()
    if not receiver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient profile not found.",
        )

    # Opposite-gender restriction
    if current_profile.gender and receiver.gender and current_profile.gender.upper() == receiver.gender.upper():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only express interest in profiles of the opposite gender.",
        )

    # Check for blocking
    is_blocked = (
        db.query(BlockedUser)
        .filter(
            ((BlockedUser.blocker_profile_id == current_profile.id) & (BlockedUser.blocked_profile_id == receiver.id))
            | ((BlockedUser.blocker_profile_id == receiver.id) & (BlockedUser.blocked_profile_id == current_profile.id))
        )
        .first()
    )
    if is_blocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to send interest to this profile.",
        )

    # Check if receiver already sent an interest to current profile
    reverse = (
        db.query(Interest)
        .filter(
            Interest.sender_profile_id == receiver.id,
            Interest.receiver_profile_id == current_profile.id,
        )
        .first()
    )
    if reverse:
        if reverse.status == "ACCEPTED":
            return InterestActionResponse(
                id=reverse.id,
                sender_profile_id=reverse.sender_profile_id,
                receiver_profile_id=reverse.receiver_profile_id,
                status=reverse.status,
                sent_at=reverse.sent_at,
                responded_at=reverse.responded_at,
                message="You and this member have already connected!",
            )
        elif reverse.status == "SENT":
            # Auto accept the pending interest from the other user!
            reverse.status = "ACCEPTED"
            reverse.responded_at = datetime.now(timezone.utc)

            # Ensure conversation exists
            c1 = (
                db.query(ConversationMember.conversation_id)
                .filter(ConversationMember.profile_id == reverse.sender_profile_id)
                .subquery()
            )
            shared_conv = (
                db.query(Conversation)
                .join(ConversationMember)
                .filter(
                    ConversationMember.profile_id == reverse.receiver_profile_id,
                    Conversation.id.in_(c1),
                )
                .first()
            )
            if not shared_conv:
                new_conv = Conversation()
                db.add(new_conv)
                db.flush()
                db.add(ConversationMember(conversation_id=new_conv.id, profile_id=reverse.sender_profile_id))
                db.add(ConversationMember(conversation_id=new_conv.id, profile_id=reverse.receiver_profile_id))

            db.commit()
            db.refresh(reverse)
            return InterestActionResponse(
                id=reverse.id,
                sender_profile_id=reverse.sender_profile_id,
                receiver_profile_id=reverse.receiver_profile_id,
                status=reverse.status,
                sent_at=reverse.sent_at,
                responded_at=reverse.responded_at,
                message=f"Mutual match! Interest from {receiver.first_name} accepted. You can now chat!",
            )

    # Check existing interest from current profile to receiver
    existing = (
        db.query(Interest)
        .filter(
            Interest.sender_profile_id == current_profile.id,
            Interest.receiver_profile_id == receiver.id,
        )
        .first()
    )

    if existing:
        if existing.status == "SENT":
            return InterestActionResponse(
                id=existing.id,
                sender_profile_id=existing.sender_profile_id,
                receiver_profile_id=existing.receiver_profile_id,
                status=existing.status,
                sent_at=existing.sent_at,
                responded_at=existing.responded_at,
                message="Interest has already been sent to this member.",
            )
        elif existing.status == "ACCEPTED":
            return InterestActionResponse(
                id=existing.id,
                sender_profile_id=existing.sender_profile_id,
                receiver_profile_id=existing.receiver_profile_id,
                status=existing.status,
                sent_at=existing.sent_at,
                responded_at=existing.responded_at,
                message="You and this member have already connected!",
            )
        else:
            # Re-send if previously cancelled or declined
            existing.status = "SENT"
            existing.sent_at = datetime.now(timezone.utc)
            existing.responded_at = None
            db.commit()
            return InterestActionResponse(
                id=existing.id,
                sender_profile_id=existing.sender_profile_id,
                receiver_profile_id=existing.receiver_profile_id,
                status=existing.status,
                sent_at=existing.sent_at,
                responded_at=existing.responded_at,
                message="Interest resent successfully!",
            )

    new_interest = Interest(
        sender_profile_id=current_profile.id,
        receiver_profile_id=receiver.id,
        status="SENT",
        sent_at=datetime.now(timezone.utc),
    )
    db.add(new_interest)
    db.commit()
    db.refresh(new_interest)

    return InterestActionResponse(
        id=new_interest.id,
        sender_profile_id=new_interest.sender_profile_id,
        receiver_profile_id=new_interest.receiver_profile_id,
        status=new_interest.status,
        sent_at=new_interest.sent_at,
        responded_at=new_interest.responded_at,
        message=f"Express Interest sent to {receiver.first_name} successfully!",
    )


@router.get("/received", response_model=List[InterestItemResponse])
def get_received_interests(
    status_filter: Optional[str] = None,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Interest, Profile, User)
        .join(Profile, Profile.id == Interest.sender_profile_id)
        .join(User, User.id == Profile.user_id)
        .filter(Interest.receiver_profile_id == current_profile.id)
    )
    if status_filter:
        query = query.filter(Interest.status == status_filter.upper())
    
    rows = query.order_by(Interest.sent_at.desc()).all()
    results = []

    for item, sender, user in rows:
        formatted = format_profile_response(
            sender,
            user=user,
            is_premium=(item.status == "ACCEPTED"),
        )
        results.append(
            InterestItemResponse(
                id=item.id,
                sender_profile_id=item.sender_profile_id,
                receiver_profile_id=item.receiver_profile_id,
                status=item.status,
                sent_at=item.sent_at,
                responded_at=item.responded_at,
                profile=formatted,
            )
        )
    return results


@router.get("/sent", response_model=List[InterestItemResponse])
def get_sent_interests(
    status_filter: Optional[str] = None,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Interest, Profile, User)
        .join(Profile, Profile.id == Interest.receiver_profile_id)
        .join(User, User.id == Profile.user_id)
        .filter(Interest.sender_profile_id == current_profile.id)
    )
    if status_filter:
        query = query.filter(Interest.status == status_filter.upper())
    
    rows = query.order_by(Interest.sent_at.desc()).all()
    results = []

    for item, receiver, user in rows:
        formatted = format_profile_response(
            receiver,
            user=user,
            is_premium=(item.status == "ACCEPTED"),
        )
        results.append(
            InterestItemResponse(
                id=item.id,
                sender_profile_id=item.sender_profile_id,
                receiver_profile_id=item.receiver_profile_id,
                status=item.status,
                sent_at=item.sent_at,
                responded_at=item.responded_at,
                profile=formatted,
            )
        )
    return results


@router.get("/sent/ids", response_model=List[str])
def get_sent_interest_ids(
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Interest.receiver_profile_id)
        .filter(
            Interest.sender_profile_id == current_profile.id,
            Interest.status.in_(["SENT", "ACCEPTED"]),
        )
        .all()
    )
    return [r[0] for r in rows]


@router.post("/{interest_id}/accept", response_model=InterestActionResponse)
def accept_interest(
    interest_id: str,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    interest = db.query(Interest).filter(Interest.id == interest_id).first()
    if not interest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interest not found.")

    if interest.receiver_profile_id != current_profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only accept interests directed to your profile.",
        )

    interest.status = "ACCEPTED"
    interest.responded_at = datetime.now(timezone.utc)

    # Check if conversation already exists between the two members
    c1 = (
        db.query(ConversationMember.conversation_id)
        .filter(ConversationMember.profile_id == interest.sender_profile_id)
        .subquery()
    )
    shared_conv = (
        db.query(Conversation)
        .join(ConversationMember)
        .filter(
            ConversationMember.profile_id == interest.receiver_profile_id,
            Conversation.id.in_(c1),
        )
        .first()
    )

    if not shared_conv:
        new_conv = Conversation()
        db.add(new_conv)
        db.flush()

        db.add(ConversationMember(conversation_id=new_conv.id, profile_id=interest.sender_profile_id))
        db.add(ConversationMember(conversation_id=new_conv.id, profile_id=interest.receiver_profile_id))

    db.commit()
    db.refresh(interest)

    return InterestActionResponse(
        id=interest.id,
        sender_profile_id=interest.sender_profile_id,
        receiver_profile_id=interest.receiver_profile_id,
        status=interest.status,
        sent_at=interest.sent_at,
        responded_at=interest.responded_at,
        message="Interest accepted! You can now chat and connect with this member.",
    )


@router.post("/{interest_id}/decline", response_model=InterestActionResponse)
def decline_interest(
    interest_id: str,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    interest = db.query(Interest).filter(Interest.id == interest_id).first()
    if not interest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interest not found.")

    if interest.receiver_profile_id != current_profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only decline interests directed to your profile.",
        )

    interest.status = "DECLINED"
    interest.responded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(interest)

    return InterestActionResponse(
        id=interest.id,
        sender_profile_id=interest.sender_profile_id,
        receiver_profile_id=interest.receiver_profile_id,
        status=interest.status,
        sent_at=interest.sent_at,
        responded_at=interest.responded_at,
        message="Interest declined respectfully.",
    )


@router.post("/{interest_id}/cancel", response_model=InterestActionResponse)
def cancel_interest(
    interest_id: str,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    interest = db.query(Interest).filter(Interest.id == interest_id).first()
    if not interest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interest not found.")

    if interest.sender_profile_id != current_profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only cancel interests that you initiated.",
        )

    interest.status = "CANCELLED"
    db.commit()
    db.refresh(interest)

    return InterestActionResponse(
        id=interest.id,
        sender_profile_id=interest.sender_profile_id,
        receiver_profile_id=interest.receiver_profile_id,
        status=interest.status,
        sent_at=interest.sent_at,
        responded_at=interest.responded_at,
        message="Interest cancelled successfully.",
    )


@router.get("/summary")
def get_interests_summary(
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    received_pending = (
        db.query(Interest)
        .filter(Interest.receiver_profile_id == current_profile.id, Interest.status == "SENT")
        .count()
    )
    received_accepted = (
        db.query(Interest)
        .filter(Interest.receiver_profile_id == current_profile.id, Interest.status == "ACCEPTED")
        .count()
    )
    sent_pending = (
        db.query(Interest)
        .filter(Interest.sender_profile_id == current_profile.id, Interest.status == "SENT")
        .count()
    )
    sent_accepted = (
        db.query(Interest)
        .filter(Interest.sender_profile_id == current_profile.id, Interest.status == "ACCEPTED")
        .count()
    )

    return {
        "received_pending": received_pending,
        "received_accepted": received_accepted,
        "sent_pending": sent_pending,
        "sent_accepted": sent_accepted,
        "total_active_connections": received_accepted + sent_accepted,
    }
