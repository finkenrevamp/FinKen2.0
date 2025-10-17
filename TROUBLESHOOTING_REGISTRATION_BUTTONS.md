# Troubleshooting: Registration Request Action Buttons

## Issue
Action buttons (Approve/Reject) not appearing or not working on the Manage Registration Requests page.

## Root Cause
The backend was storing rejected requests with status format: `"Rejected: {reason}"` instead of just `"Rejected"`.

The frontend was doing a simple `.toLowerCase()` conversion which resulted in statuses like:
- `"rejected: reason text here"` instead of `"rejected"`

This caused the status check `requestData.status === 'pending'` to fail because the status wasn't matching the expected enum values.

## Fix Applied

### File: `frontend/src/services/authService.ts`

Changed status parsing from:
```typescript
status: req.Status.toLowerCase() as 'pending' | 'approved' | 'rejected',
```

To:
```typescript
// Parse status - backend may return "Rejected: reason" format
let status: 'pending' | 'approved' | 'rejected' = 'pending';
const statusLower = req.Status.toLowerCase();
if (statusLower === 'approved') {
  status = 'approved';
} else if (statusLower.startsWith('rejected')) {
  status = 'rejected';
} else if (statusLower === 'pending') {
  status = 'pending';
}
```

## Verification Steps

1. **Open Browser Console** (F12 → Console tab)

2. **Navigate to Manage Registration Requests page**

3. **Check Console Output** - You should see:
   ```
   Registration requests data: [...]
   Pending requests: [...]
   Action cell render - RequestID: REQ001 Status: pending
   ```

4. **Verify Button Appearance**:
   - Pending requests should show Approve (✓) and Reject (✗) buttons
   - Approved requests should show no buttons
   - Rejected requests should show no buttons

5. **Test Button Functionality**:
   - Click Approve button → Dialog should open
   - Select role → Click Approve → Should show success message
   - Click Reject button → Dialog should open
   - Enter reason → Click Reject → Should show success message

## Database Check

To verify registration requests exist, run in Supabase SQL Editor:

```sql
SELECT RequestID, FirstName, LastName, Email, Status 
FROM registrationrequests 
ORDER BY RequestDate DESC;
```

Expected statuses:
- `Pending` - Should show action buttons
- `Approved` - No action buttons
- `Rejected: {reason}` - No action buttons (parsed as 'rejected')

## If Buttons Still Don't Appear

### Check 1: No Pending Requests
If all requests are Approved or Rejected, buttons won't show. Create a new registration request:
1. Sign out
2. Go to `/sign-up`
3. Fill out form and submit
4. Sign in as admin
5. Check Manage Registration Requests page

### Check 2: Token Issues
If you see 401/403 errors:
1. Sign out and sign back in
2. Check browser console for authentication errors
3. Verify you're signed in as Administrator (not Manager or Accountant)

### Check 3: DataGrid Row ID
If rows aren't rendering properly:
- Check console for DataGrid warnings about missing `id` field
- Verify each row has `id: req.RequestID.toString()`

### Check 4: Backend Status Format
Check what the backend is actually returning:
```sql
-- Check current status values
SELECT DISTINCT Status FROM registrationrequests;
```

Expected values:
- `Pending`
- `Approved`
- `Rejected: {various reasons}`

## Testing the Fix

### Test 1: Create New Request
```bash
# Terminal
curl -X POST http://localhost:8000/api/auth/registration-request \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
    "dob": "1990-01-01",
    "address": "123 Test St"
  }'
```

### Test 2: Verify Pending Status
1. Refresh Manage Registration Requests page
2. Verify "Test User" appears with status "Pending"
3. Verify Approve (✓) and Reject (✗) buttons appear

### Test 3: Test Approve Flow
1. Click Approve button
2. Select role: "Accountant"
3. Click "Approve" in dialog
4. Verify success message appears
5. Verify status changes to "Approved"
6. Verify buttons disappear

### Test 4: Test Reject Flow (with new request)
1. Create another test request
2. Click Reject button
3. Enter reason: "Test rejection"
4. Click "Reject" in dialog
5. Verify success message appears
6. Verify status changes to "Rejected"
7. Verify buttons disappear

## Debug Console Commands

Open browser console on Manage Registration Requests page and run:

```javascript
// Check if requests are loaded
console.table(window.requests); // Won't work, requests is internal state

// Check DataGrid props
document.querySelector('.MuiDataGrid-root');

// Check for errors
console.log(window.performance.getEntries().filter(e => e.name.includes('auth')));
```

## Additional Debugging

Added console.log statements in the code:

1. **Request Data**: Logs all requests and pending requests when loaded
2. **Action Cell Render**: Logs each time an action cell is rendered with RequestID and Status

Check these logs to diagnose:
- Are requests being loaded?
- What status values are being received?
- Is the action cell being rendered?
- Is the status matching 'pending'?

## Related Files
- `frontend/src/services/authService.ts` - Status parsing fix
- `frontend/src/pages/ManageRegistrationRequests.tsx` - Button rendering
- `backend/routes/auth.py` - Status storage format

## Future Improvements

1. **Backend Consistency**: Store rejection reason separately
   ```sql
   ALTER TABLE registrationrequests 
   ADD COLUMN RejectionReason TEXT;
   ```
   Then keep Status as simple enum: 'Pending', 'Approved', 'Rejected'

2. **Frontend Status Display**: Show rejection reason in tooltip or detail view

3. **Status History**: Track status changes over time in separate table
