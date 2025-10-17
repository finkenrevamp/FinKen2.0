# User Management Implementation Guide

## Overview
This document describes the implementation of the user management system that connects the frontend Users page with the backend profiles API. The system allows administrators to view, search, edit, email, suspend, and deactivate user accounts.

## Features Implemented

### 1. Backend API Endpoints (profiles.py)

#### GET `/api/profiles/users`
- **Description**: Get all users with their email addresses from auth.users
- **Authorization**: Admin only
- **Query Parameters**:
  - `search` (optional): Search by username or email
- **Response**: Array of UserWithEmail objects containing:
  - User profile data from profiles table
  - Email from Supabase auth.users table
  - Role name from roles table
  - Status information (active, suspended, deactivated)

#### GET `/api/profiles/users/{user_id}`
- **Description**: Get a specific user by ID with email
- **Authorization**: Admin only
- **Response**: Single UserWithEmail object

#### PATCH `/api/profiles/users/{user_id}`
- **Description**: Update user information
- **Authorization**: Admin only
- **Request Body**: UpdateUserRequest
  - `username` (optional)
  - `first_name` (optional)
  - `last_name` (optional)
  - `dob` (optional)
  - `address` (optional)
  - `role_id` (optional)

#### POST `/api/profiles/users/{user_id}/send-email`
- **Description**: Send email to a user
- **Authorization**: Admin only
- **Request Body**: SendEmailRequest
  - `subject`: Email subject
  - `body`: Email body/message
- **Uses**: Mailjet email service configured in emailUserFunction.py

#### POST `/api/profiles/users/{user_id}/suspend`
- **Description**: Suspend user account until a specified date
- **Authorization**: Admin only
- **Request Body**: SuspendUserRequest
  - `suspension_end_date`: ISO date string
- **Validation**: Prevents admin from suspending themselves

#### POST `/api/profiles/users/{user_id}/deactivate`
- **Description**: Deactivate user account
- **Authorization**: Admin only
- **Validation**: Prevents admin from deactivating themselves

### 2. Frontend Service (profileService.ts)

Created a comprehensive service with methods for:
- `getAllUsers(search?: string)`: Fetch all users with optional search
- `getUserById(userId: string)`: Get specific user details
- `updateUser(userId: string, updateData: UpdateUserRequest)`: Update user info
- `sendEmailToUser(userId: string, emailData: SendEmailRequest)`: Send email
- `suspendUser(userId: string, suspensionEndDate: string)`: Suspend account
- `deactivateUser(userId: string)`: Deactivate account

### 3. Frontend UI Components (Users.tsx)

#### Main Features:
- **User Table**: DataGrid displaying all users with:
  - Username
  - Full name
  - Email
  - Date of birth
  - Address
  - Role (with color-coded chips)
  - Status (Active/Suspended/Deactivated)
  - Date created
  - Action buttons

- **Search Functionality**: 
  - Real-time search bar with 500ms debounce
  - Searches both username and email fields
  - Results update automatically

- **Summary Statistics**:
  - Total users count
  - Active users count
  - Suspended users count
  - Deactivated users count

#### Dialog Components:

##### Edit User Dialog
- Edit username, first name, last name
- Update date of birth and address
- Change user role (dropdown with available roles)
- Save changes with loading state

##### Send Email Dialog
- Displays recipient email (read-only)
- Subject field (required)
- Message body field (required, multiline)
- Send with confirmation

##### Suspend User Dialog
- Shows user being suspended
- Date picker for suspension end date
- Minimum date is today
- Confirmation with warning color

##### Deactivate User Dialog
- Confirmation dialog
- Warning message about consequences
- Can be reversed by admin

#### Action Button States:
- Edit: Always enabled
- Email: Always enabled
- Suspend: Disabled if already suspended or deactivated
- Deactivate: Disabled if already deactivated

### 4. Data Flow

```
Frontend (Users.tsx)
    ↓
Profile Service (profileService.ts)
    ↓
API Client (apiClient.ts)
    ↓
Backend API (profiles.py)
    ↓
Supabase (profiles table + auth.users)
```

### 5. Security Implementation

- **Authentication**: All endpoints require valid JWT token
- **Authorization**: Admin role required for all user management operations
- **Self-protection**: Admins cannot suspend or deactivate themselves
- **Token validation**: Uses Supabase auth.get_user() to validate tokens
- **Audit logging**: User context is set for all operations

