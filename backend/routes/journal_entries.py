"""
Journal Entries routes for FinKen 2.0
Handles journal entry management operations
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query, UploadFile, File, Form
from typing import List, Optional
import logging
from datetime import datetime
from decimal import Decimal
import json
import uuid
import os

from services.supabase import get_supabase_client, set_current_user
from routes.auth import get_current_user_from_token, require_admin
from models.auth import Profile

router = APIRouter()
logger = logging.getLogger(__name__)

# Allowed file types for attachments
ALLOWED_FILE_TYPES = {
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/jpeg',
    'image/png'
}

# File extensions
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.jpg', '.jpeg', '.png'}

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

@router.post("")
async def create_journal_entry(
    entry_date: str = Form(...),
    description: Optional[str] = Form(None),
    is_adjusting_entry: bool = Form(False),
    lines: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    current_user: Profile = Depends(get_current_user_from_token)
):
    """
    Create a new journal entry with optional file attachments
    Files are uploaded to Supabase storage bucket
    """
    try:
        supabase = get_supabase_client()
        
        # Parse lines JSON
        try:
            lines_data = json.loads(lines)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid lines data format"
            )
        
        # Validate lines data
        if not lines_data or len(lines_data) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one debit and one credit line are required"
            )
        
        # Calculate totals and validate balance
        total_debit = Decimal('0.00')
        total_credit = Decimal('0.00')
        
        for line in lines_data:
            if not all(k in line for k in ['account_id', 'type', 'amount']):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Each line must have account_id, type, and amount"
                )
            
            amount = Decimal(str(line['amount']))
            if amount <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Line amounts must be greater than zero"
                )
            
            if line['type'] == 'Debit':
                total_debit += amount
            elif line['type'] == 'Credit':
                total_credit += amount
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Line type must be 'Debit' or 'Credit'"
                )
        
        # Check if debits equal credits
        if total_debit != total_credit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Debits (${total_debit}) must equal credits (${total_credit})"
            )
        
        # Validate file types if files provided
        for file in files:
            if file.filename:
                file_ext = os.path.splitext(file.filename)[1].lower()
                if file_ext not in ALLOWED_EXTENSIONS:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"File type {file_ext} is not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
                    )
        
        # Create journal entry
        entry_insert = {
            "EntryDate": entry_date,
            "Description": description,
            "Status": "Pending",
            "IsAdjustingEntry": is_adjusting_entry,
            "CreatedByUserID": str(current_user.id),
            "CreationDate": datetime.utcnow().isoformat()
        }
        
        entry_result = supabase.from_("journalentries").insert(entry_insert).execute()
        
        if not entry_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create journal entry"
            )
        
        journal_entry_id = entry_result.data[0]['JournalEntryID']
        
        # Insert journal entry lines
        lines_insert = []
        for line in lines_data:
            lines_insert.append({
                "JournalEntryID": journal_entry_id,
                "AccountID": line['account_id'],
                "Type": line['type'],
                "Amount": str(line['amount'])
            })
        
        supabase.from_("journalentrylines").insert(lines_insert).execute()
        
        # Upload files to Supabase storage if provided
        attachment_ids = []
        if files:
            bucket_name = "documents"  # You may need to create this bucket in Supabase
            
            for file in files:
                if file.filename:
                    # Generate unique filename
                    file_ext = os.path.splitext(file.filename)[1]
                    unique_filename = f"{journal_entry_id}/{uuid.uuid4()}{file_ext}"
                    
                    # Read file content
                    file_content = await file.read()
                    
                    # Upload to Supabase storage
                    try:
                        upload_result = supabase.storage.from_(bucket_name).upload(
                            unique_filename,
                            file_content,
                            file_options={"content-type": file.content_type or "application/octet-stream"}
                        )
                        
                        # Get public URL
                        file_path = f"{bucket_name}/{unique_filename}"
                        
                        # Insert attachment record
                        attachment_insert = {
                            "JournalEntryID": journal_entry_id,
                            "FileName": file.filename,
                            "FilePath": file_path,
                            "FileType": file.content_type,
                            "FileSize": len(file_content),
                            "UploadedByUserID": str(current_user.id),
                            "UploadTimestamp": datetime.utcnow().isoformat()
                        }
                        
                        attachment_result = supabase.from_("journalattachments").insert(attachment_insert).execute()
                        if attachment_result.data:
                            attachment_ids.append(attachment_result.data[0]['AttachmentID'])
                        
                    except Exception as storage_error:
                        logger.warning(f"Failed to upload file {file.filename}: {storage_error}")
                        # Continue even if file upload fails
        
        # Log the creation event
        try:
            log_entry = {
                "UserID": str(current_user.id),
                "Timestamp": datetime.utcnow().isoformat(),
                "ActionType": "CREATE",
                "TableName": "journalentries",
                "RecordID": str(journal_entry_id),
                "AfterValue": json.dumps({
                    "journal_entry_id": journal_entry_id,
                    "entry_date": entry_date,
                    "description": description,
                    "is_adjusting_entry": is_adjusting_entry,
                    "lines_count": len(lines_data),
                    "attachments_count": len(attachment_ids)
                })
            }
            supabase.from_("journal_event_logs").insert(log_entry).execute()
        except Exception as log_error:
            logger.warning(f"Failed to log journal entry creation: {log_error}")
        
        # Fetch and return the created entry
        return await get_journal_entry(journal_entry_id, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create journal entry error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the journal entry: {str(e)}"
        )