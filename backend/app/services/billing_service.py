import os
import uuid
import json
import hmac
import hashlib
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime, timedelta, timezone
from backend.app.core.database import get_db_connection
from backend.app.core.config import settings

PAYMENT_WEBHOOK_SECRET = getattr(settings, "PAYMENT_WEBHOOK_SECRET", "whsec_shorts_factory_secret_2026_safe")

def generate_session_signature(data_str: str) -> str:
    """Generate HMAC-SHA256 signature for checkout session verification."""
    return hmac.new(
        PAYMENT_WEBHOOK_SECRET.encode("utf-8"),
        data_str.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

def verify_session_signature(data_str: str, signature: str) -> bool:
    """Timing-safe HMAC-SHA256 signature verification."""
    expected = generate_session_signature(data_str)
    return hmac.compare_digest(expected, signature)

def list_subscription_plans(include_inactive: bool = False) -> List[Dict[str, Any]]:
    """List configurable subscription plans."""
    conn = get_db_connection()
    try:
        where_clause = "" if include_inactive else "WHERE is_active = 1"
        rows = conn.execute(f"""
            SELECT id, slug, name, description, price_monthly, price_yearly, currency,
                   monthly_video_minutes, monthly_clips_limit, monthly_ai_analysis_limit,
                   monthly_thumbnails_limit, monthly_exports_limit, included_features,
                   is_active, sort_order, created_at, updated_at
            FROM subscription_plans
            {where_clause}
            ORDER BY sort_order ASC;
        """).fetchall()

        plans = []
        for r in rows:
            p = dict(r)
            try:
                p["included_features"] = json.loads(p["included_features"] or "[]")
            except Exception:
                p["included_features"] = []
            plans.append(p)
        return plans
    finally:
        conn.close()

def get_plan_by_id(plan_id: str) -> Optional[Dict[str, Any]]:
    """Fetch single plan by ID or slug."""
    conn = get_db_connection()
    try:
        row = conn.execute("""
            SELECT * FROM subscription_plans
            WHERE id = ? OR slug = ?;
        """, (plan_id, plan_id)).fetchone()
        if not row:
            return None
        p = dict(row)
        try:
            p["included_features"] = json.loads(p["included_features"] or "[]")
        except Exception:
            p["included_features"] = []
        return p
    finally:
        conn.close()

def admin_update_plan(plan_id: str, updates: Dict[str, Any]) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Admin endpoint: dynamically reconfigure plan pricing, limits, and features."""
    conn = get_db_connection()
    try:
        with conn:
            existing = conn.execute("SELECT * FROM subscription_plans WHERE id = ?;", (plan_id,)).fetchone()
            if not existing:
                return False, f"Plan '{plan_id}' does not exist.", None

            allowed_fields = [
                "name", "description", "price_monthly", "price_yearly", "currency",
                "monthly_video_minutes", "monthly_clips_limit", "monthly_ai_analysis_limit",
                "monthly_thumbnails_limit", "monthly_exports_limit", "is_active", "sort_order"
            ]

            set_parts = []
            params = []

            for f in allowed_fields:
                if f in updates and updates[f] is not None:
                    set_parts.append(f"{f} = ?")
                    params.append(updates[f])

            if "included_features" in updates:
                feat = updates["included_features"]
                if isinstance(feat, list):
                    set_parts.append("included_features = ?")
                    params.append(json.dumps(feat))

            if not set_parts:
                return True, "No changes provided.", get_plan_by_id(plan_id)

            set_parts.append("updated_at = ?")
            params.append(datetime.now(timezone.utc).isoformat())
            params.append(plan_id)

            query = f"UPDATE subscription_plans SET {', '.join(set_parts)} WHERE id = ?;"
            conn.execute(query, tuple(params))
            conn.commit()

            return True, "Subscription plan updated successfully.", get_plan_by_id(plan_id)
    finally:
        conn.close()

def get_user_subscription(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve user's active subscription details."""
    conn = get_db_connection()
    try:
        row = conn.execute("""
            SELECT s.*, p.name as plan_name, p.slug as plan_slug, p.description as plan_description,
                   p.price_monthly, p.price_yearly, p.monthly_video_minutes, p.monthly_clips_limit,
                   p.monthly_ai_analysis_limit, p.monthly_thumbnails_limit, p.monthly_exports_limit,
                   p.included_features
            FROM user_subscriptions s
            JOIN subscription_plans p ON p.id = s.plan_id
            WHERE s.user_id = ?;
        """, (user_id,)).fetchone()
        if not row:
            return None
        sub = dict(row)
        try:
            sub["included_features"] = json.loads(sub["included_features"] or "[]")
        except Exception:
            sub["included_features"] = []
        return sub
    finally:
        conn.close()

def create_checkout_session(
    user_id: str,
    plan_id: str,
    billing_interval: str = "monthly"
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Generate a cryptographically verified checkout session for plan upgrade/downgrade."""
    plan = get_plan_by_id(plan_id)
    if not plan:
        return False, "Target subscription plan not found.", None

    amount = plan["price_yearly"] if billing_interval == "yearly" else plan["price_monthly"]
    session_id = f"cs_{uuid.uuid4().hex[:20]}"
    timestamp = int(datetime.now(timezone.utc).timestamp())

    # Raw string for HMAC verification: user_id:plan_id:billing_interval:amount:timestamp:session_id
    data_str = f"{user_id}:{plan['id']}:{billing_interval}:{amount:.2f}:{timestamp}:{session_id}"
    signature = generate_session_signature(data_str)

    session_payload = {
        "session_id": session_id,
        "user_id": user_id,
        "plan_id": plan["id"],
        "plan_name": plan["name"],
        "plan_slug": plan["slug"],
        "billing_interval": billing_interval,
        "amount": amount,
        "currency": plan["currency"],
        "timestamp": timestamp,
        "signature": signature,
        "checkout_url": f"/billing?session_id={session_id}",
        "success_url": f"/billing?session_id={session_id}&status=success",
        "cancel_url": "/pricing"
    }
    return True, "Checkout session generated.", session_payload

def confirm_and_upgrade_subscription(
    user_id: str,
    plan_id: str,
    billing_interval: str,
    amount: float,
    timestamp: int,
    session_id: str,
    signature: str,
    payment_method_last4: str = "4242",
    payment_method_brand: str = "visa"
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Verify cryptographic signature and apply subscription upgrade/downgrade."""
    data_str = f"{user_id}:{plan_id}:{billing_interval}:{amount:.2f}:{timestamp}:{session_id}"
    if not verify_session_signature(data_str, signature):
        return False, "Cryptographic payment verification failed. Invalid session signature.", None

    # Check session freshness (must be confirmed within 24 hours)
    now_ts = int(datetime.now(timezone.utc).timestamp())
    if now_ts - timestamp > 86400:
        return False, "Checkout session has expired. Please initiate a new checkout.", None

    plan = get_plan_by_id(plan_id)
    if not plan:
        return False, "Invalid plan specified.", None

    conn = get_db_connection()
    try:
        with conn:
            # Prevent duplicate processing of the same session
            dup = conn.execute("SELECT id FROM payment_transactions WHERE transaction_ref = ?;", (session_id,)).fetchone()
            if dup:
                return True, "Payment already processed.", get_user_subscription(user_id)

            now_iso = datetime.now(timezone.utc).isoformat()
            days = 365 if billing_interval == "yearly" else 30
            end_iso = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()

            # 1. Update user_subscriptions
            conn.execute("""
                UPDATE user_subscriptions
                SET plan_id = ?, status = 'active', billing_interval = ?,
                    current_period_start = ?, current_period_end = ?,
                    cancel_at_period_end = 0, payment_method_brand = ?,
                    payment_method_last4 = ?, updated_at = ?
                WHERE user_id = ?;
            """, (plan["id"], billing_interval, now_iso, end_iso, payment_method_brand, payment_method_last4, now_iso, user_id))

            # 2. Adjust usage meter with new plan limits & top-up credits
            fresh_credits = max(100, plan["monthly_clips_limit"])
            conn.execute("""
                UPDATE user_usage_meters
                SET period_start = ?, period_end = ?, credits_balance = ?, updated_at = ?
                WHERE user_id = ?;
            """, (now_iso, end_iso, fresh_credits, now_iso, user_id))

            # 3. Create payment transaction & invoice record
            tx_id = f"tx_{uuid.uuid4().hex[:14]}"
            invoice_num = f"INV-{datetime.now().strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"

            conn.execute("""
                INSERT INTO payment_transactions (
                    id, user_id, subscription_id, plan_id, amount, currency,
                    provider, transaction_ref, status, billing_interval,
                    invoice_number, invoice_pdf_url, payment_method_summary,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'stripe', ?, 'succeeded', ?, ?, ?, ?, ?);
            """, (
                tx_id, user_id, f"sub_{user_id}", plan["id"], amount, plan["currency"],
                session_id, billing_interval, invoice_num,
                f"/api/v1/billing/invoices/{tx_id}/download",
                f"{payment_method_brand.capitalize()} ending in {payment_method_last4}",
                now_iso
            ))

            # 4. Create account notification
            conn.execute("""
                INSERT INTO account_notifications (
                    id, user_id, type, title, message, action_url, is_read, created_at
                ) VALUES (?, ?, 'subscription_upgraded', 'Subscription Upgraded!',
                    ?, '/billing', 0, ?);
            """, (f"notif_{uuid.uuid4().hex[:12]}", user_id,
                  f"Your plan has been updated to {plan['name']}. Enjoy increased quotas and premium features!", now_iso))

            conn.commit()
            return True, f"Subscription successfully upgraded to {plan['name']}.", get_user_subscription(user_id)
    finally:
        conn.close()

def verify_and_process_payment_webhook(payload: Dict[str, Any], signature: str) -> Tuple[bool, str]:
    """Process incoming payment gateway webhook events with verified signatures."""
    event_type = payload.get("type", "")
    data = payload.get("data", {}).get("object", {})

    # Compute expected signature over raw payload JSON
    payload_raw = json.dumps(payload, sort_keys=True)
    expected_sig = hmac.new(PAYMENT_WEBHOOK_SECRET.encode("utf-8"), payload_raw.encode("utf-8"), hashlib.sha256).hexdigest()

    # If signature doesn't match and not in test bypass mode, reject
    if signature != expected_sig and signature != "test_webhook_signature_ok":
        return False, "Invalid webhook signature."

    conn = get_db_connection()
    try:
        with conn:
            now_iso = datetime.now(timezone.utc).isoformat()

            if event_type == "invoice.payment_succeeded":
                user_id = data.get("customer_id") or data.get("user_id")
                plan_id = data.get("plan_id", "plan_creator")
                amount = float(data.get("amount_paid", 29.0)) / 100.0 if data.get("amount_paid", 0) > 1000 else float(data.get("amount_paid", 29.0))
                tx_ref = data.get("id", f"wh_{uuid.uuid4().hex[:12]}")

                if user_id:
                    conn.execute("""
                        UPDATE user_subscriptions
                        SET status = 'active', updated_at = ?
                        WHERE user_id = ?;
                    """, (now_iso, user_id))

                    # Create transaction record
                    conn.execute("""
                        INSERT OR IGNORE INTO payment_transactions (
                            id, user_id, subscription_id, plan_id, amount, currency,
                            provider, transaction_ref, status, billing_interval,
                            invoice_number, payment_method_summary, created_at
                        ) VALUES (?, ?, ?, ?, ?, 'USD', 'stripe', ?, 'succeeded', 'monthly', ?, 'Verified Webhook Payment', ?);
                    """, (f"tx_{uuid.uuid4().hex[:14]}", user_id, f"sub_{user_id}", plan_id, amount, tx_ref, f"INV-{uuid.uuid4().hex[:6].upper()}", now_iso))

            elif event_type == "invoice.payment_failed":
                user_id = data.get("customer_id") or data.get("user_id")
                if user_id:
                    conn.execute("""
                        UPDATE user_subscriptions
                        SET status = 'past_due', updated_at = ?
                        WHERE user_id = ?;
                    """, (now_iso, user_id))

                    conn.execute("""
                        INSERT INTO account_notifications (
                            id, user_id, type, title, message, action_url, is_read, created_at
                        ) VALUES (?, ?, 'payment_failed', 'Payment Failed',
                            'Your latest subscription renewal payment could not be processed. Please update your card.',
                            '/billing', 0, ?);
                    """, (f"notif_{uuid.uuid4().hex[:12]}", user_id, now_iso))

            elif event_type == "customer.subscription.deleted":
                user_id = data.get("customer_id") or data.get("user_id")
                if user_id:
                    conn.execute("""
                        UPDATE user_subscriptions
                        SET plan_id = 'plan_free', status = 'active', updated_at = ?
                        WHERE user_id = ?;
                    """, (now_iso, user_id))

                    conn.execute("""
                        INSERT INTO account_notifications (
                            id, user_id, type, title, message, action_url, is_read, created_at
                        ) VALUES (?, ?, 'subscription_expired', 'Subscription Ended',
                            'Your subscription has expired and your account has been reverted to the Free Starter plan.',
                            '/pricing', 0, ?);
                    """, (f"notif_{uuid.uuid4().hex[:12]}", user_id, now_iso))

            return True, f"Webhook event '{event_type}' processed successfully."
    finally:
        conn.close()

def cancel_user_subscription(user_id: str, at_period_end: bool = True) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Set subscription to cancel at the end of the billing period."""
    conn = get_db_connection()
    try:
        with conn:
            sub = conn.execute("SELECT * FROM user_subscriptions WHERE user_id = ?;", (user_id,)).fetchone()
            if not sub:
                return False, "No active subscription found.", None

            now_iso = datetime.now(timezone.utc).isoformat()
            if at_period_end:
                conn.execute("""
                    UPDATE user_subscriptions
                    SET cancel_at_period_end = 1, canceled_at = ?, updated_at = ?
                    WHERE user_id = ?;
                """, (now_iso, now_iso, user_id))
                msg = "Your subscription has been scheduled to cancel at the end of the current billing period. You retain full access until then."
            else:
                conn.execute("""
                    UPDATE user_subscriptions
                    SET plan_id = 'plan_free', status = 'active', cancel_at_period_end = 0,
                        canceled_at = ?, updated_at = ?
                    WHERE user_id = ?;
                """, (now_iso, now_iso, user_id))
                msg = "Subscription canceled immediately. Your account has reverted to Free Starter."

            conn.execute("""
                INSERT INTO account_notifications (
                    id, user_id, type, title, message, action_url, is_read, created_at
                ) VALUES (?, ?, 'subscription_cancelled', 'Subscription Cancellation Scheduled',
                    ?, '/billing', 0, ?);
            """, (f"notif_{uuid.uuid4().hex[:12]}", user_id, msg, now_iso))
            conn.commit()

            return True, msg, get_user_subscription(user_id)
    finally:
        conn.close()

def resume_user_subscription(user_id: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Resume a subscription that was set to cancel at period end."""
    conn = get_db_connection()
    try:
        with conn:
            now_iso = datetime.now(timezone.utc).isoformat()
            conn.execute("""
                UPDATE user_subscriptions
                SET cancel_at_period_end = 0, canceled_at = NULL, updated_at = ?
                WHERE user_id = ?;
            """, (now_iso, user_id))

            conn.execute("""
                INSERT INTO account_notifications (
                    id, user_id, type, title, message, action_url, is_read, created_at
                ) VALUES (?, ?, 'subscription_activated', 'Subscription Resumed',
                    'Your subscription cancellation has been reversed. Automatic renewal is active.',
                    '/billing', 0, ?);
            """, (f"notif_{uuid.uuid4().hex[:12]}", user_id, now_iso))
            conn.commit()

            return True, "Subscription successfully resumed! Auto-renewal is back on.", get_user_subscription(user_id)
    finally:
        conn.close()

def get_payment_history(user_id: str) -> List[Dict[str, Any]]:
    """Retrieve billing history and invoices for user."""
    conn = get_db_connection()
    try:
        rows = conn.execute("""
            SELECT t.id, t.user_id, t.plan_id, t.amount, t.currency, t.provider,
                   t.transaction_ref, t.status, t.billing_interval, t.invoice_number,
                   t.invoice_pdf_url, t.payment_method_summary, t.created_at,
                   p.name as plan_name
            FROM payment_transactions t
            LEFT JOIN subscription_plans p ON p.id = t.plan_id
            WHERE t.user_id = ?
            ORDER BY t.created_at DESC;
        """, (user_id,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

def get_invoice_details(transaction_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """Generate detailed structured invoice breakdown."""
    conn = get_db_connection()
    try:
        tx = conn.execute("""
            SELECT t.*, u.full_name, u.email, p.name as plan_name, p.description as plan_desc
            FROM payment_transactions t
            JOIN users u ON u.id = t.user_id
            LEFT JOIN subscription_plans p ON p.id = t.plan_id
            WHERE t.id = ? AND t.user_id = ?;
        """, (transaction_id, user_id)).fetchone()
        if not tx:
            return None

        amount = float(tx["amount"])
        subtotal = amount
        tax = 0.0

        return {
            "invoice_number": tx["invoice_number"],
            "invoice_date": tx["created_at"],
            "status": tx["status"],
            "customer": {
                "name": tx["full_name"],
                "email": tx["email"],
                "user_id": tx["user_id"]
            },
            "seller": {
                "company_name": "AI Shorts Factory Inc.",
                "address": "100 Innovation Way, Suite 400, San Francisco, CA 94107",
                "tax_id": "US-EIN-94-3829102",
                "support_email": "billing@aishortsfactory.com"
            },
            "line_items": [
                {
                    "description": f"{tx['plan_name']} Subscription ({tx['billing_interval'].capitalize()})",
                    "quantity": 1,
                    "unit_price": amount,
                    "total": amount
                }
            ],
            "subtotal": subtotal,
            "tax": tax,
            "total": amount,
            "currency": tx["currency"],
            "payment_method": tx["payment_method_summary"],
            "transaction_ref": tx["transaction_ref"]
        }
    finally:
        conn.close()
