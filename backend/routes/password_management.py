"""
Profile management routes for FinKen 2.0
Extended functionality for user profile and password management
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from uuid import UUID
import logging

from models.auth import Profile, PasswordHistory
from routes.auth import get_current_user_from_token, require_admin
from services.password_service import get_password_service
from services.supabase import get_supabase_client

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/password-history/count")
async def get_password_history_count(
    current_user: Profile = Depends(get_current_user_from_token)
):
    """Get count of password history entries for current user"""
    try:
        supabase = get_supabase_client()
        
        result = supabase.from_("password_history")\
            .select("id")\
            .eq("user_id", str(current_user.id))\
            .execute()
        
        return {
            "user_id": str(current_user.id),
            "password_count": len(result.data) if result.data else 0
        }
        
    except Exception as e:
        logger.error(f"Get password history count error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve password history count"
        )

@router.get("/password-history/{user_id}/count")
async def get_user_password_history_count(
    user_id: UUID,
    current_user: Profile = Depends(require_admin)
):
    """Get count of password history entries for a specific user (admin only)"""
    try:
        supabase = get_supabase_client()
        
        result = supabase.from_("password_history")\
            .select("id")\
            .eq("user_id", str(user_id))\
            .execute()
        
        return {
            "user_id": str(user_id),
            "password_count": len(result.data) if result.data else 0
        }
        
    except Exception as e:
        logger.error(f"Get user password history count error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve password history count"
        )

@router.get("/password-history/{user_id}/latest")
async def get_user_latest_password_change(
    user_id: UUID,
    current_user: Profile = Depends(require_admin)
):
    """Get the date of the user's last password change (admin only)"""
    try:
        supabase = get_supabase_client()
        
        result = supabase.from_("password_history")\
            .select("created_at")\
            .eq("user_id", str(user_id))\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
        
        if not result.data or len(result.data) == 0:
            return {
                "user_id": str(user_id),
                "last_password_change": None,
                "message": "No password history found"
            }
        
        return {
            "user_id": str(user_id),
            "last_password_change": result.data[0]["created_at"]
        }
        
    except Exception as e:
        logger.error(f"Get latest password change error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve password change date"
        )

@router.delete("/password-history/{user_id}")
async def clear_user_password_history(
    user_id: UUID,
    current_user: Profile = Depends(require_admin)
):
    """Clear password history for a user (admin only) - USE WITH CAUTION"""
    try:
        supabase = get_supabase_client()
        
        # Get count before deletion
        count_result = supabase.from_("password_history")\
            .select("id")\
            .eq("user_id", str(user_id))\
            .execute()
        
        deleted_count = len(count_result.data) if count_result.data else 0
        
        if deleted_count == 0:
            return {
                "user_id": str(user_id),
                "deleted_count": 0,
                "message": "No password history to delete"
            }
        
        # Delete password history
        supabase.from_("password_history")\
            .delete()\
            .eq("user_id", str(user_id))\
            .execute()
        
        logger.warning(
            f"Admin {current_user.id} cleared password history for user {user_id}. "
            f"Deleted {deleted_count} entries."
        )
        
        return {
            "user_id": str(user_id),
            "deleted_count": deleted_count,
            "message": f"Password history cleared. {deleted_count} entries deleted."
        }
        
    except Exception as e:
        logger.error(f"Clear password history error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear password history"
        )
