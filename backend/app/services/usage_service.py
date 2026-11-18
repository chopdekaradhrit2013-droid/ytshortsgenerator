import uuid
import json
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime, timedelta, timezone
from backend.app.core.database import get_db_connection

METRIC_COLUMNS = {
    "video_processing_minutes": "video_processing_minutes_used",
    "ai_clip_generations": "ai_clips_generated_used",
    "ai_analysis_requests": "ai_analysis_requests_used",
    "thumbnail_generations": "thumbnails_generated_used",
    "export_operations": "exports_count_used"
}

PLAN_LIMIT_COLUMNS = {
    "video_processing_minutes": "monthly_video_minutes",
    "ai_clip_generations": "monthly_clips_limit",
    "ai_analysis_requests": "monthly_ai_analysis_limit",
    "thumbnail_generations": "monthly_thumbnails_limit",
    "export_operations": "monthly_exports_limit"
}

def roll_over_usage_if_due(user_id: str, conn) -> None:
    """Check if the monthly billing cycle ended and automatically roll over to a fresh cycle."""
    meter = conn.execute("SELECT * FROM user_usage_meters WHERE user_id = ?;", (user_id,)).fetchone()
    if not meter or not meter["period_end"]:
        return

    try:
        end_dt = datetime.fromisoformat(meter["period_end"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        if now >= end_dt:
            # Rollover needed: get active plan default credits
            sub = conn.execute("""
                SELECT p.monthly_video_minutes, p.monthly_clips_limit
                FROM user_subscriptions s
                JOIN subscription_plans p ON p.id = s.plan_id
                WHERE s.user_id = ?;
            """, (user_id,)).fetchone()

            new_start = now.isoformat()
            new_end = (now + timedelta(days=30)).isoformat()
            base_credits = (sub["monthly_clips_limit"] if sub else 50)

            conn.execute("""
                UPDATE user_usage_meters
                SET period_start = ?, period_end = ?,
                    video_processing_minutes_used = 0.0,
                    ai_clips_generated_used = 0,
                    ai_analysis_requests_used = 0,
                    thumbnails_generated_used = 0,
                    exports_count_used = 0,
                    credits_balance = ?,
                    updated_at = ?
                WHERE user_id = ?;
            """, (new_start, new_end, base_credits, now.isoformat(), user_id))

            # Send reset notification
            conn.execute("""
                INSERT INTO account_notifications (
                    id, user_id, type, title, message, action_url, is_read, created_at
                ) VALUES (?, ?, 'usage_reset', 'Monthly Usage Reset',
                    'Your monthly quota and credits have been renewed for the new billing cycle.',
                    '/account', 0, ?);
            """, (f"notif_{uuid.uuid4().hex[:12]}", user_id, now.isoformat()))
    except Exception:
        pass

def get_user_usage_summary(user_id: str) -> Dict[str, Any]:
    """Calculate real-time usage vs limits, remaining credits, and upgrade recommendation."""
    conn = get_db_connection()
    try:
        with conn:
            roll_over_usage_if_due(user_id, conn)

            query = """
                SELECT u.id as user_id,
                       s.plan_id, s.status as sub_status, s.billing_interval,
                       p.name as plan_name, p.slug as plan_slug,
                       p.monthly_video_minutes, p.monthly_clips_limit, p.monthly_ai_analysis_limit,
                       p.monthly_thumbnails_limit, p.monthly_exports_limit, p.included_features,
                       m.period_start, m.period_end,
                       m.video_processing_minutes_used, m.ai_clips_generated_used,
                       m.ai_analysis_requests_used, m.thumbnails_generated_used,
                       m.exports_count_used, m.credits_balance
                FROM users u
                LEFT JOIN user_subscriptions s ON s.user_id = u.id
                LEFT JOIN subscription_plans p ON p.id = s.plan_id
                LEFT JOIN user_usage_meters m ON m.user_id = u.id
                WHERE u.id = ?;
            """
            row = conn.execute(query, (user_id,)).fetchone()
            if not row:
                return {}

            now = datetime.now(timezone.utc)
            days_remaining = 30
            if row["period_end"]:
                try:
                    end_dt = datetime.fromisoformat(row["period_end"].replace("Z", "+00:00"))
                    days_remaining = max(0, (end_dt - now).days)
                except Exception:
                    pass

            def build_metric(used_val: float, limit_val: float, unit_label: str) -> Dict[str, Any]:
                used = float(used_val or 0.0)
                limit = float(limit_val or 1.0)
                pct = min(100.0, round((used / limit) * 100, 1)) if limit > 0 else 100.0
                remaining = max(0.0, round(limit - used, 1))
                return {
                    "used": used,
                    "limit": limit,
                    "remaining": remaining,
                    "percentage": pct,
                    "unit": unit_label,
                    "is_depleted": used >= limit
                }

            metrics = {
                "video_processing_minutes": build_metric(
                    row["video_processing_minutes_used"], row["monthly_video_minutes"] or 15, "minutes"
                ),
                "ai_clip_generations": build_metric(
                    row["ai_clips_generated_used"], row["monthly_clips_limit"] or 10, "clips"
                ),
                "ai_analysis_requests": build_metric(
                    row["ai_analysis_requests_used"], row["monthly_ai_analysis_limit"] or 5, "requests"
                ),
                "thumbnail_generations": build_metric(
                    row["thumbnails_generated_used"], row["monthly_thumbnails_limit"] or 15, "thumbnails"
                ),
                "export_operations": build_metric(
                    row["exports_count_used"], row["monthly_exports_limit"] or 10, "exports"
                )
            }

            features = []
            try:
                features = json.loads(row["included_features"] or "[]")
            except Exception:
                pass

            # Upgrade recommendation if any metric is over 80%
            needs_upgrade = any(m["percentage"] >= 80.0 for m in metrics.values())
            any_depleted = any(m["is_depleted"] for m in metrics.values())

            return {
                "user_id": user_id,
                "plan": {
                    "id": row["plan_id"] or "plan_free",
                    "name": row["plan_name"] or "Free Starter",
                    "slug": row["plan_slug"] or "free",
                    "status": row["sub_status"] or "active",
                    "billing_interval": row["billing_interval"] or "monthly"
                },
                "cycle": {
                    "period_start": row["period_start"],
                    "period_end": row["period_end"],
                    "days_remaining": days_remaining
                },
                "credits_balance": row["credits_balance"] if row["credits_balance"] is not None else 0,
                "metrics": metrics,
                "features": features,
                "any_depleted": any_depleted,
                "needs_upgrade": needs_upgrade
            }
    finally:
        conn.close()

def check_permission_and_quota(
    user_id: str,
    required_feature: Optional[str] = None,
    metric_type: Optional[str] = None,
    amount: float = 1.0
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Server-side gatekeeper: checks subscription validity, plan feature permissions, and usage limits."""
    conn = get_db_connection()
    try:
        with conn:
            roll_over_usage_if_due(user_id, conn)

            query = """
                SELECT s.status as sub_status,
                       p.id as plan_id, p.name as plan_name, p.slug as plan_slug,
                       p.included_features,
                       p.monthly_video_minutes, p.monthly_clips_limit,
                       p.monthly_ai_analysis_limit, p.monthly_thumbnails_limit,
                       p.monthly_exports_limit,
                       m.video_processing_minutes_used, m.ai_clips_generated_used,
                       m.ai_analysis_requests_used, m.thumbnails_generated_used,
                       m.exports_count_used, m.credits_balance
                FROM user_subscriptions s
                JOIN subscription_plans p ON p.id = s.plan_id
                LEFT JOIN user_usage_meters m ON m.user_id = s.user_id
                WHERE s.user_id = ?;
            """
            sub = conn.execute(query, (user_id,)).fetchone()
            if not sub:
                return False, "No active subscription found for user.", None

            # 1. Subscription status check
            if sub["sub_status"] in ("past_due", "canceled", "expired"):
                return False, f"Subscription is currently {sub['sub_status']}. Please update your billing info to continue.", {
                    "upgrade_url": "/billing",
                    "current_status": sub["sub_status"]
                }

            # 2. Feature check
            if required_feature:
                features = []
                try:
                    features = json.loads(sub["included_features"] or "[]")
                except Exception:
                    pass

                if "all_features" not in features and required_feature not in features:
                    feature_names = {
                        "youtube_publishing": "Direct YouTube Publishing",
                        "advanced_editing": "Multi-track Professional Studio",
                        "4k_export": "4K Ultra-HD 60FPS Video Export",
                        "ai_intelligence": "AI Content Intelligence & Viral Strategy",
                        "competitor_analysis": "Competitor Channel Gap Analysis",
                        "priority_processing": "Priority Cloud Rendering Pipeline"
                    }
                    display_feature = feature_names.get(required_feature, required_feature.replace("_", " ").title())
                    tier_needed = "Pro tier" if required_feature in ("competitor_analysis", "4k_export", "ai_intelligence", "priority_processing") else "Creator Pro"
                    return False, f"'{display_feature}' is only available on {tier_needed} or higher plans.", {
                        "required_feature": required_feature,
                        "upgrade_url": "/pricing",
                        "current_plan": sub["plan_name"]
                    }

            # 3. Usage limit check
            if metric_type and metric_type in METRIC_COLUMNS:
                used_col = METRIC_COLUMNS[metric_type]
                limit_col = PLAN_LIMIT_COLUMNS[metric_type]
                used_val = float(sub[used_col] or 0.0)
                limit_val = float(sub[limit_col] or 0.0)

                if (used_val + amount) > limit_val:
                    metric_labels = {
                        "video_processing_minutes": "monthly video processing minutes",
                        "ai_clip_generations": "monthly AI clip generations",
                        "ai_analysis_requests": "monthly highlight analysis requests",
                        "thumbnail_generations": "monthly thumbnail generations",
                        "export_operations": "monthly export operations"
                    }
                    lbl = metric_labels.get(metric_type, metric_type)
                    return False, f"You have reached your {lbl} limit ({used_val:.1f}/{limit_val:.1f}). Please upgrade your plan for higher capacity.", {
                        "metric_type": metric_type,
                        "used": used_val,
                        "limit": limit_val,
                        "upgrade_url": "/pricing",
                        "current_plan": sub["plan_name"]
                    }

            return True, "Authorized.", None
    finally:
        conn.close()

def deduct_usage(
    user_id: str,
    metric_type: str,
    amount: float = 1.0,
    credits_cost: int = 1,
    resource_id: Optional[str] = None,
    description: Optional[str] = None
) -> Tuple[bool, str]:
    """Atomically record usage consumption, debit credits, and write to auditable ledger."""
    if metric_type not in METRIC_COLUMNS:
        return False, f"Unknown metric type: {metric_type}"

    col_name = METRIC_COLUMNS[metric_type]
    limit_col = PLAN_LIMIT_COLUMNS[metric_type]

    conn = get_db_connection()
    try:
        with conn:
            roll_over_usage_if_due(user_id, conn)

            meter = conn.execute("SELECT * FROM user_usage_meters WHERE user_id = ?;", (user_id,)).fetchone()
            if not meter:
                return False, "Usage meter not initialized for user."

            current_used = float(meter[col_name] or 0.0)
            new_used = current_used + amount
            current_credits = int(meter["credits_balance"] or 0)
            new_credits = max(0, current_credits - credits_cost)
            now_iso = datetime.now(timezone.utc).isoformat()

            conn.execute(f"""
                UPDATE user_usage_meters
                SET {col_name} = ?, credits_balance = ?, updated_at = ?
                WHERE user_id = ?;
            """, (new_used, new_credits, now_iso, user_id))

            # Audit ledger entry
            log_id = f"log_{uuid.uuid4().hex[:14]}"
            conn.execute("""
                INSERT INTO usage_logs (
                    id, user_id, metric_type, amount, credits_deducted,
                    balance_after, resource_id, description, metadata, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '{}', ?);
            """, (log_id, user_id, metric_type, amount, credits_cost, new_credits, resource_id, description or f"Consumed {amount} {metric_type}", now_iso))

            # Check if threshold alert is needed (80% or 100%)
            plan_info = conn.execute("""
                SELECT p.monthly_video_minutes, p.monthly_clips_limit,
                       p.monthly_ai_analysis_limit, p.monthly_thumbnails_limit,
                       p.monthly_exports_limit
                FROM user_subscriptions s
                JOIN subscription_plans p ON p.id = s.plan_id
                WHERE s.user_id = ?;
            """, (user_id,)).fetchone()

            if plan_info:
                limit_val = float(plan_info[limit_col] or 1.0)
                pct = (new_used / limit_val) * 100.0
                if pct >= 100.0:
                    conn.execute("""
                        INSERT INTO account_notifications (
                            id, user_id, type, title, message, action_url, is_read, created_at
                        ) VALUES (?, ?, 'low_credit_balance', 'Monthly Limit Reached',
                            ?, '/pricing', 0, ?);
                    """, (f"notif_{uuid.uuid4().hex[:12]}", user_id,
                          f"You have used 100% of your {metric_type.replace('_', ' ')}. Upgrade now to unlock additional quota.", now_iso))
                elif pct >= 80.0 and current_used < (limit_val * 0.8):
                    conn.execute("""
                        INSERT INTO account_notifications (
                            id, user_id, type, title, message, action_url, is_read, created_at
                        ) VALUES (?, ?, 'low_credit_balance', 'Approaching Quota Limit',
                            ?, '/pricing', 0, ?);
                    """, (f"notif_{uuid.uuid4().hex[:12]}", user_id,
                          f"You have consumed {pct:.0f}% of your monthly {metric_type.replace('_', ' ')}.", now_iso))

            return True, "Usage recorded."
    finally:
        conn.close()

def get_usage_history(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve user usage transaction history."""
    conn = get_db_connection()
    try:
        rows = conn.execute("""
            SELECT id, metric_type, amount, credits_deducted, balance_after,
                   resource_id, description, created_at
            FROM usage_logs
            WHERE user_id = ?
            ORDER BY created_at DESC LIMIT ?;
        """, (user_id, limit)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
