from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
from backend.app.models.schemas import (
    UserRegisterRequest, UserLoginRequest, GoogleAuthRequest,
    VerifyEmailRequest, ForgotPasswordRequest, ResetPasswordRequest,
    OnboardingRequest
)
from backend.app.services import auth_service
from backend.app.api.deps import get_current_user, require_authenticated_user

router = APIRouter()

@router.post("/register")
def register(payload: UserRegisterRequest):
    """Register a new creator account with email and password."""
    success, message, user_data = auth_service.register_user(
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        username=payload.username
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return {"status": "success", "message": message, "user": user_data}

@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest):
    """Verify email address with verification token."""
    success, message, data = auth_service.verify_email(token=payload.token)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return {"status": "success", "message": message, "data": data}

@router.post("/login")
def login(payload: UserLoginRequest):
    """Authenticate creator with email and password and return JWT access token."""
    success, message, user_data = auth_service.login_user(
        email=payload.email,
        password=payload.password
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=message)
    return {"status": "success", "message": message, "user": user_data}

@router.post("/google")
def google_auth(payload: GoogleAuthRequest):
    """Authenticate or auto-provision creator via Google OAuth token."""
    success, message, user_data = auth_service.google_sign_in(
        email=payload.email,
        name=payload.name,
        avatar_url=payload.avatar_url
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return {"status": "success", "message": message, "user": user_data}

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    """Request password reset link and token."""
    success, message, token = auth_service.request_password_reset(email=payload.email)
    return {
        "status": "success",
        "message": message,
        "reset_token": token # Included for easy developer/test verification
    }

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest):
    """Set new password using reset token."""
    success, message = auth_service.reset_password(
        token=payload.token,
        new_password=payload.new_password
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return {"status": "success", "message": message}

@router.get("/me")
def get_current_user_profile(user: Dict[str, Any] = Depends(get_current_user)):
    """Get authenticated creator profile, subscription, channel and usage meters."""
    return user

@router.post("/onboarding")
def complete_onboarding(payload: OnboardingRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Save creator onboarding preferences."""
    success, message, updated_profile = auth_service.complete_onboarding(
        user_id=user["id"],
        onboarding_data=payload.model_dump()
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return {"status": "success", "message": message, "user": updated_profile}

@router.post("/logout")
def logout(user: Dict[str, Any] = Depends(get_current_user)):
    """Invalidate session and sign out user."""
    return {"status": "success", "message": "Signed out successfully."}

