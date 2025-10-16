"""
User and Authentication related Pydantic models
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID
from .base import BaseModelConfig, TimestampMixin

class Role(BaseModelConfig):
    """Role model"""
    role_id: Optional[int] = Field(None, alias="RoleID")
    role_name: str = Field(..., alias="RoleName", max_length=255)

class RoleCreate(BaseModel):
    """Role creation model"""
    role_name: str = Field(..., max_length=255)

class Profile(BaseModelConfig, TimestampMixin):
    """User profile model"""
    id: UUID = Field(..., description="User UUID from auth.users")
    username: str = Field(..., alias="Username", max_length=255)
    first_name: str = Field(..., alias="FirstName", max_length=255)
    last_name: str = Field(..., alias="LastName", max_length=255)
    profile_picture_url: Optional[str] = Field(None, alias="ProfilePictureURL")
    role_id: int = Field(..., alias="RoleID")
    is_active: bool = Field(True, alias="IsActive")
    date_created: datetime = Field(default_factory=datetime.utcnow, alias="DateCreated")
    
    # Relationships
    role: Optional[Role] = None

class ProfileCreate(BaseModel):
    """Profile creation model"""
    username: str = Field(..., max_length=255)
    first_name: str = Field(..., max_length=255)
    last_name: str = Field(..., max_length=255)
    profile_picture_url: Optional[str] = None
    role_id: int = Field(...)

class ProfileUpdate(BaseModel):
    """Profile update model"""
    username: Optional[str] = Field(None, max_length=255)
    first_name: Optional[str] = Field(None, max_length=255)
    last_name: Optional[str] = Field(None, max_length=255)
    profile_picture_url: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None

class RegistrationRequest(BaseModelConfig):
    """Registration request model"""
    request_id: Optional[int] = Field(None, alias="RequestID")
    first_name: str = Field(..., alias="FirstName", max_length=255)
    last_name: str = Field(..., alias="LastName", max_length=255)
    email: EmailStr = Field(..., alias="Email")
    request_date: datetime = Field(default_factory=datetime.utcnow, alias="RequestDate")
    status: str = Field(default="Pending", alias="Status")
    reviewed_by_user_id: Optional[UUID] = Field(None, alias="ReviewedByUserID")
    review_date: Optional[datetime] = Field(None, alias="ReviewDate")

class RegistrationRequestCreate(BaseModel):
    """Registration request creation model"""
    first_name: str = Field(..., max_length=255)
    last_name: str = Field(..., max_length=255)
    email: EmailStr = Field(...)

class RegistrationRequestUpdate(BaseModel):
    """Registration request update model"""
    status: Optional[str] = None
    reviewed_by_user_id: Optional[UUID] = None
    review_date: Optional[datetime] = None

# Authentication models
class UserLogin(BaseModel):
    """User login model"""
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    """User registration model"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., max_length=255)
    last_name: str = Field(..., max_length=255)
    username: str = Field(..., max_length=255)

class TokenResponse(BaseModel):
    """Token response model"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None
    user: Optional[Profile] = None

class ForgotPasswordRequest(BaseModel):
    """Forgot password request model"""
    email: EmailStr
    username: str = Field(..., max_length=255)

class ResetPasswordRequest(BaseModel):
    """Reset password request model"""
    token: str
    new_password: str = Field(..., min_length=8)

class ChangePasswordRequest(BaseModel):
    """Change password request model"""
    current_password: str
    new_password: str = Field(..., min_length=8)

class ApproveRegistrationRequest(BaseModel):
    """Approve registration request model"""
    role_id: int
    password: str = Field(..., min_length=8)

class RejectRegistrationRequest(BaseModel):
    """Reject registration request model"""
    reason: str = Field(..., max_length=500)