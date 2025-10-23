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

@router.get("", response_model=List[ChartOfAccounts], response_model_by_alias=False)
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
        
        # Build query with join to profiles table to get creator username
        query = supabase.from_("chartofaccounts").select(
            "*, profiles!chartofaccounts_CreatedByUserID_fkey(Username)"
        )
        
        # Apply filters if provided
        if is_active is not None:
            query = query.eq("IsActive", is_active)
        
        if category:
            query = query.eq("Category", category)
        
        # Order by display order and account number
        query = query.order("DisplayOrder", desc=False)
        query = query.order("AccountNumber", desc=False)
        
        result = query.execute()
        
        # Convert to Pydantic models and add creator username
        accounts = []
        for account_data in result.data:
            # Extract creator username from nested profiles object
            account_dict = {**account_data}
            if account_data.get("profiles") and isinstance(account_data["profiles"], dict):
                account_dict["created_by_username"] = account_data["profiles"].get("Username")
            # Remove the nested profiles object
            if "profiles" in account_dict:
                del account_dict["profiles"]
            accounts.append(ChartOfAccounts(**account_dict))
        
        return accounts
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get accounts error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching accounts"
        )

@router.get("/{account_id}", response_model=ChartOfAccounts, response_model_by_alias=False)
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

@router.post("", response_model=ChartOfAccounts, status_code=status.HTTP_201_CREATED, response_model_by_alias=False)
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
            "Balance": str(account.initial_balance),
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

@router.patch("/{account_id}", response_model=ChartOfAccounts, response_model_by_alias=False)
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
            update_data["Balance"] = str(account_update.initial_balance)
        
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
    Cannot deactivate accounts with non-zero balances
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
        
        # Check if account has a non-zero balance
        initial_balance = Decimal(str(existing.data.get("Balance", "0.00")))
        if initial_balance != Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot deactivate account with non-zero balance. Current balance: {initial_balance}"
            )
        
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

@router.get("/{account_id}/ledger", response_model=List[dict], response_model_by_alias=False)
async def get_account_ledger(
    account_id: int,
    start_date: Optional[str] = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter by end date (YYYY-MM-DD)"),
    current_user: Profile = Depends(get_current_user_from_token)
):
    """
    Get account ledger entries with calculated running balance
    Returns ledger entries with post reference (journal entry ID), date, description, debit, credit, and balance
    """
    try:
        supabase = get_supabase_client()
        
        # Check if account exists
        account_result = supabase.from_("chartofaccounts").select("*").eq("AccountID", account_id).single().execute()
        
        if not account_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Account with ID {account_id} not found"
            )
        
        account = account_result.data
        initial_balance = Decimal(str(account.get("Balance", "0.00")))
        normal_side = account.get("NormalSide", "Debit")
        
        # Build query for ledger entries
        query = supabase.from_("accountledger").select(
            "LedgerID, JournalEntryID, TransactionDate, Description, Debit, Credit, PostTimestamp"
        ).eq("AccountID", account_id)
        
        # Apply date filters if provided
        if start_date:
            query = query.gte("TransactionDate", start_date)
        
        if end_date:
            query = query.lte("TransactionDate", end_date)
        
        # Order by transaction date and post timestamp
        query = query.order("TransactionDate", desc=False)
        query = query.order("PostTimestamp", desc=False)
        
        result = query.execute()
        
        # Calculate running balance
        ledger_entries = []
        running_balance = initial_balance
        
        for entry in result.data:
            debit = Decimal(str(entry.get("Debit", "0.00")))
            credit = Decimal(str(entry.get("Credit", "0.00")))
            
            # Calculate balance based on normal side
            if normal_side == "Debit":
                running_balance = running_balance + debit - credit
            else:  # Credit
                running_balance = running_balance + credit - debit
            
            ledger_entries.append({
                "ledger_id": entry.get("LedgerID"),
                "date": entry.get("TransactionDate"),
                "post_ref": f"JE-{entry.get('JournalEntryID')}",
                "description": entry.get("Description") or "",
                "debit": str(debit),
                "credit": str(credit),
                "balance": str(running_balance),
                "post_timestamp": entry.get("PostTimestamp")
            })
        
        # Add initial balance as first entry only if:
        # 1. No date filters are applied, OR
        # 2. The account creation date falls within the date range
        should_show_opening = False
        account_created_date = str(account.get("DateCreated", ""))[:10]  # Get date portion only
        
        if not start_date and not end_date:
            # No filters, always show opening if there are entries or non-zero balance
            should_show_opening = (ledger_entries or initial_balance != Decimal("0.00"))
        else:
            # Check if opening date falls within the filtered range
            if start_date and account_created_date < start_date:
                should_show_opening = False
            elif end_date and account_created_date > end_date:
                should_show_opening = False
            else:
                should_show_opening = (ledger_entries or initial_balance != Decimal("0.00"))
        
        if should_show_opening:
            return [{
                "ledger_id": None,
                "date": account.get("DateCreated"),
                "post_ref": "Opening",
                "description": "Initial Balance",
                "debit": str(initial_balance) if normal_side == "Debit" and initial_balance > 0 else "0.00",
                "credit": str(abs(initial_balance)) if normal_side == "Credit" and initial_balance > 0 else "0.00",
                "balance": str(initial_balance),
                "post_timestamp": account.get("DateCreated")
            }] + ledger_entries
        
        return ledger_entries
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get account ledger error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching the account ledger"
        )