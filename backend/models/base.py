"""
Base Pydantic models and configurations for FinKen 2.0
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID
import json

class BaseModelConfig(BaseModel):
    """Base model configuration for all Pydantic models"""
    model_config = ConfigDict(
        from_attributes=True,
        validate_assignment=True,
        arbitrary_types_allowed=True,
        json_encoders={
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat(),
            Decimal: lambda v: float(v),
            UUID: lambda v: str(v)
        }
    )

class TimestampMixin(BaseModel):
    """Mixin for models with timestamp fields"""
    created_at: Optional[datetime] = Field(None, alias="DateCreated")
    updated_at: Optional[datetime] = Field(None, alias="UpdatedAt")

class UserMixin(BaseModel):
    """Mixin for models with user tracking"""
    created_by_user_id: Optional[UUID] = Field(None, alias="CreatedByUserID")
    updated_by_user_id: Optional[UUID] = Field(None, alias="UpdatedByUserID")