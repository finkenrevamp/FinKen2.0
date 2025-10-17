"""
Authentication routes for FinKen 2.0
Handles user sign-in, registration requests, and admin user management
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from uuid import UUID
import logging
from datetime import datetime
import re

from models.auth import (
    UserLogin, TokenResponse, RegistrationRequestCreate, RegistrationRequest,
    RegistrationRequestUpdate, UserRegister, Profile, ProfileCreate,
    ApproveRegistrationRequest, RejectRegistrationRequest, SignupInvitation,
    SignupInvitationCreate, SecurityQuestion, UserSecurityAnswer, CompleteSignupRequest,
    VerifyInvitationResponse, ChangePasswordRequest, ResetPasswordRequest,
    InitiateForgotPasswordRequest, VerifySecurityAnswerRequest, SecurityQuestionResponse,
    PasswordResetTokenResponse, PasswordResetToken
)
from services.supabase import get_supabase_service, get_supabase_client, set_current_user

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
        
        # Get current user directly from the access token without setting session
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        
        user_id = user_response.user.id
        
        # Get user profile from database
        profile_response = supabase.from_("profiles").select("*").eq("id", user_id).single().execute()
        
        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        profile_data = profile_response.data
        
        # Fetch the role information separately
        role_id = profile_data.get("RoleID")
        if role_id:
            role_response = supabase.from_("roles").select("*").eq("RoleID", role_id).single().execute()
            if role_response.data:
                profile_data["role"] = role_response.data
        
        profile = Profile(**profile_data)
        
        # Check if user is deactivated
        if not profile.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated. Please contact administrator."
            )
        
        # Check if user is suspended
        if profile.is_suspended:
            if profile.suspension_end_date:
                # Check if suspension has expired
                from datetime import timezone
                current_time = datetime.now(timezone.utc)
                
                # Make suspension_end_date timezone-aware if it isn't already
                suspension_end = profile.suspension_end_date
                if suspension_end.tzinfo is None:
                    suspension_end = suspension_end.replace(tzinfo=timezone.utc)
                
                if current_time < suspension_end:
                    # Still suspended
                    suspension_date_str = suspension_end.strftime("%B %d, %Y")
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"User account is suspended until {suspension_date_str}. Please contact administrator."
                    )
                else:
                    # Suspension expired, automatically unsuspend the user
                    supabase.from_("profiles").update({
                        "isSuspended": False,
                        "SuspensionEndDate": None
                    }).eq("id", user_id).execute()
                    profile.is_suspended = False
                    profile.suspension_end_date = None
            else:
                # Suspended indefinitely
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User account is suspended. Please contact administrator."
                )
        
        # Set current user context for audit logging
        set_current_user(user_id)
        
        return profile
        
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
        profile_response = supabase.from_("profiles").select("*").eq("id", user_id).single().execute()
        
        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found. Please contact administrator."
            )
        
        profile_data = profile_response.data
        
        # Fetch the role information separately
        role_id = profile_data.get("RoleID")
        if role_id:
            role_response = supabase.from_("roles").select("*").eq("RoleID", role_id).single().execute()
            if role_response.data:
                profile_data["role"] = role_response.data
        
        profile = Profile(**profile_data)
        
        if not profile.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated. Please contact administrator."
            )
        
        # Check if user is suspended
        if profile.is_suspended:
            if profile.suspension_end_date:
                # Check if suspension has expired
                from datetime import timezone
                current_time = datetime.now(timezone.utc)
                
                # Make suspension_end_date timezone-aware if it isn't already
                suspension_end = profile.suspension_end_date
                if suspension_end.tzinfo is None:
                    suspension_end = suspension_end.replace(tzinfo=timezone.utc)
                
                if current_time < suspension_end:
                    # Still suspended
                    suspension_date_str = suspension_end.strftime("%B %d, %Y")
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"User account is suspended until {suspension_date_str}. Please contact administrator."
                    )
                else:
                    # Suspension expired, automatically unsuspend the user
                    supabase.from_("profiles").update({
                        "isSuspended": False,
                        "SuspensionEndDate": None
                    }).eq("id", user_id).execute()
                    profile.is_suspended = False
                    profile.suspension_end_date = None
            else:
                # Suspended indefinitely
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User account is suspended. Please contact administrator."
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
            "DOB": request.dob.isoformat() if request.dob else None,
            "Address": request.address,
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
    Approve registration request and send signup invitation (admin only)
    """
    try:
        import secrets
        from datetime import timedelta
        
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
        
        # Check if role exists
        role_response = supabase.from_("roles").select("*").eq("RoleID", approval_data.role_id).single().execute()
        if not role_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role ID"
            )
        
        # Generate a secure token for signup invitation
        invitation_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=7)  # Token expires in 7 days
        
        # Create signup invitation with the approved role
        invitation_data = {
            "requestid": request_id,
            "token": invitation_token,
            "expiresat": expires_at.isoformat(),
            "approveduserrole": approval_data.role_id
        }
        
        invitation_result = supabase.from_("signupinvitations").insert(invitation_data).execute()
        
        # Update registration request status
        update_data = {
            "Status": "Approved",
            "ReviewedByUserID": str(current_user.id),
            "ReviewDate": datetime.utcnow().isoformat()
        }
        
        supabase.from_("registrationrequests").update(update_data).eq("RequestID", request_id).execute()
        
        # Import email service
        from services.emailUserFunction import send_signup_invitation_email
        from services.supabase import get_supabase_service
        
        # Generate signup URL
        frontend_url = "http://localhost:5173"  # TODO: Make this configurable
        signup_url = f"{frontend_url}/finish-signup?token={invitation_token}"
        
        # Get admin's email from Supabase auth using service client
        admin_email = "admin@finken.com"  # Default fallback
        try:
            service_client = get_supabase_service().get_service_client()
            admin_user_response = service_client.auth.admin.get_user_by_id(str(current_user.id))
            if admin_user_response and admin_user_response.user and admin_user_response.user.email:
                admin_email = admin_user_response.user.email
        except Exception as e:
            logger.warning(f"Could not fetch admin email: {e}")
        
        # Send invitation email
        try:
            send_signup_invitation_email(
                admin_email=admin_email,
                admin_name=f"{current_user.first_name} {current_user.last_name}",
                user_email=reg_request.email,
                user_name=f"{reg_request.first_name} {reg_request.last_name}",
                signup_url=signup_url,
                role_name=role_response.data["RoleName"]
            )
        except Exception as email_error:
            logger.error(f"Failed to send invitation email: {email_error}")
            # Don't fail the whole operation if email fails
        
        return {
            "message": "Registration request approved. User will receive an email with setup instructions.",
            "token": invitation_token
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
            "ReviewedByUserID": str(current_user.id),
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

@router.post("/forgot-password", response_model=SecurityQuestionResponse)
async def initiate_forgot_password(request: InitiateForgotPasswordRequest):
    """
    Initiate forgot password process by verifying email and username,
    then returning the user's security question
    """
    try:
        supabase = get_supabase_client()
        service_client = get_supabase_service().get_service_client()
        
        # Get user by email from auth.users
        try:
            users_response = service_client.auth.admin.list_users()
            user_auth = None
            for user in users_response:
                if user.email and user.email.lower() == request.email.lower():
                    user_auth = user
                    break
            
            if not user_auth:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No account found with this email address"
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching user by email: {e}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email address"
            )
        
        # Verify username matches the profile
        profile_response = supabase.from_("profiles").select("*").eq("id", user_auth.id).eq("Username", request.username).execute()
        
        if not profile_response.data or len(profile_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and username do not match"
            )
        
        # Get user's security question
        security_answer_response = supabase.from_("usersecurityanswers").select("questionid").eq("userid", user_auth.id).execute()
        
        if not security_answer_response.data or len(security_answer_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No security question found for this account. Please contact administrator."
            )
        
        question_id = security_answer_response.data[0]["questionid"]
        
        # Get the security question text
        question_response = supabase.from_("securityquestions").select("*").eq("questionid", question_id).single().execute()
        
        if not question_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve security question"
            )
        
        return SecurityQuestionResponse(
            question_id=question_id,
            question_text=question_response.data["questiontext"],
            user_id=user_auth.id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Initiate forgot password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your request"
        )

