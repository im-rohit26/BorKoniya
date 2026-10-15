import pytest
from datetime import datetime, date, timezone
from fastapi.testclient import TestClient

from main import app, init_db_and_seed
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.entities import (
    User,
    Profile,
    Subscription,
    Interest,
    BlockedUser,
    ContactSharingPermission,
    ContactSharingAuditLog,
)

PHONE_ROHIT = "9988770001"
PHONE_PRIYA = "9988770002"
PHONE_ANKITA = "9988770003"
TEST_PASSWORD = "testpassword123"


def create_or_get_user(db, phone, email, name, gender, is_sub=False):
    u = db.query(User).filter(User.phone_number == phone).first()
    if not u:
        u = User(
            phone_number=phone,
            email=email,
            is_phone_verified=True,
            is_email_verified=True,
            password_hash=get_password_hash(TEST_PASSWORD),
        )
        db.add(u)
        db.flush()
        p = Profile(
            user_id=u.id,
            first_name=name,
            last_name="Community",
            gender=gender,
            date_of_birth=date(1994, 6, 12),
            community="Sadgope",
            status="ACTIVE",
            profile_completion_pct=95,
            about_me=f"Profile of {name}",
        )
        db.add(p)
        db.flush()
    else:
        u.password_hash = get_password_hash(TEST_PASSWORD)
        u.email = email
        p = db.query(Profile).filter(Profile.user_id == u.id).first()

    # Subscription state
    db.query(Subscription).filter(Subscription.user_id == u.id).delete()
    if is_sub:
        sub = Subscription(
            user_id=u.id,
            plan_id="monthly",
            status="ACTIVE",
            starts_at=datetime.now(timezone.utc),
            expires_at=datetime(2099, 1, 1, tzinfo=timezone.utc),
        )
        db.add(sub)

    db.commit()
    return str(u.id), str(p.id)


@pytest.fixture(scope="session", autouse=True)
def setup_test_users():
    init_db_and_seed()
    with SessionLocal() as db:
        create_or_get_user(db, PHONE_ROHIT, "rohit@borkonya.com", "Rohit", "MALE", is_sub=True)
        create_or_get_user(db, PHONE_PRIYA, "priya@borkonya.com", "Priya", "FEMALE", is_sub=True)
        create_or_get_user(db, PHONE_ANKITA, "ankita@borkonya.com", "Ankita", "FEMALE", is_sub=False)


@pytest.fixture(autouse=True)
def clean_blocks_and_permissions():
    def _do_clean():
        with SessionLocal() as db:
            u_rohit = db.query(User).filter(User.phone_number == PHONE_ROHIT).first()
            u_priya = db.query(User).filter(User.phone_number == PHONE_PRIYA).first()
            u_ankita = db.query(User).filter(User.phone_number == PHONE_ANKITA).first()
            u_ids = [u.id for u in [u_rohit, u_priya, u_ankita] if u]
            p_ids = []
            for u in [u_rohit, u_priya, u_ankita]:
                if u:
                    p = db.query(Profile).filter(Profile.user_id == u.id).first()
                    if p:
                        p_ids.append(p.id)
            if u_ids:
                db.query(ContactSharingAuditLog).filter(
                    (ContactSharingAuditLog.owner_user_id.in_(u_ids))
                    | (ContactSharingAuditLog.recipient_user_id.in_(u_ids))
                ).delete(synchronize_session=False)
                db.query(ContactSharingPermission).filter(
                    (ContactSharingPermission.owner_user_id.in_(u_ids))
                    | (ContactSharingPermission.recipient_user_id.in_(u_ids))
                ).delete(synchronize_session=False)
            if p_ids:
                db.query(BlockedUser).filter(
                    (BlockedUser.blocker_profile_id.in_(p_ids))
                    | (BlockedUser.blocked_profile_id.in_(p_ids))
                ).delete(synchronize_session=False)
                db.query(Interest).filter(
                    (Interest.sender_profile_id.in_(p_ids))
                    | (Interest.receiver_profile_id.in_(p_ids))
                ).delete(synchronize_session=False)
            db.commit()

    _do_clean()
    yield
    _do_clean()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def get_auth(client, phone):
    res = client.post("/api/v1/auth/login", json={"phone_or_email": phone, "password": TEST_PASSWORD})
    assert res.status_code == 200, f"Login failed for {phone}: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def rohit_auth(client):
    return get_auth(client, PHONE_ROHIT)


