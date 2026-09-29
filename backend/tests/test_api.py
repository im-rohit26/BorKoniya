import pytest
from fastapi.testclient import TestClient
from main import app, init_db_and_seed


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db_and_seed()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers(client):
    res = client.post("/api/v1/auth/login", json={
        "phone_or_email": "9876543210",
        "password": "borkonya123",
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user2_auth_headers(client):
    res = client.post("/api/v1/auth/login", json={
        "phone_or_email": "9876543211",
        "password": "borkonya123",
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "BorKonya Backend"


def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["brand"] == "BorKonya"
    assert "Sadgope" in data["community"]


def test_auth_login_invalid(client):
    res = client.post("/api/v1/auth/login", json={
        "phone_or_email": "9876543210",
        "password": "wrongpassword",
    })
    assert res.status_code == 401
    assert "Incorrect" in res.json()["detail"]


def test_auth_me_unauthorized(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_auth_me_authorized(client, auth_headers):
    res = client.get("/api/v1/auth/me", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["phone_number"] == "9876543210"
    assert data["first_name"] == "Priyanka"


def test_send_and_verify_otp(client):
    send_res = client.post("/api/v1/auth/send-otp", json={"phone_number": "9876543210"})
    assert send_res.status_code == 200
    data = send_res.json()
    assert data["phone_number"] == "9876543210"
    otp_code = data.get("demo_otp", "749201")

    verify_res = client.post("/api/v1/auth/verify-otp", json={
        "phone_number": "9876543210",
        "otp_code": otp_code,
    })
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "VERIFIED"


def test_forgot_and_reset_password(client):
    # Forgot password sends OTP
    forgot_res = client.post("/api/v1/auth/forgot-password", json={
        "phone_or_email": "9876543210"
    })
    assert forgot_res.status_code == 200
    otp = forgot_res.json().get("demo_otp", "749201")

    # Reset password with password too short (< 8 chars)
    short_res = client.post("/api/v1/auth/reset-password", json={
        "phone_or_email": "9876543210",
        "otp_code": otp,
        "new_password": "short",
    })
    assert short_res.status_code in [400, 422]

    # Reset password with correct OTP and 8+ char password
    reset_res = client.post("/api/v1/auth/reset-password", json={
        "phone_or_email": "9876543210",
        "otp_code": otp,
        "new_password": "borkonya123",
    })
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "SUCCESS"


def test_coupon_validation_bor50(client):
    res = client.post("/api/v1/subscription/coupon/apply", json={
        "code": "BOR50",
        "plan_id": "monthly_premium",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is True
    assert data["original_price_inr"] == 200.00
    assert data["discount_amount_inr"] == 100.00
    assert data["net_payable_inr"] == 100.00

    res_invalid = client.post("/api/v1/subscription/coupon/apply", json={
        "code": "INVALID_CODE",
        "plan_id": "monthly_premium",
    })
    assert res.status_code == 200
    assert res_invalid.json()["is_valid"] is False


def test_master_data_communities(client):
    res = client.get("/api/v1/master/communities")
    assert res.status_code == 200
    communities = res.json()
    assert len(communities) >= 2
    names = [c["name"] for c in communities]
    assert "Sadgope" in names
    assert "Gowala / Goala" in names


def test_search_profiles(client):
    res = client.get("/api/v1/search?gender=FEMALE")
    assert res.status_code == 200
    profiles = res.json()
    assert isinstance(profiles, list)
    for p in profiles:
        assert p["gender"] == "FEMALE"
        assert p["is_contact_revealed"] is False
        assert p["revealed_phone"] is None
        assert p["revealed_email"] is None
        assert "••••" in p["contact_phone_masked"]


def test_recommended_matches(client):
    res = client.get("/api/v1/matches/recommended")
    assert res.status_code == 200
    matches = res.json()
    assert len(matches) > 0
    first = matches[0]
    assert "match_score" in first
    assert first["match_score"] >= 60
    assert "match_breakdown" in first
    assert len(first["match_breakdown"]) > 0


def test_match_categories(client):
    new_res = client.get("/api/v1/matches/new")
    assert new_res.status_code == 200
    assert isinstance(new_res.json(), list)

    near_res = client.get("/api/v1/matches/near-you?state=West+Bengal")
    assert near_res.status_code == 200
    assert isinstance(near_res.json(), list)

    visitors_res = client.get("/api/v1/matches/visitors")
    assert visitors_res.status_code == 200
    assert isinstance(visitors_res.json(), list)


def test_saved_searches_lifecycle(client, auth_headers):
    save_res = client.post("/api/v1/search/saved", json={
        "search_name": "Kolkata Sadgope Brides",
        "criteria": {"gender": "FEMALE", "community": "Sadgope", "city": "Kolkata"}
    }, headers=auth_headers)
    assert save_res.status_code == 200
    assert save_res.json()["status"] == "SUCCESS"

    get_res = client.get("/api/v1/search/saved", headers=auth_headers)
    assert get_res.status_code == 200
    saved_list = get_res.json()
    assert len(saved_list) > 0
    first = saved_list[0]
    assert first["search_name"] == "Kolkata Sadgope Brides"
    assert first["criteria"]["gender"] == "FEMALE"


def test_interests_lifecycle(client, auth_headers):
    matches = client.get("/api/v1/matches/recommended").json()
    assert len(matches) > 1
    target = matches[1]

    send_res = client.post("/api/v1/interests", json={"receiver_profile_id": target["id"]}, headers=auth_headers)
    assert send_res.status_code in [200, 400]

    sent_res = client.get("/api/v1/interests/sent", headers=auth_headers)
    assert sent_res.status_code == 200
    assert isinstance(sent_res.json(), list)

    recv_res = client.get("/api/v1/interests/received", headers=auth_headers)
    assert recv_res.status_code == 200
    assert isinstance(recv_res.json(), list)

    sum_res = client.get("/api/v1/interests/summary", headers=auth_headers)
    assert sum_res.status_code == 200
    data = sum_res.json()
    assert "received_pending" in data
    assert "total_active_connections" in data


def test_shortlist_lifecycle(client, auth_headers):
    matches = client.get("/api/v1/matches/recommended").json()
    assert len(matches) > 1
    target_id = matches[1]["id"]

    add_res = client.post(f"/api/v1/shortlist/{target_id}", headers=auth_headers)
    assert add_res.status_code == 200
    assert add_res.json()["status"] in ["SUCCESS", "ALREADY_SHORTLISTED"]

    ids_res = client.get("/api/v1/shortlist/ids", headers=auth_headers)
    assert ids_res.status_code == 200
    assert target_id in ids_res.json()

    list_res = client.get("/api/v1/shortlist", headers=auth_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) > 0

    del_res = client.delete(f"/api/v1/shortlist/{target_id}", headers=auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "SUCCESS"


def test_conversations_and_messaging(client, auth_headers):
    convs_res = client.get("/api/v1/conversations", headers=auth_headers)
    assert convs_res.status_code == 200
    convs = convs_res.json()
    assert isinstance(convs, list)

    if len(convs) > 0:
        conv_id = convs[0]["id"]

        send_msg = client.post(
            f"/api/v1/conversations/{conv_id}/messages",
            json={"content": "Hello! Looking forward to discussing with your family."},
            headers=auth_headers,
        )
        assert send_msg.status_code in [200, 403]  # 403 if not premium/mutual, 200 if entitled
        if send_msg.status_code == 200:
            msg_data = send_msg.json()
            assert msg_data["content"] == "Hello! Looking forward to discussing with your family."
            assert msg_data["is_mine"] is True

        get_msgs = client.get(f"/api/v1/conversations/{conv_id}/messages", headers=auth_headers)
        assert get_msgs.status_code == 200
        assert isinstance(get_msgs.json(), list)


def test_safety_block_and_report(client, auth_headers):
    matches = client.get("/api/v1/matches/recommended").json()
    assert len(matches) > 1
    target_id = matches[1]["id"]

    rep_res = client.post("/api/v1/safety/report", json={
        "reported_profile_id": target_id,
        "reason": "Suspicious / Fake details",
        "description": "Test verification of trust & safety moderation reporting."
    }, headers=auth_headers)
    assert rep_res.status_code == 200
    assert rep_res.json()["status"] == "PENDING"

    block_res = client.post("/api/v1/safety/block", json={
        "blocked_profile_id": target_id,
    }, headers=auth_headers)
    assert block_res.status_code == 200
    assert block_res.json()["status"] in ["SUCCESS", "ALREADY_BLOCKED"]

    blocked_res = client.get("/api/v1/safety/blocked", headers=auth_headers)
    assert blocked_res.status_code == 200
    blocked_ids = [b["blocked_profile_id"] for b in blocked_res.json()]
    assert target_id in blocked_ids

    unblock_res = client.delete(f"/api/v1/safety/block/{target_id}", headers=auth_headers)
    assert unblock_res.status_code == 200
    assert unblock_res.json()["status"] == "SUCCESS"


def test_subscription_plans_and_pricing(client):
    res = client.get("/api/v1/subscription/plans")
    assert res.status_code == 200
    plans = res.json()
    assert len(plans) >= 3
    plan_ids = [p["id"] for p in plans]
    assert "monthly_premium" in plan_ids
    assert "quarterly_gold" in plan_ids
    assert "annual_diamond" in plan_ids


def test_payment_initiate_and_verification(client, auth_headers):
    init_res = client.post("/api/v1/subscription/checkout/initiate", json={
        "plan_id": "monthly_premium",
        "coupon_code": "BOR50",
    }, headers=auth_headers)
    assert init_res.status_code == 200
    order_data = init_res.json()
    assert "order_id" in order_data
    assert order_data["amount_inr"] == 200.00
    assert order_data["discount_inr"] == 100.00
    assert order_data["net_amount_inr"] == 100.00

    verify_res = client.post("/api/v1/subscription/checkout/verify", json={
        "order_id": order_data["order_id"],
        "payment_id": "pay_mock_123456",
        "plan_id": "monthly_premium",
        "coupon_code": "BOR50",
    }, headers=auth_headers)
    assert verify_res.status_code == 200
    chk = verify_res.json()
    assert chk["status"] == "ACTIVE"
    assert chk["net_amount_inr"] == 100.00

    status_res = client.get("/api/v1/subscription/my-status", headers=auth_headers)
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["is_active"] is True
    assert status_data["days_remaining"] >= 29
    assert len(status_data["recent_transactions"]) > 0

    matches = client.get("/api/v1/matches/recommended").json()
    assert len(matches) > 1
    candidate_id = matches[1]["id"]
    prof_res = client.get(f"/api/v1/profile/{candidate_id}", headers=auth_headers)
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert prof["is_contact_revealed"] is True
    assert prof["revealed_phone"] is not None
    assert prof["revealed_email"] is not None


def test_unauthenticated_access_denied(client):
    """Protected endpoints MUST reject unauthenticated requests with 401."""
    assert client.get("/api/v1/interests/sent").status_code == 401
    assert client.get("/api/v1/interests/received").status_code == 401
    assert client.get("/api/v1/shortlist").status_code == 401
    assert client.get("/api/v1/conversations").status_code == 401
    assert client.get("/api/v1/subscription/my-status").status_code == 401
    assert client.get("/api/v1/profile/me").status_code == 401


def test_chat_authorization_user_c_denied(client, auth_headers):
    """User cannot access a random conversation they do not belong to (403 Forbidden)."""
    fake_conv_id = "00000000-0000-0000-0000-000000000000"
    res = client.get(f"/api/v1/conversations/{fake_conv_id}/messages", headers=auth_headers)
    assert res.status_code in [403, 404]
    
    send_res = client.post(
        f"/api/v1/conversations/{fake_conv_id}/messages",
        json={"content": "Malicious intrusion attempt"},
        headers=auth_headers,
    )
    assert send_res.status_code in [403, 404]

