import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.auth_service import login_user, create_access_token
from backend.app.core.database import get_db_connection

client = TestClient(app)

@pytest.fixture(scope="module")
def super_admin_auth():
    """Authenticate as seeded Super Admin."""
    success, msg, data = login_user("admin@shortsfactory.io", "SuperAdmin2026!")
    assert success is True, f"Super Admin login failed: {msg}"
    token = data["access_token"]
    return {"Authorization": f"Bearer {token}", "user": data}

@pytest.fixture(scope="module")
def support_agent_auth():
    """Authenticate as seeded Support Agent."""
    success, msg, data = login_user("support@shortsfactory.io", "SupportAgent2026!")
    assert success is True, f"Support Agent login failed: {msg}"
    token = data["access_token"]
    return {"Authorization": f"Bearer {token}", "user": data}

@pytest.fixture(scope="module")
def creator_auth():
    """Authenticate as seeded regular creator."""
    success, msg, data = login_user("alex.vance@creatorstudio.io", "CreatorPro2026!")
    assert success is True, f"Creator login failed: {msg}"
    token = data["access_token"]
    return {"Authorization": f"Bearer {token}", "user": data}

# ====================================================================
# TEST 1: UNAUTHORIZED ACCESS BLOCKED SERVER-SIDE
# ====================================================================
def test_1_unauthorized_access_protection(creator_auth):
    """Verify that unauthenticated users and standard creators are strictly forbidden from administrative routes."""
    # 1. No auth header -> 401 Unauthorized
    res_no_auth = client.get("/api/v1/admin/overview")
    assert res_no_auth.status_code == 401
    assert "Administrative authentication required" in res_no_auth.json()["detail"]

    # 2. Regular creator token -> 403 Forbidden
    creator_headers = {"Authorization": creator_auth["Authorization"]}
    res_creator = client.get("/api/v1/admin/overview", headers=creator_headers)
    assert res_creator.status_code == 403
    assert "lacks permission" in res_creator.json()["detail"]

    res_creator_users = client.get("/api/v1/admin/users", headers=creator_headers)
    assert res_creator_users.status_code == 403

    res_creator_settings = client.put("/api/v1/admin/settings", json={"platform_name": "Hacked"}, headers=creator_headers)
    assert res_creator_settings.status_code == 403

# ====================================================================
# TEST 2: SUPER ADMIN AUTHENTICATION & OVERVIEW METRICS
# ====================================================================
def test_2_super_admin_auth_and_overview(super_admin_auth):
    """Verify Super Admin authentication and retrieve authentic platform metrics."""
    headers = {"Authorization": super_admin_auth["Authorization"]}
    res = client.get("/api/v1/admin/overview", headers=headers)
    assert res.status_code == 200

    data = res.json()
    assert "users" in data
    assert "content" in data
    assert "revenue" in data
    assert "jobs" in data
    assert "system" in data

    assert data["users"]["total"] >= 1
    assert data["users"]["active"] >= 1
    assert data["system"]["status"] in ("operational", "degraded")
    assert isinstance(data["revenue"]["monthly_recurring_revenue"], (int, float))
    assert isinstance(data["content"]["total_shorts"], int)