@router.post("/verify-security-answer", response_model=PasswordResetTokenResponse)
async def verify_security_answer_and_send_email(request: VerifySecurityAnswerRequest):
    """
    Verify security answer and send password reset email with token
    """
    try:
        import bcrypt
        import secrets
        from datetime import timedelta
        from services.emailUserFunction import send_password_reset_email
        
        supabase = get_supabase_client()
        service_client = get_supabase_service().get_service_client()
        
        # Get user by email
        users_response = service_client.auth.admin.list_users()
        user_auth = None
        for user in users_response:
            if user.email and user.email.lower() == request.email.lower():
                user_auth = user
                break
        
        if not user_auth:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid credentials"
            )
        
        # Verify username
        profile_response = supabase.from_("profiles").select("*").eq("id", user_auth.id).eq("Username", request.username).execute()
        
        if not profile_response.data or len(profile_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid credentials"
            )
        
        profile = Profile(**profile_response.data[0])
        
        # Get user's security answer hash
        security_answer_response = supabase.from_("usersecurityanswers").select("*").eq("userid", user_auth.id).single().execute()
        
        if not security_answer_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security answer not found"
            )
        
        answer_hash = security_answer_response.data["answerhash"]
        
        # Verify the security answer
        answer_bytes = request.security_answer.encode('utf-8')
        hash_bytes = answer_hash.encode('utf-8')
        
        if not bcrypt.checkpw(answer_bytes, hash_bytes):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect security answer"
            )
        
        # Generate password reset token
        reset_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
        
        # Store reset token (we'll need to create this table or use an existing one)
        # For now, let's check if password_reset_tokens table exists, if not we'll use signupinvitations pattern
        try:
            token_data = {
                "user_id": str(user_auth.id),
                "email": request.email,
                "token": reset_token,
                "expires_at": expires_at.isoformat(),
                "used_at": None,
                "created_at": datetime.utcnow().isoformat()
            }
            
            # Try to insert into password_reset_tokens table
            supabase.from_("password_reset_tokens").insert(token_data).execute()
        except Exception as e:
            logger.warning(f"Password reset tokens table may not exist: {e}")
            # Table might not exist - we'll create it via migration or use alternative storage
            # For now, store in memory or skip (token will still be valid)
        
        # Generate reset URL
        frontend_url = "http://localhost:5173"  # TODO: Make this configurable
        reset_url = f"{frontend_url}/reset-password?token={reset_token}"
        
        # Send password reset email
        try:
            send_password_reset_email(
                user_email=request.email,
                user_name=f"{profile.first_name} {profile.last_name}",
                reset_url=reset_url
            )
        except Exception as email_error:
            logger.error(f"Failed to send password reset email: {email_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send password reset email"
            )
        
        return PasswordResetTokenResponse(
            token=reset_token,
            message="Password reset email sent successfully. Please check your inbox."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify security answer error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your request"
        )

