from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Optional
from app.core.database import get_db
from app.api.deps import get_current_profile, get_current_user
from app.models.entities import (
    Profile,
    User,
    Conversation,
    ConversationMember,
    Message,
    BlockedUser,
    Interest,
    Subscription,
)
from app.schemas.interaction import (
    ConversationSummaryResponse,
    ConversationMemberInfo,
    MessageItemResponse,
    MessageSendRequest,
    StartConversationRequest,
)

router = APIRouter(prefix="/conversations", tags=["In-App Messaging & Chat"])


def check_chat_entitlement(
    user_id: str,
    my_profile_id: str,
    other_profile_id: str,
    db: Session,
) -> bool:
    """
    Returns True if:
    1. The user has an active premium subscription, OR
    2. There is a mutual accepted interest between the two profiles.
    """
    # 1. Active subscription
    active_sub = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == user_id,
            Subscription.status == "ACTIVE",
            Subscription.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if active_sub:
        return True

    # 2. Mutual accepted interest
    mutual_interest = (
        db.query(Interest)
        .filter(
            Interest.status == "ACCEPTED",
            (
                (Interest.sender_profile_id == my_profile_id)
                & (Interest.receiver_profile_id == other_profile_id)
            )
            | (
                (Interest.sender_profile_id == other_profile_id)
                & (Interest.receiver_profile_id == my_profile_id)
            ),
        )
        .first()
    )
    if mutual_interest:
        return True

    return False


@router.get("", response_model=List[ConversationSummaryResponse])
def get_conversations(
    current_profile: Profile = Depends(get_current_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Find all conversations the current profile belongs to
    memberships = (
        db.query(ConversationMember)
        .filter(ConversationMember.profile_id == current_profile.id)
        .all()
    )

    conv_ids = [m.conversation_id for m in memberships]
    if not conv_ids:
        return []

    conversations = (
        db.query(Conversation)
        .filter(Conversation.id.in_(conv_ids))
        .order_by(Conversation.updated_at.desc())
        .all()
    )

    results = []
    for conv in conversations:
        # Find the other member
        other_member = (
            db.query(ConversationMember)
            .filter(
                ConversationMember.conversation_id == conv.id,
                ConversationMember.profile_id != current_profile.id,
            )
            .first()
        )
        if not other_member:
            continue

        other_profile = (
            db.query(Profile).filter(Profile.id == other_member.profile_id).first()
        )
        if not other_profile:
            continue

        # Get last message
        last_msg = (
            db.query(Message)
            .filter(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .first()
        )

        # Unread count
        unread = (
            db.query(Message)
            .filter(
                Message.conversation_id == conv.id,
                Message.sender_profile_id != current_profile.id,
                Message.is_read == False,
            )
            .count()
        )

        can_chat = check_chat_entitlement(
            current_user.id, current_profile.id, other_profile.id, db
        )

        results.append(
            ConversationSummaryResponse(
                id=conv.id,
                other_profile=ConversationMemberInfo(
                    profile_id=other_profile.id,
                    first_name=other_profile.first_name,
                    last_name=f"{other_profile.last_name[0]}.",
                    photo_url=None,
                    community=other_profile.community,
                    current_city=other_profile.current_city,
                    current_state=other_profile.current_state,
                    occupation=other_profile.occupation,
                    is_online=True,
                ),
                last_message=last_msg.content if last_msg else None,
                last_message_time=last_msg.created_at if last_msg else conv.updated_at,
                unread_count=unread,
                can_chat=can_chat,
                created_at=conv.created_at,
            )
        )

    return results


@router.post("/start")
def start_or_get_conversation(
    payload: StartConversationRequest,
    current_profile: Profile = Depends(get_current_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_profile.id == payload.target_profile_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot start a conversation with yourself.",
        )

    target_profile = db.query(Profile).filter(Profile.id == payload.target_profile_id).first()
    if not target_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target profile not found.",
        )

    # Check block
    is_blocked = (
        db.query(BlockedUser)
        .filter(
            ((BlockedUser.blocker_profile_id == current_profile.id) & (BlockedUser.blocked_profile_id == target_profile.id))
            | ((BlockedUser.blocker_profile_id == target_profile.id) & (BlockedUser.blocked_profile_id == current_profile.id))
        )
        .first()
    )
    if is_blocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot start conversation with this profile.",
        )

    # Entitlement check
    can_chat = check_chat_entitlement(
        current_user.id, current_profile.id, target_profile.id, db
    )
    if not can_chat:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chat is unlocked once mutual interest is accepted. Upgrade to BorKonya Premium for direct instant messaging.",
        )

    # Find existing conversation
    my_convs = (
        db.query(ConversationMember.conversation_id)
        .filter(ConversationMember.profile_id == current_profile.id)
        .subquery()
    )
    shared_conv = (
        db.query(Conversation)
        .join(ConversationMember)
        .filter(
            ConversationMember.profile_id == target_profile.id,
            Conversation.id.in_(my_convs),
        )
        .first()
    )

    if shared_conv:
        conv_id = shared_conv.id
    else:
        # Create new conversation
        new_conv = Conversation()
        db.add(new_conv)
        db.flush()

        db.add(ConversationMember(conversation_id=new_conv.id, profile_id=current_profile.id))
        db.add(ConversationMember(conversation_id=new_conv.id, profile_id=target_profile.id))
        conv_id = new_conv.id

    if payload.initial_message:
        msg = Message(
            conversation_id=conv_id,
            sender_profile_id=current_profile.id,
            content=payload.initial_message.strip(),
            created_at=datetime.now(timezone.utc),
        )
        db.add(msg)
        if shared_conv:
            shared_conv.updated_at = datetime.now(timezone.utc)

    db.commit()

    return {
        "status": "SUCCESS",
        "conversation_id": conv_id,
        "other_profile_id": target_profile.id,
        "other_name": target_profile.first_name,
    }


@router.get("/{conversation_id}/messages", response_model=List[MessageItemResponse])
def get_messages(
    conversation_id: str,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    # Verify membership
    is_member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.profile_id == current_profile.id,
        )
        .first()
    )
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this conversation.",
        )

    # Mark incoming unread messages as read
    incoming_unread = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation_id,
            Message.sender_profile_id != current_profile.id,
            Message.is_read == False,
        )
        .all()
    )
    now = datetime.now(timezone.utc)
    for m in incoming_unread:
        m.is_read = True
        m.read_at = now
    if incoming_unread:
        db.commit()

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    results = []
    for msg in messages:
        sender_prof = db.query(Profile).filter(Profile.id == msg.sender_profile_id).first()
        results.append(
            MessageItemResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                sender_profile_id=msg.sender_profile_id,
                sender_name=sender_prof.first_name if sender_prof else "Member",
                content=msg.content,
                is_mine=(msg.sender_profile_id == current_profile.id),
                is_read=msg.is_read,
                created_at=msg.created_at,
            )
        )

    return results


