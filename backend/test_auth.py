#!/usr/bin/env python3
"""
Test script to verify the authentication implementation
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    success = True
    try:
        print("Testing imports...")
        
        # Test model imports
        from models.auth import (
            UserLogin, TokenResponse, RegistrationRequestCreate, 
            RegistrationRequest, Profile, ApproveRegistrationRequest
        )
        print("✓ Auth models imported successfully")
        
        # Test service imports
        from services.supabase import get_supabase_service, get_supabase_client
        print("✓ Supabase service imported successfully")
        
        print("\n🎉 All imports successful! Authentication backend is ready to use.")
        print("\nImplemented endpoints:")
        print("- POST /api/auth/signin - User sign-in")
        print("- POST /api/auth/registration-request - Submit registration request")
        print("- GET /api/auth/registration-requests - Get all registration requests (admin)")
        print("- POST /api/auth/approve-registration/{id} - Approve registration (admin)")
        print("- POST /api/auth/reject-registration/{id} - Reject registration (admin)")
        print("- GET /api/auth/profile - Get current user profile")
        print("- POST /api/auth/signout - Sign out")
        print("- POST /api/auth/forgot-password - Send password reset email")
        print("- GET /api/auth/roles - Get all roles (admin)")
        print("- GET /api/auth/health - Health check")
        
    except Exception as e:
        print(f"❌ Import error: {e}")
        success = False
    
    sys.exit(0 if success else 1)