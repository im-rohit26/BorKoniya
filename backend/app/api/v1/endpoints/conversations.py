from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
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
    ForwardMessagesRequest,
    BatchDeleteMessagesRequest,
    ReplySnippetResponse,
    DeleteMessageRequest,
)
from app.models.entities import ProfilePhoto

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
    from sqlalchemy import func, and_, or_, case

    # Filter out conversations that this member marked as hidden ("Delete chat for me")
    my_member_records = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.profile_id == current_profile.id,
            ConversationMember.is_hidden == False
        )
        .all()
    )
    my_conv_ids = [m.conversation_id for m in my_member_records]
    cleared_at_map = {m.conversation_id: m.cleared_at for m in my_member_records}

    if not my_conv_ids:
        return []

    # Unread messages count for current user
    # (Exclude deleted messages and messages before cleared_at)
    unread_subq = (
        db.query(
            Message.conversation_id,
            func.count(Message.id).label("unread_count")
        )
        .filter(
            Message.conversation_id.in_(my_conv_ids),
            Message.sender_profile_id != current_profile.id,
            Message.is_read == False,
            Message.is_deleted_for_receiver == False,
            Message.deleted_for_everyone == False,
        )
        .group_by(Message.conversation_id)
        .subquery()
    )

    # Last message query per conversation visible to current user
    # Message visible to current user if:
    # not deleted_for_everyone AND
    # if sender == current_profile -> not is_deleted_for_sender
    # if sender != current_profile -> not is_deleted_for_receiver
    visible_filter = or_(
        Message.deleted_for_everyone == True,
        and_(
            Message.sender_profile_id == current_profile.id,
            Message.is_deleted_for_sender == False
        ),
        and_(
            Message.sender_profile_id != current_profile.id,
            Message.is_deleted_for_receiver == False
        )
    )

    last_msg_time_subq = (
        db.query(
            Message.conversation_id,
            func.max(Message.created_at).label("max_time")
        )
        .filter(
            Message.conversation_id.in_(my_conv_ids),
            visible_filter
        )
        .group_by(Message.conversation_id)
        .subquery()
    )

    last_msg_subq = (
        db.query(
            Message.conversation_id,
            case(
                (Message.deleted_for_everyone == True, "This message was deleted"),
                else_=Message.content
            ).label("content"),
            Message.created_at
        )
        .join(
            last_msg_time_subq,
            and_(
                Message.conversation_id == last_msg_time_subq.c.conversation_id,
                Message.created_at == last_msg_time_subq.c.max_time
            )
        )
        .subquery()
    )

    rows = (
        db.query(
            Conversation,
            Profile,
            last_msg_subq.c.content,
            last_msg_subq.c.created_at,
            func.coalesce(unread_subq.c.unread_count, 0).label("unread")
        )
        .join(ConversationMember, ConversationMember.conversation_id == Conversation.id)
        .join(Profile, Profile.id == ConversationMember.profile_id)
        .outerjoin(last_msg_subq, last_msg_subq.c.conversation_id == Conversation.id)
        .outerjoin(unread_subq, unread_subq.c.conversation_id == Conversation.id)
        .filter(
            Conversation.id.in_(my_conv_ids),
            ConversationMember.profile_id != current_profile.id
        )
        .order_by(Conversation.updated_at.desc())
        .all()
    )

    active_sub = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == current_user.id,
            Subscription.status == "ACTIVE",
            Subscription.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    is_premium = bool(active_sub)

    accepted_interests = (
        db.query(Interest)
        .filter(
            Interest.status == "ACCEPTED",
            or_(
                Interest.sender_profile_id == current_profile.id,
                Interest.receiver_profile_id == current_profile.id
            )
        )
        .all()
    )
    mutual_ids = {
        inc.receiver_profile_id if inc.sender_profile_id == current_profile.id else inc.sender_profile_id
        for inc in accepted_interests
    }

    results = []
    for conv, other_profile, last_msg_content, last_msg_time, unread in rows:
        can_chat = is_premium or (other_profile.id in mutual_ids)
        last_name_display = other_profile.last_name if can_chat else f"{other_profile.last_name[0]}."

        # Fetch other_profile primary photo if exists
        other_photo = db.query(ProfilePhoto).filter(ProfilePhoto.profile_id == other_profile.id, ProfilePhoto.is_primary == True).first()
        if not other_photo:
            other_photo = db.query(ProfilePhoto).filter(ProfilePhoto.profile_id == other_profile.id).first()
        other_photo_url = other_photo.storage_path if other_photo else None

        results.append(
            ConversationSummaryResponse(
                id=conv.id,
                other_profile=ConversationMemberInfo(
                    profile_id=other_profile.id,
                    first_name=other_profile.first_name,
                    last_name=last_name_display,
                    gender=other_profile.gender,
                    photo_url=other_photo_url,
                    community=other_profile.community,
                    current_city=other_profile.current_city,
                    current_state=other_profile.current_state,
                    occupation=other_profile.occupation,
                    is_online=False,
                ),
                last_message=last_msg_content,
                last_message_time=last_msg_time if last_msg_time else conv.updated_at,
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
    from sqlalchemy import and_, or_

    # Verify membership
    my_member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.profile_id == current_profile.id,
        )
        .first()
    )
    if not my_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this conversation.",
        )

    # Unhide conversation if it was hidden
    if my_member.is_hidden:
        my_member.is_hidden = False
        db.commit()

    # Mark incoming unread messages as read
    incoming_unread = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation_id,
            Message.sender_profile_id != current_profile.id,
            Message.is_read == False,
            Message.is_deleted_for_receiver == False,
            Message.deleted_for_everyone == False,
        )
        .all()
    )
    now = datetime.now(timezone.utc)
    for m in incoming_unread:
        m.is_read = True
        m.read_at = now
    if incoming_unread:
        db.commit()

    query = db.query(Message).filter(Message.conversation_id == conversation_id)

    # If chat was cleared previously by this user, only show messages created after cleared_at
    if my_member.cleared_at:
        query = query.filter(Message.created_at >= my_member.cleared_at)

    # Visibility filter for current_profile:
    # 1. If deleted_for_everyone is True, still show as deleted placeholder ("This message was deleted")
    # 2. If sender is current_profile, must NOT have is_deleted_for_sender == True
    # 3. If receiver is current_profile, must NOT have is_deleted_for_receiver == True
    visibility_filter = or_(
        Message.deleted_for_everyone == True,
        and_(
            Message.sender_profile_id == current_profile.id,
            Message.is_deleted_for_sender == False,
        ),
        and_(
            Message.sender_profile_id != current_profile.id,
            Message.is_deleted_for_receiver == False,
        )
    )
    messages = query.filter(visibility_filter).order_by(Message.created_at.asc()).all()

    results = []
    sender_cache: dict = {}

    for msg in messages:
        if msg.sender_profile_id not in sender_cache:
            sender_cache[msg.sender_profile_id] = db.query(Profile).filter(Profile.id == msg.sender_profile_id).first()
        sender_prof = sender_cache[msg.sender_profile_id]

        reply_info = None
        if msg.reply_to_message_id and msg.reply_to:
            rep_sender = db.query(Profile).filter(Profile.id == msg.reply_to.sender_profile_id).first()
            rep_content = "This message was deleted" if msg.reply_to.deleted_for_everyone else msg.reply_to.content
            reply_info = ReplySnippetResponse(
                id=msg.reply_to.id,
                sender_name=rep_sender.first_name if rep_sender else "Member",
                content=rep_content,
                message_type=msg.reply_to.message_type or "text",
                media_url=None if msg.reply_to.deleted_for_everyone else msg.reply_to.media_url,
            )

        is_mine = (msg.sender_profile_id == current_profile.id)
        # 24-hour limit check for delete for everyone
        msg_created = msg.created_at
        if msg_created.tzinfo is None:
            msg_created = msg_created.replace(tzinfo=timezone.utc)
        age_in_hours = (now - msg_created).total_seconds() / 3600.0
        can_del_everyone = is_mine and (not msg.deleted_for_everyone) and (age_in_hours <= 24.0)

        displayed_content = "This message was deleted" if msg.deleted_for_everyone else msg.content

        results.append(
            MessageItemResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                sender_profile_id=msg.sender_profile_id,
                sender_name=sender_prof.first_name if sender_prof else "Member",
                sender_gender=sender_prof.gender if sender_prof else None,
                content=displayed_content,
                is_mine=is_mine,
                is_read=msg.is_read,
                created_at=msg.created_at,
                reply_to_message_id=msg.reply_to_message_id,
                reply_to=reply_info,
                is_forwarded=bool(msg.is_forwarded),
                forwarded_from_message_id=msg.forwarded_from_message_id,
                message_type=msg.message_type or "text",
                media_url=None if msg.deleted_for_everyone else msg.media_url,
                deleted_for_everyone=bool(msg.deleted_for_everyone),
                deleted_at=msg.deleted_at,
                can_delete_for_everyone=can_del_everyone,
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

    # Validate reply target if given
    reply_target = None
    if payload.reply_to_message_id:
        reply_target = db.query(Message).filter(
            Message.id == payload.reply_to_message_id,
            Message.conversation_id == conversation_id
        ).first()

    new_msg = Message(
        conversation_id=conversation_id,
        sender_profile_id=current_profile.id,
        content=payload.content.strip(),
        reply_to_message_id=reply_target.id if reply_target else None,
        media_url=payload.media_url,
        message_type=payload.message_type or "text",
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_msg)
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(new_msg)

    reply_info = None
    if reply_target:
        rep_sender = db.query(Profile).filter(Profile.id == reply_target.sender_profile_id).first()
        reply_info = ReplySnippetResponse(
            id=reply_target.id,
            sender_name=rep_sender.first_name if rep_sender else "Member",
            content=reply_target.content,
            message_type=reply_target.message_type or "text",
            media_url=reply_target.media_url,
        )

    return MessageItemResponse(
        id=new_msg.id,
        conversation_id=new_msg.conversation_id,
        sender_profile_id=new_msg.sender_profile_id,
        sender_name=current_profile.first_name,
        sender_gender=current_profile.gender,
        content=new_msg.content,
        is_mine=True,
        is_read=new_msg.is_read,
        created_at=new_msg.created_at,
        reply_to_message_id=new_msg.reply_to_message_id,
        reply_to=reply_info,
        is_forwarded=new_msg.is_forwarded,
        message_type=new_msg.message_type,
        media_url=new_msg.media_url,
    )


@router.post("/forward")
def forward_messages(
    payload: ForwardMessagesRequest,
    current_profile: Profile = Depends(get_current_profile),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.message_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No messages selected to forward.")

    # Fetch original messages that current_profile is allowed to see
    original_messages = (
        db.query(Message)
        .join(ConversationMember, ConversationMember.conversation_id == Message.conversation_id)
        .filter(
            Message.id.in_(payload.message_ids),
            ConversationMember.profile_id == current_profile.id,
        )
        .order_by(Message.created_at.asc())
        .all()
    )

    if not original_messages:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected messages not found or inaccessible.")

    # Determine target conversations
    target_conv_ids = set(payload.target_conversation_ids or [])

    # If target profile IDs are passed, start/find conversation for each
    if payload.target_profile_ids:
        for target_pid in payload.target_profile_ids:
            if target_pid == current_profile.id:
                continue
            # Check existing conv
            my_convs_sub = (
                db.query(ConversationMember.conversation_id)
                .filter(ConversationMember.profile_id == current_profile.id)
                .subquery()
            )
            shared = (
                db.query(Conversation)
                .join(ConversationMember)
                .filter(
                    ConversationMember.profile_id == target_pid,
                    Conversation.id.in_(my_convs_sub),
                )
                .first()
            )
            if shared:
                target_conv_ids.add(shared.id)
            else:
                # Check block & entitlement
                can_chat = check_chat_entitlement(current_user.id, current_profile.id, target_pid, db)
                if can_chat:
                    new_conv = Conversation()
                    db.add(new_conv)
                    db.flush()
                    db.add(ConversationMember(conversation_id=new_conv.id, profile_id=current_profile.id))
                    db.add(ConversationMember(conversation_id=new_conv.id, profile_id=target_pid))
                    target_conv_ids.add(new_conv.id)

    if not target_conv_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid target conversations for forwarding.")

    forwarded_count = 0
    now = datetime.now(timezone.utc)

    for target_cid in target_conv_ids:
        # Check membership
        is_mem = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == target_cid,
            ConversationMember.profile_id == current_profile.id
        ).first()
        if not is_mem:
            continue

        conv_entity = db.query(Conversation).filter(Conversation.id == target_cid).first()
        if not conv_entity:
            continue

        for orig in original_messages:
            fwd_msg = Message(
                conversation_id=target_cid,
                sender_profile_id=current_profile.id,
                content=orig.content,
                is_forwarded=True,
                forwarded_from_message_id=orig.id,
                message_type=orig.message_type or "text",
                media_url=orig.media_url,
                created_at=now,
            )
            db.add(fwd_msg)
            forwarded_count += 1

        conv_entity.updated_at = now

    db.commit()

    return {
        "status": "SUCCESS",
        "message": f"Successfully forwarded {len(original_messages)} message(s) to {len(target_conv_ids)} conversation(s).",
        "forwarded_count": forwarded_count,
    }


@router.post("/batch-delete")
def batch_delete_messages(
    payload: BatchDeleteMessagesRequest,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    if not payload.message_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No messages selected for deletion.")

    messages = (
        db.query(Message)
        .join(ConversationMember, ConversationMember.conversation_id == Message.conversation_id)
        .filter(
            Message.id.in_(payload.message_ids),
            ConversationMember.profile_id == current_profile.id,
        )
        .all()
    )

    deleted_count = 0
    for m in messages:
        if m.sender_profile_id == current_profile.id:
            m.is_deleted_for_sender = True
            deleted_count += 1
        else:
            m.is_deleted_for_receiver = True
            deleted_count += 1

    db.commit()

    return {
        "status": "SUCCESS",
        "deleted_count": deleted_count,
        "message": f"Deleted {deleted_count} message(s) for you.",
    }


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
    delete_type: str = "for_me",  # query param: "for_me" or "for_everyone"
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

    now = datetime.now(timezone.utc)

    if delete_type == "for_everyone":
        # Security validation: Only sender can delete for everyone
        if msg.sender_profile_id != current_profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own messages for everyone."
            )

        # Security validation: Strict 24-hour limit
        msg_created = msg.created_at
        if msg_created.tzinfo is None:
            msg_created = msg_created.replace(tzinfo=timezone.utc)
        time_elapsed = now - msg_created
        if time_elapsed.total_seconds() > 24 * 3600:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Messages can only be deleted for everyone within 24 hours of sending."
            )

        msg.deleted_for_everyone = True
        msg.deleted_at = now
        db.commit()
        return {
            "status": "SUCCESS",
            "message": "Message deleted for everyone.",
            "message_id": message_id,
            "deleted_for_everyone": True,
        }

    else:
        # Delete for me
        if msg.sender_profile_id == current_profile.id:
            msg.is_deleted_for_sender = True
        else:
            msg.is_deleted_for_receiver = True
        db.commit()
        return {
            "status": "SUCCESS",
            "message": "Message deleted for you.",
            "message_id": message_id,
            "deleted_for_everyone": False,
        }


@router.delete("/{conversation_id}")
def delete_conversation_for_me(
    conversation_id: str,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """
    Hides the conversation from the current user's chat list ("Delete chat for me")
    without removing it for the other user.
    """
    member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.profile_id == current_profile.id,
        )
        .first()
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or you are not a member.",
        )

    member.is_hidden = True
    member.cleared_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "SUCCESS", "message": "Conversation removed from your chat list."}


@router.post("/{conversation_id}/clear")
def clear_conversation(
    conversation_id: str,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """
    Clears all messages in the conversation for the current user ("Clear chat")
    without affecting the other user.
    """
    member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.profile_id == current_profile.id,
        )
        .first()
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or you are not a member.",
        )

    member.cleared_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "SUCCESS", "message": "Chat cleared successfully."}