@pytest.fixture
def priya_auth(client):
    return get_auth(client, PHONE_PRIYA)


@pytest.fixture
def ankita_auth(client):
    return get_auth(client, PHONE_ANKITA)


def test_private_by_default_even_for_premium_subscribers(client, rohit_auth, priya_auth):
    """
    1. Two premium subscribers (Rohit & Priya) cannot see each other's contact details by default.
    """
    with SessionLocal() as db:
        priya_uid, priya_pid = create_or_get_user(db, PHONE_PRIYA, "priya@borkonya.com", "Priya", "FEMALE", is_sub=True)
        # Clean any prior permissions or interests
        db.query(ContactSharingPermission).filter(
            (ContactSharingPermission.owner_user_id == priya_uid)
            | (ContactSharingPermission.recipient_user_id == priya_uid)
        ).delete()
        db.query(Interest).filter(
            (Interest.sender_profile_id == priya_pid)
            | (Interest.receiver_profile_id == priya_pid)
        ).delete()
        db.commit()

    # Rohit (premium) views Priya (premium)
    res = client.get(f"/api/v1/profile/{priya_pid}", headers=rohit_auth)
    assert res.status_code == 200
    data = res.json()
    assert data["revealed_phone"] is None
    assert data["revealed_email"] is None
    assert data["phone_shared"] is False
    assert data["email_shared"] is False
    assert data["is_contact_revealed"] is False
    assert "private" in data["contact_phone_masked"].lower()
    assert "private" in data["contact_email_masked"].lower()


def test_free_user_cannot_access_private_contacts_via_api(client, ankita_auth):
    """
    2. A free user cannot access private contact details through direct API calls.
    """
    with SessionLocal() as db:
        rohit_user = db.query(User).filter(User.phone_number == PHONE_ROHIT).first()
        rohit_prof = db.query(Profile).filter(Profile.user_id == rohit_user.id).first()
        rohit_pid = str(rohit_prof.id)

    res = client.get(f"/api/v1/profile/{rohit_pid}", headers=ankita_auth)
    assert res.status_code == 200
    data = res.json()
    assert data["revealed_phone"] is None
    assert data["revealed_email"] is None
    assert data["phone_shared"] is False
    assert data["email_shared"] is False


def test_connection_acceptance_does_not_reveal_contacts(client, rohit_auth, priya_auth):
    """
    3. Accepting a connection request does not reveal contact information.
    """
    with SessionLocal() as db:
        rohit_user = db.query(User).filter(User.phone_number == PHONE_ROHIT).first()
        rohit_prof = db.query(Profile).filter(Profile.user_id == rohit_user.id).first()
        priya_user = db.query(User).filter(User.phone_number == PHONE_PRIYA).first()
        priya_prof = db.query(Profile).filter(Profile.user_id == priya_user.id).first()
        rohit_uid, rohit_pid = str(rohit_user.id), str(rohit_prof.id)
        priya_uid, priya_pid = str(priya_user.id), str(priya_prof.id)

        # Create accepted connection between Rohit and Priya
        db.query(Interest).filter(
            (Interest.sender_profile_id == rohit_pid) & (Interest.receiver_profile_id == priya_pid)
        ).delete()
        db.query(Interest).filter(
            (Interest.sender_profile_id == priya_pid) & (Interest.receiver_profile_id == rohit_pid)
        ).delete()
        conn = Interest(
            sender_profile_id=rohit_pid,
            receiver_profile_id=priya_pid,
            status="ACCEPTED",
            responded_at=datetime.now(timezone.utc),
        )
        db.add(conn)
        db.query(ContactSharingPermission).filter(
            (ContactSharingPermission.owner_user_id == rohit_uid) & (ContactSharingPermission.recipient_user_id == priya_uid)
        ).delete()
        db.commit()

    # Priya views Rohit's profile after connection is accepted
    res = client.get(f"/api/v1/profile/{rohit_pid}", headers=priya_auth)
    assert res.status_code == 200
    data = res.json()
    assert data["revealed_phone"] is None, "Phone should not be revealed automatically upon connection"
    assert data["revealed_email"] is None, "Email should not be revealed automatically upon connection"
    assert data["phone_shared"] is False
    assert data["email_shared"] is False


