from typing import Optional, Dict, Any, List
from fastapi import Header, HTTPException, status
from backend.app.services.auth_service import decode_access_token, get_user_profile
from backend.app.core.database import get_db_connection

DEFAULT_USER_ID = "usr_default_alex"

ROLE_RANKS = {
    "super_admin": 3,
    "admin": 2,
    "support_agent": 1,
    "creator": 0
}

def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Extract authenticated user from Bearer JWT.
    Falls back gracefully to default seed user if no header is present (ensuring backwards compatibility).
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            user = get_user_profile(payload["sub"])
            if user:
                return user

    # Default fallback user for legacy dev / demo sessions
    default_user = get_user_profile(DEFAULT_USER_ID)
    if default_user:
        return default_user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not authenticate request."
    )

def require_authenticated_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Strict authentication: rejects request with 401 if valid bearer token is not supplied."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication bearer token required."
        )

    token = authorization.split("Bearer ", 1)[1].strip()
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token."
        )

    user = get_user_profile(payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists."
        )

    return user

def require_admin_role(allowed_roles: List[str]):
    """
    Factory dependency for role-based access control.
    Strictly requires a valid bearer token, verifies that the user account is active,
    and ensures their database role is in the allowed list.
    """
    def dependency(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Administrative authentication required."
            )

        token = authorization.split("Bearer ", 1)[1].strip()
        payload = decode_access_token(token)
        if not payload or "sub" not in payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired administrative token."
            )

        user = get_user_profile(payload["sub"])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Administrative user not found."
            )

        # Check real database account status and role
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT is_active, account_status, role FROM users WHERE id = ?;", (user["id"],)).fetchone()
            if not row or not row["is_active"] or row["account_status"] in ("suspended", "disabled"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This administrative account is suspended or disabled."
                )
            current_role = row["role"]
        finally:
            conn.close()

        if current_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: '{current_role}' role lacks permission. Required roles: {allowed_roles}"
            )

        user["role"] = current_role
        return user

    return dependency

# Convenience role dependencies
get_super_admin = require_admin_role(["super_admin"])
get_admin_user = require_admin_role(["super_admin", "admin"])
get_staff_user = require_admin_role(["super_admin", "admin", "support_agent"])


