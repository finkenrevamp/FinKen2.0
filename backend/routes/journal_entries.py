"""
Journal Entries routes for FinKen 2.0
Handles journal entry management operations
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
import logging
from datetime import datetime
from decimal import Decimal

from services.supabase import get_supabase_client, set_current_user
from routes.auth import get_current_user_from_token, require_admin
from models.auth import Profile

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/health")
async def journal_entries_health():
    """Journal entries service health check"""
    return {"status": "healthy", "service": "journal_entries"}

@router.get("")
async def get_all_journal_entries(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    start_date: Optional[str] = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter by end date (YYYY-MM-DD)"),
    created_by: Optional[str] = Query(None, description="Filter by creator user ID"),
    current_user: Profile = Depends(get_current_user_from_token)
):
    """
    Get all journal entries with optional filtering
    Returns journal entries with creator username and entry lines
    """
    try:
        supabase = get_supabase_client()
        
        # Build query with joins to get creator username and entry lines
        query = supabase.from_("journalentries").select(
            """
            *,
            creator:profiles!journalentries_CreatedByUserID_fkey(Username),
            approver:profiles!journalentries_ApprovedByUserID_fkey(Username),
            journalentrylines(
                LineID,
                AccountID,
                Type,
                Amount,
                chartofaccounts(AccountNumber, AccountName)
            )
            """
        )
        
        # Apply filters if provided
        if status_filter:
            query = query.eq("Status", status_filter)
        
        if start_date:
            query = query.gte("EntryDate", start_date)
        
        if end_date:
            query = query.lte("EntryDate", end_date)
        
        if created_by:
            query = query.eq("CreatedByUserID", created_by)
        
        # Order by entry date (most recent first)
        query = query.order("EntryDate", desc=True)
        query = query.order("CreationDate", desc=True)
        
        result = query.execute()
        
        # Format response
        journal_entries = []
        for entry_data in result.data:
            # Extract creator and approver usernames
            created_by_username = "Unknown"
            if entry_data.get("creator") and isinstance(entry_data["creator"], dict):
                created_by_username = entry_data["creator"].get("Username", "Unknown")
            
            approved_by_username = None
            if entry_data.get("approver") and isinstance(entry_data["approver"], dict):
                approved_by_username = entry_data["approver"].get("Username")
            
            # Format entry lines
            lines = []
            for line in entry_data.get("journalentrylines", []):
                account = line.get("chartofaccounts", {})
                lines.append({
                    "line_id": line.get("LineID"),
                    "journal_entry_id": entry_data.get("JournalEntryID"),
                    "account_id": line.get("AccountID"),
                    "account_number": account.get("AccountNumber", ""),
                    "account_name": account.get("AccountName", ""),
                    "type": line.get("Type"),
                    "amount": str(line.get("Amount", "0.00"))
                })
            
            journal_entries.append({
                "journal_entry_id": entry_data.get("JournalEntryID"),
                "entry_date": entry_data.get("EntryDate"),
                "description": entry_data.get("Description"),
                "status": entry_data.get("Status"),
                "is_adjusting_entry": entry_data.get("IsAdjustingEntry", False),
                "created_by_user_id": created_by_username,  # Return username instead of UUID
                "created_by_username": created_by_username,
                "creation_date": entry_data.get("CreationDate"),
                "approved_by_user_id": approved_by_username,  # Return username instead of UUID
                "approved_by_username": approved_by_username,
                "approval_date": entry_data.get("ApprovalDate"),
                "rejection_reason": entry_data.get("RejectionReason"),
                "lines": lines,
                "attachments": []  # TODO: Implement attachments fetch
            })
        
        return journal_entries
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get journal entries error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching journal entries"
        )

@router.get("/{journal_entry_id}")
async def get_journal_entry(
    journal_entry_id: int,
    current_user: Profile = Depends(get_current_user_from_token)
):
    """
    Get a specific journal entry by ID with full details including attachments
    """
    try:
        supabase = get_supabase_client()
        
        # Fetch journal entry with creator, approver, and lines
        result = supabase.from_("journalentries").select(
            """
            *,
            creator:profiles!journalentries_CreatedByUserID_fkey(Username),
            approver:profiles!journalentries_ApprovedByUserID_fkey(Username),
            journalentrylines(
                LineID,
                AccountID,
                Type,
                Amount,
                chartofaccounts(AccountNumber, AccountName)
            )
            """
        ).eq("JournalEntryID", journal_entry_id).single().execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Journal entry with ID {journal_entry_id} not found"
            )
        
        entry_data = result.data
        
        # Extract creator and approver usernames
        created_by_username = "Unknown"
        if entry_data.get("creator") and isinstance(entry_data["creator"], dict):
            created_by_username = entry_data["creator"].get("Username", "Unknown")
        
        approved_by_username = None
        if entry_data.get("approver") and isinstance(entry_data["approver"], dict):
            approved_by_username = entry_data["approver"].get("Username")
        
        # Format entry lines
        lines = []
        for line in entry_data.get("journalentrylines", []):
            account = line.get("chartofaccounts", {})
            lines.append({
                "line_id": line.get("LineID"),
                "journal_entry_id": entry_data.get("JournalEntryID"),
                "account_id": line.get("AccountID"),
                "account_number": account.get("AccountNumber", ""),
                "account_name": account.get("AccountName", ""),
                "type": line.get("Type"),
                "amount": str(line.get("Amount", "0.00"))
            })
        
        # Fetch attachments
        attachments_result = supabase.from_("journalattachments").select(
            """
            *,
            uploader:profiles!journalattachments_UploadedByUserID_fkey(Username)
            """
        ).eq("JournalEntryID", journal_entry_id).execute()
        
        attachments = []
        for attachment_data in attachments_result.data:
            uploaded_by_username = "Unknown"
            if attachment_data.get("uploader") and isinstance(attachment_data["uploader"], dict):
                uploaded_by_username = attachment_data["uploader"].get("Username", "Unknown")
            
            attachments.append({
                "attachment_id": attachment_data.get("AttachmentID"),
                "journal_entry_id": attachment_data.get("JournalEntryID"),
                "file_name": attachment_data.get("FileName"),
                "file_path": attachment_data.get("FilePath"),
                "file_type": attachment_data.get("FileType"),
                "file_size": attachment_data.get("FileSize"),
                "uploaded_by_user_id": uploaded_by_username,  # Return username instead of UUID
                "uploaded_by_username": uploaded_by_username,
                "upload_timestamp": attachment_data.get("UploadTimestamp")
            })
        
        return {
            "journal_entry_id": entry_data.get("JournalEntryID"),
            "entry_date": entry_data.get("EntryDate"),
            "description": entry_data.get("Description"),
            "status": entry_data.get("Status"),
            "is_adjusting_entry": entry_data.get("IsAdjustingEntry", False),
            "created_by_user_id": created_by_username,  # Return username instead of UUID
            "created_by_username": created_by_username,
            "creation_date": entry_data.get("CreationDate"),
            "approved_by_user_id": approved_by_username,  # Return username instead of UUID
            "approved_by_username": approved_by_username,
            "approval_date": entry_data.get("ApprovalDate"),
            "rejection_reason": entry_data.get("RejectionReason"),
            "lines": lines,
            "attachments": attachments
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get journal entry error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching the journal entry"
        )