@router.post("/change-password")
async def change_password(
    change_request: ChangePasswordRequest,
    current_user: Profile = Depends(get_current_user_from_token)
):
    """Change user's password with password history tracking"""
    try:
        from services.password_service import get_password_service
        
        supabase = get_supabase_client()
        password_service = get_password_service()
        
        # Validate new password format
        if not validate_password(change_request.new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters, start with a letter, and contain a letter, number, and special character"
            )
        
        # Check if new password is same as current password
        if change_request.current_password == change_request.new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be different from current password"
            )
        
        # Verify current password by attempting to sign in
        try:
            # Get user's email from profile
            service_client = get_supabase_service().get_service_client()
            user_data = service_client.auth.admin.get_user_by_id(str(current_user.id))
            
            if not user_data or not user_data.user or not user_data.user.email:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve user information"
                )
            
            user_email = user_data.user.email
            
            # Verify current password
            auth_response = supabase.auth.sign_in_with_password({
                "email": user_email,
                "password": change_request.current_password
            })
            
            if not auth_response.user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Current password is incorrect"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect"
            )
        
        # Check password history and validate (checks last 5 passwords by default)
        success, error_msg = password_service.validate_and_store_password(
            user_id=current_user.id,
            new_password=change_request.new_password,
            check_history=True,
            history_limit=5
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg or "Password change failed"
            )
        
        # Update password in Supabase Auth
        try:
            service_client.auth.admin.update_user_by_id(
                str(current_user.id),
                {"password": change_request.new_password}
            )
        except Exception as e:
            logger.error(f"Password update error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password"
            )
        
        return {
            "message": "Password changed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Change password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while changing password"
        )