def test_granular_sharing_phone_only_and_email_only(client, rohit_auth, priya_auth, ankita_auth):
    """
    4 & 5 & 6.
    - Rohit shares phone number with Priya -> Priya sees phone, but not email.
    - Rohit shares email address with Ankita -> Ankita sees email, but not phone.
    - Permissions granted to one recipient do not apply to another recipient.
    """
    with SessionLocal() as db:
        rohit_user = db.query(User).filter(User.phone_number == PHONE_ROHIT).first()
        rohit_prof = db.query(Profile).filter(Profile.user_id == rohit_user.id).first()
        priya_user = db.query(User).filter(User.phone_number == PHONE_PRIYA).first()
        priya_prof = db.query(Profile).filter(Profile.user_id == priya_user.id).first()
        ankita_user = db.query(User).filter(User.phone_number == PHONE_ANKITA).first()
        ankita_prof = db.query(Profile).filter(Profile.user_id == ankita_user.id).first()
        rohit_pid = str(rohit_prof.id)
        priya_pid = str(priya_prof.id)
        ankita_pid = str(ankita_prof.id)

        # Ensure accepted connection with Priya
        c1 = db.query(Interest).filter(
            ((Interest.sender_profile_id == rohit_pid) & (Interest.receiver_profile_id == priya_pid))
            | ((Interest.sender_profile_id == priya_pid) & (Interest.receiver_profile_id == rohit_pid))
        ).first()
        if not c1:
            db.add(Interest(sender_profile_id=rohit_pid, receiver_profile_id=priya_pid, status="ACCEPTED", responded_at=datetime.now(timezone.utc)))
        else:
            c1.status = "ACCEPTED"

        # Ensure accepted connection with Ankita
        c2 = db.query(Interest).filter(
            ((Interest.sender_profile_id == rohit_pid) & (Interest.receiver_profile_id == ankita_pid))
            | ((Interest.sender_profile_id == ankita_pid) & (Interest.receiver_profile_id == rohit_pid))
        ).first()
        if not c2:
            db.add(Interest(sender_profile_id=rohit_pid, receiver_profile_id=ankita_pid, status="ACCEPTED", responded_at=datetime.now(timezone.utc)))
        else:
            c2.status = "ACCEPTED"
        db.commit()

    # Step A: Rohit grants phone only to Priya
    put_res = client.put(
        f"/api/v1/connections/{priya_pid}/contact-permissions",
        headers=rohit_auth,
        json={"phone_shared": True, "email_shared": False},
    )
    assert put_res.status_code == 200, f"Error: {put_res.text}"
    assert put_res.json()["phone_shared"] is True
    assert put_res.json()["email_shared"] is False

    # Step B: Rohit grants email only to Ankita
    put_res2 = client.put(
        f"/api/v1/connections/{ankita_pid}/contact-permissions",
        headers=rohit_auth,
        json={"phone_shared": False, "email_shared": True},
    )
    assert put_res2.status_code == 200, f"Error: {put_res2.text}"
    assert put_res2.json()["phone_shared"] is False
    assert put_res2.json()["email_shared"] is True

    # Check Priya views Rohit: sees phone, NO email
    res_priya = client.get(f"/api/v1/profile/{rohit_pid}", headers=priya_auth)
    assert res_priya.status_code == 200
    p_data = res_priya.json()
    assert p_data["revealed_phone"] == PHONE_ROHIT
    assert p_data["phone_shared"] is True
    assert p_data["revealed_email"] is None
    assert p_data["email_shared"] is False

    # Check Ankita views Rohit: sees email, NO phone
    res_ankita = client.get(f"/api/v1/profile/{rohit_pid}", headers=ankita_auth)
    assert res_ankita.status_code == 200
    a_data = res_ankita.json()
    assert a_data["revealed_phone"] is None
    assert a_data["phone_shared"] is False
    assert a_data["revealed_email"] == "rohit@borkonya.com"
    assert a_data["email_shared"] is True

    # Shared details endpoint verification
    sd_priya = client.get(f"/api/v1/connections/{rohit_pid}/shared-contact-details", headers=priya_auth)
    assert sd_priya.status_code == 200
    assert sd_priya.json()["phone_number"] == PHONE_ROHIT
    assert sd_priya.json()["email"] is None

    sd_ankita = client.get(f"/api/v1/connections/{rohit_pid}/shared-contact-details", headers=ankita_auth)
    assert sd_ankita.status_code == 200
    assert sd_ankita.json()["phone_number"] is None
    assert sd_ankita.json()["email"] == "rohit@borkonya.com"


