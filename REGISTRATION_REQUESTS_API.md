# Registration Requests API Integration

## Overview
This document describes the integration between the backend registration requests API and the frontend ManageRegistrationRequests page.

## Backend Changes

### 1. Updated Models (`/backend/models/auth.py`)
Added `DOB` (Date of Birth) and `Address` fields to:
- `Profile` - User profile model
- `ProfileCreate` - Profile creation model  
- `ProfileUpdate` - Profile update model
- `RegistrationRequest` - Registration request model
- `RegistrationRequestCreate` - Registration request creation model

### 2. Updated Routes (`/backend/routes/auth.py`)

#### Create Registration Request
- **Endpoint**: `POST /api/auth/registration-request`
- **Updated**: Now includes DOB and Address when creating registration requests
- **Code Change**: Added DOB and Address to insert_data

```python
insert_data = {
    "FirstName": request.first_name,
    "LastName": request.last_name,
    "DOB": request.dob.isoformat() if request.dob else None,
    "Address": request.address,
    "Email": request.email,
    "Status": "Pending"
}
```

#### Approve Registration Request
- **Endpoint**: `POST /api/auth/approve-registration/{request_id}`
- **Updated**: Now includes DOB and Address when creating user profiles
- **Code Change**: Added DOB and Address to profile_data

```python
profile_data = {
    "id": user_id,
    "Username": username,
    "FirstName": reg_request.first_name,
    "LastName": reg_request.last_name,
    "DOB": reg_request.dob.isoformat() if reg_request.dob else None,
    "Address": reg_request.address,
    "RoleID": approval_data.role_id
}
```

#### Existing Endpoints (Already Available)
- `GET /api/auth/registration-requests` - Get all registration requests (admin only)
  - Optional query parameter: `status_filter` (pending, approved, rejected)
- `POST /api/auth/reject-registration/{request_id}` - Reject a registration request

## Frontend Changes

### 1. Updated Type Definitions (`/frontend/src/types/auth.ts`)
Added to `User` interface:
- `dateOfBirth?: string` - User's date of birth
- `address?: string` - User's address

### 2. Updated Auth Service (`/frontend/src/services/authService.ts`)

#### New Interfaces
- `BackendRegistrationRequest` - Backend response format
- `RegistrationRequestData` - Frontend format (exported)
- `ApproveRequestPayload` - Payload for approval
- `RejectRequestPayload` - Payload for rejection

#### Updated Profile Transformation
The `transformBackendProfileToUser` function now maps:
- `profile.DOB` → `user.dateOfBirth`
- `profile.Address` → `user.address`

#### Updated Registration Request Creation
The `createRegistrationRequest` method now sends:
```typescript
{
  first_name: request.firstName,
  last_name: request.lastName,
  dob: request.dateOfBirth,
  address: request.address,
  email: request.email,
}
```

#### New Methods

**`getRegistrationRequests(statusFilter?: string)`**
- Fetches all registration requests from the backend
- Transforms backend format to frontend format
- Returns: `Promise<RegistrationRequestData[]>`

**`approveRegistrationRequest(requestId: number, roleId: number, password: string)`**
- Approves a registration request
- Creates a user account with the specified role and password
- Returns: `Promise<{ message: string; username: string; user_id: string }>`

**`rejectRegistrationRequest(requestId: number, reason: string)`**
- Rejects a registration request with a reason
- Returns: `Promise<{ message: string }>`

### 3. Updated ManageRegistrationRequests Component

#### Features Added
1. **Real-time Data Loading**
   - Fetches registration requests from API on component mount
   - Shows loading spinner while fetching
   - Displays error/success messages

2. **Approval Dialog**
   - Select role (Administrator, Manager, Accountant)
   - Enter temporary password
   - Password validation requirements shown
   - Sends email notification (via backend)

3. **Rejection Dialog**
   - Enter reason for rejection
   - Sends email notification (via backend)

4. **View Details Dialog**
   - Shows all registration request details
   - Displays DOB and Address if available
   - Shows review status and reviewer info

5. **Auto-Refresh**
   - After approving or rejecting, the list automatically refreshes

#### State Management
```typescript
const [requests, setRequests] = useState<RegistrationRequestData[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [successMessage, setSuccessMessage] = useState<string | null>(null);
```

#### Data Grid Enhancements
- Shows DOB and Address columns
- Formats dates properly
- Quick filter search
- Export functionality
- Summary statistics (Total, Pending, Approved, Rejected)

## Database Schema

The following tables are used:

### registrationrequests
- `RequestID` (PK)
- `FirstName`
- `LastName`
- `DOB` - Date of Birth (newly added)
- `Address` - User address (newly added)
- `Email`
- `RequestDate`
- `Status` (Pending/Approved/Rejected)
- `ReviewedByUserID` (FK to profiles)
- `ReviewDate`

### profiles
- `id` (PK, UUID from auth.users)
- `Username`
- `FirstName`
- `LastName`
- `DOB` - Date of Birth (newly added)
- `Address` - User address (newly added)
- `ProfilePictureURL`
- `RoleID` (FK to roles)
- `IsActive`
- `DateCreated`

## Usage Example

### Admin Workflow
1. Admin navigates to "Manage Registration Requests"
2. System loads all pending/approved/rejected requests
3. Admin clicks "View" to see request details including DOB and Address
4. For pending requests:
   - **Approve**: Select role → Enter password → Confirm
   - **Reject**: Enter reason → Confirm
5. User receives email notification with decision

### Email Notifications
When approved:
- Username generated: `{firstInitial}{lastName}{MMYY}`
- Email sent with username and temporary password
- User can sign in and change password

When rejected:
- Email sent with rejection reason
- User can contact admin for clarification

## Security
- All registration request endpoints require authentication
- Approve/Reject endpoints require admin role (RoleID = 1)
- Passwords must meet validation requirements:
  - Minimum 8 characters
  - Must start with a letter
  - Must contain letter, number, and special character

## Testing Checklist
- [ ] Create registration request with DOB and Address
- [ ] Verify data appears in database
- [ ] Admin can view registration requests
- [ ] Admin can view full details (including DOB/Address)
- [ ] Admin can approve request (user account created with DOB/Address)
- [ ] Admin can reject request
- [ ] Email notifications sent correctly
- [ ] User can sign in after approval
- [ ] User profile shows DOB and Address after login
