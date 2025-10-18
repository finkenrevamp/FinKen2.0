"""
Chart of Accounts routes for FinKen 2.0
Handles account management operations
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
import logging
from decimal import Decimal

from models.accounting import (
    ChartOfAccounts,
    ChartOfAccountsCreate,
    ChartOfAccountsUpdate
)
from services.supabase import get_supabase_client, set_current_user
from routes.auth import get_current_user_from_token, require_admin
from models.auth import Profile

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/health")
async def accounts_health():
    """Accounts service health check"""
    return {"status": "healthy", "service": "accounts"}

@router.get("", response_model=List[ChartOfAccounts])
async def get_all_accounts(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    category: Optional[str] = Query(None, description="Filter by account category"),
    current_user: Profile = Depends(get_current_user_from_token)
):
    """
    Get all chart of accounts
    Returns all accounts with optional filtering by active status and category
    """
    try:
        supabase = get_supabase_client()
        
        # Build query
        query = supabase.from_("chartofaccounts").select("*")
        
        # Apply filters if provided
        if is_active is not None:
            query = query.eq("IsActive", is_active)
        
        if category:
            query = query.eq("Category", category)
        
        # Order by display order and account number
        query = query.order("DisplayOrder", desc=False)
        query = query.order("AccountNumber", desc=False)
        
        result = query.execute()
        
        # Convert to Pydantic models
        accounts = [ChartOfAccounts(**account) for account in result.data]
        
        return accounts
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get accounts error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching accounts"
        )

@router.get("/{account_id}", response_model=ChartOfAccounts)
async def get_account(
    account_id: int,
    current_user: Profile = Depends(get_current_user_from_token)
):
    """
    Get a specific account by ID
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.from_("chartofaccounts").select("*").eq("AccountID", account_id).single().execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Account with ID {account_id} not found"
            )
        
        account = ChartOfAccounts(**result.data)
        
        return account
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get account error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching the account"
        )

@router.post("", response_model=ChartOfAccounts, status_code=status.HTTP_201_CREATED)
async def create_account(
    account: ChartOfAccountsCreate,
    current_user: Profile = Depends(require_admin)
):
    """
    Create a new chart of accounts entry
    Requires administrator privileges
    """
    try:
        supabase = get_supabase_client()
        
        # Validate normal side
        if account.normal_side not in ["Debit", "Credit"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Normal side must be either 'Debit' or 'Credit'"
            )
        
        # Validate category
        valid_categories = ["Asset", "Liability", "Equity", "Revenue", "Expense"]
        if account.category not in valid_categories:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category must be one of: {', '.join(valid_categories)}"
            )
        
        # Check if account number already exists
        existing_number = supabase.from_("chartofaccounts").select("AccountID").eq("AccountNumber", account.account_number).execute()
        if existing_number.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Account number {account.account_number} already exists"
            )
        
        # Check if account name already exists
        existing_name = supabase.from_("chartofaccounts").select("AccountID").eq("AccountName", account.account_name).execute()
        if existing_name.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Account name '{account.account_name}' already exists"
            )
        
        # Prepare data for insertion
        insert_data = {
            "AccountNumber": account.account_number,
            "AccountName": account.account_name,
            "AccountDescription": account.account_description,
            "NormalSide": account.normal_side,
            "Category": account.category,
            "Subcategory": account.subcategory,
            "InitialBalance": str(account.initial_balance),
            "DisplayOrder": account.display_order,
            "StatementType": account.statement_type,
            "CreatedByUserID": str(current_user.id),
            "Comment": account.comment
        }
        
        # Set current user for audit logging
        set_current_user(str(current_user.id))
        
        # Insert the account
        result = supabase.from_("chartofaccounts").insert(insert_data).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create account"
            )
        
        # Return the created account
        created_account = ChartOfAccounts(**result.data[0])
        
        return created_account
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create account error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the account"
        )

