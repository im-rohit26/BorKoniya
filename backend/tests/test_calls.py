import time
import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from main import app, init_db_and_seed
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.entities import Profile, Interest, BlockedUser, Message
from app.models.call import Call


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db_and_seed()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def _login_user(client: TestClient, phone: str, password: str = "borkonya123"):
    res = client.post(
        "/api/v1/auth/login",
        json={"phone_or_email": phone, "password": password},
    )
    assert res.status_code == 200, f"Login failed for {phone}: {res.text}"
    data = res.json()
    me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    ).json()
    return {
        "token": data["access_token"],
        "user_id": data["user_id"],
        "profile_id": me["profile_id"],
        "first_name": me["first_name"],
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
    }


def _ensure_mutual_interest(profile_a_id: str, profile_b_id: str):
    db = SessionLocal()
    try:
        # Clear any existing active calls or blocks between the two profiles
        db.query(BlockedUser).filter(
            ((BlockedUser.blocker_profile_id == profile_a_id) & (BlockedUser.blocked_profile_id == profile_b_id))
            | ((BlockedUser.blocker_profile_id == profile_b_id) & (BlockedUser.blocked_profile_id == profile_a_id))
        ).delete(synchronize_session=False)

        db.query(Call).filter(
            (Call.caller_id.in_([profile_a_id, profile_b_id]))
            | (Call.receiver_id.in_([profile_a_id, profile_b_id]))
        ).delete(synchronize_session=False)

        existing = (
            db.query(Interest)
            .filter(
                ((Interest.sender_profile_id == profile_a_id) & (Interest.receiver_profile_id == profile_b_id))
                | ((Interest.sender_profile_id == profile_b_id) & (Interest.receiver_profile_id == profile_a_id))
            )
            .first()
        )
        if existing:
            existing.status = "ACCEPTED"
        else:
            db.add(
                Interest(
                    sender_profile_id=profile_a_id,
                    receiver_profile_id=profile_b_id,
                    status="ACCEPTED",
                )
            )
        db.commit()
    finally:
        db.close()


def _assert_no_phone_in_payload(payload: dict):
    serialized = str(payload).lower()
    for forbidden in ("phone_number", "mobile_number", "personal_contact_number", "9876543210", "9876543211"):
        assert forbidden not in serialized, f"Phone data leaked in payload: {payload}"


def test_unauthenticated_websocket_rejected(client: TestClient):
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/ws/calls") as ws:
            ws.receive_json()
    assert exc_info.value.code == 1008


def test_webrtc_config_and_short_lived_turn_credentials(client: TestClient):
    u1 = _login_user(client, "9876543210")
    orig_turn_urls = settings.TURN_URLS
    orig_secret = settings.TURN_SHARED_SECRET
    try:
        settings.TURN_URLS = "turn:turn.borkonya.com:3478?transport=udp"
        settings.TURN_SHARED_SECRET = "test_ephemeral_turn_secret_key"

        res = client.get("/api/v1/calls/webrtc-config", headers=u1["headers"])
        assert res.status_code == 200
        cfg = res.json()
        assert "iceServers" in cfg
        assert len(cfg["iceServers"]) >= 2

        turn_entry = [s for s in cfg["iceServers"] if "turn:" in str(s["urls"])][0]
        assert turn_entry["username"] is not None
        assert u1["profile_id"] in turn_entry["username"]
        assert turn_entry["credential"] is not None
        assert turn_entry["credential"] != settings.TURN_SHARED_SECRET
        _assert_no_phone_in_payload(cfg)
    finally:
        settings.TURN_URLS = orig_turn_urls
        settings.TURN_SHARED_SECRET = orig_secret


