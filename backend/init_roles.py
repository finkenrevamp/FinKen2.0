#!/usr/bin/env python3
"""
Initialize default roles in the FinKen 2.0 database
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from services.supabase import get_supabase_client

def init_roles():
    """Initialize the default roles in the database"""
    try:
        supabase = get_supabase_client()
        
        # Define the default roles according to Sprint requirements
        default_roles = [
            {"RoleName": "Administrator"},
            {"RoleName": "Manager"},
            {"RoleName": "Accountant"}
        ]
        
        print("Initializing default roles...")
        
        for role in default_roles:
            # Check if role already exists
            existing = supabase.from_("roles").select("*").eq("RoleName", role["RoleName"]).execute()
            
            if not existing.data:
                # Create the role
                result = supabase.from_("roles").insert(role).execute()
                print(f"Created role: {role['RoleName']}")
            else:
                print(f"Role already exists: {role['RoleName']}")
        
        # Show all roles
        all_roles = supabase.from_("roles").select("*").execute()
        print(f"\nAll roles in database:")
        for role in all_roles.data:
            print(f"- {role['RoleName']} (ID: {role['RoleID']})")
        
        print("\nRoles initialization completed successfully!")
        
    except Exception as e:
        print(f"Error initializing roles: {e}")
        return False
    
    return True

if __name__ == "__main__":
    if init_roles():
        sys.exit(0)
    else:
        sys.exit(1)