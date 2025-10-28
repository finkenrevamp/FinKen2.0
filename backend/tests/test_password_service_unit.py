"""
Unit tests for password service
"""

import pytest
from unittest.mock import Mock, MagicMock, patch
from uuid import uuid4
from datetime import datetime

from services.password_service import PasswordHistoryService


class TestPasswordHistoryService:
    """Test suite for password history service"""
    
    @pytest.fixture
    def mock_supabase(self):
        """Create a mock Supabase client"""
        return Mock()
    
    @pytest.fixture
    def password_service(self, mock_supabase):
        """Create a password service instance with mocked Supabase"""
        with patch('services.password_service.get_supabase_client', return_value=mock_supabase):
            service = PasswordHistoryService()
            return service
    
    def test_hash_password(self, password_service):
        """Test password hashing"""
        password = "securepassword123"
        hashed = password_service.hash_password(password)
        
        # Hash should be a string
        assert isinstance(hashed, str)
        # Hash should not equal the original password
        assert hashed != password
        # Hash should be long (bcrypt hashes are typically 60 chars)
        assert len(hashed) > 50
    
    def test_verify_password_correct(self, password_service):
        """Test password verification with correct password"""
        password = "securepassword123"
        hashed = password_service.hash_password(password)
        
        # Verification should succeed
        assert password_service.verify_password(password, hashed) is True
    
    def test_verify_password_incorrect(self, password_service):
        """Test password verification with incorrect password"""
        password = "securepassword123"
        wrong_password = "wrongpassword"
        hashed = password_service.hash_password(password)
        
        # Verification should fail
        assert password_service.verify_password(wrong_password, hashed) is False
    
    def test_verify_password_invalid_hash(self, password_service):
        """Test password verification with invalid hash"""
        password = "securepassword123"
        invalid_hash = "not-a-valid-hash"
        
        # Should return False for invalid hash
        assert password_service.verify_password(password, invalid_hash) is False
    
    def test_add_password_to_history_success(self, password_service, mock_supabase):
        """Test adding password to history successfully"""
        user_id = uuid4()
        password = "newpassword123"
        
        # Mock successful insert
        mock_chain = MagicMock()
        mock_supabase.from_.return_value = mock_chain
        mock_chain.insert.return_value = mock_chain
        mock_chain.execute.return_value = Mock(data={"success": True})
        
        result = password_service.add_password_to_history(user_id, password)
        
        assert result is True
        mock_supabase.from_.assert_called_once_with("password_history")
    
    def test_add_password_to_history_failure(self, password_service, mock_supabase):
        """Test adding password to history with database error"""
        user_id = uuid4()
        password = "newpassword123"
        
        # Mock database error
        mock_supabase.from_.side_effect = Exception("Database error")
        
        result = password_service.add_password_to_history(user_id, password)
        
        assert result is False
    
    def test_get_password_history_success(self, password_service, mock_supabase):
        """Test retrieving password history successfully"""
        user_id = uuid4()
        
        # Mock successful query
        mock_history = [
            {"password_hash": "hash1", "created_at": datetime.utcnow().isoformat()},
            {"password_hash": "hash2", "created_at": datetime.utcnow().isoformat()}
        ]
        
        mock_chain = MagicMock()
        mock_supabase.from_.return_value = mock_chain
        mock_chain.select.return_value = mock_chain
        mock_chain.eq.return_value = mock_chain
        mock_chain.order.return_value = mock_chain
        mock_chain.limit.return_value = mock_chain
        mock_chain.execute.return_value = Mock(data=mock_history)
        
        result = password_service.get_password_history(user_id, limit=5)
        
        assert len(result) == 2
        assert result == mock_history
    
    def test_get_password_history_empty(self, password_service, mock_supabase):
        """Test retrieving password history with no results"""
        user_id = uuid4()
        
        # Mock empty query result
        mock_chain = MagicMock()
        mock_supabase.from_.return_value = mock_chain
        mock_chain.select.return_value = mock_chain
        mock_chain.eq.return_value = mock_chain
        mock_chain.order.return_value = mock_chain
        mock_chain.limit.return_value = mock_chain
        mock_chain.execute.return_value = Mock(data=[])
        
        result = password_service.get_password_history(user_id)
        
        assert result == []
    
    def test_is_password_reused_true(self, password_service, mock_supabase):
        """Test detecting password reuse"""
        user_id = uuid4()
        password = "reusedpassword123"
        
        # Hash the password
        password_hash = password_service.hash_password(password)
        
        # Mock history with the same password
        mock_history = [
            {"password_hash": password_hash, "created_at": datetime.utcnow().isoformat()}
        ]
        
        mock_chain = MagicMock()
        mock_supabase.from_.return_value = mock_chain
        mock_chain.select.return_value = mock_chain
        mock_chain.eq.return_value = mock_chain
        mock_chain.order.return_value = mock_chain
        mock_chain.limit.return_value = mock_chain
        mock_chain.execute.return_value = Mock(data=mock_history)
        
        result = password_service.is_password_reused(user_id, password)
        
        assert result is True
    
    def test_is_password_reused_false(self, password_service, mock_supabase):
        """Test password not reused"""
        user_id = uuid4()
        new_password = "brandnewpassword123"
        old_password = "oldpassword123"
        
        # Hash old password
        old_hash = password_service.hash_password(old_password)
        
        # Mock history with different password
        mock_history = [
            {"password_hash": old_hash, "created_at": datetime.utcnow().isoformat()}
        ]
        
        mock_chain = MagicMock()
        mock_supabase.from_.return_value = mock_chain
        mock_chain.select.return_value = mock_chain
        mock_chain.eq.return_value = mock_chain
        mock_chain.order.return_value = mock_chain
        mock_chain.limit.return_value = mock_chain
        mock_chain.execute.return_value = Mock(data=mock_history)
        
        result = password_service.is_password_reused(user_id, new_password)
        
        assert result is False
    
    def test_validate_and_store_password_success(self, password_service, mock_supabase):
        """Test validating and storing new password successfully"""
        user_id = uuid4()
        new_password = "newpassword123"
        
        # Mock successful operations
        mock_chain = MagicMock()
        mock_supabase.from_.return_value = mock_chain
        mock_chain.select.return_value = mock_chain
        mock_chain.eq.return_value = mock_chain
        mock_chain.order.return_value = mock_chain
        mock_chain.limit.return_value = mock_chain
        mock_chain.execute.return_value = Mock(data=[])  # No history
        mock_chain.insert.return_value = mock_chain
        
        success, error = password_service.validate_and_store_password(
            user_id, new_password, check_history=True
        )
        
        assert success is True
        assert error is None
    
    def test_validate_and_store_password_reused(self, password_service, mock_supabase):
        """Test validating password that was reused"""
        user_id = uuid4()
        password = "reusedpassword123"
        
        # Hash the password
        password_hash = password_service.hash_password(password)
        
        # Mock history with the same password
        mock_history = [
            {"password_hash": password_hash, "created_at": datetime.utcnow().isoformat()}
        ]
        
        mock_chain = MagicMock()
        mock_supabase.from_.return_value = mock_chain
        mock_chain.select.return_value = mock_chain
        mock_chain.eq.return_value = mock_chain
        mock_chain.order.return_value = mock_chain
        mock_chain.limit.return_value = mock_chain
        mock_chain.execute.return_value = Mock(data=mock_history)
        
        success, error = password_service.validate_and_store_password(
            user_id, password, check_history=True
        )
        
        assert success is False
        assert "last 5 passwords" in error
    
    def test_hash_password_different_hashes(self, password_service):
        """Test that same password produces different hashes (salt)"""
        password = "securepassword123"
        hash1 = password_service.hash_password(password)
        hash2 = password_service.hash_password(password)
        
        # Hashes should be different due to different salts
        assert hash1 != hash2
        # But both should verify correctly
        assert password_service.verify_password(password, hash1) is True
        assert password_service.verify_password(password, hash2) is True

