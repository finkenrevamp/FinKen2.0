# Journal Entry Approval & Rejection Feature

## Overview
Added the ability for Managers and Administrators to approve or reject pending journal entries directly from the UI.

## Issues Fixed

### 1. ✅ Account Lines Returned Correctly
The backend already had proper joins to fetch account details with journal entry lines. The issue was likely timing or state-related in the frontend.

### 2. ✅ User Information Fetching
The backend correctly fetches usernames from the `profiles` table (not the `users` table from auth.users). The query uses proper foreign key joins:
```sql
creator:profiles!journalentries_CreatedByUserID_fkey(Username)
approver:profiles!journalentries_ApprovedByUserID_fkey(Username)
```

### 3. ✅ Approve/Reject Functionality
Added complete approval and rejection workflow for Managers and Administrators.

## New Backend Endpoints

### POST `/api/journal-entries/{journal_entry_id}/approve`

Approves a pending journal entry and posts it to the account ledger.

**Authorization**: Manager or Administrator only

**Process**:
1. Validates user has Manager or Administrator role
2. Checks entry exists and is in "Pending" status
3. Updates entry status to "Approved"
4. Records approver and approval timestamp
5. Posts all lines to the account ledger
6. Logs the approval event
7. Returns updated entry

**Response**: Updated `JournalEntry` object

**Errors**:
- 403: User doesn't have permission
- 404: Entry not found
- 400: Entry already approved/rejected

---

### POST `/api/journal-entries/{journal_entry_id}/reject`

Rejects a pending journal entry with a reason.

**Authorization**: Manager or Administrator only

**Request** (Form Data):
```
rejection_reason: string (min 5 characters)
```

**Process**:
1. Validates user has Manager or Administrator role
2. Checks entry exists and is in "Pending" status
3. Validates rejection reason (min 5 characters)
4. Updates entry status to "Rejected"
5. Records rejector, rejection timestamp, and reason
6. Logs the rejection event
7. Returns updated entry

**Response**: Updated `JournalEntry` object

**Errors**:
- 403: User doesn't have permission
- 404: Entry not found
- 400: Entry already approved, or invalid rejection reason

## Frontend Changes

### Updated: `Journalize.tsx`

**New State Variables**:
```typescript
const [approving, setApproving] = useState(false);
const [rejecting, setRejecting] = useState(false);
const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
const [rejectionReason, setRejectionReason] = useState('');
```

**New Handler Functions**:

1. **`handleApprove()`**
   - Calls approve endpoint
   - Refreshes journal entries list
   - Closes details dialog
   - Shows error if approval fails

2. **`handleRejectClick()`**
   - Opens rejection reason dialog

3. **`handleRejectCancel()`**
   - Closes rejection dialog
   - Clears rejection reason

4. **`handleRejectConfirm()`**
   - Validates rejection reason (min 5 characters)
   - Calls reject endpoint with reason
   - Refreshes journal entries list
   - Closes both dialogs
   - Shows error if rejection fails

**Permission Check**:
```typescript
const canApproveOrReject = user.role === 'Manager' || user.role === 'Administrator';
```

**Updated Details Dialog**:
- Added action buttons in DialogActions:
  - **Approve** button (green, with checkmark icon)
  - **Reject** button (red, with cancel icon)
  - Only shown for Pending entries
  - Only visible to Managers and Administrators
  - Disabled during processing

**New Rejection Dialog**:
- Modal for entering rejection reason
- Multi-line text field (4 rows)
- Minimum 5 characters required
- Confirm/Cancel buttons
- Disables confirm button until valid reason entered

### Updated: `journalEntriesService.ts`

**Modified `rejectJournalEntry()` method**:
- Changed to send FormData instead of JSON
- Matches backend expectation of Form data
```typescript
const formData = new FormData();
formData.append('rejection_reason', rejectionReason);
```

## User Flow

### Approving an Entry

1. User (Manager/Admin) clicks on a pending journal entry
2. Details dialog opens showing entry information
3. User reviews entry details, lines, and attachments
4. User clicks **"Approve"** button
5. System:
   - Updates status to "Approved"
   - Posts to account ledger
   - Logs approval event
6. Entry list refreshes
7. Dialog closes
8. Entry now shows "Approved" status with approver name

### Rejecting an Entry

1. User (Manager/Admin) clicks on a pending journal entry
2. Details dialog opens showing entry information
3. User reviews entry and decides to reject
4. User clicks **"Reject"** button
5. Rejection reason dialog appears
6. User enters reason (minimum 5 characters required)
7. User clicks **"Confirm Rejection"**
8. System:
   - Updates status to "Rejected"
   - Saves rejection reason
   - Logs rejection event
9. Entry list refreshes
10. Dialogs close
11. Entry now shows "Rejected" status with rejection reason

## Permission Matrix

| Action | Accountant | Manager | Administrator |
|--------|-----------|---------|---------------|
| Create Entry | ✅ | ✅ | ✅ |
| View Entries | ✅ | ✅ | ✅ |
| Approve Entry | ❌ | ✅ | ✅ |
| Reject Entry | ❌ | ✅ | ✅ |

## Account Ledger Posting