@router.post("/{conversation_id}/messages", response_model=MessageItemResponse)
def send_message(
    conversation_id: str,
    payload: MessageSendRequest,
    current_profile: Profile = Depends(get_current_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be blank.",
        )

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    # Verify membership
    is_member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.profile_id == current_profile.id,
        )
        .first()
    )
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to send messages in this conversation.",
        )

    # Find the recipient
    other_member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.profile_id != current_profile.id,
        )
        .first()
    )
    if other_member:
        # Check blocking
        is_blocked = (
            db.query(BlockedUser)
            .filter(
                ((BlockedUser.blocker_profile_id == current_profile.id) & (BlockedUser.blocked_profile_id == other_member.profile_id))
                | ((BlockedUser.blocker_profile_id == other_member.profile_id) & (BlockedUser.blocked_profile_id == current_profile.id))
            )
            .first()
        )
        if is_blocked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Communication is blocked between these profiles.",
            )

        # Entitlement check
        can_chat = check_chat_entitlement(
            current_user.id, current_profile.id, other_member.profile_id, db
        )
        if not can_chat:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Messaging requires an active BorKonya Premium plan or mutual interest acceptance.",
            )

    new_msg = Message(
        conversation_id=conversation_id,
        sender_profile_id=current_profile.id,
        content=payload.content.strip(),
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_msg)
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(new_msg)

    return MessageItemResponse(
        id=new_msg.id,
        conversation_id=new_msg.conversation_id,
        sender_profile_id=new_msg.sender_profile_id,
        sender_name=current_profile.first_name,
        content=new_msg.content,
        is_mine=True,
        is_read=new_msg.is_read,
        created_at=new_msg.created_at,
    )


@router.post("/{conversation_id}/read")
def mark_conversation_read(
    conversation_id: str,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    is_member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.profile_id == current_profile.id,
        )
        .first()
    )
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this conversation.",
        )
    unread = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation_id,
            Message.sender_profile_id != current_profile.id,
            Message.is_read == False,
        )
        .all()
    )
    now = datetime.now(timezone.utc)
    for m in unread:
        m.is_read = True
        m.read_at = now
    db.commit()
    return {"status": "SUCCESS", "marked_read": len(unread)}


@router.delete("/{conversation_id}/messages/{message_id}")
def delete_message(
    conversation_id: str,
    message_id: str,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    is_member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.profile_id == current_profile.id,
        )
        .first()
    )
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this conversation.",
        )
    msg = db.query(Message).filter(Message.id == message_id, Message.conversation_id == conversation_id).first()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found.")
    if msg.sender_profile_id != current_profile.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own messages.")
    db.delete(msg)
    db.commit()
    return {"status": "SUCCESS", "message": "Message deleted."}

