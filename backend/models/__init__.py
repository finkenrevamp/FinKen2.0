"""
FinKen 2.0 Pydantic Models Package
"""

from .base import BaseModelConfig, TimestampMixin, UserMixin
from .auth import (
    Role, RoleCreate,
    Profile, ProfileCreate, ProfileUpdate,
    RegistrationRequest, RegistrationRequestCreate, RegistrationRequestUpdate,
    UserLogin, UserRegister, TokenResponse
)
from .accounting import (
    ChartOfAccounts, ChartOfAccountsCreate, ChartOfAccountsUpdate,
    JournalEntry, JournalEntryCreate, JournalEntryUpdate,
    JournalEntryLine, JournalEntryLineCreate, JournalEntryLineUpdate,
    AccountLedger,
    JournalAttachment, JournalAttachmentCreate
)
from .system import (
    ErrorMessage, ErrorMessageCreate,
    EventLog, EventLogCreate,
    APIResponse, PaginatedResponse, HealthCheck
)

__all__ = [
    # Base models
    "BaseModelConfig", "TimestampMixin", "UserMixin",
    
    # Auth models
    "Role", "RoleCreate",
    "Profile", "ProfileCreate", "ProfileUpdate",
    "RegistrationRequest", "RegistrationRequestCreate", "RegistrationRequestUpdate",
    "UserLogin", "UserRegister", "TokenResponse",
    
    # Accounting models
    "ChartOfAccounts", "ChartOfAccountsCreate", "ChartOfAccountsUpdate",
    "JournalEntry", "JournalEntryCreate", "JournalEntryUpdate",
    "JournalEntryLine", "JournalEntryLineCreate", "JournalEntryLineUpdate",
    "AccountLedger",
    "JournalAttachment", "JournalAttachmentCreate",
    
    # System models
    "ErrorMessage", "ErrorMessageCreate",
    "EventLog", "EventLogCreate",
    "APIResponse", "PaginatedResponse", "HealthCheck"
]