#!/usr/bin/env python3
"""
FinKen 2.0 Authentication Setup Guide
This script provides instructions for setting up the authentication system
"""

import sys
from pathlib import Path

def print_setup_guide():
    """Print the complete setup guide"""
    
    print("🚀 FinKen 2.0 Authentication Setup Guide")
    print("=" * 50)
    print()
    
    print("📋 Prerequisites:")
    print("1. Supabase project created with database")
    print("2. Environment variables configured (.env file)")
    print("3. Python dependencies installed (pip install -r requirements.txt)")
    print()
    
    print("🔧 Setup Steps:")
    print()
    
    print("Step 1: Complete Setup (Recommended)")
    print("   python setup_auth.py")
    print("   → This will initialize roles and create your first admin user")
    print()
    
    print("Step 2: Manual Setup (Alternative)")
    print("   python init_roles.py        # Initialize roles")
    print("   python create_admin.py      # Create first admin user (interactive)")
    print("   # OR")
    print("   python create_admin_quick.py admin@company.com AdminPass123! John Doe")
    print()
    
    print("Step 3: Test the Setup")
    print("   python test_auth.py         # Verify implementation")
    print()
    
    print("Step 4: Start the Server")
    print("   python main.py              # Start FastAPI server")
    print("   → API available at http://localhost:8000")
    print("   → Documentation at http://localhost:8000/api/docs")
    print()
    
    print("🔐 Authentication Flow:")
    print("1. New users submit registration requests via frontend or API")
    print("2. Admin users approve/reject requests via admin panel or API")
    print("3. Approved users receive credentials and can sign in")
    print("4. Users get role-based access (Administrator/Manager/Accountant)")
    print()
    
    print("📱 API Endpoints Available:")
    print("• POST /api/auth/signin - User authentication")
    print("• POST /api/auth/registration-request - Submit registration")
    print("• GET /api/auth/registration-requests - View requests (admin)")
    print("• POST /api/auth/approve-registration/{id} - Approve (admin)")
    print("• POST /api/auth/reject-registration/{id} - Reject (admin)")
    print("• GET /api/auth/profile - Current user profile")
    print("• GET /api/auth/roles - Available roles (admin)")
    print()
    
    print("📚 Documentation:")
    print("• AUTH_IMPLEMENTATION.md - Detailed implementation guide")
    print("• README.md - Backend overview and quick start")
    print("• /api/docs - Interactive API documentation (when server running)")
    print()
    
    print("⚠️  Important Notes:")
    print("• Password requirements: 8+ chars, starts with letter, has letter/number/special")
    print("• Username format: first initial + last name + month/year (e.g., jdoe1025)")
    print("• First admin user is required to approve subsequent registrations")
    print("• All authentication data is stored securely in Supabase")
    print()
    
    print("🎯 Next Steps After Setup:")
    print("1. Create your first admin user")
    print("2. Start the FastAPI server")
    print("3. Test sign-in with admin credentials")
    print("4. Use admin account to approve new user registrations")
    print("5. Continue with Sprint 2 implementation (Chart of Accounts)")

def main():
    """Main function"""
    print_setup_guide()

if __name__ == "__main__":
    main()