### 6. Database Integration

#### Profiles Table Fields Used:
- `id`: User UUID (from auth.users)
- `Username`: User's username
- `FirstName`: First name
- `LastName`: Last name
- `DOB`: Date of birth
- `Address`: User address
- `RoleID`: Foreign key to roles table
- `isActive`: Account active status
- `isSuspended`: Suspension status
- `SuspensionEndDate`: When suspension ends
- `DateCreated`: Account creation date

#### Auth.users Integration:
- Email is fetched from Supabase auth.users using service client
- Admin operations use service_key for elevated permissions
- User authentication uses regular client

### 7. Error Handling

- Loading states for all async operations
- Error messages displayed in snackbar notifications
- Success confirmations for all actions
- Network error handling
- Validation errors from backend displayed to user

## Usage Instructions

### For Administrators:

1. **View Users**: Navigate to Users page to see all system users
2. **Search Users**: Type in search bar to filter by username or email
3. **Edit User**:
   - Click Edit icon (pencil) on user row
   - Modify desired fields
   - Click Save to update

4. **Send Email**:
   - Click Email icon (envelope) on user row
   - Enter subject and message
   - Click Send Email

5. **Suspend User**:
   - Click Suspend icon (pause) on user row
   - Select suspension end date
   - Confirm suspension

6. **Deactivate User**:
   - Click Deactivate icon (block) on user row
   - Confirm deactivation in dialog

## Testing Checklist

- [ ] Users load successfully on page open
- [ ] Search filters users by username
- [ ] Search filters users by email
- [ ] Edit dialog opens with current user data
- [ ] User information updates successfully
- [ ] Role can be changed via dropdown
- [ ] Email dialog opens with correct recipient
- [ ] Email sends successfully
- [ ] Suspend dialog opens with date picker
- [ ] User suspends successfully with end date
- [ ] Deactivate dialog shows confirmation
- [ ] User deactivates successfully
- [ ] Suspended users show warning status
- [ ] Deactivated users show error status
- [ ] Action buttons disable appropriately
- [ ] Admin cannot suspend/deactivate themselves
- [ ] Success/error messages display correctly
- [ ] Loading states show during operations

## Environment Variables Required

### Backend (.env):
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
MAILJET_API_KEY=your_mailjet_key
MAILJET_API_SECRET=your_mailjet_secret
```

### Frontend (.env):
```
VITE_API_URL=http://localhost:8000/api
```

## API Response Examples

### Get All Users Response:
```json
[
  {
    "id": "uuid-here",
    "username": "jsmith0824",
    "first_name": "John",
    "last_name": "Smith",
    "email": "john.smith@example.com",
    "dob": "1990-05-15",
    "address": "123 Main St, New York, NY",
    "role_id": 3,
    "role_name": "Accountant",
    "is_active": true,
    "is_suspended": false,
    "suspension_end_date": null,
    "date_created": "2024-01-15T10:30:00Z"
  }
]
```

### Update User Response:
```json
{
  "message": "User updated successfully",
  "user_id": "uuid-here"
}
```

### Send Email Response:
```json
{
  "message": "Email sent successfully",
  "user_id": "uuid-here",
  "email": "john.smith@example.com"
}
```

## File Structure

```
backend/
├── routes/
│   └── profiles.py          # User management API endpoints
├── models/
│   └── auth.py             # Profile and user models
└── services/
    ├── supabase.py         # Supabase client
    └── emailUserFunction.py # Email service

frontend/
├── src/
│   ├── pages/
│   │   └── Users.tsx       # User management UI
│   └── services/
│       ├── profileService.ts # Profile API client
│       └── authService.ts    # Auth API client (getRoles added)
```

## Known Limitations

1. Search functionality searches in backend, not client-side
2. Email requires Mailjet configuration
3. Pagination handled by DataGrid component only
4. No bulk operations (suspend/deactivate multiple users)
5. Profile pictures not editable through this interface

## Future Enhancements

1. Add user activity logs
2. Implement password reset from admin
3. Add bulk operations
4. Export users to CSV
5. Advanced filtering (by role, status, date range)
6. User activity analytics
7. Email templates for common scenarios
8. Suspension auto-expiry mechanism