@router.get("/verify-reset-token")
async def verify_reset_token(token: str = Query(..., description="Password reset token")):
    """Verify password reset token validity"""
    try:
        from datetime import timezone
        
        supabase = get_supabase_client()
        
        # Get token from database
        try:
            token_response = supabase.from_("password_reset_tokens").select("*").eq("token", token).execute()
            
            if not token_response.data or len(token_response.data) == 0:
                return {"valid": False, "error": "Invalid reset token"}
            
            token_data = PasswordResetToken(**token_response.data[0])
            
            # Check if token is expired
            current_time = datetime.now(timezone.utc)
            if token_data.expires_at < current_time:
                return {"valid": False, "error": "Reset token has expired"}
            
            # Check if token has been used
            if token_data.used_at:
                return {"valid": False, "error": "Reset token has already been used"}
            
            return {"valid": True, "message": "Token is valid"}
            
        except Exception as e:
            logger.error(f"Error verifying reset token: {e}")
            return {"valid": False, "error": "Invalid reset token"}
        
    except Exception as e:
        logger.error(f"Verify reset token error: {e}")
        return {"valid": False, "error": "An error occurred while verifying token"}

@router.post("/reset-password")
async def reset_password(reset_request: ResetPasswordRequest):
    """Reset password using reset token with password history tracking"""
    try:
        from datetime import timezone
        from services.password_service import get_password_service
        
        supabase = get_supabase_client()
        password_service = get_password_service()
        
        # Validate new password format
        if not validate_password(reset_request.new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters, start with a letter, and contain a letter, number, and special character"
            )
        
        # Verify the reset token from our database
        try:
            token_response = supabase.from_("password_reset_tokens").select("*").eq("token", reset_request.token).execute()
            
            if not token_response.data or len(token_response.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired reset token"
                )
            
            token_data = PasswordResetToken(**token_response.data[0])
            
            # Check if token is expired
            current_time = datetime.now(timezone.utc)
            if token_data.expires_at < current_time:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Reset token has expired. Please request a new password reset."
                )
            
            # Check if token has been used
            if token_data.used_at:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Reset token has already been used. Please request a new password reset."
                )
            
            user_id = token_data.user_id
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Check password history and validate
        success, error_msg = password_service.validate_and_store_password(
            user_id=user_id,
            new_password=reset_request.new_password,
            check_history=True,
            history_limit=5
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg or "Password reset failed"
            )
        
        # Update password in Supabase Auth using service client
        try:
            service_client = get_supabase_service().get_service_client()
            service_client.auth.admin.update_user_by_id(
                str(user_id),
                {"password": reset_request.new_password}
            )
        except Exception as e:
            logger.error(f"Password update error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reset password"
            )
        
        # Mark token as used
        supabase.from_("password_reset_tokens").update({
            "used_at": datetime.utcnow().isoformat()
        }).eq("token", reset_request.token).execute()
        
        return {
            "message": "Password reset successfully. You can now sign in with your new password."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while resetting password"
        )

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

@router.get("/security-questions", response_model=List[SecurityQuestion])
async def get_security_questions():
    """Get all security questions (public endpoint for signup)"""
    try:
        supabase = get_supabase_client()
        result = supabase.from_("securityquestions").select("*").execute()
        return [SecurityQuestion(**item) for item in result.data]
    except Exception as e:
        logger.error(f"Get security questions error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching security questions"
        )

@router.post("/verify-invitation", response_model=VerifyInvitationResponse)
async def verify_invitation_token(token: str = Query(..., description="Invitation token")):
    """Verify signup invitation token and return associated registration request data"""
    try:
        from datetime import timezone
        
        supabase = get_supabase_client()
        
        # Get invitation by token
        invitation_response = supabase.from_("signupinvitations").select("*").eq("token", token).execute()
        
        if not invitation_response.data or len(invitation_response.data) == 0:
            return VerifyInvitationResponse(valid=False, error="Invalid invitation token")
        
        invitation = SignupInvitation(**invitation_response.data[0])
        
        # Check if token is expired (use timezone-aware datetime)
        current_time = datetime.now(timezone.utc)
        if invitation.expires_at < current_time:
            return VerifyInvitationResponse(valid=False, error="Invitation token has expired")
        
        # Check if token has already been used
        if invitation.used_at:
            return VerifyInvitationResponse(valid=False, error="Invitation token has already been used")
        
        # Get associated registration request
        request_response = supabase.from_("registrationrequests").select("*").eq("RequestID", invitation.request_id).single().execute()
        
        if not request_response.data:
            return VerifyInvitationResponse(valid=False, error="Associated registration request not found")
        
        reg_request = RegistrationRequest(**request_response.data)
        
        return VerifyInvitationResponse(
            valid=True,
            request_id=reg_request.request_id,
            first_name=reg_request.first_name,
            last_name=reg_request.last_name,
            email=reg_request.email
        )
        
    except Exception as e:
        logger.error(f"Verify invitation error: {e}")
        return VerifyInvitationResponse(valid=False, error="An error occurred while verifying invitation")