def test_voice_call_full_flow_accept_webrtc_and_end(client: TestClient):
    u1 = _login_user(client, "9876543210")
    u2 = _login_user(client, "9876543211")
    _ensure_mutual_interest(u1["profile_id"], u2["profile_id"])

    with client.websocket_connect(f"/ws/calls?token={u1['token']}") as ws_a, client.websocket_connect(
        f"/ws/calls?token={u2['token']}"
    ) as ws_b:
        # 1. User A initiates VOICE call to User B
        ws_a.send_json(
            {
                "type": "call.initiate",
                "receiver_id": u2["profile_id"],
                "call_type": "VOICE",
            }
        )

        # User B receives incoming call
        incoming = ws_b.receive_json()
        assert incoming["type"] == "call.initiate"
        assert incoming["caller_id"] == u1["profile_id"]
        assert incoming["receiver_id"] == u2["profile_id"]
        assert incoming["call_type"] == "VOICE"
        assert incoming["status"] == "RINGING"
        _assert_no_phone_in_payload(incoming)
        call_id = incoming["call_id"]

        # User A receives ringing confirmation
        ringing = ws_a.receive_json()
        assert ringing["type"] == "call.ringing"
        assert ringing["call_id"] == call_id
        _assert_no_phone_in_payload(ringing)

        # 2. User B accepts the call
        ws_b.send_json({"type": "call.accept", "call_id": call_id})
        acc_a = ws_a.receive_json()
        acc_b = ws_b.receive_json()
        assert acc_a["type"] == "call.accept"
        assert acc_b["type"] == "call.accept"

        # 3. WebRTC Offer / Answer / ICE Candidate exchange
        ws_a.send_json(
            {
                "type": "call.offer",
                "call_id": call_id,
                "sdp": {"type": "offer", "sdp": "v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\n"},
            }
        )
        offer_b = ws_b.receive_json()
        assert offer_b["type"] == "call.offer"
        assert offer_b["sdp"]["type"] == "offer"

        ws_b.send_json(
            {
                "type": "call.answer",
                "call_id": call_id,
                "sdp": {"type": "answer", "sdp": "v=0\r\no=- 456 2 IN IP4 127.0.0.1\r\n"},
            }
        )
        answer_a = ws_a.receive_json()
        assert answer_a["type"] == "call.answer"
        assert answer_a["sdp"]["type"] == "answer"

        ws_a.send_json(
            {
                "type": "call.ice_candidate",
                "call_id": call_id,
                "candidate": {"candidate": "candidate:1 1 UDP 2122252543 192.168.1.2 54321 typ host", "sdpMid": "0"},
            }
        )
        ice_b = ws_b.receive_json()
        assert ice_b["type"] == "call.ice_candidate"
        assert "candidate" in ice_b["candidate"]

        # 4. Connected state
        ws_a.send_json({"type": "call.connected", "call_id": call_id})
        conn_a = ws_a.receive_json()
        conn_b = ws_b.receive_json()
        assert conn_a["type"] == "call.connected"
        assert conn_b["type"] == "call.connected"

        # 5. End call
        ws_a.send_json({"type": "call.end", "call_id": call_id})
        end_a = ws_a.receive_json()
        end_b = ws_b.receive_json()
        assert end_a["type"] == "call.end"
        assert end_a["status"] == "ENDED"
        assert end_b["type"] == "call.end"

    # Verify call history & conversation activity message
    hist_res = client.get("/api/v1/calls/history", headers=u1["headers"])
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert any(h["id"] == call_id and h["status"] == "ENDED" for h in history)
    _assert_no_phone_in_payload({"history": history})


def test_video_call_reject_and_cancel_and_busy(client: TestClient):
    u1 = _login_user(client, "9876543210")
    u2 = _login_user(client, "9876543211")
    _ensure_mutual_interest(u1["profile_id"], u2["profile_id"])

    with client.websocket_connect(f"/ws/calls?token={u1['token']}") as ws_a, client.websocket_connect(
        f"/ws/calls?token={u2['token']}"
    ) as ws_b:
        # 1. Video Call -> Reject
        ws_a.send_json(
            {
                "type": "call.initiate",
                "receiver_id": u2["profile_id"],
                "call_type": "VIDEO",
            }
        )
        inc = ws_b.receive_json()
        ring = ws_a.receive_json()
        assert inc["call_type"] == "VIDEO"
        assert ring["type"] == "call.ringing"

        ws_b.send_json({"type": "call.reject", "call_id": inc["call_id"]})
        rej_a = ws_a.receive_json()
        rej_b = ws_b.receive_json()
        assert rej_a["type"] == "call.reject"
        assert rej_a["status"] == "REJECTED"
        assert rej_b["status"] == "REJECTED"

        # 2. Video Call -> Cancel by Caller
        ws_a.send_json(
            {
                "type": "call.initiate",
                "receiver_id": u2["profile_id"],
                "call_type": "VIDEO",
            }
        )
        inc2 = ws_b.receive_json()
        _ = ws_a.receive_json()

        ws_a.send_json({"type": "call.cancel", "call_id": inc2["call_id"]})
        canc_b = ws_b.receive_json()
        canc_a = ws_a.receive_json()
        assert canc_b["type"] == "call.cancel"
        assert canc_a["status"] == "CANCELLED"

        # 3. Duplicate active call / Busy detection
        ws_a.send_json(
            {
                "type": "call.initiate",
                "receiver_id": u2["profile_id"],
                "call_type": "VOICE",
            }
        )
        inc3 = ws_b.receive_json()
        _ = ws_a.receive_json()

        # While call 3 is ringing, User A tries to start a second call -> CALLER_BUSY
        ws_a.send_json(
            {
                "type": "call.initiate",
                "receiver_id": u2["profile_id"],
                "call_type": "VOICE",
            }
        )
        busy_err = ws_a.receive_json()
        assert busy_err["type"] == "call.failed"
        assert busy_err["reason"] == "CALLER_BUSY"

        # Clean up call 3
        ws_a.send_json({"type": "call.cancel", "call_id": inc3["call_id"]})
        _ = ws_b.receive_json()
        _ = ws_a.receive_json()