# ====================================================================
# TEST 3: USER MANAGEMENT, SEARCH, AND DETAILED INSPECTION
# ====================================================================
def test_3_user_management_search_and_inspection(super_admin_auth):
    """Test searching users, filtering by role/status, and inspecting detailed profiles without secret leakage."""
    headers = {"Authorization": super_admin_auth["Authorization"]}

    # Search by email
    res = client.get("/api/v1/admin/users?search=alex.vance", headers=headers)
    assert res.status_code == 200
    search_data = res.json()
    assert search_data["total"] >= 1
    alex = search_data["users"][0]
    assert alex["email"] == "alex.vance@creatorstudio.io"
    assert "password_hash" not in alex
    assert "verification_token" not in alex

    # Inspect user details
    detail_res = client.get(f"/api/v1/admin/users/{alex['id']}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["user"]["email"] == "alex.vance@creatorstudio.io"
    assert "subscription" in detail
    assert "usage" in detail
    assert "connected_channel" in detail
    assert detail["usage"]["credits_balance"] >= 0

# ====================================================================
# TEST 4: USER SUSPENSION AND REACTIVATION LIFECYCLE
# ====================================================================
def test_4_user_suspension_and_reactivation(super_admin_auth):
    """Test suspending a user account with required reason and reactivating it."""
    headers = {"Authorization": super_admin_auth["Authorization"]}

    # Register a temporary target user to suspend
    conn = get_db_connection()
    temp_user_id = "usr_test_suspend_99"
    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO users (id, email, password_hash, full_name, username, role, is_active, account_status, created_at, updated_at)
            VALUES (?, 'suspend.target@example.com', 'dummy_hash', 'Suspend Target', 'suspendtarget', 'creator', 1, 'active', datetime('now'), datetime('now'));
        """, (temp_user_id,))
        conn.commit()
    conn.close()

    # 1. Attempt suspension without reason -> 422 Unprocessable Entity
    bad_res = client.put(f"/api/v1/admin/users/{temp_user_id}/status", json={"status": "suspended", "reason": ""}, headers=headers)
    assert bad_res.status_code == 422

    # 2. Suspend with valid reason -> 200
    suspend_res = client.put(f"/api/v1/admin/users/{temp_user_id}/status", json={
        "status": "suspended",
        "reason": "Terms of service violation: suspicious automated scraping"
    }, headers=headers)
    assert suspend_res.status_code == 200
    assert suspend_res.json()["user"]["account_status"] == "suspended"
    assert suspend_res.json()["user"]["is_active"] is False

    # 3. Verify user is blocked when trying to authenticate
    login_success, login_msg, _ = login_user("suspend.target@example.com", "any_password")
    assert login_success is False
    assert "deactivated" in login_msg

    # 4. Reactivate user -> 200
    reactivate_res = client.put(f"/api/v1/admin/users/{temp_user_id}/status", json={
        "status": "active",
        "reason": "Appeal accepted and account restored"
    }, headers=headers)
    assert reactivate_res.status_code == 200
    assert reactivate_res.json()["user"]["account_status"] == "active"
    assert reactivate_res.json()["user"]["is_active"] is True

# ====================================================================
# TEST 5: ROLE ELEVATION & GRANULAR RBAC ENFORCEMENT
# ====================================================================
def test_5_role_elevation_and_rbac(super_admin_auth, support_agent_auth):
    """
    Test role elevation by Super Admin and verify that Support Agent role
    has inspection access but is strictly blocked from destructive operations.
    """
    super_headers = {"Authorization": super_admin_auth["Authorization"]}
    support_headers = {"Authorization": support_agent_auth["Authorization"]}

    # 1. Support agent can inspect overview and users
    res_ov = client.get("/api/v1/admin/overview", headers=support_headers)
    assert res_ov.status_code == 200

    res_users = client.get("/api/v1/admin/users", headers=support_headers)
    assert res_users.status_code == 200

    # 2. Support agent CANNOT suspend a user (requires admin or super_admin) -> 403 Forbidden
    res_suspend = client.put("/api/v1/admin/users/usr_default_alex/status", json={
        "status": "suspended",
        "reason": "Support agent rogue suspension"
    }, headers=support_headers)
    assert res_suspend.status_code == 403
    assert "lacks permission" in res_suspend.json()["detail"]

    # 3. Support agent CANNOT adjust credits -> 403 Forbidden
    res_cred = client.post("/api/v1/admin/credits/adjust", json={
        "user_id": "usr_default_alex",
        "adjustment_type": "add",
        "amount": 100,
        "reason": "Free promotional credits"
    }, headers=support_headers)
    assert res_cred.status_code == 403

    # 4. Support agent CANNOT update platform settings (Super Admin only) -> 403 Forbidden
    res_set = client.put("/api/v1/admin/settings", json={"platform_name": "Support Override"}, headers=support_headers)
    assert res_set.status_code == 403

    # 5. Super Admin updates a creator's role to 'admin'
    role_res = client.put("/api/v1/admin/users/usr_default_alex/role", json={"role": "admin"}, headers=super_headers)
    assert role_res.status_code == 200
    assert role_res.json()["role_data"]["role"] == "admin"

    # Reset role back to creator for clean state
    client.put("/api/v1/admin/users/usr_default_alex/role", json={"role": "creator"}, headers=super_headers)

# ====================================================================
# TEST 6: AUDITABLE CREDIT ADJUSTMENTS & LEDGER
# ====================================================================
def test_6_auditable_credit_adjustments(super_admin_auth):
    """Test manual credit adjustments with mandatory reason and immutable audit history."""
    headers = {"Authorization": super_admin_auth["Authorization"]}
    user_id = "usr_default_alex"

    # 1. Fetch initial balance
    user_detail = client.get(f"/api/v1/admin/users/{user_id}", headers=headers).json()
    initial_credits = user_detail["usage"]["credits_balance"]

    # 2. Add promotional credits
    add_res = client.post("/api/v1/admin/credits/adjust", json={
        "user_id": user_id,
        "adjustment_type": "promotional",
        "amount": 75,
        "reason": "SaaS Launch promotional bonus grant"
    }, headers=headers)
    assert add_res.status_code == 200
    adj_data = add_res.json()["adjustment"]
    assert adj_data["balance_before"] == initial_credits
    assert adj_data["balance_after"] == initial_credits + 75

    # 3. Deduct credits with reason
    deduct_res = client.post("/api/v1/admin/credits/adjust", json={
        "user_id": user_id,
        "adjustment_type": "deduct",
        "amount": 25,
        "reason": "Correction for duplicated batch export credits"
    }, headers=headers)
    assert deduct_res.status_code == 200
    assert deduct_res.json()["adjustment"]["balance_after"] == initial_credits + 50

    # 4. Verify in audit log of credit adjustments
    history_res = client.get(f"/api/v1/admin/credits/adjustments?user_id={user_id}", headers=headers)
    assert history_res.status_code == 200
    history = history_res.json()
    assert history["total"] >= 2
    assert any("SaaS Launch promotional" in a["reason"] for a in history["adjustments"])

# ====================================================================
# TEST 7: SUBSCRIPTION PLAN CREATION & PRICING CONFIGURATION
# ====================================================================
def test_7_subscription_plan_creation_and_updates(super_admin_auth):
    """Test creating a custom tier and modifying pricing/features."""
    import uuid
    headers = {"Authorization": super_admin_auth["Authorization"]}
    unique_slug = f"agency-{uuid.uuid4().hex[:6]}"

    # Create new plan
    plan_payload = {
        "name": "Custom Agency Tier",
        "slug": unique_slug,
        "description": "Bespoke volume tier for digital marketing agencies",
        "price_monthly": 149.0,
        "price_yearly": 1490.0,
        "monthly_video_minutes": 1000,
        "monthly_clips_limit": 800,
        "monthly_ai_analysis_limit": 500,
        "monthly_thumbnails_limit": 800,
        "monthly_exports_limit": 800,
        "included_features": ["4k_export", "priority_support", "white_label_exports"],
        "is_active": True,
        "sort_order": 5
    }

    create_res = client.post("/api/v1/admin/plans", json=plan_payload, headers=headers)
    assert create_res.status_code == 200
    created_plan = create_res.json()["plan"]
    plan_id = created_plan["id"]

    # Update plan price and minutes
    update_res = client.put(f"/api/v1/admin/plans/{plan_id}", json={
        "price_monthly": 159.0,
        "monthly_video_minutes": 1200
    }, headers=headers)
    assert update_res.status_code == 200
    updated = update_res.json()["plan"]
    assert updated["price_monthly"] == 159.0
    assert updated["monthly_video_minutes"] == 1200

# ====================================================================
# TEST 8: AI SERVICES MANAGEMENT & TELEMETRY
# ====================================================================
def test_8_ai_services_management(super_admin_auth):
    """Test AI services configuration, budget controls, and model selection."""
    headers = {"Authorization": super_admin_auth["Authorization"]}

    # List AI services
    services_res = client.get("/api/v1/admin/ai-services", headers=headers)
    assert services_res.status_code == 200
    services = services_res.json()
    assert len(services) >= 5
    whisper_srv = next(s for s in services if s["service_key"] == "whisper_transcription")
    assert whisper_srv["status"] == "active"
    assert "sk-" in whisper_srv["api_key_masked"]

    # Update AI service configuration
    update_res = client.put("/api/v1/admin/ai-services/whisper_transcription", json={
        "model_name": "whisper-large-v3-turbo",
        "daily_request_budget": 12000,
        "monthly_spend_limit_usd": 800.0
    }, headers=headers)
    assert update_res.status_code == 200
    updated_srv = update_res.json()["service"]
    assert updated_srv["model_name"] == "whisper-large-v3-turbo"
    assert updated_srv["daily_request_budget"] == 12000

# ====================================================================
# TEST 9: VIDEO PROCESSING JOBS & INTERVENTIONS
# ====================================================================
def test_9_processing_jobs_and_interventions(super_admin_auth):
    """Test listing processing jobs, retrying failed jobs, and cancelling active jobs."""
    headers = {"Authorization": super_admin_auth["Authorization"]}

    # Seed a dummy failed job for testing intervention
    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO analysis_jobs (
                id, project_id, status, stage, progress_percentage, error_message, created_at, updated_at
            ) VALUES (
                'job_test_intervention_1', '11111111-1111-1111-1111-111111111111',
                'failed', 'highlight_detection', 45, 'Simulated CUDA out of memory',
                datetime('now'), datetime('now')
            );
        """)
        conn.commit()
    conn.close()

    # 1. List jobs
    jobs_res = client.get("/api/v1/admin/jobs?status=failed", headers=headers)
    assert jobs_res.status_code == 200
    jobs_data = jobs_res.json()
    assert jobs_data["total"] >= 1
    target_job = next(j for j in jobs_data["jobs"] if j["id"] == "job_test_intervention_1")
    assert target_job["error_message"] == "Simulated CUDA out of memory"

    # 2. Retry job
    retry_res = client.post("/api/v1/admin/jobs/job_test_intervention_1/retry", headers=headers)
    assert retry_res.status_code == 200
    assert retry_res.json()["job"]["status"] == "queued"

    # 3. Cancel job
    cancel_res = client.post("/api/v1/admin/jobs/job_test_intervention_1/cancel", json={
        "reason": "Video format incompatible with target resolution"
    }, headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["job"]["status"] == "cancelled"

# ====================================================================
# TEST 10: PLATFORM ANNOUNCEMENTS LIFECYCLE
# ====================================================================
def test_10_platform_announcements_lifecycle(super_admin_auth, creator_auth):
    """Test creating announcements, displaying to creators, and deleting."""
    admin_headers = {"Authorization": super_admin_auth["Authorization"]}
    creator_headers = {"Authorization": creator_auth["Authorization"]}

    # 1. Create maintenance announcement
    create_res = client.post("/api/v1/admin/announcements", json={
        "title": "Scheduled Database Migration",
        "message": "Routine maintenance scheduled for Sunday at 02:00 UTC for 15 minutes.",
        "type": "maintenance",
        "priority": "high",
        "target_audience": "all",
        "is_active": True
    }, headers=admin_headers)
    assert create_res.status_code == 200
    ann_id = create_res.json()["announcement"]["id"]

    # 2. Normal creator fetches announcements
    user_ann_res = client.get("/api/v1/users/announcements", headers=creator_headers)
    assert user_ann_res.status_code == 200
    announcements = user_ann_res.json()
    assert any(a["id"] == ann_id for a in announcements)

    # 3. Admin deletes announcement
    del_res = client.delete(f"/api/v1/admin/announcements/{ann_id}", headers=admin_headers)
    assert del_res.status_code == 200

# ====================================================================
# TEST 11: SYSTEM HEALTH DIAGNOSTICS & AUDIT TRAIL
# ====================================================================
def test_11_system_health_and_audit_trail(super_admin_auth):
    """Verify authentic live health diagnostics and searchable audit logs."""
    headers = {"Authorization": super_admin_auth["Authorization"]}

    # 1. Health check
    health_res = client.get("/api/v1/admin/health", headers=headers)
    assert health_res.status_code == 200
    health = health_res.json()
    assert health["overall_status"] in ("healthy", "degraded")
    assert "database" in health["services"]
    assert "storage" in health["services"]
    assert "queue" in health["services"]
    assert "ai_pipelines" in health["services"]
    assert health["services"]["database"]["integrity"] == "ok"
    assert health["services"]["database"]["latency_ms"] >= 0

    # 2. Audit logs search
    audit_res = client.get("/api/v1/admin/audit-logs?search=admin@shortsfactory.io", headers=headers)
    assert audit_res.status_code == 200
    logs_data = audit_res.json()
    assert logs_data["total"] >= 1
    assert any(l["admin_email"] == "admin@shortsfactory.io" for l in logs_data["logs"])

# ====================================================================
# TEST 12: PLATFORM CONFIGURATION & SETTINGS
# ====================================================================
def test_12_platform_settings_management(super_admin_auth):
    """Test retrieving and updating global platform configuration (Super Admin only)."""
    headers = {"Authorization": super_admin_auth["Authorization"]}

    # Get settings
    get_res = client.get("/api/v1/admin/settings", headers=headers)
    assert get_res.status_code == 200
    settings_data = get_res.json()
    assert settings_data["platform_name"] == "AI Shorts Factory"
    assert "feature_flags" in settings_data

    # Update settings
    update_res = client.put("/api/v1/admin/settings", json={
        "platform_name": "AI Shorts Factory Enterprise",
        "support_email": "admin-help@shortsfactory.io",
        "maintenance_mode": False,
        "feature_flags": {
            "auto_reframing": True,
            "ai_thumbnails": True,
            "competitor_analysis": True,
            "bulk_publishing": True,
            "dynamic_subtitles": True,
            "high_fps_exports": True
        }
    }, headers=headers)
    assert update_res.status_code == 200
    updated = update_res.json()["settings"]
    assert updated["platform_name"] == "AI Shorts Factory Enterprise"
    assert updated["support_email"] == "admin-help@shortsfactory.io"

    # Reset platform name back
    client.put("/api/v1/admin/settings", json={"platform_name": "AI Shorts Factory"}, headers=headers)