@router.patch("/{account_id}", response_model=ChartOfAccounts)
async def update_account(
    account_id: int,
    account_update: ChartOfAccountsUpdate,
    current_user: Profile = Depends(require_admin)
):
    """
    Update an existing chart of accounts entry
    Requires administrator privileges
    """
    try:
        supabase = get_supabase_client()
        
        # Check if account exists
        existing = supabase.from_("chartofaccounts").select("*").eq("AccountID", account_id).single().execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Account with ID {account_id} not found"
            )
        
        # Prepare update data (only include fields that are being updated)
        update_data = {}
        
        if account_update.account_number is not None:
            # Check if new account number already exists (excluding current account)
            existing_number = supabase.from_("chartofaccounts").select("AccountID").eq("AccountNumber", account_update.account_number).neq("AccountID", account_id).execute()
            if existing_number.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Account number {account_update.account_number} already exists"
                )
            update_data["AccountNumber"] = account_update.account_number
        
        if account_update.account_name is not None:
            # Check if new account name already exists (excluding current account)
            existing_name = supabase.from_("chartofaccounts").select("AccountID").eq("AccountName", account_update.account_name).neq("AccountID", account_id).execute()
            if existing_name.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Account name '{account_update.account_name}' already exists"
                )
            update_data["AccountName"] = account_update.account_name
        
        if account_update.account_description is not None:
            update_data["AccountDescription"] = account_update.account_description
        
        if account_update.normal_side is not None:
            if account_update.normal_side not in ["Debit", "Credit"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Normal side must be either 'Debit' or 'Credit'"
                )
            update_data["NormalSide"] = account_update.normal_side
        
        if account_update.category is not None:
            valid_categories = ["Asset", "Liability", "Equity", "Revenue", "Expense"]
            if account_update.category not in valid_categories:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Category must be one of: {', '.join(valid_categories)}"
                )
            update_data["Category"] = account_update.category
        
        if account_update.subcategory is not None:
            update_data["Subcategory"] = account_update.subcategory
        
        if account_update.initial_balance is not None:
            update_data["InitialBalance"] = str(account_update.initial_balance)
        
        if account_update.display_order is not None:
            update_data["DisplayOrder"] = account_update.display_order
        
        if account_update.statement_type is not None:
            update_data["StatementType"] = account_update.statement_type
        
        if account_update.is_active is not None:
            update_data["IsActive"] = account_update.is_active
        
        if account_update.comment is not None:
            update_data["Comment"] = account_update.comment
        
        # If no fields to update, return current account
        if not update_data:
            return ChartOfAccounts(**existing.data)
        
        # Set current user for audit logging
        set_current_user(str(current_user.id))
        
        # Update the account
        result = supabase.from_("chartofaccounts").update(update_data).eq("AccountID", account_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update account"
            )
        
        # Return the updated account
        updated_account = ChartOfAccounts(**result.data[0])
        
        return updated_account
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update account error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating the account"
        )

@router.delete("/{account_id}")
async def deactivate_account(
    account_id: int,
    current_user: Profile = Depends(require_admin)
):
    """
    Deactivate an account (soft delete)
    Requires administrator privileges
    Note: This sets IsActive to false rather than deleting the record
    """
    try:
        supabase = get_supabase_client()
        
        # Check if account exists
        existing = supabase.from_("chartofaccounts").select("*").eq("AccountID", account_id).single().execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Account with ID {account_id} not found"
            )
        
        # Check if account is already inactive
        if not existing.data.get("IsActive", True):
            return {
                "message": f"Account {account_id} is already deactivated"
            }
        
        # Set current user for audit logging
        set_current_user(str(current_user.id))
        
        # Deactivate the account
        result = supabase.from_("chartofaccounts").update({
            "IsActive": False
        }).eq("AccountID", account_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to deactivate account"
            )
        
        return {
            "message": f"Account {account_id} deactivated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deactivate account error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deactivating the account"
        )