def test_offline_receiver_and_missed_call_chat_activity(client: TestClient):
    u1 = _login_user(client, "9876543210")
    u2 = _login_user(client, "9876543211")
    _ensure_mutual_interest(u1["profile_id"], u2["profile_id"])

    # Only User A connects; User B is offline
    with client.websocket_connect(f"/ws/calls?token={u1['token']}") as ws_a:
        ws_a.send_json(
            {
                "type": "call.initiate",
                "receiver_id": u2["profile_id"],
                "call_type": "VIDEO",
            }
        )
        resp = ws_a.receive_json()
        assert resp["type"] == "call.failed"
        assert resp["reason"] == "OFFLINE"
        assert "currently offline" in resp["message"]
        conv_id = resp["conversation_id"]

    # Check that a missed video call message was added to the conversation
    msgs_res = client.get(f"/api/v1/conversations/{conv_id}/messages", headers=u1["headers"])
    assert msgs_res.status_code == 200
    msgs = msgs_res.json()
    assert any(m["message_type"] == "call_video" and "Missed video call" in m["content"] for m in msgs)


def test_security_fake_caller_blocked_user_and_phone_leak_prevention(client: TestClient):
    u1 = _login_user(client, "9876543210")
    u2 = _login_user(client, "9876543211")
    _ensure_mutual_interest(u1["profile_id"], u2["profile_id"])

    with client.websocket_connect(f"/ws/calls?token={u1['token']}") as ws_a:
        # 1. Fake caller_id impersonation attempt
        ws_a.send_json(
            {
                "type": "call.initiate",
                "caller_id": "someone-elses-uuid-1234",
                "receiver_id": u2["profile_id"],
                "call_type": "VOICE",
            }
        )
        impersonation_res = ws_a.receive_json()
        assert impersonation_res["type"] == "call.failed"
        assert impersonation_res["reason"] == "IMPERSONATION_FORBIDDEN"

        # 2. Attempt to include phone_number in signaling
        ws_a.send_json(
            {
                "type": "call.initiate",
                "receiver_id": u2["profile_id"],
                "phone_number": "9876543210",
                "call_type": "VOICE",
            }
        )
        priv_res = ws_a.receive_json()
        assert priv_res["type"] == "call.failed"
        assert priv_res["reason"] == "PRIVACY_VIOLATION"

        # 3. Self-call attempt
        ws_a.send_json(
            {
                "type": "call.initiate",
                "receiver_id": u1["profile_id"],
                "call_type": "VOICE",
            }
        )
        self_res = ws_a.receive_json()
        assert self_res["type"] == "call.failed"
        assert self_res["reason"] == "SELF_CALL"

        # 4. Invalid receiver
        ws_a.send_json(
            {
                "type": "call.initiate",
                "receiver_id": "00000000-0000-0000-0000-000000000000",
                "call_type": "VOICE",
            }
        )
        inv_res = ws_a.receive_json()
        assert inv_res["type"] == "call.failed"
        assert inv_res["reason"] == "INVALID_RECEIVER"

        # 5. Blocked user check
        client.post(
            "/api/v1/safety/block",
            json={"blocked_profile_id": u2["profile_id"]},
            headers=u1["headers"],
        )
        try:
            ws_a.send_json(
                {
                    "type": "call.initiate",
                    "receiver_id": u2["profile_id"],
                    "call_type": "VOICE",
                }
            )
            blk_res = ws_a.receive_json()
            assert blk_res["type"] == "call.failed"
            assert blk_res["reason"] == "BLOCKED"
        finally:
            client.delete(f"/api/v1/safety/block/{u2['profile_id']}", headers=u1["headers"])
