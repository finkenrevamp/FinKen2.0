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
    dob: Optional[datetime] = Field(None, alias="DOB", description="Date of Birth")
    address: Optional[str] = Field(None, alias="Address", max_length=500)
    profile_picture_url: Optional[str] = Field(None, alias="ProfilePictureURL")
    role_id: int = Field(..., alias="RoleID")
    is_active: bool = Field(True, alias="IsActive")
    is_suspended: bool = Field(False, alias="isSuspended")
    suspension_end_date: Optional[datetime] = Field(None, alias="SuspensionEndDate")
    date_created: datetime = Field(default_factory=datetime.utcnow, alias="DateCreated")
    
    # Relationships
    role: Optional[Role] = None

class ProfileCreate(BaseModel):
    """Profile creation model"""
    username: str = Field(..., max_length=255)
    first_name: str = Field(..., max_length=255)
    last_name: str = Field(..., max_length=255)
    dob: Optional[datetime] = None
    address: Optional[str] = Field(None, max_length=500)
    profile_picture_url: Optional[str] = None
    role_id: int = Field(...)

class ProfileUpdate(BaseModel):
    """Profile update model"""
    username: Optional[str] = Field(None, max_length=255)
    first_name: Optional[str] = Field(None, max_length=255)
    last_name: Optional[str] = Field(None, max_length=255)
    dob: Optional[datetime] = None
    address: Optional[str] = Field(None, max_length=500)
    profile_picture_url: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None

class RegistrationRequest(BaseModelConfig):
    """Registration request model"""
    request_id: Optional[int] = Field(None, alias="RequestID")
    first_name: str = Field(..., alias="FirstName", max_length=255)
    last_name: str = Field(..., alias="LastName", max_length=255)
    dob: Optional[datetime] = Field(None, alias="DOB", description="Date of Birth")
    address: Optional[str] = Field(None, alias="Address", max_length=500)
    email: EmailStr = Field(..., alias="Email")
    request_date: datetime = Field(default_factory=datetime.utcnow, alias="RequestDate")
    status: str = Field(default="Pending", alias="Status")
    reviewed_by_user_id: Optional[UUID] = Field(None, alias="ReviewedByUserID")
    review_date: Optional[datetime] = Field(None, alias="ReviewDate")
    reviewer_username: Optional[str] = Field(None, alias="ReviewerUsername")

class RegistrationRequestCreate(BaseModel):
    """Registration request creation model"""
    first_name: str = Field(..., max_length=255)
    last_name: str = Field(..., max_length=255)
    dob: Optional[datetime] = None
    address: Optional[str] = Field(None, max_length=500)
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

class RejectRegistrationRequest(BaseModel):
    """Reject registration request model"""
    reason: str = Field(..., max_length=500)

class SignupInvitation(BaseModelConfig):
    """Signup invitation model"""
    invitation_id: Optional[int] = Field(None, alias="invitationid")
    request_id: int = Field(..., alias="requestid")
    token: str = Field(..., alias="token")
    expires_at: datetime = Field(..., alias="expiresat")
    used_at: Optional[datetime] = Field(None, alias="usedat")
    approved_user_role: Optional[int] = Field(None, alias="approveduserrole")

class SignupInvitationCreate(BaseModel):
    """Signup invitation creation model"""
    request_id: int
    token: str
    expires_at: datetime

class SecurityQuestion(BaseModelConfig):
    """Security question model"""
    question_id: Optional[int] = Field(None, alias="questionid")
    question_text: str = Field(..., alias="questiontext", max_length=500)

class UserSecurityAnswer(BaseModelConfig):
    """User security answer model"""
    user_answer_id: Optional[int] = Field(None, alias="useranswerid")
    user_id: UUID = Field(..., alias="userid")
    question_id: int = Field(..., alias="questionid")
    answer_hash: str = Field(..., alias="answerhash")

class CompleteSignupRequest(BaseModel):
    """Complete signup request model"""
    token: str = Field(..., min_length=1)
    password: str = Field(..., min_length=8)
    security_question_id: int = Field(..., gt=0)
    security_answer: str = Field(..., min_length=1)

class VerifyInvitationResponse(BaseModel):
    """Verify invitation response model"""
    valid: bool
    request_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    error: Optional[str] = None

class PasswordHistory(BaseModelConfig):
    """Password history model"""
    id: Optional[int] = Field(None, description="Password history ID")
    user_id: UUID = Field(..., alias="user_id", description="User UUID")
    password_hash: str = Field(..., alias="password_hash")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="created_at")

class PasswordResetToken(BaseModelConfig):
    """Password reset token model"""
    id: Optional[int] = Field(None, description="Reset token ID")
    user_id: UUID = Field(..., alias="user_id", description="User UUID")
    email: EmailStr = Field(..., alias="email")
    token: str = Field(..., alias="token")
    expires_at: datetime = Field(..., alias="expires_at")
    used_at: Optional[datetime] = Field(None, alias="used_at")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="created_at")

class InitiateForgotPasswordRequest(BaseModel):
    """Initiate forgot password request model"""
    email: EmailStr
    username: str = Field(..., max_length=255)

class VerifySecurityAnswerRequest(BaseModel):
    """Verify security answer request model"""
    email: EmailStr
    username: str = Field(..., max_length=255)
    security_answer: str = Field(..., min_length=1)

class SecurityQuestionResponse(BaseModel):
    """Security question response model"""
    question_id: int
    question_text: str
    user_id: str

class PasswordResetTokenResponse(BaseModel):
    """Password reset token response model"""
    token: str
    message: str
