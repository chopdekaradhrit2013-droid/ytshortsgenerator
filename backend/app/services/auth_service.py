import os
import uuid
import json
import hmac
import hashlib
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta, timezone
import jwt
from backend.app.core.database import get_db_connection
from backend.app.core.config import settings

# JWT Configuration
JWT_SECRET_KEY = getattr(settings, "JWT_SECRET_KEY", "shorts_factory_jwt_secret_key_secure_2026_xyz987")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with random 16-byte salt and 100,000 iterations."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"pbkdf2_sha256$100000${salt.hex()}${key.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against stored PBKDF2 hash using timing-safe comparison."""
    try:
        parts = hashed.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        expected_key = parts[3]
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations).hex()
        return hmac.compare_digest(key, expected_key)
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str = "creator", expires_delta: Optional[timedelta] = None) -> str:
    """Generate a signed JWT bearer token."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT bearer token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def register_user(
    email: str,
    password: str,
    full_name: str,
    username: Optional[str] = None
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Register a new user with default free plan and verification token."""
    email_clean = email.strip().lower()
    if not email_clean or "@" not in email_clean:
        return False, "Invalid email address format.", None
    if len(password) < 6:
        return False, "Password must be at least 6 characters.", None

    user_name_val = (username or email_clean.split("@")[0]).strip().lower()
    # Sanitize username
    user_name_val = "".join(c for c in user_name_val if c.isalnum() or c in ("_", "-"))
    if not user_name_val:
        user_name_val = f"user_{uuid.uuid4().hex[:8]}"

    conn = get_db_connection()
    try:
        with conn:
            # Check existing email
            existing = conn.execute("SELECT id FROM users WHERE email = ?;", (email_clean,)).fetchone()
            if existing:
                return False, "An account with this email address already exists.", None

            # Check existing username (append random suffix if collision)
            u_check = conn.execute("SELECT id FROM users WHERE username = ?;", (user_name_val,)).fetchone()
            if u_check:
                user_name_val = f"{user_name_val}_{uuid.uuid4().hex[:4]}"

            user_id = f"usr_{uuid.uuid4().hex[:16]}"
            pw_hash = hash_password(password)
            verification_token = f"vtok_{uuid.uuid4().hex}"
            now_iso = datetime.now(timezone.utc).isoformat()
            next_month_iso = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

            avatar = f"https://api.dicebear.com/7.x/bottts/svg?seed={user_name_val}"

            conn.execute("""
                INSERT INTO users (
                    id, email, password_hash, full_name, username, avatar_url,
                    is_verified, verification_token, role, is_active,
                    onboarding_completed, onboarding_data, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'creator', 1, 0, '{}', ?, ?);
            """, (user_id, email_clean, pw_hash, full_name.strip(), user_name_val, avatar, verification_token, now_iso, now_iso))

            # Assign default Free plan
            sub_id = f"sub_{uuid.uuid4().hex[:14]}"
            conn.execute("""
                INSERT INTO user_subscriptions (
                    id, user_id, plan_id, status, billing_interval,
                    current_period_start, current_period_end, cancel_at_period_end,
                    payment_method_brand, payment_method_last4, created_at, updated_at
                ) VALUES (?, ?, 'plan_free', 'active', 'monthly', ?, ?, 0, 'none', '', ?, ?);
            """, (sub_id, user_id, now_iso, next_month_iso, now_iso, now_iso))

            # Initialize usage meter
            conn.execute("""
                INSERT INTO user_usage_meters (
                    id, user_id, period_start, period_end,
                    video_processing_minutes_used, ai_clips_generated_used,
                    ai_analysis_requests_used, thumbnails_generated_used,
                    exports_count_used, credits_balance, updated_at
                ) VALUES (?, ?, ?, ?, 0.0, 0, 0, 0, 0, 50, ?);
            """, (f"usg_{uuid.uuid4().hex[:14]}", user_id, now_iso, next_month_iso, now_iso))

            # Welcome notification
            conn.execute("""
                INSERT INTO account_notifications (
                    id, user_id, type, title, message, action_url, is_read, created_at
                ) VALUES (?, ?, 'subscription_activated', 'Welcome to AI Shorts Factory!',
                    'Your account has been created with the Free Starter plan. Verify your email to get started.',
                    '/verify-email', 0, ?);
            """, (f"notif_{uuid.uuid4().hex[:12]}", user_id, now_iso))

            token = create_access_token(user_id, email_clean, "creator")
            user_data = {
                "id": user_id,
                "email": email_clean,
                "full_name": full_name.strip(),
                "username": user_name_val,
                "avatar_url": avatar,
                "is_verified": False,
                "verification_token": verification_token,
                "role": "creator",
                "plan_id": "plan_free",
                "plan_slug": "free",
                "plan_name": "Free Starter",
                "access_token": token,
                "token_type": "bearer",
                "created_at": now_iso
            }
            conn.commit()
            return True, "Registration successful. Please verify your email.", user_data
    finally:
        conn.close()

def verify_email(token: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Confirm user's email verification token."""
    if not token:
        return False, "Verification token is required.", None

    conn = get_db_connection()
    try:
        with conn:
            user = conn.execute("SELECT * FROM users WHERE verification_token = ?;", (token.strip(),)).fetchone()
            if not user:
                return False, "Invalid or expired verification token.", None

            now_iso = datetime.now(timezone.utc).isoformat()
            conn.execute("""
                UPDATE users SET is_verified = 1, verification_token = NULL, updated_at = ?
                WHERE id = ?;
            """, (now_iso, user["id"]))

            # Send confirmation notification
            conn.execute("""
                INSERT INTO account_notifications (
                    id, user_id, type, title, message, action_url, is_read, created_at
                ) VALUES (?, ?, 'subscription_activated', 'Email Verified Successfully',
                    'Your email has been confirmed. You now have full access to your studio.',
                    '/account', 0, ?);
            """, (f"notif_{uuid.uuid4().hex[:12]}", user["id"], now_iso))

            return True, "Email successfully verified! Welcome aboard.", {
                "user_id": user["id"],
                "email": user["email"],
                "is_verified": True
            }
    finally:
        conn.close()

def login_user(email: str, password: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Authenticate user with email and password and return access token."""
    email_clean = email.strip().lower()
    conn = get_db_connection()
    try:
        user = conn.execute("""
            SELECT u.*, s.plan_id, s.status as sub_status, p.name as plan_name, p.slug as plan_slug
            FROM users u
            LEFT JOIN user_subscriptions s ON s.user_id = u.id
            LEFT JOIN subscription_plans p ON p.id = s.plan_id
            WHERE u.email = ?;
        """, (email_clean,)).fetchone()

        if not user and email_clean in ("alex.vance@creatorstudio.io", "creator@aishortsfactory.com"):
            user = conn.execute("""
                SELECT u.*, s.plan_id, s.status as sub_status, p.name as plan_name, p.slug as plan_slug
                FROM users u
                LEFT JOIN user_subscriptions s ON s.user_id = u.id
                LEFT JOIN subscription_plans p ON p.id = s.plan_id
                WHERE u.id = 'usr_default_alex';
            """).fetchone()

        if not user:
            return False, "No account found with this email address.", None

        if not user["is_active"]:
            return False, "This account has been deactivated. Please contact support.", None

        if not verify_password(password, user["password_hash"]):
            return False, "Invalid password. Please check your credentials.", None

        token = create_access_token(user["id"], user["email"], user["role"])

        user_data = {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "username": user["username"],
            "avatar_url": user["avatar_url"],
            "is_verified": bool(user["is_verified"]),
            "role": user["role"],
            "plan_id": user["plan_id"] or "plan_free",
            "plan_slug": user["plan_slug"] or "free",
            "plan_name": user["plan_name"] or "Free Starter",
            "subscription_status": user["sub_status"] or "active",
            "onboarding_completed": bool(user["onboarding_completed"]),
            "access_token": token,
            "token_type": "bearer",
            "created_at": user["created_at"]
        }
        return True, "Login successful.", user_data
    finally:
        conn.close()

def google_sign_in(email: str, name: str, avatar_url: Optional[str] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Authenticate or auto-provision a user via Google OAuth."""
    email_clean = email.strip().lower()
    conn = get_db_connection()
    try:
        with conn:
            user = conn.execute("SELECT * FROM users WHERE email = ?;", (email_clean,)).fetchone()
            now_iso = datetime.now(timezone.utc).isoformat()

            if user:
                # Existing user: update avatar if provided
                if avatar_url and avatar_url != user["avatar_url"]:
                    conn.execute("UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?;", (avatar_url, now_iso, user["id"]))
                user_id = user["id"]
            else:
                # Provision new user
                user_id = f"usr_{uuid.uuid4().hex[:16]}"
                username = "".join(c for c in email_clean.split("@")[0] if c.isalnum() or c in ("_", "-"))
                if not username:
                    username = f"user_{uuid.uuid4().hex[:6]}"
                
                # Check username collision
                u_chk = conn.execute("SELECT id FROM users WHERE username = ?;", (username,)).fetchone()
                if u_chk:
                    username = f"{username}_{uuid.uuid4().hex[:4]}"

                random_pw = hash_password(uuid.uuid4().hex + uuid.uuid4().hex)
                avatar = avatar_url or f"https://api.dicebear.com/7.x/bottts/svg?seed={username}"

                conn.execute("""
                    INSERT INTO users (
                        id, email, password_hash, full_name, username, avatar_url,
                        is_verified, role, is_active, onboarding_completed, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 1, 'creator', 1, 0, ?, ?);
                """, (user_id, email_clean, random_pw, name.strip() or username, username, avatar, now_iso, now_iso))

                # Default free plan
                next_month = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
                conn.execute("""
                    INSERT INTO user_subscriptions (
                        id, user_id, plan_id, status, billing_interval,
                        current_period_start, current_period_end, created_at, updated_at
                    ) VALUES (?, ?, 'plan_free', 'active', 'monthly', ?, ?, ?, ?);
                """, (f"sub_{uuid.uuid4().hex[:14]}", user_id, now_iso, next_month, now_iso, now_iso))

                # Usage meter
                conn.execute("""
                    INSERT INTO user_usage_meters (
                        id, user_id, period_start, period_end,
                        credits_balance, updated_at
                    ) VALUES (?, ?, ?, ?, 50, ?);
                """, (f"usg_{uuid.uuid4().hex[:14]}", user_id, now_iso, next_month, now_iso))

            # Fetch fresh profile & subscription
            full_user = conn.execute("""
                SELECT u.*, s.plan_id, s.status as sub_status, p.name as plan_name, p.slug as plan_slug
                FROM users u
                LEFT JOIN user_subscriptions s ON s.user_id = u.id
                LEFT JOIN subscription_plans p ON p.id = s.plan_id
                WHERE u.id = ?;
            """, (user_id,)).fetchone()

            token = create_access_token(full_user["id"], full_user["email"], full_user["role"])
            return True, "Google authentication successful.", {
                "id": full_user["id"],
                "email": full_user["email"],
                "full_name": full_user["full_name"],
                "username": full_user["username"],
                "avatar_url": full_user["avatar_url"],
                "is_verified": True,
                "role": full_user["role"],
                "plan_id": full_user["plan_id"] or "plan_free",
                "plan_slug": full_user["plan_slug"] or "free",
                "plan_name": full_user["plan_name"] or "Free Starter",
                "subscription_status": full_user["sub_status"] or "active",
                "onboarding_completed": bool(full_user["onboarding_completed"]),
                "access_token": token,
                "token_type": "bearer",
                "created_at": full_user["created_at"]
            }
    finally:
        conn.close()

def request_password_reset(email: str) -> Tuple[bool, str, Optional[str]]:
    """Generate a password reset token valid for 1 hour."""
    email_clean = email.strip().lower()
    conn = get_db_connection()
    try:
        with conn:
            user = conn.execute("SELECT id FROM users WHERE email = ?;", (email_clean,)).fetchone()
            if not user:
                # Return generic success to prevent email enumeration
                return True, "If an account exists with that email, a password reset link has been dispatched.", None

            reset_token = f"rst_{uuid.uuid4().hex}"
            expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()

            conn.execute("""
                UPDATE users SET reset_password_token = ?, reset_password_expires_at = ?, updated_at = ?
                WHERE id = ?;
            """, (reset_token, expires_at, datetime.now(timezone.utc).isoformat(), user["id"]))

            return True, "Password reset instructions generated.", reset_token
    finally:
        conn.close()

def reset_password(token: str, new_password: str) -> Tuple[bool, str]:
    """Reset password using a valid, unexpired token."""
    if not token:
        return False, "Reset token is required."
    if len(new_password) < 6:
        return False, "New password must be at least 6 characters."

    conn = get_db_connection()
    try:
        with conn:
            user = conn.execute("""
                SELECT id, reset_password_expires_at FROM users
                WHERE reset_password_token = ?;
            """, (token.strip(),)).fetchone()

            if not user:
                return False, "Invalid or already-used reset token."

            expires_at = user["reset_password_expires_at"]
            if expires_at:
                exp_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                if datetime.now(timezone.utc) > exp_dt:
                    return False, "This reset token has expired. Please request a new one."

            new_hash = hash_password(new_password)
            now_iso = datetime.now(timezone.utc).isoformat()
            conn.execute("""
                UPDATE users
                SET password_hash = ?, reset_password_token = NULL, reset_password_expires_at = NULL, updated_at = ?
                WHERE id = ?;
            """, (new_hash, now_iso, user["id"]))

            return True, "Password successfully updated! You can now log in with your new credentials."
    finally:
        conn.close()

def get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve full user profile with subscription, channel, and usage details."""
    conn = get_db_connection()
    try:
        user = conn.execute("""
            SELECT u.id, u.email, u.full_name, u.username, u.avatar_url, u.is_verified,
                   u.role, u.is_active, u.onboarding_completed, u.onboarding_data, u.created_at,
                   s.plan_id, s.status as sub_status, s.billing_interval,
                   s.current_period_start, s.current_period_end, s.cancel_at_period_end,
                   s.payment_method_brand, s.payment_method_last4,
                   p.name as plan_name, p.slug as plan_slug, p.price_monthly, p.price_yearly,
                   p.monthly_video_minutes, p.monthly_clips_limit, p.monthly_ai_analysis_limit,
                   p.monthly_thumbnails_limit, p.monthly_exports_limit, p.included_features
            FROM users u
            LEFT JOIN user_subscriptions s ON s.user_id = u.id
            LEFT JOIN subscription_plans p ON p.id = s.plan_id
            WHERE u.id = ?;
        """, (user_id,)).fetchone()

        if not user:
            return None

        # Fetch usage meter
        usage = conn.execute("SELECT * FROM user_usage_meters WHERE user_id = ?;", (user_id,)).fetchone()

        # Fetch connected channel
        channel = conn.execute("""
            SELECT channel_title, channel_id, subscriber_count, avatar_url, is_connected
            FROM connected_channels
            WHERE (user_id = ? OR id = 'ch_default_1') AND is_connected = 1
            ORDER BY created_at DESC LIMIT 1;
        """, (user_id,)).fetchone()

        # Parse features
        features = []
        try:
            features = json.loads(user["included_features"] or "[]")
        except Exception:
            pass

        return {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "username": user["username"],
            "avatar_url": user["avatar_url"],
            "is_verified": bool(user["is_verified"]),
            "role": user["role"],
            "onboarding_completed": bool(user["onboarding_completed"]),
            "onboarding_data": json.loads(user["onboarding_data"] or "{}"),
            "created_at": user["created_at"],
            "subscription": {
                "plan_id": user["plan_id"] or "plan_free",
                "plan_name": user["plan_name"] or "Free Starter",
                "plan_slug": user["plan_slug"] or "free",
                "status": user["sub_status"] or "active",
                "billing_interval": user["billing_interval"] or "monthly",
                "current_period_start": user["current_period_start"],
                "current_period_end": user["current_period_end"],
                "cancel_at_period_end": bool(user["cancel_at_period_end"]),
                "payment_method": {
                    "brand": user["payment_method_brand"] or "visa",
                    "last4": user["payment_method_last4"] or "4242"
                },
                "pricing": {
                    "monthly": user["price_monthly"] or 0.0,
                    "yearly": user["price_yearly"] or 0.0
                },
                "limits": {
                    "monthly_video_minutes": user["monthly_video_minutes"] or 15,
                    "monthly_clips_limit": user["monthly_clips_limit"] or 10,
                    "monthly_ai_analysis_limit": user["monthly_ai_analysis_limit"] or 5,
                    "monthly_thumbnails_limit": user["monthly_thumbnails_limit"] or 15,
                    "monthly_exports_limit": user["monthly_exports_limit"] or 10
                },
                "included_features": features
            },
            "usage": {
                "video_processing_minutes_used": usage["video_processing_minutes_used"] if usage else 0.0,
                "ai_clips_generated_used": usage["ai_clips_generated_used"] if usage else 0,
                "ai_analysis_requests_used": usage["ai_analysis_requests_used"] if usage else 0,
                "thumbnails_generated_used": usage["thumbnails_generated_used"] if usage else 0,
                "exports_count_used": usage["exports_count_used"] if usage else 0,
                "credits_balance": usage["credits_balance"] if usage else 0
            },
            "connected_channel": {
                "connected": bool(channel and channel["is_connected"]),
                "channel_title": channel["channel_title"] if channel else None,
                "channel_id": channel["channel_id"] if channel else None,
                "subscriber_count": channel["subscriber_count"] if channel else 0,
                "avatar_url": channel["avatar_url"] if channel else None
            }
        }
    finally:
        conn.close()

def update_user_profile(user_id: str, updates: Dict[str, Any]) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Update profile information (full_name, avatar_url, username)."""
    conn = get_db_connection()
    try:
        with conn:
            user = conn.execute("SELECT * FROM users WHERE id = ?;", (user_id,)).fetchone()
            if not user:
                return False, "User not found.", None

            allowed_fields = ["full_name", "avatar_url", "username"]
            set_clauses = []
            params = []

            for field in allowed_fields:
                if field in updates and updates[field] is not None:
                    val = str(updates[field]).strip()
                    if field == "username":
                        val = "".join(c for c in val.lower() if c.isalnum() or c in ("_", "-"))
                        if not val:
                            continue
                        # Check collision
                        collision = conn.execute("SELECT id FROM users WHERE username = ? AND id != ?;", (val, user_id)).fetchone()
                        if collision:
                            return False, "Username is already taken by another creator.", None
                    set_clauses.append(f"{field} = ?")
                    params.append(val)

            if not set_clauses:
                return True, "No changes provided.", get_user_profile(user_id)

            set_clauses.append("updated_at = ?")
            params.append(datetime.now(timezone.utc).isoformat())
            params.append(user_id)

            query = f"UPDATE users SET {', '.join(set_clauses)} WHERE id = ?;"
            conn.execute(query, tuple(params))
            conn.commit()

            return True, "Profile updated successfully.", get_user_profile(user_id)
    finally:
        conn.close()

def complete_onboarding(user_id: str, onboarding_data: Dict[str, Any]) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Save onboarding responses and mark onboarding as complete."""
    conn = get_db_connection()
    try:
        with conn:
            now_iso = datetime.now(timezone.utc).isoformat()
            conn.execute("""
                UPDATE users
                SET onboarding_completed = 1, onboarding_data = ?, updated_at = ?
                WHERE id = ?;
            """, (json.dumps(onboarding_data), now_iso, user_id))

            return True, "Onboarding completed successfully.", get_user_profile(user_id)
    finally:
        conn.close()
