"""
Test script for password history service
"""

import sys
from uuid import uuid4
from services.password_service import get_password_service

def test_password_service():
    """Test password history functionality"""
    
    print("Testing Password History Service...")
    print("-" * 50)
    
    password_service = get_password_service()
    test_user_id = uuid4()
    
    # Test 1: Hash password
    print("\n1. Testing password hashing...")
    password = "TestPass123!"
    hashed = password_service.hash_password(password)
    print(f"✓ Password hashed successfully")
    print(f"  Original: {password}")
    print(f"  Hashed: {hashed[:50]}...")
    
    # Test 2: Verify password
    print("\n2. Testing password verification...")
    if password_service.verify_password(password, hashed):
        print("✓ Password verification successful")
    else:
        print("✗ Password verification failed")
        return False
    
    # Test 3: Verify wrong password
    print("\n3. Testing wrong password verification...")
    if not password_service.verify_password("WrongPass123!", hashed):
        print("✓ Correctly rejected wrong password")
    else:
        print("✗ Incorrectly accepted wrong password")
        return False
    
    # Test 4: Test password reuse detection
    print("\n4. Testing password reuse detection...")
    print("Note: This test requires database access and may not work in isolation")
    print("  Skipping database-dependent tests in this environment")
    
    print("\n" + "=" * 50)
    print("✓ All basic tests passed!")
    print("=" * 50)
    
    return True

if __name__ == "__main__":
    try:
        success = test_password_service()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