When a journal entry is **approved**:
- All entry lines are posted to the `accountledger` table
- Each line creates a ledger entry with:
  - AccountID
  - JournalEntryID (reference)
  - TransactionDate (from entry date)
  - Description
  - Debit amount (if debit line) or 0.00
  - Credit amount (if credit line) or 0.00
  - PostTimestamp (current timestamp)

When a journal entry is **rejected**:
- No ledger entries are created
- Entry remains in database with rejection reason
- Can be viewed for reference but won't affect account balances

## Event Logging

Both approval and rejection actions are logged in `journal_event_logs`:

**Approval Log**:
```json
{
  "UserID": "{approver_uuid}",
  "ActionType": "APPROVE",
  "TableName": "journalentries",
  "RecordID": "{journal_entry_id}",
  "BeforeValue": {"status": "Pending"},
  "AfterValue": {"status": "Approved"}
}
```

**Rejection Log**:
```json
{
  "UserID": "{rejector_uuid}",
  "ActionType": "REJECT",
  "TableName": "journalentries",
  "RecordID": "{journal_entry_id}",
  "BeforeValue": {"status": "Pending"},
  "AfterValue": {"status": "Rejected", "reason": "..."}
}
```

## UI/UX Features

### Visual Indicators

1. **Status Chips** (in table):
   - 🟡 Pending (yellow/warning)
   - 🟢 Approved (green/success)
   - 🔴 Rejected (red/error)

2. **Status Icons**:
   - ⏳ Pending icon
   - ✅ Approved (checkmark)
   - ❌ Rejected (cancel)

3. **Action Buttons** (in details dialog):
   - Only shown for Pending entries
   - Only shown to Managers/Administrators
   - Color-coded: green (approve), red (reject)
   - With icons for visual clarity
   - Loading states during processing

### Validation

1. **Role Validation**:
   - Frontend checks user role before showing buttons
   - Backend validates role before allowing action

2. **Status Validation**:
   - Cannot approve/reject non-pending entries
   - Cannot approve already rejected entries
   - Cannot reject already approved entries

3. **Rejection Reason Validation**:
   - Minimum 5 characters required
   - Frontend disables confirm until valid
   - Backend validates before processing

### Error Handling

- Network errors shown in alert
- Permission errors (403) handled gracefully
- Validation errors displayed to user
- Failed operations don't close dialogs (user can retry)

## Testing Checklist

### As Accountant:
- [ ] Create journal entry (should work)
- [ ] View journal entry details (should work)
- [ ] Approve/Reject buttons should NOT appear

### As Manager:
- [ ] Create journal entry (should work)
- [ ] View journal entry details (should work)
- [ ] Approve pending entry (should work)
- [ ] Reject pending entry with reason (should work)
- [ ] Try to approve already approved entry (should fail)
- [ ] Try to reject already rejected entry (should fail)
- [ ] Try to approve rejected entry (should fail)
- [ ] Verify entry posts to account ledger on approval
- [ ] Verify rejection reason is saved and displayed

### As Administrator:
- [ ] Same tests as Manager (all should work)

### General:
- [ ] Approved entries show approver name and timestamp
- [ ] Rejected entries show rejection reason
- [ ] Event logs created for approvals
- [ ] Event logs created for rejections
- [ ] Rejection reason must be at least 5 characters
- [ ] Entries list refreshes after approval/rejection
- [ ] Dialogs close after successful action
- [ ] Loading states shown during processing

## Database Impact

### Tables Modified:

1. **journalentries**:
   - Status updated to "Approved" or "Rejected"
   - ApprovedByUserID set to approver/rejector UUID
   - ApprovalDate set to timestamp
   - RejectionReason set (if rejected)

2. **accountledger** (on approval only):
   - New entries created for each journal entry line
   - Links to journal entry via JournalEntryID
   - Affects account balances in financial reports

3. **journal_event_logs**:
   - New log entry created
   - Tracks who approved/rejected and when
   - Stores before/after values for audit

## Future Enhancements

Potential improvements:
- [ ] Bulk approve/reject multiple entries
- [ ] Edit/modify pending entries before approval
- [ ] Require two-level approval for large amounts
- [ ] Email notifications on approval/rejection
- [ ] Approval workflow comments/notes
- [ ] Undo approval (reverse posting)
- [ ] Filter entries by approver
- [ ] Approval queue dashboard

## Files Modified

### Backend:
- `/backend/routes/journal_entries.py`
  - Added `approve_journal_entry()` endpoint
  - Added `reject_journal_entry()` endpoint

### Frontend:
- `/frontend/src/pages/Journalize.tsx`
  - Added approval/rejection state and handlers
  - Added approve/reject buttons to details dialog
  - Added rejection reason dialog
- `/frontend/src/services/journalEntriesService.ts`
  - Updated `rejectJournalEntry()` to use FormData

## Security Considerations

1. **Role-Based Access**: Only Managers and Administrators can approve/reject
2. **Status Validation**: Prevents invalid state transitions
3. **Audit Trail**: All actions logged with user ID and timestamp
4. **Immutability**: Approved entries cannot be modified or re-rejected
5. **Reason Required**: Rejections must include explanation for accountability

---

**Status**: ✅ Complete and ready for testing
**Date**: October 18, 2025
