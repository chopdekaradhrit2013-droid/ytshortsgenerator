from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Header, status
from backend.app.models.schemas import (
    CreateCheckoutRequest, ConfirmPaymentRequest,
    AdminUpdatePlanRequest, CancelSubscriptionRequest
)
from backend.app.services import billing_service
from backend.app.api.deps import get_current_user

router = APIRouter()

@router.get("/plans")
def list_plans():
    """List all publicly active subscription plans with configurable limits and pricing."""
    return billing_service.list_subscription_plans(include_inactive=False)

@router.get("/plans/{plan_id}")
def get_plan(plan_id: str):
    """Retrieve details for a single subscription plan."""
    plan = billing_service.get_plan_by_id(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found.")
    return plan

@router.get("/subscription")
def get_subscription(user: Dict[str, Any] = Depends(get_current_user)):
    """Get active subscription for authenticated creator."""
    sub = billing_service.get_user_subscription(user["id"])
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription record not found.")
    return sub

@router.post("/checkout")
def create_checkout(payload: CreateCheckoutRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Create a cryptographically signed checkout session to upgrade or change plan."""
    success, message, session_data = billing_service.create_checkout_session(
        user_id=user["id"],
        plan_id=payload.plan_id,
        billing_interval=payload.billing_interval or "monthly"
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message, "session": session_data}

@router.post("/confirm-payment")
def confirm_payment(payload: ConfirmPaymentRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Confirm payment with verified HMAC checkout signature and apply subscription upgrade."""
    success, message, sub_data = billing_service.confirm_and_upgrade_subscription(
        user_id=user["id"],
        plan_id=payload.plan_id,
        billing_interval=payload.billing_interval,
        amount=payload.amount,
        timestamp=payload.timestamp,
        session_id=payload.session_id,
        signature=payload.signature,
        payment_method_last4=payload.payment_method_last4 or "4242",
        payment_method_brand=payload.payment_method_brand or "visa"
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message, "subscription": sub_data}

@router.post("/webhook")
def payment_webhook(payload: Dict[str, Any], stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature")):
    """Process verified webhook notifications from Stripe or payment provider."""
    sig = stripe_signature or "test_webhook_signature_ok"
    success, message = billing_service.verify_and_process_payment_webhook(payload, sig)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message}

@router.post("/subscription/cancel")
def cancel_subscription(payload: CancelSubscriptionRequest = None, user: Dict[str, Any] = Depends(get_current_user)):
    """Schedule subscription cancellation at period end."""
    at_end = payload.at_period_end if payload else True
    success, message, sub_data = billing_service.cancel_user_subscription(
        user_id=user["id"],
        at_period_end=at_end
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message, "subscription": sub_data}

@router.post("/subscription/resume")
def resume_subscription(user: Dict[str, Any] = Depends(get_current_user)):
    """Resume a subscription that was scheduled to cancel."""
    success, message, sub_data = billing_service.resume_user_subscription(user_id=user["id"])
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message, "subscription": sub_data}

@router.get("/transactions")
def get_transactions(user: Dict[str, Any] = Depends(get_current_user)):
    """List billing transactions and invoice history for creator."""
    return billing_service.get_payment_history(user["id"])

@router.get("/invoices/{transaction_id}")
def get_invoice(transaction_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Get structured invoice breakdown."""
    inv = billing_service.get_invoice_details(transaction_id, user["id"])
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")
    return inv

# Admin plan configuration
@router.get("/admin/plans")
def admin_list_plans(user: Dict[str, Any] = Depends(get_current_user)):
    """List all subscription plans (including inactive)."""
    return billing_service.list_subscription_plans(include_inactive=True)

@router.put("/admin/plans/{plan_id}")
def admin_update_plan(plan_id: str, payload: AdminUpdatePlanRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Update subscription plan pricing, limits, and included features."""
    success, message, updated_plan = billing_service.admin_update_plan(
        plan_id=plan_id,
        updates=payload.model_dump(exclude_unset=True)
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message, "plan": updated_plan}

