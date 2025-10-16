#!/usr/bin/env python3
"""
Complete setup script for FinKen 2.0 Authentication System
This script initializes roles and optionally creates the first admin user
"""

import sys
import os
from pathlib import Path
import getpass
import re
from datetime import datetime

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def setup_system():
    """Complete system setup"""
    print("🚀 FinKen 2.0 Authentication System Setup")
    print("=" * 45)
    
    try:
        from services.supabase import get_supabase_service, get_supabase_client
        
        supabase = get_supabase_client()
        print("✓ Connected to Supabase")
        
        # Step 1: Initialize roles
        print("\n📋 Step 1: Initializing roles...")
        
        # Check if roles exist
        roles_response = supabase.from_("roles").select("*").execute()
        
        if not roles_response.data:
            print("Creating default roles...")
            default_roles = [
                {"RoleName": "Administrator"},
                {"RoleName": "Manager"},
                {"RoleName": "Accountant"}
            ]
            
            for role in default_roles:
                result = supabase.from_("roles").insert(role).execute()
                print(f"✓ Created role: {role['RoleName']}")
        else:
            print("✓ Roles already exist:")
            for role in roles_response.data:
                print(f"   - {role['RoleName']} (ID: {role['RoleID']})")
        
        # Step 2: Check for admin users
        print("\n👥 Step 2: Checking for administrator users...")
        
        admin_role = supabase.from_("roles").select("*").eq("RoleName", "Administrator").single().execute()
        admin_role_id = admin_role.data["RoleID"]
        
        existing_admins = supabase.from_("profiles").select("*").eq("RoleID", admin_role_id).execute()
        
        if existing_admins.data:
            print("✓ Administrator users found:")
            for admin in existing_admins.data:
                print(f"   - {admin['FirstName']} {admin['LastName']} ({admin['Username']})")
            
            create_another = input("\nDo you want to create another administrator? (y/N): ").strip().lower()
            if create_another not in ['y', 'yes']:
                print("\n🎉 Setup complete! You can now use the existing administrator accounts.")
                return True
        else:
            print("⚠️  No administrator users found.")
            print("   You need at least one administrator to approve new user registrations.")
        
        # Step 3: Create admin user
        print("\n🔧 Step 3: Creating administrator user...")
        
        # Import the create_admin function
        from create_admin import create_admin_user
        
        if create_admin_user():
            print("\n🎉 FinKen 2.0 Authentication System setup complete!")
            print("\nNext steps:")
            print("1. Start the FastAPI server: python main.py")
            print("2. Test the authentication endpoints")
            print("3. Use the admin account to approve new user registrations")
            return True
        else:
            print("❌ Failed to create administrator user")
            return False
        
    except ImportError as e:
        print(f"❌ Missing dependencies: {e}")
        print("Please run: pip install -r requirements.txt")
        return False
    except Exception as e:
        print(f"❌ Setup error: {e}")
        return False

def main():
    """Main function"""
    try:
        if not setup_system():
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nSetup cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()