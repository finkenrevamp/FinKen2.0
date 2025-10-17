# Suspension System Implementation

## Overview
This document describes the implementation of the user suspension system, including blocking suspended users from logging in and providing the ability to unsuspend users.

## Changes Made

### 1. Backend Changes

#### Updated Profile Model (`backend/models/auth.py`)
Added suspension fields to the Profile model:
```python
is_suspended: bool = Field(False, alias="isSuspended")
suspension_end_date: Optional[datetime] = Field(None, alias="SuspensionEndDate")
```

#### Enhanced Authentication (`backend/routes/auth.py`)

**Sign-in Validation:**
- Added suspension check during login in `sign_in()` function
- Prevents suspended users from logging in
- Shows suspension end date in error message
- Automatically unsuspends users if suspension period has expired

**Token Validation:**
- Added suspension check in `get_current_user_from_token()` function
- Blocks API requests from suspended users even if they have a valid token
- Handles automatic unsuspension for expired suspensions

**Key Features:**
- Timezone-aware date comparisons
- Automatic unsuspension when period expires
- Clear error messages with suspension end dates
- Database updates to remove expired suspensions

#### New Unsuspend Endpoint (`backend/routes/profiles.py`)

**POST `/api/profiles/users/{user_id}/unsuspend`**
- Removes suspension status from user
- Clears suspension end date
- Admin only access
- Returns success confirmation

**Implementation:**
```python
@router.post("/users/{user_id}/unsuspend")
async def unsuspend_user(
    user_id: str,
    current_user: Profile = Depends(require_admin)
):
    """Unsuspend user account (admin only)"""
```

### 2. Frontend Changes

#### Profile Service (`frontend/src/services/profileService.ts`)

Added `unsuspendUser()` method:
```typescript
async unsuspendUser(userId: string): Promise<{ message: string; user_id: string }> {
    const response = await apiClient.post<{ message: string; user_id: string }>(
      `profiles/users/${userId}/unsuspend`
    );
    return response.data;
}
```

#### Users Page UI (`frontend/src/pages/Users.tsx`)

**Added Unsuspend Dialog State:**
```typescript
const [unsuspendDialog, setUnsuspendDialog] = useState<{
    open: boolean;
    user: UserData | null;
    loading: boolean;
}>({...});
```

**Added Unsuspend Handlers:**
- `handleUnsuspend()` - Opens confirmation dialog
- `handleUnsuspendSubmit()` - Calls API and refreshes user list

**Updated Action Buttons:**
- Suspend button now conditionally shows based on suspension status
- When user is suspended, shows Unsuspend button (PlayArrow icon) instead
- Unsuspend button has green/success color scheme
- Suspend button disabled for already suspended or deactivated users

**Added Unsuspend Dialog:**
- Confirmation dialog with user name
- Success-themed messaging
- Loading state during operation
- Success/error snackbar notifications

**Visual Changes:**
- Suspend button: Warning color (yellow/orange) with PauseCircle icon
- Unsuspend button: Success color (green) with PlayArrow icon
- Conditional rendering: Shows only one of the two buttons at a time

## User Experience Flow

### Suspension Flow
1. Admin clicks suspend button on active user
2. Dialog opens with date picker
3. Admin selects suspension end date
4. User is suspended and marked in database
5. User list refreshes showing suspended status
6. Suspended button is replaced with unsuspend button

### Login Block Flow
1. Suspended user attempts to login
2. System checks suspension status
3. If still suspended: Login denied with message "User account is suspended until [date]"
4. If suspension expired: User auto-unsuspended and allowed to login

### Unsuspension Flow (Admin)
1. Admin sees suspended user in list
2. Clicks unsuspend button (green play icon)
3. Confirmation dialog appears
4. Admin confirms unsuspension
5. User immediately unsuspended
6. User can now login
7. Button changes back to suspend button

### Automatic Unsuspension Flow
1. Suspended user tries to login after suspension period ends
2. System detects expired suspension
3. Automatically removes suspension from database
4. Allows user to proceed with login
5. User regains full access

