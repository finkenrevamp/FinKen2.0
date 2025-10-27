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

from services.supabase import get_supabase_client, get_supabase_service, set_current_user
from routes.auth import get_current_user_from_token, require_admin
from models.auth import Profile
from services.emailUserFunction import send_journal_entry_notification_email

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

def get_file_download_url(supabase, bucket_name: str, file_path: str, expiry_seconds: int = 3600) -> str:
    """
    Generate a signed URL for downloading a file from Supabase storage
    
    Args:
        supabase: Supabase client
        bucket_name: Name of the storage bucket
        file_path: Path to the file in the bucket
        expiry_seconds: URL expiry time in seconds (default 1 hour)
    
    Returns:
        Signed URL for file access
    """
    try:
        # Remove bucket name from file_path if it's included
        if file_path.startswith(f"{bucket_name}/"):
            file_path = file_path[len(f"{bucket_name}/"):]
        
        # Try to create a signed URL for private buckets
        try:
            signed_url_result = supabase.storage.from_(bucket_name).create_signed_url(
                file_path,
                expiry_seconds
            )
            
            if isinstance(signed_url_result, dict) and 'signedURL' in signed_url_result:
                return signed_url_result['signedURL']
            elif isinstance(signed_url_result, str):
                return signed_url_result
            else:
                logger.warning(f"Unexpected signed URL result format: {signed_url_result}")
                
        except Exception as signed_error:
            logger.warning(f"Could not create signed URL, trying public URL: {signed_error}")
            # Fallback to public URL for public buckets
            try:
                public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
                return public_url
            except Exception as public_error:
                logger.error(f"Could not get public URL either: {public_error}")
        
        # Last resort: return the path as-is
        return f"{bucket_name}/{file_path}"
        
    except Exception as e:
        logger.error(f"Error generating file URL: {e}")
        return f"{bucket_name}/{file_path}"

@router.get("/health")
async def journal_entries_health():
    """Journal entries service health check"""
    return {"status": "healthy", "service": "journal_entries"}

