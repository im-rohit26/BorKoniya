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
    assert data["first_name"] in ["Priyanka", "Subham"]


def test_send_and_verify_otp(client):
    test_phone = "9876500001"
    send_res = client.post("/api/v1/auth/send-otp", json={"phone_number": test_phone})
    assert send_res.status_code == 200
    data = send_res.json()
    assert data["phone_number"] == test_phone

    from app.core.database import SessionLocal
    from app.models.entities import OTPStore
    with SessionLocal() as db:
        otp_entry = (
            db.query(OTPStore)
            .filter(OTPStore.identifier == test_phone, OTPStore.purpose == "VERIFY")
            .order_by(OTPStore.created_at.desc())
            .first()
        )
        assert otp_entry is not None
        otp_code = otp_entry.otp_code

    verify_res = client.post("/api/v1/auth/verify-otp", json={
        "phone_number": test_phone,
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

    from app.core.database import SessionLocal
    from app.models.entities import OTPStore
    with SessionLocal() as db:
        otp_entry = (
            db.query(OTPStore)
            .filter(OTPStore.identifier == "9876543210", OTPStore.purpose == "RESET_PASSWORD")
            .order_by(OTPStore.created_at.desc())
            .first()
        )
        assert otp_entry is not None
        otp = otp_entry.otp_code

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

    res_m = client.get("/api/v1/search?gender=MALE")
    assert res_m.status_code == 200
    for p in res_m.json():
        assert p["gender"] == "MALE"


def test_female_user_sees_only_males(client, auth_headers):
    """Priyanka (FEMALE) must only see male profiles across search and all match endpoints."""
    # 1. Search (even if omitting gender or asking for female)
    search_res = client.get("/api/v1/search", headers=auth_headers)
    assert search_res.status_code == 200
    search_profiles = search_res.json()
    assert len(search_profiles) > 0
    for p in search_profiles:
        assert p["gender"] == "MALE"

    search_override = client.get("/api/v1/search?gender=FEMALE", headers=auth_headers)
    assert search_override.status_code == 200
    for p in search_override.json():
        assert p["gender"] == "MALE"

    # 2. Recommended matches
    rec_res = client.get("/api/v1/matches/recommended", headers=auth_headers)
    assert rec_res.status_code == 200
    rec_matches = rec_res.json()
    assert len(rec_matches) > 0
    for p in rec_matches:
        assert p["gender"] == "MALE"

    # 3. New matches
    new_res = client.get("/api/v1/matches/new", headers=auth_headers)
    assert new_res.status_code == 200
    for p in new_res.json():
        assert p["gender"] == "MALE"

    # 4. Near-you matches
    near_res = client.get("/api/v1/matches/near-you", headers=auth_headers)
    assert near_res.status_code == 200
    for p in near_res.json():
        assert p["gender"] == "MALE"

    # 5. Visitors
    vis_res = client.get("/api/v1/matches/visitors", headers=auth_headers)
    assert vis_res.status_code == 200
    for p in vis_res.json():
        assert p["gender"] == "MALE"


def test_male_user_sees_only_females(client, user2_auth_headers):
    """Subham (MALE) must only see female profiles across search and all match endpoints."""
    # 1. Search (even if omitting gender or asking for male)
    search_res = client.get("/api/v1/search", headers=user2_auth_headers)
    assert search_res.status_code == 200
    search_profiles = search_res.json()
    assert len(search_profiles) > 0
    for p in search_profiles:
        assert p["gender"] == "FEMALE"

    search_override = client.get("/api/v1/search?gender=MALE", headers=user2_auth_headers)
    assert search_override.status_code == 200
    for p in search_override.json():
        assert p["gender"] == "FEMALE"

    # 2. Recommended matches
    rec_res = client.get("/api/v1/matches/recommended", headers=user2_auth_headers)
    assert rec_res.status_code == 200
    rec_matches = rec_res.json()
    assert len(rec_matches) > 0
    for p in rec_matches:
        assert p["gender"] == "FEMALE"

    # 3. New matches
    new_res = client.get("/api/v1/matches/new", headers=user2_auth_headers)
    assert new_res.status_code == 200
    for p in new_res.json():
        assert p["gender"] == "FEMALE"

    # 4. Near-you matches
    near_res = client.get("/api/v1/matches/near-you", headers=user2_auth_headers)
    assert near_res.status_code == 200
    for p in near_res.json():
        assert p["gender"] == "FEMALE"

    # 5. Visitors
    vis_res = client.get("/api/v1/matches/visitors", headers=user2_auth_headers)
    assert vis_res.status_code == 200
    for p in vis_res.json():
        assert p["gender"] == "FEMALE"


def test_opposite_gender_access_control(client, auth_headers, user2_auth_headers):
    """Users cannot view profiles of the same gender unless it is their own profile."""
    priyanka_profile = client.get("/api/v1/profile/me", headers=auth_headers).json()
    subham_profile = client.get("/api/v1/profile/me", headers=user2_auth_headers).json()

    priyanka_id = priyanka_profile["id"]
    subham_id = subham_profile["id"]

    assert priyanka_profile["gender"] == "FEMALE"
    assert subham_profile["gender"] == "MALE"

    # Female viewing Male -> Allowed (200)
    res_fm = client.get(f"/api/v1/profile/{subham_id}", headers=auth_headers)
    assert res_fm.status_code == 200
    assert res_fm.json()["gender"] == "MALE"

    # Male viewing Female -> Allowed (200)
    res_mf = client.get(f"/api/v1/profile/{priyanka_id}", headers=user2_auth_headers)
    assert res_mf.status_code == 200
    assert res_mf.json()["gender"] == "FEMALE"

    # Female viewing own profile by ID -> Allowed (200)
    res_own = client.get(f"/api/v1/profile/{priyanka_id}", headers=auth_headers)
    assert res_own.status_code == 200
    assert res_own.json()["gender"] == "FEMALE"

    # Find another female profile (Ananya)
    all_females = client.get("/api/v1/search?gender=FEMALE").json()
    other_females = [f for f in all_females if f["id"] != priyanka_id]
    if other_females:
        ananya_id = other_females[0]["id"]
        # Female viewing Female -> Blocked (403)
        res_ff = client.get(f"/api/v1/profile/{ananya_id}", headers=auth_headers)
        assert res_ff.status_code == 403
        assert "Access restricted" in res_ff.json()["detail"]

    # Find another male profile (Debjit)
    all_males = client.get("/api/v1/search?gender=MALE").json()
    other_males = [m for m in all_males if m["id"] != subham_id]
    if other_males:
        debjit_id = other_males[0]["id"]
        # Male viewing Male -> Blocked (403)
        res_mm = client.get(f"/api/v1/profile/{debjit_id}", headers=user2_auth_headers)
        assert res_mm.status_code == 403
        assert "Access restricted" in res_mm.json()["detail"]


def test_cannot_interact_with_same_gender(client, auth_headers):
    """Users cannot send interest or shortlist someone of the same gender."""
    priyanka_profile = client.get("/api/v1/profile/me", headers=auth_headers).json()
    all_females = client.get("/api/v1/search?gender=FEMALE").json()
    other_females = [f for f in all_females if f["id"] != priyanka_profile["id"]]
    if other_females:
        ananya_id = other_females[0]["id"]
        # Attempt to express interest in another female
        interest_res = client.post("/api/v1/interests", json={"receiver_profile_id": ananya_id}, headers=auth_headers)
        assert interest_res.status_code == 400
        assert "opposite gender" in interest_res.json()["detail"]

        # Attempt to shortlist another female
        shortlist_res = client.post(f"/api/v1/shortlist/{ananya_id}", headers=auth_headers)
        assert shortlist_res.status_code == 400
        assert "opposite gender" in shortlist_res.json()["detail"]


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
    matches = client.get("/api/v1/matches/recommended", headers=auth_headers).json()
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
    matches = client.get("/api/v1/matches/recommended", headers=auth_headers).json()
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
            msg_id = msg_data["id"]

            # Test adding reaction
            react_res = client.post(
                f"/api/v1/conversations/{conv_id}/messages/{msg_id}/reactions",
                json={"emoji": "❤️"},
                headers=auth_headers,
            )
            assert react_res.status_code == 200
            react_data = react_res.json()
            assert "reactions" in react_data
            assert "❤️" in react_data["reactions"].values()

            # Test toggling reaction off
            toggle_res = client.post(
                f"/api/v1/conversations/{conv_id}/messages/{msg_id}/reactions",
                json={"emoji": "❤️"},
                headers=auth_headers,
            )
            assert toggle_res.status_code == 200
            assert toggle_res.json()["reactions"] == {}

        get_msgs = client.get(f"/api/v1/conversations/{conv_id}/messages", headers=auth_headers)
        assert get_msgs.status_code == 200
        assert isinstance(get_msgs.json(), list)


def test_safety_block_and_report(client, auth_headers):
    matches = client.get("/api/v1/matches/recommended", headers=auth_headers).json()
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

    matches = client.get("/api/v1/matches/recommended", headers=auth_headers).json()
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


def test_dashboard_stats_structure(client, auth_headers):
    """Dashboard API returns nested user, metrics, and recommended_profiles."""
    res = client.get("/api/v1/profile/me/dashboard", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    # User block
    assert "user" in data
    assert "first_name" in data["user"]
    assert "profile_completion_pct" in data["user"]
    assert data["user"]["profile_completion_pct"] > 0

    # Metrics block
    assert "metrics" in data
    metrics = data["metrics"]
    assert "recommended_count" in metrics
    assert "received_interests_count" in metrics
    assert "sent_interests_count" in metrics
    assert "total_active_connections" in metrics
    assert "shortlist_count" in metrics
    assert "profile_completion_pct" in metrics
    assert metrics["recommended_count"] >= 0

    # Recommended profiles list
    assert "recommended_profiles" in data
    assert isinstance(data["recommended_profiles"], list)


def test_profile_update_and_dynamic_completion(client, auth_headers):
    """PUT /api/v1/profile/me persists all fields and dynamically recalculates profile completion."""
    update_payload = {
        "first_name": "Subham",
        "last_name": "Pal",
        "current_city": "Kolkata",
        "current_state": "West Bengal",
        "highest_qualification": "Master of Technology",
        "occupation": "Principal Engineer",
        "company_name": "Leading Tech Corp",
        "annual_income": "₹20 – 30 Lakhs",
        "diet": "VEGETARIAN",
        "smoking": "NO",
        "drinking": "NO",
        "rashi": "Kanya",
        "nakshatra": "Hasta",
        "is_manglik": "NO",
        "about_me": "Dedicated professional with traditional values, keen on Bengali culture and classical music.",
    }
    res = client.put("/api/v1/profile/me", json=update_payload, headers=auth_headers)
    assert res.status_code == 200
    updated = res.json()

    assert updated["first_name"] == "Subham"
    assert updated["company_name"] == "Leading Tech Corp"
    assert updated["rashi"] == "Kanya"
    assert updated["nakshatra"] == "Hasta"
    assert updated["smoking"] == "NO"
    # Dynamic completion should be high with all fields filled
    assert updated["profile_completion_pct"] >= 75

    # Verify persisted on GET /me
    get_res = client.get("/api/v1/profile/me", headers=auth_headers)
    assert get_res.status_code == 200
    persisted = get_res.json()
    assert persisted["company_name"] == "Leading Tech Corp"
    assert persisted["profile_completion_pct"] >= 75

    # Restore first name
    client.put("/api/v1/profile/me", json={"first_name": "Priyanka"}, headers=auth_headers)


def test_connected_profiles_and_recommendation_exclusion(client, auth_headers, user2_auth_headers):
    """Connected profiles must show in connected IDs and be excluded from recommendation lists."""
    p1 = client.get("/api/v1/profile/me", headers=auth_headers).json()
    p2 = client.get("/api/v1/profile/me", headers=user2_auth_headers).json()

    # User 1 sends interest to User 2
    send_res = client.post("/api/v1/interests", json={"receiver_profile_id": p2["id"]}, headers=auth_headers)
    assert send_res.status_code == 200

    # User 2 accepts interest from User 1
    received = client.get("/api/v1/interests/received", headers=user2_auth_headers).json()
    interest_item = next((i for i in received if i["sender_profile_id"] == p1["id"]), None)
    if interest_item and interest_item["status"] == "SENT":
        accept_res = client.post(f"/api/v1/interests/{interest_item['id']}/accept", headers=user2_auth_headers)
        assert accept_res.status_code == 200

    # Both users should have each other in connected IDs
    conn1 = client.get("/api/v1/interests/connected/ids", headers=auth_headers).json()
    conn2 = client.get("/api/v1/interests/connected/ids", headers=user2_auth_headers).json()
    assert p2["id"] in conn1
    assert p1["id"] in conn2

    # User 2 must NOT appear in User 1's recommended matches
    rec1 = client.get("/api/v1/matches/recommended", headers=auth_headers).json()
    rec1_ids = [m["id"] for m in rec1]
    assert p2["id"] not in rec1_ids

    # User 2 must NOT appear in User 1's dashboard recommended profiles
    dash1 = client.get("/api/v1/profile/me/dashboard", headers=auth_headers).json()
    dash_rec_ids = [m["id"] for m in dash1["recommended_profiles"]]
    assert p2["id"] not in dash_rec_ids

