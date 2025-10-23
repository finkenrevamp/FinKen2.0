"""
Accounting related Pydantic models
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID
from .base import BaseModelConfig, TimestampMixin, UserMixin

class ChartOfAccounts(BaseModelConfig, TimestampMixin, UserMixin):
    """Chart of Accounts model"""
    account_id: Optional[int] = Field(None, alias="AccountID")
    account_number: str = Field(..., alias="AccountNumber", max_length=50)
    account_name: str = Field(..., alias="AccountName", max_length=255)
    account_description: Optional[str] = Field(None, alias="AccountDescription")
    normal_side: str = Field(..., alias="NormalSide")  # "Debit" or "Credit"
    category: str = Field(..., alias="Category")
    subcategory: Optional[str] = Field(None, alias="Subcategory")
    initial_balance: Decimal = Field(default=Decimal("0.00"), alias="Balance")
    display_order: Optional[int] = Field(None, alias="DisplayOrder")
    statement_type: Optional[str] = Field(None, alias="StatementType")
    is_active: bool = Field(default=True, alias="IsActive")
    date_created: datetime = Field(default_factory=datetime.utcnow, alias="DateCreated")
    created_by_user_id: Optional[UUID] = Field(None, alias="CreatedByUserID")
    created_by_username: Optional[str] = None  # Username of the creator (from join)
    comment: Optional[str] = Field(None, alias="Comment")

class ChartOfAccountsCreate(BaseModel):
    """Chart of Accounts creation model"""
    account_number: str = Field(..., max_length=50)
    account_name: str = Field(..., max_length=255)
    account_description: Optional[str] = None
    normal_side: str = Field(...)  # "Debit" or "Credit"
    category: str = Field(...)
    subcategory: Optional[str] = None
    initial_balance: Decimal = Field(default=Decimal("0.00"))
    display_order: Optional[int] = None
    statement_type: Optional[str] = None
    comment: Optional[str] = None

class ChartOfAccountsUpdate(BaseModel):
    """Chart of Accounts update model"""
    account_number: Optional[str] = Field(None, max_length=50)
    account_name: Optional[str] = Field(None, max_length=255)
    account_description: Optional[str] = None
    normal_side: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    initial_balance: Optional[Decimal] = None
    display_order: Optional[int] = None
    statement_type: Optional[str] = None
    is_active: Optional[bool] = None
    comment: Optional[str] = None

class JournalEntry(BaseModelConfig):
    """Journal Entry model"""
    journal_entry_id: Optional[int] = Field(None, alias="JournalEntryID")
    entry_date: date = Field(..., alias="EntryDate")
    description: Optional[str] = Field(None, alias="Description")
    status: str = Field(default="Pending", alias="Status")
    is_adjusting_entry: bool = Field(default=False, alias="IsAdjustingEntry")
    created_by_user_id: UUID = Field(..., alias="CreatedByUserID")
    creation_date: datetime = Field(default_factory=datetime.utcnow, alias="CreationDate")
    approved_by_user_id: Optional[UUID] = Field(None, alias="ApprovedByUserID")
    approval_date: Optional[datetime] = Field(None, alias="ApprovalDate")
    rejection_reason: Optional[str] = Field(None, alias="RejectionReason")
    
    # Relationships
    journal_entry_lines: Optional[List["JournalEntryLine"]] = []
    attachments: Optional[List["JournalAttachment"]] = []

class JournalEntryCreate(BaseModel):
    """Journal Entry creation model"""
    entry_date: date = Field(...)
    description: Optional[str] = None
    is_adjusting_entry: bool = Field(default=False)
    journal_entry_lines: List["JournalEntryLineCreate"] = Field(...)

class JournalEntryUpdate(BaseModel):
    """Journal Entry update model"""
    entry_date: Optional[date] = None
    description: Optional[str] = None
    status: Optional[str] = None
    is_adjusting_entry: Optional[bool] = None
    approved_by_user_id: Optional[UUID] = None
    approval_date: Optional[datetime] = None
    rejection_reason: Optional[str] = None

class JournalEntryLine(BaseModelConfig):
    """Journal Entry Line model"""
    line_id: Optional[int] = Field(None, alias="LineID")
    journal_entry_id: int = Field(..., alias="JournalEntryID")
    account_id: int = Field(..., alias="AccountID")
    type: str = Field(..., alias="Type")  # "Debit" or "Credit"
    amount: Decimal = Field(..., alias="Amount")
    
    # Relationships
    account: Optional[ChartOfAccounts] = None

class JournalEntryLineCreate(BaseModel):
    """Journal Entry Line creation model"""
    account_id: int = Field(...)
    type: str = Field(...)  # "Debit" or "Credit"
    amount: Decimal = Field(...)

class JournalEntryLineUpdate(BaseModel):
    """Journal Entry Line update model"""
    account_id: Optional[int] = None
    type: Optional[str] = None
    amount: Optional[Decimal] = None

class AccountLedger(BaseModelConfig):
    """Account Ledger model"""
    ledger_id: Optional[int] = Field(None, alias="LedgerID")
    account_id: int = Field(..., alias="AccountID")
    journal_entry_id: int = Field(..., alias="JournalEntryID")
    transaction_date: date = Field(..., alias="TransactionDate")
    description: Optional[str] = Field(None, alias="Description")
    debit: Decimal = Field(default=Decimal("0.00"), alias="Debit")
    credit: Decimal = Field(default=Decimal("0.00"), alias="Credit")
    post_timestamp: datetime = Field(default_factory=datetime.utcnow, alias="PostTimestamp")
    
    # Relationships
    account: Optional[ChartOfAccounts] = None
    journal_entry: Optional[JournalEntry] = None

class JournalAttachment(BaseModelConfig):
    """Journal Attachment model"""
    attachment_id: Optional[int] = Field(None, alias="AttachmentID")
    journal_entry_id: int = Field(..., alias="JournalEntryID")
    file_name: str = Field(..., alias="FileName")
    file_path: str = Field(..., alias="FilePath")
    file_type: Optional[str] = Field(None, alias="FileType")
    file_size: Optional[int] = Field(None, alias="FileSize")
    uploaded_by_user_id: UUID = Field(..., alias="UploadedByUserID")
    upload_timestamp: datetime = Field(default_factory=datetime.utcnow, alias="UploadTimestamp")

class JournalAttachmentCreate(BaseModel):
    """Journal Attachment creation model"""
    journal_entry_id: int = Field(...)
    file_name: str = Field(...)
    file_path: str = Field(...)
    file_type: Optional[str] = None
    file_size: Optional[int] = None