@router.get("/test-query")
async def test_query(current_user: Profile = Depends(get_current_user_from_token)):
    """Test endpoint to verify query structure"""
    try:
        supabase = get_supabase_client()
        
        result = supabase.from_("journalentries").select(
            """
            *,
            creator:profiles!journalentries_CreatedByUserID_fkey(Username),
            journalentrylines(
                LineID,
                AccountID,
                Type,
                Amount,
                chartofaccounts(AccountNumber, AccountName)
            )
            """
        ).limit(1).execute()
        
        return {
            "count": len(result.data) if result.data else 0,
            "data": result.data[0] if result.data else None,
            "has_creator": result.data[0].get("creator") if result.data else None,
            "has_lines": len(result.data[0].get("journalentrylines", [])) if result.data else 0
        }
    except Exception as e:
        logger.error(f"Test query error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

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
        
        # Build query with joins - use exact same syntax as test script that works
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
        
        # Debug logging - log the raw result
        logger.info(f"=== JOURNAL ENTRIES QUERY DEBUG ===")
        logger.info(f"Query result count: {len(result.data) if result.data else 0}")
        if result.data and len(result.data) > 0:
            first_entry = result.data[0]
            logger.info(f"First entry keys: {list(first_entry.keys())}")
            logger.info(f"First entry JournalEntryID: {first_entry.get('JournalEntryID')}")
            logger.info(f"First entry creator type: {type(first_entry.get('creator'))}")
            logger.info(f"First entry creator value: {first_entry.get('creator')}")
            logger.info(f"First entry journalentrylines type: {type(first_entry.get('journalentrylines'))}")
            logger.info(f"First entry lines count: {len(first_entry.get('journalentrylines', []))}")
            if first_entry.get('journalentrylines'):
                logger.info(f"First line: {first_entry.get('journalentrylines')[0]}")
        else:
            logger.warning(f"No journal entries returned from query!")
        logger.info(f"=== END DEBUG ===")
        
        # Format response
        journal_entries = []
        for entry_data in result.data:
            # Extract creator username
            created_by_username = "Unknown"
            creator_data = entry_data.get("creator")
            
            if creator_data:
                if isinstance(creator_data, dict):
                    created_by_username = creator_data.get("Username", "Unknown")
                elif isinstance(creator_data, list) and len(creator_data) > 0:
                    created_by_username = creator_data[0].get("Username", "Unknown")
            
            # Extract approver username
            approved_by_username = None
            approver_data = entry_data.get("approver")
            if approver_data:
                if isinstance(approver_data, dict):
                    approved_by_username = approver_data.get("Username")
                elif isinstance(approver_data, list) and len(approver_data) > 0:
                    approved_by_username = approver_data[0].get("Username")
            
            # Format entry lines
            lines = []
            for line in entry_data.get("journalentrylines", []):
                account = line.get("chartofaccounts")
                
                # Handle both dict and list responses
                account_number = ""
                account_name = ""
                if account:
                    if isinstance(account, dict):
                        account_number = account.get("AccountNumber", "")
                        account_name = account.get("AccountName", "")
                    elif isinstance(account, list) and len(account) > 0:
                        account_number = account[0].get("AccountNumber", "")
                        account_name = account[0].get("AccountName", "")
                
                lines.append({
                    "line_id": line.get("LineID"),
                    "journal_entry_id": entry_data.get("JournalEntryID"),
                    "account_id": line.get("AccountID"),
                    "account_number": account_number,
                    "account_name": account_name,
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
        
        # Log the formatted response
        if journal_entries:
            logger.info(f"=== FORMATTED RESPONSE ===")
            logger.info(f"First formatted entry created_by: {journal_entries[0].get('created_by_username')}")
            logger.info(f"First formatted entry lines count: {len(journal_entries[0].get('lines', []))}")
            if journal_entries[0].get('lines'):
                logger.info(f"First formatted line: {journal_entries[0]['lines'][0]}")
            logger.info(f"=== END FORMATTED ===")
        
        return journal_entries
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get journal entries error: {e}")
        logger.exception("Full traceback:")
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
        
        # Debug logging
        logger.info(f"Entry data for ID {journal_entry_id}: creator={entry_data.get('creator')}, lines={len(entry_data.get('journalentrylines', []))}")
        
        # Extract creator and approver usernames
        created_by_username = "Unknown"
        creator_data = entry_data.get("creator")
        
        # Handle both dict and list responses from Supabase
        if creator_data:
            if isinstance(creator_data, dict):
                created_by_username = creator_data.get("Username", "Unknown")
            elif isinstance(creator_data, list) and len(creator_data) > 0:
                created_by_username = creator_data[0].get("Username", "Unknown")
        
        approved_by_username = None
        approver_data = entry_data.get("approver")
        if approver_data:
            if isinstance(approver_data, dict):
                approved_by_username = approver_data.get("Username")
            elif isinstance(approver_data, list) and len(approver_data) > 0:
                approved_by_username = approver_data[0].get("Username")
        
        # Format entry lines
        lines = []
        for line in entry_data.get("journalentrylines", []):
            account = line.get("chartofaccounts")
            
            # Handle both dict and list responses
            account_number = ""
            account_name = ""
            if account:
                if isinstance(account, dict):
                    account_number = account.get("AccountNumber", "")
                    account_name = account.get("AccountName", "")
                elif isinstance(account, list) and len(account) > 0:
                    account_number = account[0].get("AccountNumber", "")
                    account_name = account[0].get("AccountName", "")
            
            lines.append({
                "line_id": line.get("LineID"),
                "journal_entry_id": entry_data.get("JournalEntryID"),
                "account_id": line.get("AccountID"),
                "account_number": account_number,
                "account_name": account_name,
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
        bucket_name = "documents"
        
        for attachment_data in attachments_result.data:
            uploaded_by_username = "Unknown"
            uploader_data = attachment_data.get("uploader")
            
            if uploader_data:
                if isinstance(uploader_data, dict):
                    uploaded_by_username = uploader_data.get("Username", "Unknown")
                elif isinstance(uploader_data, list) and len(uploader_data) > 0:
                    uploaded_by_username = uploader_data[0].get("Username", "Unknown")
            
            # Get the stored file path
            stored_file_path = attachment_data.get("FilePath")
            
            # Generate a signed URL for secure access
            # This URL will be valid for 1 hour
            download_url = get_file_download_url(supabase, bucket_name, stored_file_path, 3600)
            
            attachments.append({
                "attachment_id": attachment_data.get("AttachmentID"),
                "journal_entry_id": attachment_data.get("JournalEntryID"),
                "file_name": attachment_data.get("FileName"),
                "file_path": download_url,  # Use signed URL for download
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
        upload_errors = []
        
        if files:
            bucket_name = "documents"  # Supabase storage bucket name
            
            for file in files:
                if file.filename:
                    try:
                        # Generate unique filename
                        file_ext = os.path.splitext(file.filename)[1]
                        unique_filename = f"{journal_entry_id}/{uuid.uuid4()}{file_ext}"
                        
                        # Read file content
                        file_content = await file.read()
                        
                        logger.info(f"Attempting to upload file: {file.filename} ({len(file_content)} bytes) to {bucket_name}/{unique_filename}")
                        
                        # Upload to Supabase storage
                        try:
                            upload_result = supabase.storage.from_(bucket_name).upload(
                                unique_filename,
                                file_content,
                                file_options={"content-type": file.content_type or "application/octet-stream"}
                            )
                            
                            logger.info(f"Upload result for {file.filename}: {upload_result}")
                            
                            # Check if upload was successful
                            # Supabase Python client returns the path on success or raises exception on error
                            if upload_result:
                                logger.info(f"✓ File uploaded successfully to {bucket_name}/{unique_filename}")
                                
                                # Store the file path (without bucket prefix) in the database
                                # We'll generate signed URLs dynamically when retrieving attachments
                                file_storage_path = unique_filename
                                
                                # Insert attachment record
                                attachment_insert = {
                                    "JournalEntryID": journal_entry_id,
                                    "FileName": file.filename,
                                    "FilePath": file_storage_path,  # Store just the path, not the full URL
                                    "FileType": file.content_type,
                                    "FileSize": len(file_content),
                                    "UploadedByUserID": str(current_user.id),
                                    "UploadTimestamp": datetime.utcnow().isoformat()
                                }
                                
                                attachment_result = supabase.from_("journalattachments").insert(attachment_insert).execute()
                                
                                if attachment_result.data:
                                    attachment_ids.append(attachment_result.data[0]['AttachmentID'])
                                    logger.info(f"Successfully saved attachment record for {file.filename}")
                                else:
                                    logger.error(f"Failed to insert attachment record for {file.filename}")
                                    upload_errors.append(f"Failed to save record for {file.filename}")
                            else:
                                logger.error(f"Upload returned empty result for {file.filename}")
                                upload_errors.append(f"Upload failed for {file.filename}")
                                
                        except Exception as storage_error:
                            logger.error(f"Storage upload error for {file.filename}: {storage_error}")
                            upload_errors.append(f"Upload error for {file.filename}: {str(storage_error)}")
                            
                    except Exception as file_error:
                        logger.error(f"File processing error for {file.filename}: {file_error}")
                        upload_errors.append(f"Processing error for {file.filename}: {str(file_error)}")
        
        # Log upload errors if any (but don't fail the entire request)
        if upload_errors:
            logger.warning(f"File upload errors occurred: {', '.join(upload_errors)}")
        
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
        
        # Send email notifications to all managers
        try:
            # Get the Manager role ID
            manager_role_result = supabase.from_("roles").select("RoleID").eq("RoleName", "Manager").single().execute()
            
            if manager_role_result.data:
                manager_role_id = manager_role_result.data["RoleID"]
                
                # Get all managers (profiles with Manager role)
                managers_result = supabase.from_("profiles").select(
                    "id, Username, FirstName, LastName"
                ).eq("RoleID", manager_role_id).eq("IsActive", True).execute()
                
                if managers_result.data:
                    submitter_name = f"{current_user.first_name} {current_user.last_name}"
                    
                    # Format the total amount for the email
                    total_amount_formatted = f"{total_debit:,.2f}"
                    
                    # Get service client to access auth.users
                    service_client = get_supabase_service().get_service_client()
                    
                    for manager in managers_result.data:
                        try:
                            # Get the manager's email from auth.users using service role client
                            manager_user = service_client.auth.admin.get_user_by_id(str(manager['id']))
                            
                            if manager_user and manager_user.user and manager_user.user.email:
                                manager_email = manager_user.user.email
                                manager_name = f"{manager['FirstName']} {manager['LastName']}"
                                
                                # Send notification email
                                email_result = send_journal_entry_notification_email(
                                    manager_email=manager_email,
                                    manager_name=manager_name,
                                    submitter_name=submitter_name,
                                    journal_entry_id=journal_entry_id,
                                    entry_date=entry_date,
                                    description=description or "No description provided",
                                    total_amount=total_amount_formatted
                                )
                                
                                if email_result.get('success'):
                                    logger.info(f"Successfully sent notification to manager {manager['Username']} ({manager_email})")
                                else:
                                    logger.warning(f"Failed to send notification to manager {manager['Username']}: {email_result.get('message')}")
                            else:
                                logger.warning(f"Could not retrieve email for manager {manager['Username']}")
                                
                        except Exception as manager_email_error:
                            logger.error(f"Error sending notification to manager {manager.get('Username', 'Unknown')}: {manager_email_error}")
                            # Continue with other managers even if one fails
                            continue
                else:
                    logger.info("No active managers found to notify")
            else:
                logger.warning("Manager role not found in database")
                
        except Exception as notification_error:
            logger.error(f"Error sending manager notifications: {notification_error}")
            # Don't fail the request if notifications fail
        
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

@router.post("/{journal_entry_id}/approve")
async def approve_journal_entry(
    journal_entry_id: int,
    current_user: Profile = Depends(get_current_user_from_token)
):
    """
    Approve a pending journal entry (Manager or Administrator only)
    """
    try:
        # Check if user has permission (Manager or Administrator)
        supabase = get_supabase_client()
        
        # Get user role
        role_result = supabase.from_("profiles").select("roles(RoleName)").eq("id", str(current_user.id)).single().execute()
        user_role = role_result.data.get("roles", {}).get("RoleName") if role_result.data else None
        
        if user_role not in ["Manager", "Administrator"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Managers and Administrators can approve journal entries"
            )
        
        # Fetch the journal entry
        entry_result = supabase.from_("journalentries").select("*").eq("JournalEntryID", journal_entry_id).single().execute()
        
        if not entry_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Journal entry with ID {journal_entry_id} not found"
            )
        
        entry_data = entry_result.data
        
        # Check if entry is already approved or rejected
        if entry_data.get("Status") == "Approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Journal entry is already approved"
            )
        
        if entry_data.get("Status") == "Rejected":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot approve a rejected journal entry"
            )
        
        # Update journal entry status
        update_data = {
            "Status": "Approved",
            "ApprovedByUserID": str(current_user.id),
            "ApprovalDate": datetime.utcnow().isoformat()
        }
        
        supabase.from_("journalentries").update(update_data).eq("JournalEntryID", journal_entry_id).execute()
        
        # Post to account ledger and update account balances
        lines_result = supabase.from_("journalentrylines").select("*").eq("JournalEntryID", journal_entry_id).execute()
        
        for line in lines_result.data:
            ledger_entry = {
                "AccountID": line.get("AccountID"),
                "JournalEntryID": journal_entry_id,
                "TransactionDate": entry_data.get("EntryDate"),
                "Description": entry_data.get("Description") or "Journal Entry",
                "Debit": str(line.get("Amount")) if line.get("Type") == "Debit" else "0.00",
                "Credit": str(line.get("Amount")) if line.get("Type") == "Credit" else "0.00",
                "PostTimestamp": datetime.utcnow().isoformat()
            }
            supabase.from_("accountledger").insert(ledger_entry).execute()
            
            # Update account balance
            account_id = line.get("AccountID")
            amount = Decimal(str(line.get("Amount")))
            line_type = line.get("Type")
            
            # Get the account's normal side to determine how to update balance
            account_result = supabase.from_("chartofaccounts").select("Balance, NormalSide").eq("AccountID", account_id).single().execute()
            
            if account_result.data:
                current_balance = Decimal(str(account_result.data.get("Balance", "0.00")))
                normal_side = account_result.data.get("NormalSide")
                
                # Calculate new balance based on normal side and transaction type
                # Debit accounts (Assets, Expenses): Debits increase, Credits decrease
                # Credit accounts (Liabilities, Equity, Revenue): Credits increase, Debits decrease
                if line_type == "Debit":
                    if normal_side == "Debit":
                        new_balance = current_balance + amount
                    else:  # normal_side == "Credit"
                        new_balance = current_balance - amount
                else:  # line_type == "Credit"
                    if normal_side == "Credit":
                        new_balance = current_balance + amount
                    else:  # normal_side == "Debit"
                        new_balance = current_balance - amount
                
                # Update the account balance
                supabase.from_("chartofaccounts").update({
                    "Balance": str(new_balance)
                }).eq("AccountID", account_id).execute()
                
                logger.info(f"Updated account {account_id} balance from {current_balance} to {new_balance} (Type: {line_type}, NormalSide: {normal_side})")
        
        # Log the approval event
        try:
            log_entry = {
                "UserID": str(current_user.id),
                "Timestamp": datetime.utcnow().isoformat(),
                "ActionType": "APPROVE",
                "TableName": "journalentries",
                "RecordID": str(journal_entry_id),
                "BeforeValue": json.dumps({"status": entry_data.get("Status")}),
                "AfterValue": json.dumps({"status": "Approved"})
            }
            supabase.from_("journal_event_logs").insert(log_entry).execute()
        except Exception as log_error:
            logger.warning(f"Failed to log approval: {log_error}")
        
        # Return updated entry
        return await get_journal_entry(journal_entry_id, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Approve journal entry error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while approving the journal entry: {str(e)}"
        )

@router.post("/{journal_entry_id}/reject")
async def reject_journal_entry(
    journal_entry_id: int,
    rejection_reason: str = Form(...),
    current_user: Profile = Depends(get_current_user_from_token)
):
    """
    Reject a pending journal entry (Manager or Administrator only)
    """
    try:
        # Check if user has permission (Manager or Administrator)
        supabase = get_supabase_client()
        
        # Get user role
        role_result = supabase.from_("profiles").select("roles(RoleName)").eq("id", str(current_user.id)).single().execute()
        user_role = role_result.data.get("roles", {}).get("RoleName") if role_result.data else None
        
        if user_role not in ["Manager", "Administrator"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Managers and Administrators can reject journal entries"
            )
        
        # Fetch the journal entry
        entry_result = supabase.from_("journalentries").select("*").eq("JournalEntryID", journal_entry_id).single().execute()
        
        if not entry_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Journal entry with ID {journal_entry_id} not found"
            )
        
        entry_data = entry_result.data
        
        # Check if entry is already approved or rejected
        if entry_data.get("Status") == "Approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reject an approved journal entry"
            )
        
        if entry_data.get("Status") == "Rejected":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Journal entry is already rejected"
            )
        
        # Validate rejection reason
        if not rejection_reason or len(rejection_reason.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rejection reason must be at least 5 characters long"
            )
        
        # Update journal entry status
        update_data = {
            "Status": "Rejected",
            "ApprovedByUserID": str(current_user.id),
            "ApprovalDate": datetime.utcnow().isoformat(),
            "RejectionReason": rejection_reason
        }
        
        supabase.from_("journalentries").update(update_data).eq("JournalEntryID", journal_entry_id).execute()
        
        # Log the rejection event
        try:
            log_entry = {
                "UserID": str(current_user.id),
                "Timestamp": datetime.utcnow().isoformat(),
                "ActionType": "REJECT",
                "TableName": "journalentries",
                "RecordID": str(journal_entry_id),
                "BeforeValue": json.dumps({"status": entry_data.get("Status")}),
                "AfterValue": json.dumps({"status": "Rejected", "reason": rejection_reason})
            }
            supabase.from_("journal_event_logs").insert(log_entry).execute()
        except Exception as log_error:
            logger.warning(f"Failed to log rejection: {log_error}")
        
        # Return updated entry
        return await get_journal_entry(journal_entry_id, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reject journal entry error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while rejecting the journal entry: {str(e)}"
        )

@router.delete("/{journal_entry_id}")
async def delete_journal_entry(
    journal_entry_id: int,
    current_user: Profile = Depends(get_current_user_from_token)
):
    """
    Delete a journal entry (Creator can delete their own pending entries, Administrators can delete any pending entry)
    Only pending entries can be deleted - approved entries cannot be deleted as they've been posted to the ledger
    """
    try:
        supabase = get_supabase_client()
        
        # Get user role
        role_result = supabase.from_("profiles").select("roles(RoleName)").eq("id", str(current_user.id)).single().execute()
        user_role = role_result.data.get("roles", {}).get("RoleName") if role_result.data else None
        
        # Fetch the journal entry
        entry_result = supabase.from_("journalentries").select("*").eq("JournalEntryID", journal_entry_id).single().execute()
        
        if not entry_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Journal entry with ID {journal_entry_id} not found"
            )
        
        entry_data = entry_result.data
        
        # Check permissions: Creator can delete their own entries, Administrator can delete any
        is_creator = str(entry_data.get("CreatedByUserID")) == str(current_user.id)
        is_admin = user_role == "Administrator"
        
        if not is_creator and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own journal entries"
            )
        
        # Only allow deletion of pending entries
        if entry_data.get("Status") != "Pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete a {entry_data.get('Status')} journal entry. Only pending entries can be deleted."
            )
        
        # Delete attachments from storage
        attachments_result = supabase.from_("journalattachments").select("FilePath").eq("JournalEntryID", journal_entry_id).execute()
        
        bucket_name = "documents"
        for attachment in attachments_result.data:
            file_path = attachment.get("FilePath")
            try:
                # Remove from storage
                supabase.storage.from_(bucket_name).remove([file_path])
                logger.info(f"Deleted file from storage: {file_path}")
            except Exception as storage_error:
                logger.warning(f"Failed to delete file from storage: {file_path}, error: {storage_error}")
        
        # Delete attachment records
        supabase.from_("journalattachments").delete().eq("JournalEntryID", journal_entry_id).execute()
        
        # Delete journal entry lines
        supabase.from_("journalentrylines").delete().eq("JournalEntryID", journal_entry_id).execute()
        
        # Delete the journal entry
        supabase.from_("journalentries").delete().eq("JournalEntryID", journal_entry_id).execute()
        
        # Log the deletion event
        try:
            log_entry = {
                "UserID": str(current_user.id),
                "Timestamp": datetime.utcnow().isoformat(),
                "ActionType": "DELETE",
                "TableName": "journalentries",
                "RecordID": str(journal_entry_id),
                "BeforeValue": json.dumps({
                    "journal_entry_id": journal_entry_id,
                    "status": entry_data.get("Status"),
                    "created_by": entry_data.get("CreatedByUserID")
                })
            }
            supabase.from_("journal_event_logs").insert(log_entry).execute()
        except Exception as log_error:
            logger.warning(f"Failed to log deletion: {log_error}")
        
        return {"message": f"Journal entry {journal_entry_id} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete journal entry error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting the journal entry: {str(e)}"
        )

