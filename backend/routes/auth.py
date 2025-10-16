"""
Authentication routes for FinKen 2.0
Handles user sign-in, registration requests, and admin user management
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from uuid import UUID
import logging
from datetime import datetime
import re

from ..models.auth import (
    UserLogin, TokenResponse, RegistrationRequestCreate, RegistrationRequest,
    RegistrationRequestUpdate, UserRegister, Profile, ProfileCreate,
    ApproveRegistrationRequest, RejectRegistrationRequest
)
from ..services.supabase import get_supabase_service, get_supabase_client, set_current_user

router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)

def generate_username(first_name: str, last_name: str) -> str:
    """
    Generate username according to Sprint requirements:
    first name initial + full last name + 4 digits (month+year)
    """
    now = datetime.now()
    month_year = f"{now.month:02d}{now.year % 100:02d}"
    username = f"{first_name[0].lower()}{last_name.lower()}{month_year}"
    return username

def validate_password(password: str) -> bool:
    """
    Validate password according to Sprint requirements:
    - Minimum 8 characters
    - Must start with a letter
    - Must have a letter, a number, and a special character
    """
    if len(password) < 8:
        return False
    
    if not password[0].isalpha():
        return False
    
    has_letter = bool(re.search(r'[A-Za-z]', password))
    has_number = bool(re.search(r'\d', password))
    has_special = bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password))
    
    return has_letter and has_number and has_special

async def get_current_user_from_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Profile:
    """Get current user from JWT token"""
    try:
        supabase = get_supabase_client()
        
        # Set the session token
        supabase.auth.set_session(credentials.credentials, "")
        
        # Get current user
        user_response = supabase.auth.get_user()
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        
        user_id = user_response.user.id
        
        # Get user profile from database
        profile_response = supabase.from_("profiles").select(
            "*, roles(RoleID, RoleName)"
        ).eq("id", user_id).single().execute()
        
        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        # Set current user context for audit logging
        set_current_user(user_id)
        
        return Profile(**profile_response.data)
        
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )

async def require_admin(current_user: Profile = Depends(get_current_user_from_token)) -> Profile:
    """Require admin role"""
    if current_user.role and current_user.role.role_name != "Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required"
        )
    return current_user

@router.get("/health")
async def auth_health():
    """Authentication service health check"""
    try:
        supabase_service = get_supabase_service()
        health_status = await supabase_service.health_check()
        return {
            "status": "healthy", 
            "service": "authentication",
            "supabase": health_status
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "authentication", 
            "error": str(e)
        }

@router.post("/signin", response_model=TokenResponse)
async def sign_in(user_login: UserLogin):
    """
    Sign in user using Supabase authentication
    """
    try:
        supabase = get_supabase_client()
        
        # Authenticate with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": user_login.email,
            "password": user_login.password
        })
        
        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        user_id = auth_response.user.id
        
        # Check if user profile exists and is active
        profile_response = supabase.from_("profiles").select(
            "*, roles(RoleID, RoleName)"
        ).eq("id", user_id).single().execute()
        
        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found. Please contact administrator."
            )
        
        profile = Profile(**profile_response.data)
        
        if not profile.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated. Please contact administrator."
            )
        
        # Set current user context
        set_current_user(user_id)
        
        return TokenResponse(
            access_token=auth_response.session.access_token,
            token_type="bearer",
            expires_in=auth_response.session.expires_in or 3600,
            refresh_token=auth_response.session.refresh_token,
            user=profile
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sign-in error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during sign-in"
        )

@router.post("/registration-request", response_model=dict)
async def create_registration_request(request: RegistrationRequestCreate):
    """
    Create a new registration request for admin approval
    """
    try:
        supabase = get_supabase_client()
        
        # Check if email already exists in registration requests
        existing_request = supabase.from_("registrationrequests").select("*").eq("Email", request.email).execute()
        
        if existing_request.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A registration request with this email already exists"
            )
        
        # Create registration request
        insert_data = {
            "FirstName": request.first_name,
            "LastName": request.last_name,
            "Email": request.email,
            "Status": "Pending"
        }
        
        result = supabase.from_("registrationrequests").insert(insert_data).execute()
        
        return {
            "message": "Registration request submitted successfully. You will receive an email once approved.",
            "request_id": result.data[0]["RequestID"] if result.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration request error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing registration request"
        )

@router.get("/registration-requests", response_model=List[RegistrationRequest])
async def get_registration_requests(
    status_filter: Optional[str] = None,
    current_user: Profile = Depends(require_admin)
):
    """
    Get all registration requests (admin only)
    """
    try:
        supabase = get_supabase_client()
        
        query = supabase.from_("registrationrequests").select("*")
        
        if status_filter:
            query = query.eq("Status", status_filter)
        
        result = query.order("RequestDate", desc=True).execute()
        
        return [RegistrationRequest(**item) for item in result.data]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get registration requests error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching registration requests"
        )

@router.post("/approve-registration/{request_id}")
async def approve_registration_request(
    request_id: int,
    approval_data: ApproveRegistrationRequest,
    current_user: Profile = Depends(require_admin)
):
    """
    Approve registration request and create user account (admin only)
    """
    try:
        supabase = get_supabase_client()
        
        # Validate password
        if not validate_password(approval_data.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters, start with a letter, and contain a letter, number, and special character"
            )
        
        # Get the registration request
        request_response = supabase.from_("registrationrequests").select("*").eq("RequestID", request_id).single().execute()
        
        if not request_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registration request not found"
            )
        
        reg_request = RegistrationRequest(**request_response.data)
        
        if reg_request.status != "Pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration request has already been processed"
            )
        
        # Check if role exists
        role_response = supabase.from_("roles").select("*").eq("RoleID", approval_data.role_id).single().execute()
        if not role_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role ID"
            )
        
        # Generate username
        username = generate_username(reg_request.first_name, reg_request.last_name)
        
        # Create user in Supabase Auth
        service_client = get_supabase_service().get_service_client()
        
        auth_response = service_client.auth.admin.create_user({
            "email": reg_request.email,
            "password": approval_data.password,
            "email_confirm": True
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account"
            )
        
        user_id = auth_response.user.id
        
        # Create user profile
        profile_data = {
            "id": user_id,
            "Username": username,
            "FirstName": reg_request.first_name,
            "LastName": reg_request.last_name,
            "RoleID": approval_data.role_id
        }
        
        profile_result = supabase.from_("profiles").insert(profile_data).execute()
        
        # Update registration request status
        update_data = {
            "Status": "Approved",
            "ReviewedByUserID": current_user.id,
            "ReviewDate": datetime.utcnow().isoformat()
        }
        
        supabase.from_("registrationrequests").update(update_data).eq("RequestID", request_id).execute()
        
        return {
            "message": "Registration request approved and user account created successfully",
            "username": username,
            "user_id": user_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Approve registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while approving registration request"
        )

@router.post("/reject-registration/{request_id}")
async def reject_registration_request(
    request_id: int,
    rejection_data: RejectRegistrationRequest,
    current_user: Profile = Depends(require_admin)
):
    """
    Reject registration request (admin only)
    """
    try:
        supabase = get_supabase_client()
        
        # Get the registration request
        request_response = supabase.from_("registrationrequests").select("*").eq("RequestID", request_id).single().execute()
        
        if not request_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registration request not found"
            )
        
        reg_request = RegistrationRequest(**request_response.data)
        
        if reg_request.status != "Pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration request has already been processed"
            )
        
        # Update registration request status
        update_data = {
            "Status": f"Rejected: {rejection_data.reason}",
            "ReviewedByUserID": current_user.id,
            "ReviewDate": datetime.utcnow().isoformat()
        }
        
        supabase.from_("registrationrequests").update(update_data).eq("RequestID", request_id).execute()
        
        return {
            "message": "Registration request rejected successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reject registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while rejecting registration request"
        )

@router.get("/profile")
async def get_current_profile(current_user: Profile = Depends(get_current_user_from_token)):
    """Get current user's profile"""
    return current_user

@router.post("/signout")
async def sign_out():
    """Sign out user"""
    try:
        supabase = get_supabase_client()
        supabase.auth.sign_out()
        return {"message": "Successfully signed out"}
    except Exception as e:
        logger.error(f"Sign-out error: {e}")
        return {"message": "Signed out"}

@router.post("/forgot-password")
async def forgot_password(email: str):
    """Send password reset email"""
    try:
        supabase = get_supabase_client()
        
        # Send password reset email (Supabase will handle checking if user exists)
        supabase.auth.reset_password_email(email)
        
        # Always return success message for security (don't reveal if email exists)
        return {"message": "If the email exists, a password reset link will be sent"}
        
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        return {"message": "If the email exists, a password reset link will be sent"}

@router.get("/roles")
async def get_roles(current_user: Profile = Depends(require_admin)):
    """Get all available roles (admin only)"""
    try:
        supabase = get_supabase_client()
        result = supabase.from_("roles").select("*").execute()
        return result.data
    except Exception as e:
        logger.error(f"Get roles error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching roles"
        )