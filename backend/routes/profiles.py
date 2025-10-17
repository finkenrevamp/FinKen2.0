"""
Profiles routes - User management functionality
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, date, timedelta
from uuid import UUID
from pydantic import BaseModel, EmailStr
import logging

from models.auth import Profile, ProfileUpdate
from services.supabase import get_supabase_service, get_supabase_client, set_current_user
from services.emailUserFunction import send_email, send_password_expiry_notification

router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)


class UserWithEmail(BaseModel):
    """User profile with email from auth.users"""
    id: str
    username: str
    first_name: str
    last_name: str
    email: str
    dob: Optional[date] = None
    address: Optional[str] = None
    profile_picture_url: Optional[str] = None
    role_id: int
    role_name: str
    is_active: bool
    is_suspended: bool
    suspension_end_date: Optional[date] = None
    date_created: datetime


class UpdateUserRequest(BaseModel):
    """Update user request"""
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[date] = None
    address: Optional[str] = None
    role_id: Optional[int] = None


class SendEmailRequest(BaseModel):
    """Send email request"""
    subject: str
    body: str


class SuspendUserRequest(BaseModel):
    """Suspend user request"""
    suspension_end_date: date


class PasswordExpiryData(BaseModel):
    """Password expiry data for a user"""
    id: str
    user_id: str
    username: str
    name: str
    email: str
    role: str
    password_created_date: Optional[date] = None
    password_expiry_date: Optional[date] = None
    days_until_expiry: Optional[int] = None
    status: str  # 'expired', 'expiring_soon', 'normal', 'no_password'


class SendPasswordReminderRequest(BaseModel):
    """Send password expiry reminder request"""
    days_until_expiry: int


async def get_current_user_from_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Profile:
    """Get current user from JWT token"""
    try:
        supabase = get_supabase_client()
        
        # Get current user directly from the access token
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
        
        # Fetch the role information
        role_id = profile_data.get("RoleID")
        if role_id:
            role_response = supabase.from_("roles").select("*").eq("RoleID", role_id).single().execute()
            if role_response.data:
                profile_data["role"] = role_response.data
        
        # Set current user context for audit logging
        set_current_user(user_id)
        
        return Profile(**profile_data)
        
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
async def profiles_health():
    """Profiles service health check"""
    return {"status": "healthy", "service": "profiles"}


@router.get("/users", response_model=List[UserWithEmail])
async def get_all_users(
    search: Optional[str] = Query(None, description="Search by username or email"),
    current_user: Profile = Depends(require_admin)
):
    """
    Get all users with their email addresses (admin only)
    Supports searching by username or email
    """
    try:
        supabase = get_supabase_client()
        service_client = get_supabase_service().get_service_client()
        
        # Get all profiles
        profiles_response = supabase.from_("profiles").select("*").execute()
        
        users_with_email = []
        
        for profile in profiles_response.data:
            try:
                # Get user email from auth.users using service client
                user_id = profile.get("id")
                auth_user_response = service_client.auth.admin.get_user_by_id(user_id)
                email = auth_user_response.user.email if auth_user_response and auth_user_response.user and auth_user_response.user.email else "N/A"
                
                # Apply email search filter if needed
                if search:
                    search_lower = search.lower()
                    username_match = search_lower in profile.get("Username", "").lower()
                    email_match = search_lower in email.lower() if email != "N/A" else False
                    
                    if not (username_match or email_match):
                        continue
                
                # Get role name
                role_id = profile.get("RoleID")
                role_name = "Unknown"
                if role_id:
                    role_response = supabase.from_("roles").select("RoleName").eq("RoleID", role_id).single().execute()
                    if role_response.data:
                        role_name = role_response.data.get("RoleName", "Unknown")
                
                users_with_email.append(UserWithEmail(
                    id=str(profile.get("id")),
                    username=profile.get("Username", ""),
                    first_name=profile.get("FirstName", ""),
                    last_name=profile.get("LastName", ""),
                    email=email,
                    dob=profile.get("DOB"),
                    address=profile.get("Address"),
                    profile_picture_url=profile.get("ProfilePictureURL"),
                    role_id=profile.get("RoleID", 0),
                    role_name=role_name,
                    is_active=profile.get("isActive", True),
                    is_suspended=profile.get("isSuspended", False),
                    suspension_end_date=profile.get("SuspensionEndDate"),
                    date_created=profile.get("DateCreated")
                ))
            except Exception as e:
                logger.error(f"Error fetching email for user {profile.get('id')}: {e}")
                continue
        
        return users_with_email
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get users error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching users: {str(e)}"
        )


@router.get("/users/password-expiry", response_model=List[PasswordExpiryData])
async def get_password_expiry_data(
    current_user: Profile = Depends(require_admin)
):
    """
    Get password expiry data for all users (admin only)
    Calculates expiry dates based on password creation date + 90 days
    """
    try:
        supabase = get_supabase_client()
        service_client = get_supabase_service().get_service_client()
        
        # Get all profiles
        profiles_response = supabase.from_("profiles").select("*").execute()
        
        # Password expiry period in days (90 days as per Sprint requirement #15)
        PASSWORD_EXPIRY_DAYS = 90
        EXPIRING_SOON_THRESHOLD = 7  # Consider expiring soon if <= 7 days
        
        password_expiry_list = []
        today = date.today()
        
        for profile in profiles_response.data:
            try:
                user_id = profile.get("id")
                
                # Get user email from auth.users
                auth_user_response = service_client.auth.admin.get_user_by_id(user_id)
                email = auth_user_response.user.email if auth_user_response and auth_user_response.user and auth_user_response.user.email else "N/A"
                
                # Get role name
                role_id = profile.get("RoleID")
                role_name = "Unknown"
                if role_id:
                    role_response = supabase.from_("roles").select("RoleName").eq("RoleID", role_id).single().execute()
                    if role_response.data:
                        role_name = role_response.data.get("RoleName", "Unknown")
                
                # Get most recent password from password_history
                # Query to get the most recent password creation date for this user
                password_history_response = supabase.from_("password_history")\
                    .select("created_at")\
                    .eq("user_id", user_id)\
                    .order("created_at", desc=True)\
                    .limit(1)\
                    .execute()
                
                password_created_date = None
                password_expiry_date = None
                days_until_expiry = None
                password_status = "no_password"
                
                if password_history_response.data and len(password_history_response.data) > 0:
                    # Get the password creation timestamp
                    created_at_str = password_history_response.data[0].get("created_at")
                    
                    if created_at_str:
                        # Parse the datetime and extract date
                        created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                        password_created_date = created_at.date()
                        
                        # Calculate expiry date (90 days from creation)
                        password_expiry_date = password_created_date + timedelta(days=PASSWORD_EXPIRY_DAYS)
                        
                        # Calculate days until expiry
                        days_until_expiry = (password_expiry_date - today).days
                        
                        # Determine status
                        if days_until_expiry < 0:
                            password_status = "expired"
                        elif days_until_expiry <= EXPIRING_SOON_THRESHOLD:
                            password_status = "expiring_soon"
                        else:
                            password_status = "normal"
                
                user_name = f"{profile.get('FirstName', '')} {profile.get('LastName', '')}"
                
                password_expiry_list.append(PasswordExpiryData(
                    id=str(user_id),
                    user_id=str(user_id),
                    username=profile.get("Username", ""),
                    name=user_name,
                    email=email,
                    role=role_name,
                    password_created_date=password_created_date,
                    password_expiry_date=password_expiry_date,
                    days_until_expiry=days_until_expiry,
                    status=password_status
                ))
                
            except Exception as e:
                logger.error(f"Error processing password expiry for user {profile.get('id')}: {e}")
                continue
        
        return password_expiry_list
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get password expiry data error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching password expiry data: {str(e)}"
        )


@router.post("/users/{user_id}/send-password-reminder")
async def send_password_reminder(
    user_id: str,
    reminder_data: SendPasswordReminderRequest,
    current_user: Profile = Depends(require_admin)
):
    """Send password expiry reminder email to user (admin only)"""
    try:
        supabase = get_supabase_client()
        service_client = get_supabase_service().get_service_client()
        
        # Get user profile
        profile_response = supabase.from_("profiles").select("*").eq("id", user_id).single().execute()
        
        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        profile = profile_response.data
        user_name = f"{profile.get('FirstName', '')} {profile.get('LastName', '')}"
        
        # Get user email from auth.users
        auth_user_response = service_client.auth.admin.get_user_by_id(user_id)
        if not auth_user_response or not auth_user_response.user or not auth_user_response.user.email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User email not found"
            )
        
        user_email = auth_user_response.user.email
        
        # Get admin email
        admin_auth_response = service_client.auth.admin.get_user_by_id(str(current_user.id))
        admin_email = admin_auth_response.user.email if admin_auth_response and admin_auth_response.user and admin_auth_response.user.email else "admin@finken.com"
        admin_name = f"{current_user.first_name} {current_user.last_name}"
        
        # Send password expiry notification
        result = send_password_expiry_notification(
            admin_email=admin_email or "admin@finken.com",
            admin_name=admin_name,
            user_email=user_email,
            user_name=user_name,
            days_until_expiry=reminder_data.days_until_expiry
        )
        
        if result.get("success"):
            return {
                "message": "Password expiry reminder sent successfully",
                "user_id": user_id,
                "email": user_email
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send password expiry reminder"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send password reminder error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while sending password reminder: {str(e)}"
        )


@router.get("/users/{user_id}", response_model=UserWithEmail)
async def get_user_by_id(
    user_id: str,
    current_user: Profile = Depends(require_admin)
):
    """Get user by ID with email (admin only)"""
    try:
        supabase = get_supabase_client()
        service_client = get_supabase_service().get_service_client()
        
        # Get profile
        profile_response = supabase.from_("profiles").select("*").eq("id", user_id).single().execute()
        
        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        profile = profile_response.data
        
        # Get email from auth.users
        auth_user_response = service_client.auth.admin.get_user_by_id(user_id)
        email = auth_user_response.user.email if auth_user_response and auth_user_response.user and auth_user_response.user.email else "N/A"
        
        # Get role name
        role_id = profile.get("RoleID")
        role_name = "Unknown"
        if role_id:
            role_response = supabase.from_("roles").select("RoleName").eq("RoleID", role_id).single().execute()
            if role_response.data:
                role_name = role_response.data.get("RoleName", "Unknown")
        
        return UserWithEmail(
            id=str(profile.get("id")),
            username=profile.get("Username", ""),
            first_name=profile.get("FirstName", ""),
            last_name=profile.get("LastName", ""),
            email=email or "N/A",
            dob=profile.get("DOB"),
            address=profile.get("Address"),
            profile_picture_url=profile.get("ProfilePictureURL"),
            role_id=profile.get("RoleID", 0),
            role_name=role_name,
            is_active=profile.get("isActive", True),
            is_suspended=profile.get("isSuspended", False),
            suspension_end_date=profile.get("SuspensionEndDate"),
            date_created=profile.get("DateCreated")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching user: {str(e)}"
        )


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    update_data: UpdateUserRequest,
    current_user: Profile = Depends(require_admin)
):
    """Update user information (admin only)"""
    try:
        supabase = get_supabase_client()
        
        # Check if user exists
        profile_response = supabase.from_("profiles").select("*").eq("id", user_id).single().execute()
        
        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prepare update data
        update_dict = {}
        if update_data.username is not None:
            update_dict["Username"] = update_data.username
        if update_data.first_name is not None:
            update_dict["FirstName"] = update_data.first_name
        if update_data.last_name is not None:
            update_dict["LastName"] = update_data.last_name
        if update_data.dob is not None:
            update_dict["DOB"] = update_data.dob.isoformat() if update_data.dob else None
        if update_data.address is not None:
            update_dict["Address"] = update_data.address
        if update_data.role_id is not None:
            # Verify role exists
            role_response = supabase.from_("roles").select("*").eq("RoleID", update_data.role_id).single().execute()
            if not role_response.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid role ID"
                )
            update_dict["RoleID"] = update_data.role_id
        
        if not update_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No update data provided"
            )
        
        # Update profile
        result = supabase.from_("profiles").update(update_dict).eq("id", user_id).execute()
        
        return {
            "message": "User updated successfully",
            "user_id": user_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating user: {str(e)}"
        )


@router.post("/users/{user_id}/send-email")
async def send_user_email(
    user_id: str,
    email_data: SendEmailRequest,
    current_user: Profile = Depends(require_admin)
):
    """Send email to user (admin only)"""
    try:
        supabase = get_supabase_client()
        service_client = get_supabase_service().get_service_client()
        
        # Get user profile
        profile_response = supabase.from_("profiles").select("*").eq("id", user_id).single().execute()
        
        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        profile = profile_response.data
        user_name = f"{profile.get('FirstName', '')} {profile.get('LastName', '')}"
        
        # Get user email from auth.users
        auth_user_response = service_client.auth.admin.get_user_by_id(user_id)
        if not auth_user_response or not auth_user_response.user or not auth_user_response.user.email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User email not found"
            )
        
        user_email = auth_user_response.user.email
        
        # Get admin email
        admin_auth_response = service_client.auth.admin.get_user_by_id(str(current_user.id))
        admin_email = admin_auth_response.user.email if admin_auth_response and admin_auth_response.user and admin_auth_response.user.email else "admin@finken.com"
        admin_name = f"{current_user.first_name} {current_user.last_name}"
        
        # Send email
        result = send_email(
            sender_email=admin_email or "admin@finken.com",
            sender_name=admin_name,
            receiver_email=user_email,
            receiver_name=user_name,
            subject=email_data.subject,
            body=email_data.body
        )
        
        if result.get("success"):
            return {
                "message": "Email sent successfully",
                "user_id": user_id,
                "email": user_email
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send email"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send email error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while sending email: {str(e)}"
        )


@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    suspend_data: SuspendUserRequest,
    current_user: Profile = Depends(require_admin)
):
    """Suspend user account until a specified date (admin only)"""
    try:
        supabase = get_supabase_client()
        
        # Check if user exists
        profile_response = supabase.from_("profiles").select("*").eq("id", user_id).single().execute()
        
        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent admin from suspending themselves
        if str(current_user.id) == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot suspend your own account"
            )
        
        # Update profile to suspended status
        update_data = {
            "isSuspended": True,
            "SuspensionEndDate": suspend_data.suspension_end_date.isoformat()
        }
        
        result = supabase.from_("profiles").update(update_data).eq("id", user_id).execute()
        
        return {
            "message": "User suspended successfully",
            "user_id": user_id,
            "suspension_end_date": suspend_data.suspension_end_date
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Suspend user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while suspending user: {str(e)}"
        )


@router.post("/users/{user_id}/unsuspend")
async def unsuspend_user(
    user_id: str,
    current_user: Profile = Depends(require_admin)
):
    """Unsuspend user account (admin only)"""
    try:
        supabase = get_supabase_client()
        
        # Check if user exists
        profile_response = supabase.from_("profiles").select("*").eq("id", user_id).single().execute()
        
        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update profile to remove suspension
        update_data = {
            "isSuspended": False,
            "SuspensionEndDate": None
        }
        
        result = supabase.from_("profiles").update(update_data).eq("id", user_id).execute()
        
        return {
            "message": "User unsuspended successfully",
            "user_id": user_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unsuspend user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while unsuspending user: {str(e)}"
        )


@router.post("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    current_user: Profile = Depends(require_admin)
):
    """Deactivate user account (admin only)"""
    try:
        supabase = get_supabase_client()
        
        # Check if user exists
        profile_response = supabase.from_("profiles").select("*").eq("id", user_id).single().execute()
        
        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent admin from deactivating themselves
        if str(current_user.id) == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot deactivate your own account"
            )
        
        # Update profile to deactivated status
        update_data = {
            "isActive": False
        }
        
        result = supabase.from_("profiles").update(update_data).eq("id", user_id).execute()
        
        return {
            "message": "User deactivated successfully",
            "user_id": user_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deactivate user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deactivating user: {str(e)}"
        )