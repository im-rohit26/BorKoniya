import asyncio
import json
import time
from typing import Dict, Set, Optional, Any, List
from fastapi import WebSocket
from app.core.config import settings
from app.core.database import SessionLocal
from app.schemas.call import sanitize_signaling_dict
from app.services.call_service import CallService
from app.models.call import Call


class CallConnectionManager:
    """
    Production-safe WebSocket signaling & presence manager for 1-to-1 Voice/Video calls.
    - Maps profile_id -> active WebSocket connections
    - Supports optional Redis pub/sub for multi-worker horizontal scaling
    - Enforces rate limiting on call initiation
    - Manages server-side ringing timeouts so calls never hang indefinitely
    """

    def __init__(self):
        # profile_id -> set of active WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # user_id -> profile_id lookup
        self.user_to_profile: Dict[str, str] = {}
        # call_id -> asyncio.Task for ringing timeout
        self.ring_timers: Dict[str, asyncio.Task] = {}
        # profile_id -> list of call initiation timestamps (for rate limiting)
        self.call_rate_log: Dict[str, List[float]] = {}
        self._lock = asyncio.Lock()

        # Optional Redis client for multi-worker deployments
        self._redis = None
        self._redis_pubsub_task: Optional[asyncio.Task] = None

    async def init_redis_if_configured(self):
        if not settings.REDIS_URL or self._redis is not None:
            return
        try:
            import redis.asyncio as aioredis  # type: ignore

            self._redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            self._redis_pubsub_task = asyncio.create_task(self._redis_listener())
        except Exception as exc:
            print(f"Redis not enabled or unavailable, using in-memory signaling: {exc}")
            self._redis = None

    async def _redis_listener(self):
        if not self._redis:
            return
        try:
            pubsub = self._redis.pubsub()
            await pubsub.psubscribe("borkonya:call:signal:*")
            async for message in pubsub.listen():
                if message.get("type") == "pmessage":
                    channel = message.get("channel", "")
                    target_profile_id = channel.split(":")[-1]
                    data_raw = message.get("data")
                    if target_profile_id and data_raw:
                        payload = json.loads(data_raw)
                        await self._send_local(target_profile_id, payload)
        except Exception as exc:
            print(f"Redis pubsub listener stopped: {exc}")

    async def connect(self, profile_id: str, user_id: str, websocket: WebSocket):
        await websocket.accept()
        await self.init_redis_if_configured()
        async with self._lock:
            if profile_id not in self.active_connections:
                self.active_connections[profile_id] = set()
            self.active_connections[profile_id].add(websocket)
            self.user_to_profile[user_id] = profile_id

        if self._redis:
            try:
                await self._redis.sadd("borkonya:call:online", profile_id)
            except Exception:
                pass

    async def disconnect(self, profile_id: str, websocket: WebSocket):
        became_offline = False
        async with self._lock:
            conns = self.active_connections.get(profile_id)
            if conns and websocket in conns:
                conns.remove(websocket)
                if not conns:
                    self.active_connections.pop(profile_id, None)
                    became_offline = True

        if became_offline and self._redis:
            try:
                await self._redis.srem("borkonya:call:online", profile_id)
            except Exception:
                pass

        if became_offline:
            await self._handle_unexpected_disconnect(profile_id)

    async def is_user_online(self, profile_id: str) -> bool:
        if profile_id in self.active_connections and len(self.active_connections[profile_id]) > 0:
            return True
        if self._redis:
            try:
                return bool(await self._redis.sismember("borkonya:call:online", profile_id))
            except Exception:
                pass
        return False

    def check_rate_limit(self, profile_id: str) -> bool:
        """
        Returns True if allowed, False if caller exceeded CALL_RATE_LIMIT_PER_MINUTE.
        """
        now = time.time()
        window = 60.0
        max_calls = int(getattr(settings, "CALL_RATE_LIMIT_PER_MINUTE", 10) or 10)
        history = self.call_rate_log.get(profile_id, [])
        history = [t for t in history if now - t < window]
        if len(history) >= max_calls:
            self.call_rate_log[profile_id] = history
            return False
        history.append(now)
        self.call_rate_log[profile_id] = history
        return True

    async def _send_local(self, profile_id: str, payload: Dict[str, Any]) -> bool:
        safe_payload = sanitize_signaling_dict(payload)
        conns = list(self.active_connections.get(profile_id, set()))
        if not conns:
            return False
        delivered = False
        dead: List[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_json(safe_payload)
                delivered = True
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                active_set = self.active_connections.get(profile_id)
                if active_set:
                    for d in dead:
                        active_set.discard(d)
                    if not active_set:
                        self.active_connections.pop(profile_id, None)
        return delivered

    async def send_to_profile(self, profile_id: str, payload: Dict[str, Any]) -> bool:
        """
        Sends a structured signaling event to a specific profile_id (locally or via Redis).
        """
        safe_payload = sanitize_signaling_dict(payload)
        if self._redis:
            try:
                await self._redis.publish(
                    f"borkonya:call:signal:{profile_id}", json.dumps(safe_payload)
                )
                return True
            except Exception:
                pass
        return await self._send_local(profile_id, safe_payload)

    def start_ring_timer(self, call_id: str, timeout_seconds: Optional[int] = None):
        self.cancel_ring_timer(call_id)
        timeout = (
            timeout_seconds
            if timeout_seconds is not None
            else int(getattr(settings, "CALL_RING_TIMEOUT_SECONDS", 45) or 45)
        )
        task = asyncio.create_task(self._ring_timeout_worker(call_id, timeout))
        self.ring_timers[call_id] = task

    def cancel_ring_timer(self, call_id: str):
        task = self.ring_timers.pop(call_id, None)
        if task and not task.done():
            task.cancel()

    async def _ring_timeout_worker(self, call_id: str, timeout: int):
        try:
            await asyncio.sleep(timeout)
            db = SessionLocal()
            try:
                call = db.query(Call).filter(Call.id == call_id).first()
                if call and call.status in ("INITIATED", "RINGING"):
                    updated = CallService.transition_call_status(
                        db,
                        call_id=call_id,
                        new_status="MISSED",
                        reason="timeout",
                        record_chat_activity=True,
                    )
                    if updated:
                        timeout_event = {
                            "type": "call.end",
                            "call_id": updated.id,
                            "call_type": updated.call_type,
                            "conversation_id": updated.conversation_id,
                            "status": "MISSED",
                            "reason": "timeout",
                            "message": "No answer",
                        }
                        await self.send_to_profile(updated.caller_id, timeout_event)
                        await self.send_to_profile(updated.receiver_id, timeout_event)
            finally:
                db.close()
        except asyncio.CancelledError:
            pass
        finally:
            self.ring_timers.pop(call_id, None)

    async def _handle_unexpected_disconnect(self, profile_id: str):
        """
        If a user's WebSocket disconnects while in an active or ringing call,
        cleanly terminate the call and notify the peer.
        """
        db = SessionLocal()
        try:
            active_call = CallService.get_active_call_for_profile(db, profile_id)
            if not active_call:
                return
            self.cancel_ring_timer(active_call.id)
            was_connected = active_call.status in ("ACCEPTED", "CONNECTED")
            new_status = "ENDED" if was_connected else "CANCELLED"
            updated = CallService.transition_call_status(
                db,
                call_id=active_call.id,
                new_status=new_status,
                reason="disconnect",
                record_chat_activity=True,
            )
            if updated:
                other_id = (
                    updated.receiver_id
                    if updated.caller_id == profile_id
                    else updated.caller_id
                )
                await self.send_to_profile(
                    other_id,
                    {
                        "type": "call.end",
                        "call_id": updated.id,
                        "call_type": updated.call_type,
                        "conversation_id": updated.conversation_id,
                        "status": updated.status,
                        "duration": updated.duration or 0,
                        "reason": "network_disconnect",
                        "message": "Call ended due to connection loss.",
                    },
                )
        except Exception as exc:
            print(f"Error handling disconnect cleanup: {exc}")
        finally:
            db.close()


call_manager = CallConnectionManager()
