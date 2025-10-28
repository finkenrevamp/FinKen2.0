"""
Unit tests for Pydantic models
"""

import pytest
from datetime import datetime
from uuid import uuid4
from pydantic import ValidationError

from models.auth import (
    UserLogin,
    UserRegister,
    Profile,
    RegistrationRequestCreate,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    CompleteSignupRequest,
    Role,
    TokenResponse
)


class TestAuthModels:
    """Test suite for authentication models"""
    
    def test_user_login_valid(self):
        """Test valid user login model"""
        login = UserLogin(
            email="test@example.com",
            password="securepassword123"
        )
        assert login.email == "test@example.com"
        assert login.password == "securepassword123"
    
    def test_user_login_invalid_email(self):
        """Test user login with invalid email"""
        with pytest.raises(ValidationError):
            UserLogin(
                email="invalid-email",
                password="securepassword123"
            )
    
    def test_user_register_valid(self):
        """Test valid user registration"""
        register = UserRegister(
            email="newuser@example.com",
            password="securepass123",
            first_name="John",
            last_name="Doe",
            username="johndoe"
        )
        assert register.email == "newuser@example.com"
        assert register.first_name == "John"
        assert register.username == "johndoe"
    
    def test_user_register_short_password(self):
        """Test user registration with short password"""
        with pytest.raises(ValidationError):
            UserRegister(
                email="newuser@example.com",
                password="short",  # Less than 8 characters
                first_name="John",
                last_name="Doe",
                username="johndoe"
            )
    
    def test_registration_request_create(self):
        """Test registration request creation"""
        request = RegistrationRequestCreate(
            first_name="Jane",
            last_name="Smith",
            email="jane@example.com",
            dob=datetime(1990, 1, 1),
            address="123 Main St"
        )
        assert request.first_name == "Jane"
        assert request.email == "jane@example.com"
    
    def test_forgot_password_request(self):
        """Test forgot password request"""
        request = ForgotPasswordRequest(
            email="user@example.com",
            username="testuser"
        )
        assert request.email == "user@example.com"
        assert request.username == "testuser"
    
    def test_reset_password_request(self):
        """Test reset password request"""
        request = ResetPasswordRequest(
            token="reset-token-123",
            new_password="newsecurepass123"
        )
        assert request.token == "reset-token-123"
        assert len(request.new_password) >= 8
    
    def test_reset_password_short_password(self):
        """Test reset password with short password"""
        with pytest.raises(ValidationError):
            ResetPasswordRequest(
                token="reset-token-123",
                new_password="short"
            )
    
    def test_change_password_request(self):
        """Test change password request"""
        request = ChangePasswordRequest(
            current_password="oldpassword123",
            new_password="newpassword123"
        )
        assert request.current_password == "oldpassword123"
        assert request.new_password == "newpassword123"
    
    def test_complete_signup_request(self):
        """Test complete signup request"""
        request = CompleteSignupRequest(
            token="signup-token-123",
            password="securepass123",
            security_question_id=1,
            security_answer="My answer"
        )
        assert request.token == "signup-token-123"
        assert request.security_question_id == 1
        assert request.security_answer == "My answer"
    
    def test_complete_signup_invalid_question_id(self):
        """Test complete signup with invalid question ID"""
        with pytest.raises(ValidationError):
            CompleteSignupRequest(
                token="signup-token-123",
                password="securepass123",
                security_question_id=0,  # Must be > 0
                security_answer="My answer"
            )
    
    def test_role_model(self):
        """Test role model"""
        role = Role(RoleName="Administrator")
        assert role.role_name == "Administrator"
    
    def test_token_response(self):
        """Test token response model"""
        token_response = TokenResponse(
            access_token="access-token-123",
            expires_in=3600
        )
        assert token_response.access_token == "access-token-123"
        assert token_response.token_type == "bearer"
        assert token_response.expires_in == 3600
    
    def test_profile_with_role(self):
        """Test profile model with role"""
        user_id = uuid4()
        role = Role(RoleID=1, RoleName="Accountant")
        
        profile = Profile(
            id=user_id,
            Username="testuser",
            FirstName="Test",
            LastName="User",
            RoleID=1,
            IsActive=True,
            DateCreated=datetime.utcnow(),
            role=role
        )
        
        assert profile.username == "testuser"
        assert profile.role_id == 1
        assert profile.is_active is True
        assert profile.role.role_name == "Accountant"

