"""
Test script to verify FinKen 2.0 setup
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test that all required modules can be imported"""
    print("Testing imports...")
    
    try:
        # Test FastAPI imports
        from fastapi import FastAPI
        print("✓ FastAPI imported successfully")
        
        # Test Pydantic imports
        from pydantic import BaseModel
        print("✓ Pydantic imported successfully")
        
        # Test Supabase imports
        from supabase.client import create_client
        print("✓ Supabase imported successfully")
        
        # Test our models
        from models.auth import Profile, Role
        from models.accounting import ChartOfAccounts, JournalEntry
        from models.system import APIResponse
        print("✓ FinKen models imported successfully")
        
        # Test our services (optional - may not exist yet)
        try:
            from services.supabase import SupabaseClient
            print("✓ FinKen services imported successfully")
        except ImportError:
            print("⚠ FinKen services not found (this is OK for initial setup)")
        
        
        return True
        
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

def test_environment():
    """Test environment configuration"""
    print("\nTesting environment...")
    
    # Check for .env file in project root
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        print("✓ .env file found")
        
        # Load environment variables
        from dotenv import load_dotenv
        load_dotenv(env_path)
        
        # Check required variables
        required_vars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY']
        missing_vars = []
        
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            print(f"✗ Missing environment variables: {', '.join(missing_vars)}")
            return False
        else:
            print("✓ Required environment variables found")
            return True
    else:
        print("✗ .env file not found. Please copy .env.example to .env and configure it.")
        return False

def test_models():
    """Test model creation"""
    print("\nTesting models...")
    
    try:
        from models.auth import Role
        from models.accounting import ChartOfAccountsCreate
        from decimal import Decimal
        
        # Test role creation (using field aliases)
        role_data = {"RoleID": 1, "RoleName": "Test Role"}
        role = Role(**role_data)
        print("✓ Role model created successfully")
        
        # Test account creation
        account = ChartOfAccountsCreate(
            account_number="1000",
            account_name="Test Account",
            normal_side="Debit",
            category="Asset",
            initial_balance=Decimal("100.00")
        )
        print("✓ ChartOfAccountsCreate model created successfully")
        
        return True
        
    except Exception as e:
        print(f"✗ Model test error: {e}")
        return False

def main():
    """Run all tests"""
    print("FinKen 2.0 Setup Verification")
    print("=" * 40)
    
    tests = [
        test_imports,
        test_environment,
        test_models
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! FinKen 2.0 is ready for development.")
        return 0
    else:
        print("❌ Some tests failed. Please check the setup.")
        return 1

if __name__ == "__main__":
    sys.exit(main())