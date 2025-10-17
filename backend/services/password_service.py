"""
Password service for handling password history and validation
"""

import bcrypt
import logging
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from services.supabase import get_supabase_client

logger = logging.getLogger(__name__)

class PasswordHistoryService:
    """Service for managing password history"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
        return password_hash
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify a password against its hash"""
        try:
            password_bytes = password.encode('utf-8')
            hash_bytes = password_hash.encode('utf-8')
            return bcrypt.checkpw(password_bytes, hash_bytes)
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    def add_password_to_history(self, user_id: UUID, password: str) -> bool:
        """
        Add a password to the user's password history
        Returns True if successful, False otherwise
        """
        try:
            password_hash = self.hash_password(password)
            
            history_data = {
                "user_id": str(user_id),
                "password_hash": password_hash,
                "created_at": datetime.utcnow().isoformat()
            }
            
            self.supabase.from_("password_history").insert(history_data).execute()
            logger.info(f"Password added to history for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding password to history: {e}")
            return False
    
    def get_password_history(self, user_id: UUID, limit: int = 5) -> List[dict]:
        """
        Get password history for a user
        Returns the most recent password hashes (limited by limit parameter)
        """
        try:
            result = self.supabase.from_("password_history")\
                .select("*")\
                .eq("user_id", str(user_id))\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Error retrieving password history: {e}")
            return []
    
    def is_password_reused(self, user_id: UUID, new_password: str, history_limit: int = 5) -> bool:
        """
        Check if a password has been used before in the user's history
        Returns True if password has been used before, False otherwise
        """
        try:
            password_history = self.get_password_history(user_id, history_limit)
            
            for history_entry in password_history:
                password_hash = history_entry.get("password_hash")
                if password_hash and self.verify_password(new_password, password_hash):
                    logger.warning(f"Password reuse detected for user {user_id}")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking password reuse: {e}")
            return False
    
    def validate_and_store_password(
        self, 
        user_id: UUID, 
        new_password: str, 
        check_history: bool = True,
        history_limit: int = 5
    ) -> tuple[bool, Optional[str]]:
        """
        Validate a new password and store it in history
        Returns (success: bool, error_message: Optional[str])
        """
        try:
            # Check if password has been reused
            if check_history and self.is_password_reused(user_id, new_password, history_limit):
                return False, f"Password has been used in your last {history_limit} passwords. Please choose a different password."
            
            # Add password to history
            if not self.add_password_to_history(user_id, new_password):
                return False, "Failed to store password in history"
            
            return True, None
            
        except Exception as e:
            logger.error(f"Error in validate_and_store_password: {e}")
            return False, "An error occurred while processing password"

# Singleton instance
_password_service = None

def get_password_service() -> PasswordHistoryService:
    """Get or create password service singleton"""
    global _password_service
    if _password_service is None:
        _password_service = PasswordHistoryService()
    return _password_service