def test_only_owner_can_modify_permissions(client, priya_auth):
    """
    7. Only the owner can modify or revoke their sharing permissions.
    Priya cannot modify what Rohit shares with her or anyone else.
    """
    with SessionLocal() as db:
        rohit_user = db.query(User).filter(User.phone_number == PHONE_ROHIT).first()
        rohit_prof = db.query(Profile).filter(Profile.user_id == rohit_user.id).first()
        priya_user = db.query(User).filter(User.phone_number == PHONE_PRIYA).first()
        priya_prof = db.query(Profile).filter(Profile.user_id == priya_user.id).first()
        rohit_uid, rohit_pid = str(rohit_user.id), str(rohit_prof.id)
        priya_uid, priya_pid = str(priya_user.id), str(priya_prof.id)

        # Ensure accepted connection exists
        c = db.query(Interest).filter(
            ((Interest.sender_profile_id == rohit_pid) & (Interest.receiver_profile_id == priya_pid))
            | ((Interest.sender_profile_id == priya_pid) & (Interest.receiver_profile_id == rohit_pid))
        ).first()
        if not c:
            db.add(Interest(sender_profile_id=rohit_pid, receiver_profile_id=priya_pid, status="ACCEPTED", responded_at=datetime.now(timezone.utc)))
        else:
            c.status = "ACCEPTED"

        # Explicitly set Rohit's sharing towards Priya: phone only
        rohit_perm = db.query(ContactSharingPermission).filter(
            ContactSharingPermission.owner_user_id == rohit_uid,
            ContactSharingPermission.recipient_user_id == priya_uid,
        ).first()
        if not rohit_perm:
            rohit_perm = ContactSharingPermission(
                owner_user_id=rohit_uid,
                recipient_user_id=priya_uid,
                phone_shared=True,
                email_shared=False,
            )
            db.add(rohit_perm)
        else:
            rohit_perm.phone_shared = True
            rohit_perm.email_shared = False
            rohit_perm.revoked_at = None
        db.commit()

    # Priya calls update on connection with Rohit -> this updates what PRIYA shares, NOT what Rohit shares!
    res = client.put(
        f"/api/v1/connections/{rohit_pid}/contact-permissions",
        headers=priya_auth,
        json={"phone_shared": True, "email_shared": True},
    )
    assert res.status_code == 200
    assert res.json()["owner_user_id"] != rohit_uid

    # Verify Rohit's sharing towards Priya has NOT changed
    with SessionLocal() as db:
        rohit_perm = db.query(ContactSharingPermission).filter(
            ContactSharingPermission.owner_user_id == rohit_uid,
            ContactSharingPermission.recipient_user_id == priya_uid,
        ).first()
        # Rohit still only shares phone, not email
        assert rohit_perm is not None
        assert rohit_perm.phone_shared is True
        assert rohit_perm.email_shared is False


