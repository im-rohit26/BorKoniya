import base64
import hashlib
import hmac
import time
from datetime import datetime, timezone
from typing import Optional, Tuple, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.core.config import settings
from app.models.entities import (
    User,
    Profile,
    ProfilePhoto,
    BlockedUser,
    Interest,
    Subscription,
    Conversation,
    ConversationMember,
    Message,
)
from app.models.call import Call
from app.schemas.call import WebRTCConfigResponse, ICEServerItem


ACTIVE_CALL_STATUSES = ("INITIATED", "RINGING", "ACCEPTED", "CONNECTED")


def format_call_duration_label(duration_seconds: int) -> str:
    if duration_seconds <= 0:
        return "0 sec"
    mins = duration_seconds // 60
    secs = duration_seconds % 60
    if mins > 0 and secs > 0:
        return f"{mins} min {secs:02d} sec"
    if mins > 0:
        return f"{mins} min"
    return f"{secs} sec"


class CallService:
    @staticmethod
    def resolve_profile(db: Session, identifier: str) -> Optional[Profile]:
        """
        Resolves a BorKonya member by profile.id or user.id.
        Never resolves by phone number.
        """
        if not identifier:
            return None
        profile = db.query(Profile).filter(Profile.id == identifier).first()
        if profile:
            return profile
        return db.query(Profile).filter(Profile.user_id == identifier).first()

    @staticmethod
    def get_primary_photo_url(db: Session, profile_id: str) -> Optional[str]:
        photo = (
            db.query(ProfilePhoto)
            .filter(ProfilePhoto.profile_id == profile_id, ProfilePhoto.is_primary == True)
            .first()
        )
        if not photo:
            photo = db.query(ProfilePhoto).filter(ProfilePhoto.profile_id == profile_id).first()
        return photo.storage_path if photo else None

    @staticmethod
    def is_blocked(db: Session, profile_a_id: str, profile_b_id: str) -> bool:
        blocked = (
            db.query(BlockedUser)
            .filter(
                or_(
                    and_(
                        BlockedUser.blocker_profile_id == profile_a_id,
                        BlockedUser.blocked_profile_id == profile_b_id,
                    ),
                    and_(
                        BlockedUser.blocker_profile_id == profile_b_id,
                        BlockedUser.blocked_profile_id == profile_a_id,
                    ),
                )
            )
            .first()
        )
        return blocked is not None

    @staticmethod
    def find_shared_conversation(
        db: Session, profile_a_id: str, profile_b_id: str
    ) -> Optional[Conversation]:
        from sqlalchemy import select

        my_convs = select(ConversationMember.conversation_id).where(
            ConversationMember.profile_id == profile_a_id
        )
        return (
            db.query(Conversation)
            .join(ConversationMember)
            .filter(
                ConversationMember.profile_id == profile_b_id,
                Conversation.id.in_(my_convs),
            )
            .first()
        )

    @staticmethod
    def ensure_conversation(
        db: Session, profile_a_id: str, profile_b_id: str, preferred_conv_id: Optional[str] = None
    ) -> Conversation:
        if preferred_conv_id:
            conv = db.query(Conversation).filter(Conversation.id == preferred_conv_id).first()
            if conv:
                members = {
                    m.profile_id
                    for m in db.query(ConversationMember)
                    .filter(ConversationMember.conversation_id == conv.id)
                    .all()
                }
                if profile_a_id in members and profile_b_id in members:
                    return conv

        shared = CallService.find_shared_conversation(db, profile_a_id, profile_b_id)
        if shared:
            return shared

        new_conv = Conversation()
        db.add(new_conv)
        db.flush()
        db.add(ConversationMember(conversation_id=new_conv.id, profile_id=profile_a_id))
        db.add(ConversationMember(conversation_id=new_conv.id, profile_id=profile_b_id))
        db.flush()
        return new_conv

    @staticmethod
    def check_calling_permission(
        db: Session,
        caller_user_id: str,
        caller_profile_id: str,
        receiver_profile_id: str,
    ) -> bool:
        """
        Verifies if caller is allowed to contact receiver:
        1. Active Premium subscription (caller or receiver), OR
        2. Mutual ACCEPTED interest, OR
        3. Existing shared conversation between the two members.
        """
        now = datetime.now(timezone.utc)
        active_sub = (
            db.query(Subscription)
            .filter(
                Subscription.user_id == caller_user_id,
                Subscription.status == "ACTIVE",
                Subscription.expires_at > now,
            )
            .first()
        )
        if active_sub:
            return True

        mutual_interest = (
            db.query(Interest)
            .filter(
                Interest.status == "ACCEPTED",
                or_(
                    and_(
                        Interest.sender_profile_id == caller_profile_id,
                        Interest.receiver_profile_id == receiver_profile_id,
                    ),
                    and_(
                        Interest.sender_profile_id == receiver_profile_id,
                        Interest.receiver_profile_id == caller_profile_id,
                    ),
                ),
            )
            .first()
        )
        if mutual_interest:
            return True

        shared_conv = CallService.find_shared_conversation(db, caller_profile_id, receiver_profile_id)
        if shared_conv:
            return True

        return False

    @staticmethod
    def get_active_call_for_profile(db: Session, profile_id: str) -> Optional[Call]:
        """
        Returns any active call (INITIATED, RINGING, ACCEPTED, CONNECTED) for a profile.
        Also cleans up stale calls older than 2 hours automatically.
        """
        now = datetime.now(timezone.utc)
        active_calls = (
            db.query(Call)
            .filter(
                or_(Call.caller_id == profile_id, Call.receiver_id == profile_id),
                Call.status.in_(ACTIVE_CALL_STATUSES),
            )
            .all()
        )
        valid_active: Optional[Call] = None
        dirty = False
        for c in active_calls:
            started = c.started_at
            if started and started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
            age_sec = (now - started).total_seconds() if started else 0
            # Stale ringing/initiated call (> 90s) or stale connected call (> 4 hours)
            if (c.status in ("INITIATED", "RINGING") and age_sec > 90) or age_sec > 14400:
                c.status = "ENDED" if c.status == "CONNECTED" else "MISSED"
                c.ended_at = now
                dirty = True
            else:
                valid_active = c
        if dirty:
            db.commit()
        return valid_active

    @staticmethod
    def validate_and_create_call(
        db: Session,
        caller_user: User,
        caller_profile: Profile,
        receiver_identifier: str,
        call_type: str,
        conversation_id: Optional[str] = None,
    ) -> Tuple[Optional[Call], Optional[Profile], Optional[str], Optional[str]]:
        """
        Validates call authorization and creates a new Call record.
        Returns (call, receiver_profile, error_code, error_message)
        """
        call_type_norm = (call_type or "VOICE").upper().strip()
        if call_type_norm not in ("VOICE", "VIDEO"):
            return None, None, "INVALID_CALL_TYPE", "Invalid call type. Must be VOICE or VIDEO."

        receiver_profile = CallService.resolve_profile(db, receiver_identifier)
        if not receiver_profile or receiver_profile.status in ("BLOCKED", "DELETED"):
            return None, None, "INVALID_RECEIVER", "The member you are trying to call could not be found."

        if receiver_profile.id == caller_profile.id:
            return None, receiver_profile, "SELF_CALL", "You cannot place a call to yourself."

        if CallService.is_blocked(db, caller_profile.id, receiver_profile.id):
            return (
                None,
                receiver_profile,
                "BLOCKED",
                "Calling is unavailable between these profiles due to privacy settings.",
            )

        if not CallService.check_calling_permission(
            db, caller_user.id, caller_profile.id, receiver_profile.id
        ):
            return (
                None,
                receiver_profile,
                "UNAUTHORIZED",
                "Voice & Video calls require an accepted interest or BorKonya Premium membership.",
            )

        caller_active = CallService.get_active_call_for_profile(db, caller_profile.id)
        if caller_active:
            return (
                None,
                receiver_profile,
                "CALLER_BUSY",
                "You already have an active call in progress.",
            )

        receiver_active = CallService.get_active_call_for_profile(db, receiver_profile.id)
        if receiver_active:
            # Log a BUSY call record for audit/history
            conv = CallService.ensure_conversation(
                db, caller_profile.id, receiver_profile.id, conversation_id
            )
            busy_call = Call(
                caller_id=caller_profile.id,
                receiver_id=receiver_profile.id,
                conversation_id=conv.id,
                call_type=call_type_norm,
                status="BUSY",
                started_at=datetime.now(timezone.utc),
                ended_at=datetime.now(timezone.utc),
                duration=0,
                end_reason="busy",
            )
            db.add(busy_call)
            db.commit()
            db.refresh(busy_call)
            return (
                busy_call,
                receiver_profile,
                "RECEIVER_BUSY",
                f"{receiver_profile.first_name} is currently on another call.",
            )

        conv = CallService.ensure_conversation(
            db, caller_profile.id, receiver_profile.id, conversation_id
        )

        new_call = Call(
            caller_id=caller_profile.id,
            receiver_id=receiver_profile.id,
            conversation_id=conv.id,
            call_type=call_type_norm,
            status="INITIATED",
            started_at=datetime.now(timezone.utc),
            duration=0,
        )
        db.add(new_call)
        db.commit()
        db.refresh(new_call)
        return new_call, receiver_profile, None, None

    @staticmethod
    def record_call_activity_message(
        db: Session,
        call: Call,
    ) -> Optional[Message]:
        """
        Inserts a call activity message into the conversation so both participants
        see Missed Call or Answered Call duration in the BorKonya chat history.
        """
        if not call.conversation_id:
            conv = CallService.ensure_conversation(db, call.caller_id, call.receiver_id)
            call.conversation_id = conv.id

        is_video = call.call_type == "VIDEO"
        msg_type = "call_video" if is_video else "call_voice"

        if call.status in ("MISSED", "REJECTED", "CANCELLED", "BUSY", "FAILED"):
            content = "Missed video call" if is_video else "Missed voice call"
        else:
            dur_str = format_call_duration_label(call.duration or 0)
            label = "Video call" if is_video else "Voice call"
            content = f"{label} • {dur_str}"

        now = datetime.now(timezone.utc)
        msg = Message(
            conversation_id=call.conversation_id,
            sender_profile_id=call.caller_id,
            content=content,
            message_type=msg_type,
            is_read=(call.status in ("CONNECTED", "ENDED")),
            created_at=now,
        )
        db.add(msg)

        conv_obj = db.query(Conversation).filter(Conversation.id == call.conversation_id).first()
        if conv_obj:
            conv_obj.updated_at = now

        # Unhide conversation for both members if hidden
        members = (
            db.query(ConversationMember)
            .filter(ConversationMember.conversation_id == call.conversation_id)
            .all()
        )
        for m in members:
            if m.is_hidden:
                m.is_hidden = False

        db.commit()
        db.refresh(msg)
        return msg

    @staticmethod
    def transition_call_status(
        db: Session,
        call_id: str,
        new_status: str,
        reason: Optional[str] = None,
        record_chat_activity: bool = False,
    ) -> Optional[Call]:
        call = db.query(Call).filter(Call.id == call_id).first()
        if not call:
            return None

        now = datetime.now(timezone.utc)
        prev_status = call.status
        call.status = new_status

        if new_status == "CONNECTED" and not call.answered_at:
            call.answered_at = now

        if new_status in ("REJECTED", "BUSY", "MISSED", "CANCELLED", "ENDED", "FAILED"):
            call.ended_at = now
            if reason:
                call.end_reason = reason
            if call.answered_at:
                ans = call.answered_at
                if ans.tzinfo is None:
                    ans = ans.replace(tzinfo=timezone.utc)
                call.duration = max(1, int((now - ans).total_seconds()))
            else:
                call.duration = 0

        db.commit()
        db.refresh(call)

        if record_chat_activity and prev_status not in (
            "REJECTED",
            "MISSED",
            "CANCELLED",
            "ENDED",
            "FAILED",
        ):
            try:
                CallService.record_call_activity_message(db, call)
            except Exception as exc:
                print(f"Warning: failed to log call activity message: {exc}")

        return call

    @staticmethod
    def generate_webrtc_config(profile_id: str) -> WebRTCConfigResponse:
        """
        Generates centralized WebRTC ICE server configuration.
        If TURN_SHARED_SECRET is set, generates short-lived HMAC-SHA1 credentials
        following the coturn REST API specification (never exposing static secrets).
        """
        ice_servers: List[ICEServerItem] = []

        stun_urls = [u.strip() for u in (settings.STUN_URLS or "").split(",") if u.strip()]
        if not stun_urls:
            stun_urls = ["stun:stun.l.google.com:19302"]

        for stun_url in stun_urls:
            ice_servers.append(ICEServerItem(urls=stun_url))

        turn_urls = [u.strip() for u in (settings.TURN_URLS or "").split(",") if u.strip()]
        ttl = int(getattr(settings, "TURN_CREDENTIAL_TTL_SECONDS", 3600) or 3600)

        if turn_urls:
            if settings.TURN_SHARED_SECRET:
                expiry_ts = int(time.time()) + ttl
                temp_username = f"{expiry_ts}:{profile_id}"
                digest = hmac.new(
                    settings.TURN_SHARED_SECRET.encode("utf-8"),
                    temp_username.encode("utf-8"),
                    hashlib.sha1,
                ).digest()
                temp_credential = base64.b64encode(digest).decode("utf-8")
                ice_servers.append(
                    ICEServerItem(
                        urls=turn_urls if len(turn_urls) > 1 else turn_urls[0],
                        username=temp_username,
                        credential=temp_credential,
                    )
                )
            elif settings.TURN_STATIC_USERNAME and settings.TURN_STATIC_CREDENTIAL:
                ice_servers.append(
                    ICEServerItem(
                        urls=turn_urls if len(turn_urls) > 1 else turn_urls[0],
                        username=settings.TURN_STATIC_USERNAME,
                        credential=settings.TURN_STATIC_CREDENTIAL,
                    )
                )
        else:
            # High-availability public fallback TURN so calls connect across mobile data & NAT out of the box
            ice_servers.append(
                ICEServerItem(
                    urls=[
                        "turn:openrelay.metered.ca:80",
                        "turn:openrelay.metered.ca:443",
                        "turn:openrelay.metered.ca:443?transport=tcp",
                    ],
                    username="openrelayproject",
                    credential="openrelayproject",
                )
            )

        return WebRTCConfigResponse(iceServers=ice_servers, ttl=ttl)