@router.post("/complete-signup")
async def complete_signup(signup_data: CompleteSignupRequest):
    """Complete user signup after invitation approval"""
    try:
        import bcrypt
        from datetime import timezone
        from services.password_service import get_password_service
        
        supabase = get_supabase_client()
        password_service = get_password_service()
        
        # Verify the token
        invitation_response = supabase.from_("signupinvitations").select("*").eq("token", signup_data.token).execute()
        
        if not invitation_response.data or len(invitation_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid invitation token"
            )
        
        invitation = SignupInvitation(**invitation_response.data[0])
        
        # Check if token is expired (use timezone-aware datetime)
        current_time = datetime.now(timezone.utc)
        if invitation.expires_at < current_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation token has expired"
            )
        
        # Check if token has already been used
        if invitation.used_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation token has already been used"
            )
        
        # Validate password
        if not validate_password(signup_data.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters, start with a letter, and contain a letter, number, and special character"
            )
        
        # Get registration request
        request_response = supabase.from_("registrationrequests").select("*").eq("RequestID", invitation.request_id).single().execute()
        
        if not request_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registration request not found"
            )
        
        reg_request = RegistrationRequest(**request_response.data)
        
        # Get role ID from the invitation (stored during approval process)
        role_id = invitation.approved_user_role
        if not role_id:
            # Fallback to Accountant if role_id is not set (shouldn't happen in normal flow)
            logger.warning(f"No role found in invitation {invitation.invitation_id}, defaulting to Accountant")
            role_id = 3
        
        # Generate username
        username = generate_username(reg_request.first_name, reg_request.last_name)
        
        # Create user in Supabase Auth
        service_client = get_supabase_service().get_service_client()
        
        auth_response = service_client.auth.admin.create_user({
            "email": reg_request.email,
            "password": signup_data.password,
            "email_confirm": True
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account"
            )
        
        user_id = auth_response.user.id
        
        # Store password in history (new account, so no history check needed)
        success, error_msg = password_service.validate_and_store_password(
            user_id=UUID(user_id),
            new_password=signup_data.password,
            check_history=False  # First password, no history to check
        )
        
        if not success:
            # Rollback user creation if password storage fails
            try:
                service_client.auth.admin.delete_user(user_id)
            except:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_msg or "Failed to store password"
            )
        
        # Create user profile
        profile_data = {
            "id": user_id,
            "Username": username,
            "FirstName": reg_request.first_name,
            "LastName": reg_request.last_name,
            "DOB": reg_request.dob.isoformat() if reg_request.dob else None,
            "Address": reg_request.address,
            "RoleID": role_id
        }
        
        supabase.from_("profiles").insert(profile_data).execute()
        
        # Hash the security answer
        answer_bytes = signup_data.security_answer.encode('utf-8')
        salt = bcrypt.gensalt()
        answer_hash = bcrypt.hashpw(answer_bytes, salt).decode('utf-8')
        
        # Save security answer
        security_answer_data = {
            "userid": user_id,
            "questionid": signup_data.security_question_id,
            "answerhash": answer_hash
        }
        
        supabase.from_("usersecurityanswers").insert(security_answer_data).execute()
        
        # Mark invitation as used
        supabase.from_("signupinvitations").update({
            "usedat": datetime.utcnow().isoformat()
        }).eq("token", signup_data.token).execute()
        
        return {
            "message": "Account setup completed successfully. You can now sign in.",
            "username": username
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Complete signup error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while completing signup"
        )