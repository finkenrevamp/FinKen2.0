"""
Event Logs routes - Audit trail and system event logging
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Literal
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
import logging

from models.auth import Profile
from services.supabase import get_supabase_client, set_current_user

router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)


class EventLog(BaseModel):
    """Event log entry"""
    log_id: int
    user_id: Optional[str] = None
    username: Optional[str] = None
    timestamp: datetime
    action_type: str
    table_name: str
    record_id: Optional[str] = None
    before_value: Optional[dict] = None
    after_value: Optional[dict] = None


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


async def require_admin_or_manager(current_user: Profile = Depends(get_current_user_from_token)) -> Profile:
    """Require admin or manager role to view event logs"""
    if current_user.role and current_user.role.role_name not in ["Administrator", "Manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator or Manager access required"
        )
    return current_user


@router.get("/health")
async def event_logs_health():
    """Event logs service health check"""
    return {"status": "healthy", "service": "event_logs"}


@router.get("/account-events", response_model=List[EventLog])
async def get_account_event_logs(
    limit: int = Query(100, description="Maximum number of logs to return"),
    offset: int = Query(0, description="Number of logs to skip"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    current_user: Profile = Depends(require_admin_or_manager)
):
    """
    Get account event logs (admin/manager only)
    Returns audit trail for account-related actions
    """
    try:
        supabase = get_supabase_client()
        
        # Build query
        query = supabase.from_("account_event_logs").select("*, profiles!account_event_logs_UserID_fkey(Username)")
        
        # Apply filters
        if user_id:
            query = query.eq("UserID", user_id)
        if action_type:
            query = query.eq("ActionType", action_type)
        
        # Order by timestamp descending (most recent first)
        query = query.order("Timestamp", desc=True)
        
        # Apply pagination
        query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        
        # Transform data to include username
        event_logs = []
        for item in result.data:
            log_data = {
                "log_id": item.get("LogID"),
                "user_id": str(item.get("UserID")) if item.get("UserID") else None,
                "username": item.get("profiles", {}).get("Username") if item.get("profiles") else None,
                "timestamp": item.get("Timestamp"),
                "action_type": item.get("ActionType"),
                "table_name": item.get("TableName"),
                "record_id": item.get("RecordID"),
                "before_value": item.get("BeforeValue"),
                "after_value": item.get("AfterValue")
            }
            event_logs.append(EventLog(**log_data))
        
        return event_logs
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get account event logs error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching account event logs: {str(e)}"
        )


@router.get("/journal-events", response_model=List[EventLog])
async def get_journal_event_logs(
    limit: int = Query(100, description="Maximum number of logs to return"),
    offset: int = Query(0, description="Number of logs to skip"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    current_user: Profile = Depends(require_admin_or_manager)
):
    """
    Get journal event logs (admin/manager only)
    Returns audit trail for journal entry-related actions
    """
    try:
        supabase = get_supabase_client()
        
        # Build query
        query = supabase.from_("journal_event_logs").select("*, profiles!journal_event_logs_UserID_fkey(Username)")
        
        # Apply filters
        if user_id:
            query = query.eq("UserID", user_id)
        if action_type:
            query = query.eq("ActionType", action_type)
        
        # Order by timestamp descending (most recent first)
        query = query.order("Timestamp", desc=True)
        
        # Apply pagination
        query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        
        # Transform data to include username
        event_logs = []
        for item in result.data:
            log_data = {
                "log_id": item.get("LogID"),
                "user_id": str(item.get("UserID")) if item.get("UserID") else None,
                "username": item.get("profiles", {}).get("Username") if item.get("profiles") else None,
                "timestamp": item.get("Timestamp"),
                "action_type": item.get("ActionType"),
                "table_name": item.get("TableName"),
                "record_id": item.get("RecordID"),
                "before_value": item.get("BeforeValue"),
                "after_value": item.get("AfterValue")
            }
            event_logs.append(EventLog(**log_data))
        
        return event_logs
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get journal event logs error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching journal event logs: {str(e)}"
        )


@router.get("/users-events", response_model=List[EventLog])
async def get_users_event_logs(
    limit: int = Query(100, description="Maximum number of logs to return"),
    offset: int = Query(0, description="Number of logs to skip"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    current_user: Profile = Depends(require_admin_or_manager)
):
    """
    Get users event logs (admin/manager only)
    Returns audit trail for user-related actions
    """
    try:
        supabase = get_supabase_client()
        
        # Build query
        query = supabase.from_("users_event_logs").select("*, profiles!eventlogs_UserID_fkey(Username)")
        
        # Apply filters
        if user_id:
            query = query.eq("UserID", user_id)
        if action_type:
            query = query.eq("ActionType", action_type)
        
        # Order by timestamp descending (most recent first)
        query = query.order("Timestamp", desc=True)
        
        # Apply pagination
        query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        
        # Transform data to include username
        event_logs = []
        for item in result.data:
            log_data = {
                "log_id": item.get("LogID"),
                "user_id": str(item.get("UserID")) if item.get("UserID") else None,
                "username": item.get("profiles", {}).get("Username") if item.get("profiles") else None,
                "timestamp": item.get("Timestamp"),
                "action_type": item.get("ActionType"),
                "table_name": item.get("TableName"),
                "record_id": item.get("RecordID"),
                "before_value": item.get("BeforeValue"),
                "after_value": item.get("AfterValue")
            }
            event_logs.append(EventLog(**log_data))
        
        return event_logs
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get users event logs error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching users event logs: {str(e)}"
        )
