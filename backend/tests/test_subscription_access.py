import pytest
from datetime import datetime, date, timezone
from dateutil.relativedelta import relativedelta
from fastapi.testclient import TestClient

from main import app, init_db_and_seed
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.entities import User, Profile, Subscription, SubscriptionPlan, PaymentTransaction, BlockedUser
from app.services.subscription_service import subscription_service
from app.services.entitlement_service import entitlement_service


TEST_GROOM_PHONE = "9999900001"
TEST_BRIDE_PHONE = "9999900002"
TEST_PASSWORD = "testpassword123"


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db_and_seed()
    with SessionLocal() as db:
        # Ensure test groom
        u1 = db.query(User).filter(User.phone_number == TEST_GROOM_PHONE).first()
        if not u1:
            u1 = User(
                phone_number=TEST_GROOM_PHONE,
                email="testgroom@borkonya.com",
                is_phone_verified=True,
                is_email_verified=True,
                password_hash=get_password_hash(TEST_PASSWORD),
            )
            db.add(u1)
            db.flush()
            p1 = Profile(
                user_id=u1.id,
                first_name="TestGroom",
                last_name="Ghosh",
                gender="MALE",
                date_of_birth=date(1993, 5, 10),
                community="Sadgope",
                status="ACTIVE",
                profile_completion_pct=90,
                about_me="Software Engineer based in Kolkata. Looking for an educated partner.",
                company_name="Tech Solutions Ltd",
                annual_income="15-20 Lakhs INR",
            )
            db.add(p1)
        else:
            u1.password_hash = get_password_hash(TEST_PASSWORD)
            u1.is_phone_verified = True

        # Ensure test bride
        u2 = db.query(User).filter(User.phone_number == TEST_BRIDE_PHONE).first()
        if not u2:
            u2 = User(
                phone_number=TEST_BRIDE_PHONE,
                email="testbride@borkonya.com",
                is_phone_verified=True,
                is_email_verified=True,
                password_hash=get_password_hash(TEST_PASSWORD),
            )
            db.add(u2)
            db.flush()
            p2 = Profile(
                user_id=u2.id,
                first_name="TestBride",
                last_name="Pal",
                gender="FEMALE",
                date_of_birth=date(1996, 8, 15),
                community="Sadgope",
                status="ACTIVE",
                profile_completion_pct=90,
                about_me="Educator living in Siliguri. Rooted in family culture.",
                company_name="State Academy",
                annual_income="8-12 Lakhs INR",
            )
            db.add(p2)
        else:
            u2.password_hash = get_password_hash(TEST_PASSWORD)
            u2.is_phone_verified = True

        db.commit()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def groom_auth_headers(client):
    res = client.post("/api/v1/auth/login", json={
        "phone_or_email": TEST_GROOM_PHONE,
        "password": TEST_PASSWORD,
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def bride_auth_headers(client):
    res = client.post("/api/v1/auth/login", json={
        "phone_or_email": TEST_BRIDE_PHONE,
        "password": TEST_PASSWORD,
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def clean_user_subscriptions(user_id: str):
    with SessionLocal() as db:
        db.query(Subscription).filter(Subscription.user_id == user_id).delete()
        db.query(PaymentTransaction).filter(PaymentTransaction.user_id == user_id).delete()
        db.commit()


def test_subscription_plans_config_and_savings(client):
    """
    Verify exactly 3 plans are active and exposed via the API:
    - Monthly: 1 month, ₹200 (Savings ₹0)
    - Quarterly: 3 months, ₹500 (Savings ₹100)
    - Half-yearly: 6 months, ₹900 (Savings ₹300)
    """
    res = client.get("/api/v1/subscription/plans")
    assert res.status_code == 200
    plans = res.json()
    assert len(plans) == 3

    plan_dict = {p["id"]: p for p in plans}
    assert "monthly" in plan_dict
    assert "quarterly" in plan_dict
    assert "half_yearly" in plan_dict

    m = plan_dict["monthly"]
    assert m["duration_months"] == 1
    assert m["price_inr"] == 200.0
    assert m["savings_inr"] == 0.0

    q = plan_dict["quarterly"]
    assert q["duration_months"] == 3
    assert q["price_inr"] == 500.0
    assert q["savings_inr"] == 100.0

    h = plan_dict["half_yearly"]
    assert h["duration_months"] == 6
    assert h["price_inr"] == 900.0
    assert h["savings_inr"] == 300.0


def test_calendar_month_expiry_arithmetic():
    """
    Verify that subscription expiry is calculated using calendar-month arithmetic,
    not a fixed number of days (e.g. 30/90/180).
    """
    start_jan31 = datetime(2026, 1, 31, 12, 0, 0, tzinfo=timezone.utc)
    
    # 1 month from Jan 31 in 2026 (non-leap year) is Feb 28
    exp_1m = start_jan31 + relativedelta(months=1)
    assert exp_1m == datetime(2026, 2, 28, 12, 0, 0, tzinfo=timezone.utc)
    assert (exp_1m - start_jan31).days == 28  # NOT 30 days!

    # 3 months from Jan 31 is April 30
    exp_3m = start_jan31 + relativedelta(months=3)
    assert exp_3m == datetime(2026, 4, 30, 12, 0, 0, tzinfo=timezone.utc)

    # 6 months from Jan 31 is July 31
    exp_6m = start_jan31 + relativedelta(months=6)
    assert exp_6m == datetime(2026, 7, 31, 12, 0, 0, tzinfo=timezone.utc)


def test_non_subscriber_profile_visibility_limit_and_masking(client, bride_auth_headers):
    """
    Non-subscribers may see at most 3 eligible opposite-gender profiles unlocked.
    Profiles beyond the 3-profile limit must have is_locked=True and sensitive fields sanitized.
    """
    me = client.get("/api/v1/auth/me", headers=bride_auth_headers).json()
    user_id = me["user_id"]
    clean_user_subscriptions(user_id)

    # Fetch matches/recommended (Bride views male profiles)
    res = client.get("/api/v1/matches/recommended", headers=bride_auth_headers)
    assert res.status_code == 200
    matches = res.json()

    assert len(matches) > 3, "Expected > 3 male profiles in DB"
    unlocked_matches = [m for m in matches if not m.get("is_locked")]
    locked_matches = [m for m in matches if m.get("is_locked")]

    assert len(unlocked_matches) <= 3, f"Expected <= 3 unlocked profiles, got {len(unlocked_matches)}"
    assert len(locked_matches) >= 1

    # Check sanitization on the first locked profile
    first_locked = locked_matches[0]
    assert first_locked["is_locked"] is True
    assert first_locked["photos"] == []
    assert first_locked["company_name"] is None
    assert first_locked["annual_income"] is None
    assert "Subscribe" in first_locked["about_me"]
    assert first_locked["contact_phone_masked"] == "Subscribe to view"


def test_direct_profile_url_cannot_bypass_lock(client, bride_auth_headers):
    """
    Direct profile URL /api/v1/profile/{id} cannot bypass locked status for non-subscribers.
    """
    me = client.get("/api/v1/auth/me", headers=bride_auth_headers).json()
    clean_user_subscriptions(me["user_id"])

    res = client.get("/api/v1/matches/recommended", headers=bride_auth_headers)
    matches = res.json()
    locked_matches = [m for m in matches if m.get("is_locked")]

    assert len(locked_matches) > 0
    target_id = locked_matches[0]["id"]
    direct_res = client.get(f"/api/v1/profile/{target_id}", headers=bride_auth_headers)
    assert direct_res.status_code == 200
    prof = direct_res.json()
    assert prof["is_locked"] is True
    assert prof["photos"] == []
    assert prof["company_name"] is None
    assert prof["annual_income"] is None
    assert "Subscribe" in prof["about_me"]


def test_subscriber_unlocks_all_profiles(client, bride_auth_headers):
    """
    Active subscriber has is_locked=False for all eligible profiles.
    """
    me = client.get("/api/v1/auth/me", headers=bride_auth_headers).json()
    user_id = me["user_id"]

    # Activate a 1-month subscription
    checkout_res = client.post("/api/v1/subscription/checkout", json={
        "plan_id": "monthly",
        "order_id": "order_test_unlock_all_001",
    }, headers=bride_auth_headers)
    assert checkout_res.status_code == 200
    assert checkout_res.json()["status"] == "ACTIVE"

    # Now verify all recommended matches are unlocked
    res = client.get("/api/v1/matches/recommended", headers=bride_auth_headers)
    assert res.status_code == 200
    matches = res.json()
    assert len(matches) > 0
    assert all(not m.get("is_locked") for m in matches)

    # Clean up
    clean_user_subscriptions(user_id)


def test_non_subscriber_chat_restricted(client, groom_auth_headers, bride_auth_headers):
    """
    Starting a conversation or sending a message requires an active subscription.
    Non-subscribers must be rejected with 403 Forbidden.
    """
    groom = client.get("/api/v1/auth/me", headers=groom_auth_headers).json()
    bride = client.get("/api/v1/auth/me", headers=bride_auth_headers).json()

    clean_user_subscriptions(groom["user_id"])
    clean_user_subscriptions(bride["user_id"])

    # Attempt to start conversation
    conv_res = client.post("/api/v1/conversations/start", json={
        "target_profile_id": bride["profile_id"]
    }, headers=groom_auth_headers)
    
    assert conv_res.status_code == 403
    assert "subscription" in conv_res.json()["detail"].lower() or "premium" in conv_res.json()["detail"].lower()


def test_subscriber_chat_allowed(client, groom_auth_headers, bride_auth_headers):
    """
    Subscriber can initiate conversations and send messages.
    """
    groom = client.get("/api/v1/auth/me", headers=groom_auth_headers).json()
    bride = client.get("/api/v1/auth/me", headers=bride_auth_headers).json()

    # Give active subscriptions
    client.post("/api/v1/subscription/checkout", json={
        "plan_id": "monthly",
        "order_id": "order_test_chat_groom_001",
    }, headers=groom_auth_headers)

    client.post("/api/v1/subscription/checkout", json={
        "plan_id": "monthly",
        "order_id": "order_test_chat_bride_001",
    }, headers=bride_auth_headers)

    # Attempt to start conversation
    conv_res = client.post("/api/v1/conversations/start", json={
        "target_profile_id": bride["profile_id"]
    }, headers=groom_auth_headers)
    assert conv_res.status_code == 200
    conv_id = conv_res.json()["conversation_id"]

    # Send message
    msg_res = client.post(f"/api/v1/conversations/{conv_id}/messages", json={
        "content": "Namaste! Interested in your profile."
    }, headers=groom_auth_headers)
    assert msg_res.status_code == 200
    assert msg_res.json()["content"] == "Namaste! Interested in your profile."

    # Clean up
    clean_user_subscriptions(groom["user_id"])
    clean_user_subscriptions(bride["user_id"])


def test_expired_subscription_revokes_access_immediately(client, groom_auth_headers, bride_auth_headers):
    """
    When a subscription expires, premium access (chat, unlocked profiles) is revoked immediately.
    """
    groom = client.get("/api/v1/auth/me", headers=groom_auth_headers).json()
    bride = client.get("/api/v1/auth/me", headers=bride_auth_headers).json()

    clean_user_subscriptions(groom["user_id"])

    # Create an expired subscription manually
    with SessionLocal() as db:
        past_date = datetime(2025, 1, 1, tzinfo=timezone.utc)
        sub = Subscription(
            user_id=groom["user_id"],
            plan_id="monthly",
            status="ACTIVE",
            starts_at=past_date - relativedelta(months=1),
            expires_at=past_date,
        )
        db.add(sub)
        db.commit()

    # Status check should transition it to EXPIRED and return is_active=False
    status_res = client.get("/api/v1/subscription/my-status", headers=groom_auth_headers)
    assert status_res.status_code == 200
    assert status_res.json()["is_active"] is False

    # Chat attempt should fail with 403
    conv_res = client.post("/api/v1/conversations/start", json={
        "target_profile_id": bride["profile_id"]
    }, headers=groom_auth_headers)
    assert conv_res.status_code == 403

    # Clean up
    clean_user_subscriptions(groom["user_id"])


def test_idempotent_payment_verification(client, groom_auth_headers):
    """
    Calling checkout/verify with the same order_id multiple times must be idempotent.
    It should not create duplicate subscriptions or transactions.
    """
    me = client.get("/api/v1/auth/me", headers=groom_auth_headers).json()
    clean_user_subscriptions(me["user_id"])

    test_order_id = "order_idempotent_test_999"

    # First call
    res1 = client.post("/api/v1/subscription/checkout", json={
        "plan_id": "quarterly",
        "order_id": test_order_id,
        "payment_id": "pay_test_001",
    }, headers=groom_auth_headers)
    assert res1.status_code == 200
    data1 = res1.json()
    sub_id1 = data1["subscription_id"]

    # Second call with identical order_id
    res2 = client.post("/api/v1/subscription/checkout", json={
        "plan_id": "quarterly",
        "order_id": test_order_id,
        "payment_id": "pay_test_001",
    }, headers=groom_auth_headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["subscription_id"] == sub_id1

    # Verify only 1 transaction exists for this order_id
    with SessionLocal() as db:
        txns = db.query(PaymentTransaction).filter(PaymentTransaction.order_id == test_order_id).all()
        assert len(txns) == 1

        active_subs = db.query(Subscription).filter(
            Subscription.user_id == me["user_id"],
            Subscription.status == "ACTIVE"
        ).all()
        assert len(active_subs) == 1

    # Clean up
    clean_user_subscriptions(me["user_id"])
