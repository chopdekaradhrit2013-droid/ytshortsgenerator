import pytest
import uuid
import json
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import get_db_connection
from backend.app.services.billing_service import generate_session_signature

client = TestClient(app)

def test_1_user_registration_and_email_verification():
    """Test 1 & 2: User registration creates account with Free Starter plan and email verification succeeds."""
    unique_email = f"creator_{uuid.uuid4().hex[:8]}@teststudio.io"
    reg_payload = {
        "email": unique_email,
        "password": "SecurePassword2026!",
        "full_name": "Jordan Lee",
        "username": f"jordan_{uuid.uuid4().hex[:6]}"
    }

    # 1. Register
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 200, reg_res.text
    reg_data = reg_res.json()
    assert reg_data["status"] == "success"
    user_info = reg_data["user"]
    assert user_info["email"] == unique_email
    assert user_info["plan_slug"] == "free" or user_info["plan_id"] == "plan_free"
    assert user_info["is_verified"] is False
    v_token = user_info["verification_token"]
    assert v_token is not None

    # 2. Verify Email
    ver_res = client.post("/api/v1/auth/verify-email", json={"token": v_token})
    assert ver_res.status_code == 200, ver_res.text
    ver_data = ver_res.json()
    assert ver_data["status"] == "success"
    assert ver_data["data"]["is_verified"] is True

    # 3. Log In with verified credentials
    login_res = client.post("/api/v1/auth/login", json={
        "email": unique_email,
        "password": "SecurePassword2026!"
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data["user"]
    assert login_data["user"]["is_verified"] is True

def test_2_default_plan_assignment_and_plans_catalog():
    """Test 3, 4 & 5: Authenticated profile returns default free plan and available plans catalog."""
    # List public plans
    plans_res = client.get("/api/v1/billing/plans")
    assert plans_res.status_code == 200
    plans = plans_res.json()
    assert len(plans) >= 4
    plan_slugs = [p["slug"] for p in plans]
    assert "free" in plan_slugs
    assert "creator" in plan_slugs
    assert "pro" in plan_slugs
    assert "enterprise" in plan_slugs

    # Default seed user (Alex Vance) has active plan
    profile_res = client.get("/api/v1/auth/me")
    assert profile_res.status_code == 200
    profile = profile_res.json()
    assert profile["email"] == "alex.vance@creatorstudio.io"
    assert profile["subscription"]["plan_slug"] in ("creator", "pro")
    assert profile["subscription"]["status"] == "active"

def test_3_checkout_session_and_cryptographic_payment_verification():
    """Test 6, 7 & 8: Checkout session creation, cryptographic HMAC verification, and subscription upgrade."""
    # Register fresh user
    new_email = f"upgrade_{uuid.uuid4().hex[:8]}@example.com"
    reg = client.post("/api/v1/auth/register", json={
        "email": new_email,
        "password": "Password123!",
        "full_name": "Test Upgrader"
    }).json()
    token = reg["user"]["access_token"]
    user_id = reg["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify user starts on Free plan
    me = client.get("/api/v1/auth/me", headers=headers).json()
    assert me["subscription"]["plan_slug"] == "free"

    # Step 6: Create checkout session for Pro plan
    checkout_res = client.post("/api/v1/billing/checkout", json={
        "plan_id": "plan_pro",
        "billing_interval": "monthly"
    }, headers=headers)
    assert checkout_res.status_code == 200
    session = checkout_res.json()["session"]
    assert session["plan_slug"] == "pro"
    assert session["amount"] == 79.0
    assert "signature" in session

    # Step 7 & 8: Confirm payment with cryptographic signature
    confirm_res = client.post("/api/v1/billing/confirm-payment", json={
        "session_id": session["session_id"],
        "signature": session["signature"],
        "plan_id": session["plan_id"],
        "billing_interval": session["billing_interval"],
        "amount": session["amount"],
        "timestamp": session["timestamp"],
        "payment_method_last4": "5555",
        "payment_method_brand": "mastercard"
    }, headers=headers)
    assert confirm_res.status_code == 200, confirm_res.text
    confirm_data = confirm_res.json()
    assert confirm_data["status"] == "success"
    assert confirm_data["subscription"]["plan_slug"] == "pro"

    # Verify user profile now has Pro tier limits & features unlocked
    updated_me = client.get("/api/v1/auth/me", headers=headers).json()
    assert updated_me["subscription"]["plan_slug"] == "pro"
    assert "competitor_analysis" in updated_me["subscription"]["included_features"]
    assert updated_me["subscription"]["limits"]["monthly_video_minutes"] == 500

def test_4_webhook_payment_verification_and_failure_handling():
    """Test webhook processing for renewal success, past_due status on payment failure, and expiration."""
    test_user_id = "usr_default_alex"

    # 1. Payment failure event
    fail_payload = {
        "type": "invoice.payment_failed",
        "data": {
            "object": {
                "user_id": test_user_id,
                "amount_due": 2900
            }
        }
    }
    fail_res = client.post("/api/v1/billing/webhook", json=fail_payload, headers={"Stripe-Signature": "test_webhook_signature_ok"})
    assert fail_res.status_code == 200

    # Verify status changed to past_due
    sub = client.get("/api/v1/billing/subscription").json()
    assert sub["status"] == "past_due"

    # 2. Payment succeeded event (recovers active status)
    success_payload = {
        "type": "invoice.payment_succeeded",
        "data": {
            "object": {
                "user_id": test_user_id,
                "plan_id": "plan_pro",
                "amount_paid": 7900,
                "id": f"in_{uuid.uuid4().hex[:10]}"
            }
        }
    }
    succ_res = client.post("/api/v1/billing/webhook", json=success_payload, headers={"Stripe-Signature": "test_webhook_signature_ok"})
    assert succ_res.status_code == 200

    sub_recovered = client.get("/api/v1/billing/subscription").json()
    assert sub_recovered["status"] == "active"

def test_5_usage_tracking_credits_deduction_and_quota_enforcement():
    """Test 9 & 10: Auditable credit deduction, meter updates, and quota enforcement block."""
    # Create free tier user
    email = f"quota_{uuid.uuid4().hex[:8]}@example.com"
    reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Quota Tester"
    }).json()
    token = reg["user"]["access_token"]
    user_id = reg["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Initial usage summary
    sum_res = client.get("/api/v1/usage/summary", headers=headers)
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert summary["metrics"]["video_processing_minutes"]["used"] == 0.0
    assert summary["metrics"]["video_processing_minutes"]["limit"] == 15.0

    # Permission check for allowed amount
    perm_ok = client.post("/api/v1/usage/check-permission", json={
        "metric": "video_processing_minutes",
        "amount": 5.0
    }, headers=headers).json()
    assert perm_ok["allowed"] is True

    # Permission check for amount exceeding limit (15 min limit + 20 min requested = 35 > 15)
    perm_block = client.post("/api/v1/usage/check-permission", json={
        "metric": "video_processing_minutes",
        "amount": 25.0
    }, headers=headers).json()
    assert perm_block["allowed"] is False
    assert "limit" in perm_block["reason"].lower()

    # Free user attempting Pro-only feature (Competitor Analysis)
    comp_block = client.get("/api/v1/intelligence/competitors", headers=headers)
    assert comp_block.status_code == 403
    assert "pro tier" in comp_block.json()["detail"].lower()

    # Free user attempting YouTube publishing (Requires Creator plan)
    pub_block = client.post("/api/v1/publishing/jobs", json={
        "project_id": "proj_demo",
        "clip_id": "clip_demo",
        "video_title": "Blocked Short",
        "tags": ["Shorts"],
        "hashtags": ["#Shorts"],
        "visibility": "public"
    }, headers=headers)
    assert pub_block.status_code == 403
    assert "creator pro" in pub_block.json()["detail"].lower()

def test_6_subscription_lifecycle_management():
    """Test 11: Cancellation scheduling at period end and resumption."""
    # Alex Vance subscription
    cancel_res = client.post("/api/v1/billing/subscription/cancel", json={"at_period_end": True})
    assert cancel_res.status_code == 200
    sub = cancel_res.json()["subscription"]
    assert sub["cancel_at_period_end"] == 1

    # Resume subscription
    resume_res = client.post("/api/v1/billing/subscription/resume")
    assert resume_res.status_code == 200
    resumed_sub = resume_res.json()["subscription"]
    assert resumed_sub["cancel_at_period_end"] == 0

def test_7_multi_tenant_data_isolation():
    """Test 12: Private workspace isolation: User B cannot access User A's private project."""
    # User A
    user_a = client.post("/api/v1/auth/register", json={
        "email": f"usera_{uuid.uuid4().hex[:8]}@example.com",
        "password": "Password123!",
        "full_name": "User Alpha"
    }).json()
    token_a = user_a["user"]["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # User B
    user_b = client.post("/api/v1/auth/register", json={
        "email": f"userb_{uuid.uuid4().hex[:8]}@example.com",
        "password": "Password123!",
        "full_name": "User Beta"
    }).json()
    token_b = user_b["user"]["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a private project
    proj_a = client.post("/api/v1/projects", json={
        "name": "Alpha Top Secret Project",
        "category": "podcast"
    }, headers=headers_a).json()
    proj_a_id = proj_a["id"]

    # User A can read their own project
    get_a = client.get(f"/api/v1/projects/{proj_a_id}", headers=headers_a)
    assert get_a.status_code == 200

    # User B attempts to access User A's project -> MUST BE FORBIDDEN (403)
    get_b = client.get(f"/api/v1/projects/{proj_a_id}", headers=headers_b)
    assert get_b.status_code == 403
    assert "access denied" in get_b.json()["detail"].lower()

def test_8_admin_plan_configuration_api():
    """Verify administrator can dynamically configure plan prices and limits without code changes."""
    # Admin updates plan_creator price & limits
    update_res = client.put("/api/v1/billing/admin/plans/plan_creator", json={
        "name": "Creator Pro Plus",
        "price_monthly": 34.0,
        "monthly_video_minutes": 150,
        "monthly_clips_limit": 120
    })
    assert update_res.status_code == 200
    updated_plan = update_res.json()["plan"]
    assert updated_plan["name"] == "Creator Pro Plus"
    assert updated_plan["price_monthly"] == 34.0
    assert updated_plan["monthly_video_minutes"] == 150

    # Revert back to 29.0 for standard defaults
    client.put("/api/v1/billing/admin/plans/plan_creator", json={
        "name": "Creator Pro",
        "price_monthly": 29.0,
        "monthly_video_minutes": 120,
        "monthly_clips_limit": 100
    })