@router.patch("/{journal_entry_id}")
async def update_journal_entry(
    journal_entry_id: int,
    entry_date: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    is_adjusting_entry: Optional[bool] = Form(None),
    lines: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    current_user: Profile = Depends(get_current_user_from_token)
):
    """
    Update a journal entry (Creator can edit their own pending entries, Administrators can edit any pending entry)
    Only pending entries can be edited - approved/rejected entries cannot be modified
    """
    try:
        supabase = get_supabase_client()
        
        # Get user role
        role_result = supabase.from_("profiles").select("roles(RoleName)").eq("id", str(current_user.id)).single().execute()
        user_role = role_result.data.get("roles", {}).get("RoleName") if role_result.data else None
        
        # Fetch the journal entry
        entry_result = supabase.from_("journalentries").select("*").eq("JournalEntryID", journal_entry_id).single().execute()
        
        if not entry_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Journal entry with ID {journal_entry_id} not found"
            )
        
        entry_data = entry_result.data
        
        # Check permissions: Creator can edit their own entries, Administrator can edit any
        is_creator = str(entry_data.get("CreatedByUserID")) == str(current_user.id)
        is_admin = user_role == "Administrator"
        
        if not is_creator and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit your own journal entries"
            )
        
        # Only allow editing of pending entries
        if entry_data.get("Status") != "Pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot edit a {entry_data.get('Status')} journal entry. Only pending entries can be edited."
            )
        
        # Prepare update data
        update_data = {}
        
        if entry_date is not None:
            update_data["EntryDate"] = entry_date
        
        if description is not None:
            update_data["Description"] = description
        
        if is_adjusting_entry is not None:
            update_data["IsAdjustingEntry"] = is_adjusting_entry
        
        # Update journal entry basic info if any updates provided
        if update_data:
            supabase.from_("journalentries").update(update_data).eq("JournalEntryID", journal_entry_id).execute()
        
        # Update lines if provided
        if lines:
            try:
                lines_data = json.loads(lines)
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid lines data format"
                )
            
            # Validate lines data
            if len(lines_data) < 2:
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
            
            # Delete existing lines
            supabase.from_("journalentrylines").delete().eq("JournalEntryID", journal_entry_id).execute()
            
            # Insert new lines
            lines_insert = []
            for line in lines_data:
                lines_insert.append({
                    "JournalEntryID": journal_entry_id,
                    "AccountID": line['account_id'],
                    "Type": line['type'],
                    "Amount": str(line['amount'])
                })
            
            supabase.from_("journalentrylines").insert(lines_insert).execute()
        
        # Handle file uploads if provided
        if files:
            bucket_name = "documents"
            
            for file in files:
                if file.filename:
                    try:
                        # Validate file type
                        file_ext = os.path.splitext(file.filename)[1].lower()
                        if file_ext not in ALLOWED_EXTENSIONS:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"File type {file_ext} is not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
                            )
                        
                        # Generate unique filename
                        unique_filename = f"{journal_entry_id}/{uuid.uuid4()}{file_ext}"
                        
                        # Read file content
                        file_content = await file.read()
                        
                        # Upload to Supabase storage
                        upload_result = supabase.storage.from_(bucket_name).upload(
                            unique_filename,
                            file_content,
                            file_options={"content-type": file.content_type or "application/octet-stream"}
                        )
                        
                        if upload_result:
                            # Insert attachment record
                            attachment_insert = {
                                "JournalEntryID": journal_entry_id,
                                "FileName": file.filename,
                                "FilePath": unique_filename,
                                "FileType": file.content_type,
                                "FileSize": len(file_content),
                                "UploadedByUserID": str(current_user.id),
                                "UploadTimestamp": datetime.utcnow().isoformat()
                            }
                            
                            supabase.from_("journalattachments").insert(attachment_insert).execute()
                            logger.info(f"Successfully added attachment {file.filename} to journal entry {journal_entry_id}")
                        
                    except Exception as file_error:
                        logger.error(f"File upload error for {file.filename}: {file_error}")
                        # Continue with other files even if one fails
        
        # Log the update event
        try:
            log_entry = {
                "UserID": str(current_user.id),
                "Timestamp": datetime.utcnow().isoformat(),
                "ActionType": "UPDATE",
                "TableName": "journalentries",
                "RecordID": str(journal_entry_id),
                "BeforeValue": json.dumps(entry_data, default=str),
                "AfterValue": json.dumps(update_data, default=str)
            }
            supabase.from_("journal_event_logs").insert(log_entry).execute()
        except Exception as log_error:
            logger.warning(f"Failed to log update: {log_error}")
        
        # Return updated entry
        return await get_journal_entry(journal_entry_id, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update journal entry error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating the journal entry: {str(e)}"
        )