def test_revocation_prevents_future_reads(client, rohit_auth, priya_auth):
    """
    8. Revocation prevents future unauthorized reads immediately.
    """
    with SessionLocal() as db:
        rohit_user = db.query(User).filter(User.phone_number == PHONE_ROHIT).first()
        rohit_prof = db.query(Profile).filter(Profile.user_id == rohit_user.id).first()
        priya_user = db.query(User).filter(User.phone_number == PHONE_PRIYA).first()
        priya_prof = db.query(Profile).filter(Profile.user_id == priya_user.id).first()
        rohit_uid, rohit_pid = str(rohit_user.id), str(rohit_prof.id)
        priya_uid, priya_pid = str(priya_user.id), str(priya_prof.id)

        # Ensure connection
        c = db.query(Interest).filter(
            ((Interest.sender_profile_id == rohit_pid) & (Interest.receiver_profile_id == priya_pid))
            | ((Interest.sender_profile_id == priya_pid) & (Interest.receiver_profile_id == rohit_pid))
        ).first()
        if not c:
            db.add(Interest(sender_profile_id=rohit_pid, receiver_profile_id=priya_pid, status="ACCEPTED", responded_at=datetime.now(timezone.utc)))
        else:
            c.status = "ACCEPTED"

        # Explicitly ensure Rohit shares phone initially
        rohit_perm = db.query(ContactSharingPermission).filter(
            ContactSharingPermission.owner_user_id == rohit_uid,
            ContactSharingPermission.recipient_user_id == priya_uid,
        ).first()
        if not rohit_perm:
            rohit_perm = ContactSharingPermission(
                owner_user_id=rohit_uid,
                recipient_user_id=priya_uid,
                phone_shared=True,
                email_shared=False,
            )
            db.add(rohit_perm)
        else:
            rohit_perm.phone_shared = True
            rohit_perm.email_shared = False
            rohit_perm.revoked_at = None
        db.commit()

    # Rohit revokes all permissions for Priya
    del_res = client.delete(f"/api/v1/connections/{priya_pid}/contact-permissions", headers=rohit_auth)
    assert del_res.status_code == 200
    assert del_res.json()["phone_shared"] is False
    assert del_res.json()["email_shared"] is False
    assert del_res.json()["revoked_at"] is not None

    # Priya attempts to read Rohit's profile again -> phone is now hidden!
    res = client.get(f"/api/v1/profile/{rohit_pid}", headers=priya_auth)
    assert res.status_code == 200
    data = res.json()
    assert data["revealed_phone"] is None
    assert data["revealed_email"] is None
    assert data["phone_shared"] is False
    assert data["email_shared"] is False