## Security Features

1. **Authentication Block**: Suspended users cannot obtain new tokens
2. **Token Validation**: Existing tokens are invalidated for suspended users
3. **Admin Only**: Only administrators can suspend/unsuspend users
4. **Audit Trail**: All suspension actions are logged (via existing audit system)
5. **Self-Protection**: Admins cannot suspend themselves (existing check)

## Error Messages

### For Suspended Users (Login):
- With end date: `"User account is suspended until [Month Day, Year]. Please contact administrator."`
- Without end date: `"User account is suspended. Please contact administrator."`
- For deactivated: `"User account is deactivated. Please contact administrator."`

### For API Requests:
Same messages as login, returned as HTTP 403 Forbidden

## Database Schema

**profiles table fields used:**
- `isSuspended` (boolean) - Suspension status flag
- `SuspensionEndDate` (date, nullable) - When suspension ends

**Values:**
- Active user: `isSuspended = false`, `SuspensionEndDate = null`
- Suspended user: `isSuspended = true`, `SuspensionEndDate = '2025-10-20'`
- Unsuspended user: `isSuspended = false`, `SuspensionEndDate = null`

## API Endpoints Summary

### POST `/api/profiles/users/{user_id}/suspend`
- Suspends user until specified date
- Sets `isSuspended = true` and `SuspensionEndDate`

### POST `/api/profiles/users/{user_id}/unsuspend`
- Immediately unsuspends user
- Sets `isSuspended = false` and clears `SuspensionEndDate`

### POST `/api/auth/signin`
- Enhanced to check suspension status
- Auto-unsuspends expired suspensions
- Blocks active suspensions

## Testing Checklist

### Backend Testing
- [ ] Suspended user cannot login
- [ ] Suspended user with valid token cannot make API requests
- [ ] Expired suspension auto-unsuspends on login attempt
- [ ] Expired suspension auto-unsuspends on API request
- [ ] Unsuspend endpoint works correctly
- [ ] Error messages display suspension end date
- [ ] Timezone handling works correctly

### Frontend Testing
- [ ] Suspend button shows for active users
- [ ] Unsuspend button shows for suspended users
- [ ] Suspend dialog accepts future dates
- [ ] Unsuspend dialog shows confirmation
- [ ] User list refreshes after suspend/unsuspend
- [ ] Status chip updates to show suspended state
- [ ] Success/error messages display correctly
- [ ] Loading states work during operations

### Integration Testing
- [ ] Suspend user, verify they cannot login
- [ ] Unsuspend user, verify they can login
- [ ] Set suspension for tomorrow, verify blocks today
- [ ] Set suspension for yesterday, verify auto-unsuspends
- [ ] Multiple admins can suspend/unsuspend users
- [ ] Suspended users see appropriate error messages

## UI Icons

- **Suspend**: `<PauseCircle />` - Warning color (orange)
- **Unsuspend**: `<PlayArrow />` - Success color (green)
- **Edit**: `<Edit />` - Primary color (blue)
- **Email**: `<Email />` - Info color (light blue)
- **Deactivate**: `<Block />` - Error color (red)

## Best Practices Implemented

1. **Timezone Awareness**: All date comparisons use UTC timezone
2. **Auto-cleanup**: Expired suspensions are automatically removed
3. **Clear Messaging**: Users know exactly when suspension ends
4. **Atomic Operations**: Suspension state changes are transactional
5. **Graceful Degradation**: System works even if dates are not timezone-aware
6. **User Feedback**: Success/error messages for all actions
7. **Loading States**: Visual feedback during async operations
8. **Conditional UI**: Shows only relevant actions for each user state

## Future Enhancements (Potential)

1. Email notifications when users are suspended/unsuspended
2. Suspension history log
3. Bulk suspend/unsuspend operations
4. Scheduled suspensions (suspend at future date)
5. Suspension reason field
6. Recurring suspensions
7. Suspension statistics dashboard
8. Auto-unsuspend background job (instead of on-login check)
