from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db, SessionLocal
from app.core.security import decode_access_token
from app.api.deps import get_current_user, get_current_profile
from app.models.entities import User, Profile
from app.models.call import Call
from app.schemas.call import (
    WebRTCConfigResponse,
    CallHistoryItemResponse,
    sanitize_signaling_dict,
    FORBIDDEN_PHONE_FIELDS,
)
from app.services.call_service import CallService
from app.websocket.call_manager import call_manager

router = APIRouter(tags=["Voice & Video Calling"])


@router.get("/calls/webrtc-config", response_model=WebRTCConfigResponse)
def get_webrtc_config(
    current_profile: Profile = Depends(get_current_profile),
):
    """
    Returns STUN and short-lived TURN ICE server configuration for the authenticated user.
    Never exposes static TURN secrets or phone numbers.
    """
    return CallService.generate_webrtc_config(current_profile.id)


@router.get("/calls/history", response_model=List[CallHistoryItemResponse])
def get_call_history(
    conversation_id: Optional[str] = None,
    limit: int = 50,
    current_profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """
    Returns recent 1-to-1 Voice & Video call metadata for the authenticated member.
    Never includes phone numbers.
    """
    query = db.query(Call).filter(
        or_(Call.caller_id == current_profile.id, Call.receiver_id == current_profile.id)
    )
    if conversation_id:
        query = query.filter(Call.conversation_id == conversation_id)

    calls = query.order_by(Call.created_at.desc()).limit(min(limit, 100)).all()
    results: List[CallHistoryItemResponse] = []
    profile_cache: Dict[str, Optional[Profile]] = {}

    for c in calls:
        is_outgoing = c.caller_id == current_profile.id
        other_id = c.receiver_id if is_outgoing else c.caller_id
        if other_id not in profile_cache:
            profile_cache[other_id] = db.query(Profile).filter(Profile.id == other_id).first()
        other_prof = profile_cache[other_id]
        other_name = (
            f"{other_prof.first_name} {other_prof.last_name}".strip()
            if other_prof
            else "BorKonya Member"
        )
        other_photo = CallService.get_primary_photo_url(db, other_id) if other_prof else None

        results.append(
            CallHistoryItemResponse(
                id=c.id,
                caller_id=c.caller_id,
                receiver_id=c.receiver_id,
                conversation_id=c.conversation_id,
                call_type=c.call_type,
                status=c.status,
                is_outgoing=is_outgoing,
                other_profile_id=other_id,
                other_name=other_name,
                other_photo_url=other_photo,
                other_gender=other_prof.gender if other_prof else None,
                started_at=c.started_at,
                answered_at=c.answered_at,
                ended_at=c.ended_at,
                duration=c.duration or 0,
                created_at=c.created_at,
            )
        )
    return results


def _authenticate_websocket(websocket: WebSocket, token_param: Optional[str]) -> Optional[TupleUserAndProfile]:
    """
    Authenticates WebSocket connection strictly from JWT token (query param or Authorization header).
    Never trusts client-supplied user_id or caller_id.
    """
    raw_token = token_param
    if not raw_token:
        auth_header = websocket.headers.get("authorization") or websocket.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            raw_token = auth_header.split(" ", 1)[1].strip()

    if not raw_token:
        return None

    user_id = decode_access_token(raw_token)
    if not user_id:
        return None

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        if not profile or profile.status in ("BLOCKED", "DELETED"):
            return None
        return (user.id, profile.id, f"{profile.first_name} {profile.last_name}".strip(), profile.gender)
    finally:
        db.close()


TupleUserAndProfile = tuple[str, str, str, Optional[str]]


async def handle_calls_websocket(websocket: WebSocket, token: Optional[str] = None):
    """
    Core WebSocket signaling handler for 1-to-1 Voice & Video Calls.
    """
    auth_info = _authenticate_websocket(websocket, token)
    if not auth_info:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required")
        return

    auth_user_id, auth_profile_id, auth_full_name, auth_gender = auth_info
    await call_manager.connect(auth_profile_id, auth_user_id, websocket)

    try:
        while True:
            raw_data = await websocket.receive_json()
            if not isinstance(raw_data, dict):
                continue

            # Reject if payload attempts to transmit forbidden phone number fields
            if any(k.lower() in FORBIDDEN_PHONE_FIELDS for k in raw_data.keys()):
                await websocket.send_json(
                    {
                        "type": "call.failed",
                        "reason": "PRIVACY_VIOLATION",
                        "message": "Personal phone numbers are prohibited in call signaling.",
                    }
                )
                continue

            event_type = str(raw_data.get("type") or "").strip()

            if event_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            # Security: Reject impersonation attempts where client passes a mismatched caller_id
            client_caller_id = raw_data.get("caller_id")
            if client_caller_id and client_caller_id not in (auth_profile_id, auth_user_id):
                await websocket.send_json(
                    {
                        "type": "call.failed",
                        "reason": "IMPERSONATION_FORBIDDEN",
                        "message": "Caller identity cannot be overridden.",
                    }
                )
                continue

            data = sanitize_signaling_dict(raw_data)

            # ------------------------------------------------------------------
            # 1. INITIATE CALL (call.initiate)
            # ------------------------------------------------------------------
            if event_type == "call.initiate":
                if not call_manager.check_rate_limit(auth_profile_id):
                    await websocket.send_json(
                        {
                            "type": "call.failed",
                            "reason": "RATE_LIMITED",
                            "message": "Too many call attempts. Please wait a moment and try again.",
                        }
                    )
                    continue

                receiver_identifier = str(data.get("receiver_id") or "").strip()
                call_type = str(data.get("call_type") or "VOICE").upper().strip()
                conversation_id = data.get("conversation_id")

                db = SessionLocal()
                try:
                    caller_user = db.query(User).filter(User.id == auth_user_id).first()
                    caller_profile = db.query(Profile).filter(Profile.id == auth_profile_id).first()
                    if not caller_user or not caller_profile:
                        await websocket.send_json(
                            {
                                "type": "call.failed",
                                "reason": "UNAUTHORIZED",
                                "message": "Invalid caller profile.",
                            }
                        )
                        continue

                    call_obj, receiver_prof, err_code, err_msg = CallService.validate_and_create_call(
                        db=db,
                        caller_user=caller_user,
                        caller_profile=caller_profile,
                        receiver_identifier=receiver_identifier,
                        call_type=call_type,
                        conversation_id=conversation_id,
                    )

                    if err_code == "RECEIVER_BUSY" and call_obj and receiver_prof:
                        await websocket.send_json(
                            {
                                "type": "call.busy",
                                "call_id": call_obj.id,
                                "receiver_id": receiver_prof.id,
                                "receiver_name": receiver_prof.first_name,
                                "call_type": call_type,
                                "conversation_id": call_obj.conversation_id,
                                "message": err_msg,
                            }
                        )
                        continue

                    if err_code or not call_obj or not receiver_prof:
                        await websocket.send_json(
                            {
                                "type": "call.failed",
                                "reason": err_code or "VALIDATION_FAILED",
                                "receiver_id": receiver_prof.id if receiver_prof else receiver_identifier,
                                "message": err_msg or "Unable to start call.",
                            }
                        )
                        continue

                    # Check if receiver is currently connected to Call WebSocket
                    receiver_online = await call_manager.is_user_online(receiver_prof.id)
                    if not receiver_online:
                        CallService.transition_call_status(
                            db,
                            call_id=call_obj.id,
                            new_status="MISSED",
                            reason="offline",
                            record_chat_activity=True,
                        )
                        await websocket.send_json(
                            {
                                "type": "call.failed",
                                "call_id": call_obj.id,
                                "receiver_id": receiver_prof.id,
                                "receiver_name": receiver_prof.first_name,
                                "call_type": call_obj.call_type,
                                "conversation_id": call_obj.conversation_id,
                                "reason": "OFFLINE",
                                "message": f"{receiver_prof.first_name} is currently offline.",
                            }
                        )
                        continue

                    # Receiver is online -> transition to RINGING
                    call_obj = CallService.transition_call_status(
                        db, call_id=call_obj.id, new_status="RINGING"
                    )
                    caller_photo = CallService.get_primary_photo_url(db, caller_profile.id)
                    receiver_photo = CallService.get_primary_photo_url(db, receiver_prof.id)

                    # Send incoming call notification to Receiver
                    incoming_payload = {
                        "type": "call.initiate",
                        "call_id": call_obj.id,
                        "caller_id": caller_profile.id,
                        "caller_name": f"{caller_profile.first_name} {caller_profile.last_name}".strip(),
                        "caller_first_name": caller_profile.first_name,
                        "caller_photo": caller_photo,
                        "caller_gender": caller_profile.gender,
                        "receiver_id": receiver_prof.id,
                        "call_type": call_obj.call_type,
                        "conversation_id": call_obj.conversation_id,
                        "status": "RINGING",
                    }
                    delivered = await call_manager.send_to_profile(receiver_prof.id, incoming_payload)

                    if not delivered:
                        CallService.transition_call_status(
                            db,
                            call_id=call_obj.id,
                            new_status="MISSED",
                            reason="offline",
                            record_chat_activity=True,
                        )
                        await websocket.send_json(
                            {
                                "type": "call.failed",
                                "call_id": call_obj.id,
                                "receiver_id": receiver_prof.id,
                                "receiver_name": receiver_prof.first_name,
                                "call_type": call_obj.call_type,
                                "conversation_id": call_obj.conversation_id,
                                "reason": "OFFLINE",
                                "message": f"{receiver_prof.first_name} is currently offline.",
                            }
                        )
                        continue

                    # Notify Caller that call is ringing
                    await websocket.send_json(
                        {
                            "type": "call.ringing",
                            "call_id": call_obj.id,
                            "caller_id": caller_profile.id,
                            "receiver_id": receiver_prof.id,
                            "receiver_name": f"{receiver_prof.first_name} {receiver_prof.last_name}".strip(),
                            "receiver_first_name": receiver_prof.first_name,
                            "receiver_photo": receiver_photo,
                            "call_type": call_obj.call_type,
                            "conversation_id": call_obj.conversation_id,
                            "status": "RINGING",
                        }
                    )

                    # Start 45s ring timeout
                    call_manager.start_ring_timer(call_obj.id)
                finally:
                    db.close()

            # ------------------------------------------------------------------
            # 2. RINGING ACKNOWLEDGEMENT (call.ringing)
            # ------------------------------------------------------------------
            elif event_type == "call.ringing":
                call_id = str(data.get("call_id") or "").strip()
                if not call_id:
                    continue
                db = SessionLocal()
                try:
                    call_obj = db.query(Call).filter(Call.id == call_id).first()
                    if call_obj and call_obj.receiver_id == auth_profile_id:
                        await call_manager.send_to_profile(
                            call_obj.caller_id,
                            {
                                "type": "call.ringing",
                                "call_id": call_obj.id,
                                "receiver_id": auth_profile_id,
                                "call_type": call_obj.call_type,
                                "conversation_id": call_obj.conversation_id,
                                "status": "RINGING",
                            },
                        )
                finally:
                    db.close()

            # ------------------------------------------------------------------
            # 3. ACCEPT CALL (call.accept)
            # ------------------------------------------------------------------
            elif event_type == "call.accept":
                call_id = str(data.get("call_id") or "").strip()
                if not call_id:
                    continue
                call_manager.cancel_ring_timer(call_id)
                db = SessionLocal()
                try:
                    call_obj = db.query(Call).filter(Call.id == call_id).first()
                    if not call_obj or call_obj.receiver_id != auth_profile_id:
                        await websocket.send_json(
                            {
                                "type": "call.failed",
                                "call_id": call_id,
                                "reason": "INVALID_CALL",
                                "message": "Call cannot be accepted.",
                            }
                        )
                        continue
                    if call_obj.status not in ("INITIATED", "RINGING"):
                        await websocket.send_json(
                            {
                                "type": "call.failed",
                                "call_id": call_id,
                                "reason": "CALL_NO_LONGER_ACTIVE",
                                "message": "This call has already ended.",
                            }
                        )
                        continue

                    updated = CallService.transition_call_status(db, call_id, "ACCEPTED")
                    accept_event = {
                        "type": "call.accept",
                        "call_id": updated.id,
                        "caller_id": updated.caller_id,
                        "receiver_id": updated.receiver_id,
                        "call_type": updated.call_type,
                        "conversation_id": updated.conversation_id,
                        "status": "ACCEPTED",
                    }
                    await call_manager.send_to_profile(updated.caller_id, accept_event)
                    await call_manager.send_to_profile(updated.receiver_id, accept_event)
                finally:
                    db.close()

            # ------------------------------------------------------------------
            # 4. REJECT / BUSY CALL (call.reject / call.busy)
            # ------------------------------------------------------------------
            elif event_type in ("call.reject", "call.busy"):
                call_id = str(data.get("call_id") or "").strip()
                if not call_id:
                    continue
                call_manager.cancel_ring_timer(call_id)
                db = SessionLocal()
                try:
                    call_obj = db.query(Call).filter(Call.id == call_id).first()
                    if not call_obj or call_obj.receiver_id != auth_profile_id:
                        continue
                    new_status = "BUSY" if event_type == "call.busy" else "REJECTED"
                    updated = CallService.transition_call_status(
                        db,
                        call_id=call_id,
                        new_status=new_status,
                        reason=data.get("reason") or new_status.lower(),
                        record_chat_activity=True,
                    )
                    if updated:
                        payload = {
                            "type": event_type,
                            "call_id": updated.id,
                            "caller_id": updated.caller_id,
                            "receiver_id": updated.receiver_id,
                            "call_type": updated.call_type,
                            "conversation_id": updated.conversation_id,
                            "status": new_status,
                            "reason": data.get("reason") or new_status.lower(),
                            "message": (
                                f"{auth_full_name.split()[0]} is currently on another call."
                                if new_status == "BUSY"
                                else f"{auth_full_name.split()[0]} declined the call."
                            ),
                        }
                        await call_manager.send_to_profile(updated.caller_id, payload)
                        await call_manager.send_to_profile(updated.receiver_id, payload)
                finally:
                    db.close()

            # ------------------------------------------------------------------
            # 5. CANCEL CALL (call.cancel - by caller before answer)
            # ------------------------------------------------------------------
            elif event_type == "call.cancel":
                call_id = str(data.get("call_id") or "").strip()
                if not call_id:
                    continue
                call_manager.cancel_ring_timer(call_id)
                db = SessionLocal()
                try:
                    call_obj = db.query(Call).filter(Call.id == call_id).first()
                    if not call_obj or call_obj.caller_id != auth_profile_id:
                        continue
                    updated = CallService.transition_call_status(
                        db,
                        call_id=call_id,
                        new_status="CANCELLED",
                        reason="caller_cancelled",
                        record_chat_activity=True,
                    )
                    if updated:
                        cancel_event = {
                            "type": "call.cancel",
                            "call_id": updated.id,
                            "caller_id": updated.caller_id,
                            "receiver_id": updated.receiver_id,
                            "call_type": updated.call_type,
                            "conversation_id": updated.conversation_id,
                            "status": "CANCELLED",
                        }
                        await call_manager.send_to_profile(updated.receiver_id, cancel_event)
                        await call_manager.send_to_profile(updated.caller_id, cancel_event)
                finally:
                    db.close()

            # ------------------------------------------------------------------
            # 6. WEBRTC SIGNALING RELAY (call.offer, call.answer, call.ice_candidate, call.media_state)
            # ------------------------------------------------------------------
            elif event_type in ("call.offer", "call.answer", "call.ice_candidate", "call.media_state"):
                call_id = str(data.get("call_id") or "").strip()
                if not call_id:
                    continue
                db = SessionLocal()
                try:
                    call_obj = db.query(Call).filter(Call.id == call_id).first()
                    if not call_obj or auth_profile_id not in (call_obj.caller_id, call_obj.receiver_id):
                        continue
                    target_profile_id = (
                        call_obj.receiver_id
                        if auth_profile_id == call_obj.caller_id
                        else call_obj.caller_id
                    )
                    relay_payload: Dict[str, Any] = {
                        "type": event_type,
                        "call_id": call_obj.id,
                        "sender_id": auth_profile_id,
                        "call_type": call_obj.call_type,
                        "conversation_id": call_obj.conversation_id,
                    }
                    if "sdp" in data:
                        relay_payload["sdp"] = data["sdp"]
                    if "candidate" in data:
                        relay_payload["candidate"] = data["candidate"]
                    if "audio_enabled" in data:
                        relay_payload["audio_enabled"] = bool(data["audio_enabled"])
                    if "video_enabled" in data:
                        relay_payload["video_enabled"] = bool(data["video_enabled"])

                    await call_manager.send_to_profile(target_profile_id, relay_payload)
                finally:
                    db.close()

            # ------------------------------------------------------------------
            # 7. CALL CONNECTED (call.connected)
            # ------------------------------------------------------------------
            elif event_type == "call.connected":
                call_id = str(data.get("call_id") or "").strip()
                if not call_id:
                    continue
                call_manager.cancel_ring_timer(call_id)
                db = SessionLocal()
                try:
                    call_obj = db.query(Call).filter(Call.id == call_id).first()
                    if not call_obj or auth_profile_id not in (call_obj.caller_id, call_obj.receiver_id):
                        continue
                    updated = CallService.transition_call_status(db, call_id, "CONNECTED")
                    if updated:
                        conn_event = {
                            "type": "call.connected",
                            "call_id": updated.id,
                            "caller_id": updated.caller_id,
                            "receiver_id": updated.receiver_id,
                            "call_type": updated.call_type,
                            "conversation_id": updated.conversation_id,
                            "status": "CONNECTED",
                            "answered_at": updated.answered_at.isoformat() if updated.answered_at else None,
                        }
                        await call_manager.send_to_profile(updated.caller_id, conn_event)
                        await call_manager.send_to_profile(updated.receiver_id, conn_event)
                finally:
                    db.close()

            # ------------------------------------------------------------------
            # 8. CALL END / CALL FAILED (call.end / call.failed)
            # ------------------------------------------------------------------
            elif event_type in ("call.end", "call.failed"):
                call_id = str(data.get("call_id") or "").strip()
                if not call_id:
                    continue
                call_manager.cancel_ring_timer(call_id)
                db = SessionLocal()
                try:
                    call_obj = db.query(Call).filter(Call.id == call_id).first()
                    if not call_obj or auth_profile_id not in (call_obj.caller_id, call_obj.receiver_id):
                        continue

                    if call_obj.status in ("ENDED", "REJECTED", "MISSED", "CANCELLED", "FAILED"):
                        continue

                    if event_type == "call.failed":
                        target_status = "FAILED"
                    elif call_obj.status in ("INITIATED", "RINGING"):
                        target_status = "CANCELLED" if auth_profile_id == call_obj.caller_id else "REJECTED"
                    else:
                        target_status = "ENDED"

                    updated = CallService.transition_call_status(
                        db,
                        call_id=call_id,
                        new_status=target_status,
                        reason=data.get("reason") or ("failed" if event_type == "call.failed" else "ended"),
                        record_chat_activity=True,
                    )
                    if updated:
                        end_payload = {
                            "type": "call.end",
                            "call_id": updated.id,
                            "caller_id": updated.caller_id,
                            "receiver_id": updated.receiver_id,
                            "call_type": updated.call_type,
                            "conversation_id": updated.conversation_id,
                            "status": updated.status,
                            "duration": updated.duration or 0,
                            "reason": data.get("reason") or "ended",
                        }
                        await call_manager.send_to_profile(updated.caller_id, end_payload)
                        await call_manager.send_to_profile(updated.receiver_id, end_payload)
                finally:
                    db.close()

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        print(f"Call WebSocket error for profile {auth_profile_id}: {exc}")
    finally:
        await call_manager.disconnect(auth_profile_id, websocket)


@router.websocket("/ws/calls")
async def websocket_calls_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None),
):
    await handle_calls_websocket(websocket, token)