def test_blocked_users_cannot_access_contact_details(client, rohit_auth, priya_auth):
    """
    9. Blocked users cannot access contact details even if previously shared.
    """
    with SessionLocal() as db:
        rohit_user = db.query(User).filter(User.phone_number == PHONE_ROHIT).first()
        rohit_prof = db.query(Profile).filter(Profile.user_id == rohit_user.id).first()
        priya_user = db.query(User).filter(User.phone_number == PHONE_PRIYA).first()
        priya_prof = db.query(Profile).filter(Profile.user_id == priya_user.id).first()
        rohit_uid, rohit_pid = str(rohit_user.id), str(rohit_prof.id)
        priya_uid, priya_pid = str(priya_user.id), str(priya_prof.id)

        # Ensure connection
        c = db.query(Interest).filter(
            ((Interest.sender_profile_id == rohit_pid) & (Interest.receiver_profile_id == priya_pid))
            | ((Interest.sender_profile_id == priya_pid) & (Interest.receiver_profile_id == rohit_pid))
        ).first()
        if not c:
            db.add(Interest(sender_profile_id=rohit_pid, receiver_profile_id=priya_pid, status="ACCEPTED", responded_at=datetime.now(timezone.utc)))
            db.commit()

        # Re-grant permission
        perm = db.query(ContactSharingPermission).filter(
            ContactSharingPermission.owner_user_id == rohit_uid,
            ContactSharingPermission.recipient_user_id == priya_uid,
        ).first()
        if not perm:
            perm = ContactSharingPermission(
                owner_user_id=rohit_uid,
                recipient_user_id=priya_uid,
                phone_shared=True,
                email_shared=True,
            )
            db.add(perm)
        else:
            perm.phone_shared = True
            perm.email_shared = True
            perm.revoked_at = None

        # Block Priya
        db.query(BlockedUser).filter(
            (BlockedUser.blocker_profile_id == rohit_pid) & (BlockedUser.blocked_profile_id == priya_pid)
        ).delete()
        block = BlockedUser(
            blocker_profile_id=rohit_pid,
            blocked_profile_id=priya_pid,
        )
        db.add(block)
        db.commit()

    try:
        # Priya attempts to read shared details while blocked
        res = client.get(f"/api/v1/connections/{rohit_pid}/shared-contact-details", headers=priya_auth)
        assert res.status_code in [403, 404]
    finally:
        # Always clean up block
        with SessionLocal() as db:
            db.query(BlockedUser).filter(
                (BlockedUser.blocker_profile_id == rohit_pid) & (BlockedUser.blocked_profile_id == priya_pid)
            ).delete()
            db.commit()


def test_contact_privacy_list_endpoint(client, rohit_auth):
    """
    Verifies GET /api/v1/connections/contact-privacy returns the list of accepted
    connections with their granular sharing statuses.
    """
    with SessionLocal() as db:
        rohit_user = db.query(User).filter(User.phone_number == PHONE_ROHIT).first()
        rohit_prof = db.query(Profile).filter(Profile.user_id == rohit_user.id).first()
        priya_user = db.query(User).filter(User.phone_number == PHONE_PRIYA).first()
        priya_prof = db.query(Profile).filter(Profile.user_id == priya_user.id).first()
        ankita_user = db.query(User).filter(User.phone_number == PHONE_ANKITA).first()
        ankita_prof = db.query(Profile).filter(Profile.user_id == ankita_user.id).first()
        rohit_pid = str(rohit_prof.id)
        priya_pid = str(priya_prof.id)
        ankita_pid = str(ankita_prof.id)

        for pid in [priya_pid, ankita_pid]:
            c = db.query(Interest).filter(
                ((Interest.sender_profile_id == rohit_pid) & (Interest.receiver_profile_id == pid))
                | ((Interest.sender_profile_id == pid) & (Interest.receiver_profile_id == rohit_pid))
            ).first()
            if not c:
                db.add(Interest(sender_profile_id=rohit_pid, receiver_profile_id=pid, status="ACCEPTED", responded_at=datetime.now(timezone.utc)))
            else:
                c.status = "ACCEPTED"
        db.commit()

    res = client.get("/api/v1/connections/contact-privacy", headers=rohit_auth)
    assert res.status_code == 200
    items = res.json()
    assert isinstance(items, list)
    assert len(items) >= 2
    first = items[0]
    assert "my_sharing" in first
    assert "their_sharing" in first
    assert "phone_shared" in first["my_sharing"]
    assert "email_shared" in first["my_sharing"]
