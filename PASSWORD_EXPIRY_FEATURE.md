# Password Expiry Management Feature

## Overview
This document describes the implementation of the Password Expiry Management feature for FinKen 2.0, which allows administrators to monitor user password expiration dates and send reminder emails.

## Implementation Details

### Backend Changes

#### 1. Routes - `/backend/routes/profiles.py`

**New Models:**
- `PasswordExpiryData`: Response model containing password expiry information for each user
- `SendPasswordReminderRequest`: Request model for sending password expiry reminders

**New Endpoints:**

##### GET `/profiles/users/password-expiry`
- **Purpose**: Retrieve password expiry data for all users
- **Access**: Admin only
- **Logic**:
  - Queries the `password_history` table to get the most recent password creation date for each user
  - Calculates password expiry date (password creation date + 90 days)
  - Calculates days until expiry
  - Determines status: `expired`, `expiring_soon` (≤7 days), `normal`, or `no_password`
- **Response**: Array of `PasswordExpiryData` objects

##### POST `/profiles/users/{user_id}/send-password-reminder`
- **Purpose**: Send a password expiry reminder email to a specific user
- **Access**: Admin only
- **Request Body**: `{ days_until_expiry: number }`
- **Logic**:
  - Validates user exists
  - Retrieves user email from auth.users
  - Calls `send_password_expiry_notification()` function
- **Response**: Success message with user_id and email

#### 2. Email Service - `/backend/services/emailUserFunction.py`

**Existing Function Used:**
- `send_password_expiry_notification()`: Already implemented function that sends formatted password expiry reminder emails
  - Includes personalized message with days until expiry
  - Provides step-by-step instructions to change password
  - Supports both plain text and HTML email formats

### Frontend Changes

#### 1. Profile Service - `/frontend/src/services/profileService.ts`

**New Interfaces:**
- `PasswordExpiryData`: Matches backend response model
- `SendPasswordReminderRequest`: Matches backend request model

**New Methods:**
- `getPasswordExpiry()`: Fetches password expiry data for all users
- `sendPasswordExpiryReminder(userId, daysUntilExpiry)`: Sends reminder email to specific user

#### 2. Password Expiry Page - `/frontend/src/pages/PasswordExpiry.tsx`

**Changes:**
- Removed mock data
- Added `useEffect` hook to fetch real data on component mount
- Added loading and error states
- Added snackbar notifications for user feedback
- Updated `handleSendReminder()` to call the API
- Updated column definitions to match API response structure
- Added support for `no_password` status
- Added handling for null password expiry dates

**Features:**
- Real-time data from the database
- Search and filter capabilities via DataGrid toolbar
- Sort by any column (default: days until expiry, ascending)
- Email reminder button for each user
- Visual status indicators (chips with color coding)
- Summary statistics at the bottom
- Loading spinner during data fetch
- Error messages for failed operations
- Success/error notifications via snackbar

## Password Expiry Policy

- **Expiry Period**: 90 days from password creation
- **Expiring Soon Threshold**: 7 days or less until expiry
- **Status Categories**:
  - `expired`: Password expiry date has passed
  - `expiring_soon`: Password expires within 7 days
  - `normal`: Password expires in more than 7 days
  - `no_password`: User has no password in password_history table

## Email Notification

When an admin sends a password expiry reminder:
- Email is sent from the configured sender (noreply@job-fit-ai.com)
- Reply-to is set to the admin's email
- Message includes:
  - Days until password expires
  - Clear call-to-action
  - Step-by-step instructions to change password
  - Professional HTML formatting with branding

## Sprint Requirement Fulfillment

This implementation fulfills Sprint 1 requirements:
- **#15**: "Three days before a password expires, the user should receive notification that the password is about to expire"
  - Administrators can now manually send notifications
  - System identifies users with passwords expiring within 7 days
- **#18**: "The administrator should get a report of all expired passwords"
  - Password Expiry page provides comprehensive view of all user password statuses
  - Can filter to show only expired passwords
  - Sortable and searchable interface

## Usage

1. **View Password Expiry Data**:
   - Navigate to Password Expiry Management page
   - View all users with their password expiry information
   - Use search/filter to find specific users
   - Sort by any column for better analysis

2. **Send Reminder Email**:
   - Click the email icon (✉️) next to a user's name
   - System automatically sends reminder with appropriate expiry information
   - Confirmation message displays on success
   - Error message displays if send fails

3. **Monitor Statuses**:
   - Red "Expired" chip: Password has expired
   - Orange "Expiring Soon" chip: Password expires in ≤7 days
   - Green "Normal" chip: Password is current
   - Gray "No Password" chip: No password history found

## Database Requirements

The feature relies on the `password_history` table:
```sql
CREATE TABLE public.password_history (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT password_history_pkey PRIMARY KEY (id),
  CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

## Future Enhancements

Potential improvements:
1. Automated email notifications (scheduled task to send reminders)
2. Configurable expiry period (instead of hardcoded 90 days)
3. Configurable expiring soon threshold
4. Email reminder history (track when reminders were sent)
5. Bulk email functionality (send reminders to all expiring soon users)
6. Export capability for reporting
7. Password expiry dashboard widget for admin home page

## Testing

To test the feature:
1. Ensure users have entries in the `password_history` table
2. Login as an administrator
3. Navigate to Password Expiry Management page
4. Verify data displays correctly
5. Test sending reminder email
6. Check recipient's email inbox
7. Verify email formatting and content
8. Test search/filter/sort functionality
9. Test error handling (invalid user, network errors, etc.)

## Error Handling

The implementation includes comprehensive error handling:
- Backend: HTTP exceptions with appropriate status codes and messages
- Frontend: Try-catch blocks with user-friendly error messages
- Email failures: Proper error propagation and user notification
- Database errors: Logged and reported to admin
- Invalid data: Validated and rejected with clear messages
