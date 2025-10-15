"""
System and logging related Pydantic models
"""

from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List
from datetime import datetime
from uuid import UUID
from .base import BaseModelConfig

class ErrorMessage(BaseModelConfig):
    """Error Message model"""
    error_id: Optional[int] = Field(None, alias="ErrorID")
    error_code: str = Field(..., alias="ErrorCode", max_length=50)
    error_message_text: str = Field(..., alias="ErrorMessageText")
    severity: Optional[str] = Field(None, alias="Severity")

class ErrorMessageCreate(BaseModel):
    """Error Message creation model"""
    error_code: str = Field(..., max_length=50)
    error_message_text: str = Field(...)
    severity: Optional[str] = None

class EventLog(BaseModelConfig):
    """Event Log model"""
    log_id: Optional[int] = Field(None, alias="LogID")
    user_id: Optional[UUID] = Field(None, alias="UserID")
    timestamp: datetime = Field(default_factory=datetime.utcnow, alias="Timestamp")
    action_type: str = Field(..., alias="ActionType")
    table_name: str = Field(..., alias="TableName")
    record_id: Optional[str] = Field(None, alias="RecordID")
    before_value: Optional[Dict[str, Any]] = Field(None, alias="BeforeValue")
    after_value: Optional[Dict[str, Any]] = Field(None, alias="AfterValue")

class EventLogCreate(BaseModel):
    """Event Log creation model"""
    user_id: Optional[UUID] = None
    action_type: str = Field(...)
    table_name: str = Field(...)
    record_id: Optional[str] = None
    before_value: Optional[Dict[str, Any]] = None
    after_value: Optional[Dict[str, Any]] = None

# API Response models
class APIResponse(BaseModel):
    """Standard API response model"""
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None
    errors: Optional[List[str]] = None

class PaginatedResponse(BaseModel):
    """Paginated response model"""
    items: List[Any]
    total: int
    page: int
    per_page: int
    pages: int
    has_next: bool
    has_prev: bool

class HealthCheck(BaseModel):
    """Health check response model"""
    status: str = "healthy"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    service: str = "FinKen 2.0 API"
    version: str = "2.0.0"