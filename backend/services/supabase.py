"""
Enhanced Supabase client service for FinKen 2.0
Provides database connectivity, authentication, and audit logging
"""

import contextvars
import os
from typing import Optional, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv
import logging
from functools import wraps

# Set up logging
logger = logging.getLogger(__name__)

# Create a context variable to store current user ID for audit logging
current_user_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar('current_user_id', default=None)

class SupabaseService:
    """Enhanced Supabase service class"""
    
    def __init__(self):
        self._client: Optional[Client] = None
        self._url: Optional[str] = None
        self._anon_key: Optional[str] = None
        self._service_key: Optional[str] = None
        self._load_config()
    
    def _load_config(self):
        """Load Supabase configuration from environment variables"""
        # Load environment variables from .env file
        load_dotenv()
        
        self._url = os.environ.get('SUPABASE_URL')
        self._anon_key = os.environ.get('SUPABASE_ANON_KEY')
        self._service_key = os.environ.get('SUPABASE_SERVICE_KEY')
        
        # If variables are missing, try loading fallback 'env' file
        if (not self._url or not self._anon_key) and os.path.exists('env'):
            load_dotenv('env')
            self._url = os.environ.get('SUPABASE_URL')
            self._anon_key = os.environ.get('SUPABASE_ANON_KEY')
            self._service_key = os.environ.get('SUPABASE_SERVICE_KEY')
        
        if not self._url or not self._anon_key:
            raise RuntimeError(
                "Supabase environment is not configured. "
                "Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables."
            )
    
    @property
    def client(self) -> Client:
        """Get or create Supabase client"""
        if self._client is None:
            if not self._url or not self._anon_key:
                raise RuntimeError("Supabase configuration is incomplete")
            self._client = create_client(self._url, self._anon_key)
            self._setup_audit_logging()
        return self._client
    
    def get_service_client(self) -> Client:
        """Get Supabase client with service key for admin operations"""
        if not self._service_key:
            raise RuntimeError("Service key not configured")
        if not self._url:
            raise RuntimeError("Supabase URL not configured")
        return create_client(self._url, self._service_key)
    
    def _setup_audit_logging(self):
        """Set up audit logging context"""
        user_id = get_current_user()
        if user_id:
            try:
                # Use RPC to set session variable for audit logging
                self.client.rpc('set_audit_user_context', {'user_id': str(user_id)}).execute()
            except Exception as e:
                logger.warning(f"Could not set user context for audit logging: {e}")
    
    def set_auth_token(self, access_token: str, refresh_token: str = ""):
        """Set authentication token for the client"""
        self.client.auth.set_session(access_token, refresh_token or "")
        self._setup_audit_logging()
    
    def clear_auth(self):
        """Clear authentication"""
        self.client.auth.sign_out()
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform a health check on the Supabase connection"""
        try:
            # Try a simple query to test connection
            result = self.client.from_("roles").select("*").limit(1).execute()
            return {
                "status": "healthy",
                "message": "Supabase connection successful",
                "data_accessible": True
            }
        except Exception as e:
            logger.error(f"Supabase health check failed: {e}")
            return {
                "status": "unhealthy",
                "message": f"Supabase connection failed: {str(e)}",
                "data_accessible": False
            }

# Global instance
_supabase_service = None

def get_supabase_service() -> SupabaseService:
    """Get the global Supabase service instance"""
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service

def get_supabase_client() -> Client:
    """Get the Supabase client - convenience function"""
    return get_supabase_service().client

def set_current_user(user_id: str):
    """Set the current user for audit logging"""
    current_user_id.set(user_id)

def get_current_user() -> Optional[str]:
    """Get the current user for audit logging"""
    return current_user_id.get()

def with_user_context(user_id: str):
    """Decorator to set user context for a function"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            token = current_user_id.set(user_id)
            try:
                return await func(*args, **kwargs)
            finally:
                current_user_id.reset(token)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            token = current_user_id.set(user_id)
            try:
                return func(*args, **kwargs)
            finally:
                current_user_id.reset(token)
        
        # Return async or sync wrapper based on function type
        if hasattr(func, '__code__') and func.__code__.co_flags & 0x80:  # CO_COROUTINE
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

# Backward compatibility
def _sb() -> Client:
    """Legacy function name for backward compatibility"""
    return get_supabase_client()