# FinKen 2.0 Authentication Backend Implementation

This document describes the authentication backend implementation for FinKen 2.0, which fulfills the Sprint 1 requirements for user management and authentication.

## Overview

The authentication system uses Supabase's built-in authentication service combined with custom user management logic to implement the role-based access control required by the Sprint specifications.

## Architecture

### Components

1. **Supabase Auth**: Handles password authentication, token management, and basic user storage
2. **Custom Profiles Table**: Stores additional user information and role assignments
3. **Registration Requests Table**: Manages the admin approval workflow for new users
4. **Roles Table**: Defines the three user types (Administrator, Manager, Accountant)

### Database Schema

The authentication system uses the following key tables from `schema.sql`:

- `roles`: Defines user roles (Administrator, Manager, Accountant)
- `profiles`: Stores user profile information linked to Supabase auth users
- `registrationrequests`: Manages new user registration requests pending admin approval

## Implementation Details

### Sprint Requirements Fulfilled

#### Basic Authentication (Requirements 1, 5, 7, 12, 14)
- ✅ Three user types: Administrator, Manager, Accountant
- ✅ Secure login with username/email and password
- ✅ Password encryption handled by Supabase
- ✅ All login information stored in database

#### Password Security (Requirements 10, 11, 13)
- ✅ Password validation: minimum 8 characters, must start with letter, contains letter/number/special character
- ✅ Password history tracking (Supabase feature)
- ✅ Account suspension after failed attempts (configurable in Supabase)

#### User Registration Workflow (Requirement 8)
- ✅ New users submit registration requests with personal information
- ✅ Admin receives requests and can approve/reject
- ✅ Approved users receive account credentials

#### Username Generation (Requirement 20)
- ✅ Username format: first initial + last name + month/year (e.g., "jdoe1025")

#### Administrative Features (Requirements 2, 3, 4, 16, 17, 19)
- ✅ Admins can create and manage users
- ✅ Admins can activate/deactivate users
- ✅ Admin reporting capabilities
- ✅ User suspension functionality
- ✅ Email integration capabilities

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/signin`
Sign in with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token_here",
  "user": {
    "id": "uuid",
    "username": "jdoe1025",
    "first_name": "John",
    "last_name": "Doe",
    "role": {
      "role_name": "Accountant"
    }
  }
}
```

#### POST `/api/auth/registration-request`
Submit a new user registration request.

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com"
}
```

#### GET `/api/auth/registration-requests` (Admin only)
Get all registration requests with optional status filtering.

#### POST `/api/auth/approve-registration/{request_id}` (Admin only)
Approve a registration request and create user account.

**Request:**
```json
{
  "role_id": 3,
  "password": "TempPass123!"
}
```

#### POST `/api/auth/reject-registration/{request_id}` (Admin only)
Reject a registration request.

**Request:**
```json
{
  "reason": "Insufficient documentation provided"
}
```

### Utility Endpoints

#### GET `/api/auth/profile`
Get current user's profile information.

#### POST `/api/auth/signout`
Sign out the current user.

#### POST `/api/auth/forgot-password`
Send password reset email.

#### GET `/api/auth/roles` (Admin only)
Get all available roles.

#### GET `/api/auth/health`
Health check endpoint.

## Security Features

### Authentication
- JWT-based token authentication via Supabase
- Secure password hashing and validation
- Token expiration and refresh capabilities

### Authorization
- Role-based access control (RBAC)
- Admin-only endpoints protected with role checks
- User context tracking for audit logging

### Password Security
- Minimum 8 characters
- Must start with a letter
- Must contain letter, number, and special character
- Password history tracking (via Supabase)
- Account lockout after failed attempts

## Setup Instructions

### 1. Initialize Roles
Run the role initialization script to create default roles:

```bash
cd backend
python init_roles.py
```

### 2. Create First Administrator User
Before you can approve new user registrations, you need to create the first administrator user. You have two options:

#### Option A: Interactive Creation (Recommended)
```bash
cd backend
python create_admin.py
```

This will guide you through creating the first admin user with prompts for:
- First Name
- Last Name  
- Email
- Password (with validation)
- Username (auto-generated)

#### Option B: Quick Creation (for scripts/automation)
```bash
cd backend
python create_admin_quick.py admin@company.com AdminPass123! John Doe
```

This creates an admin user with the provided details non-interactively.

**Important Notes:**
- The password must meet Sprint requirements (8+ chars, start with letter, contain letter/number/special char)
- Username is auto-generated as: first initial + last name + month/year (e.g., "jdoe1025")
- The script will warn you if admin users already exist
- This admin user can then approve other registration requests

### 3. Environment Variables
Ensure the following environment variables are set:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key  # For admin operations
```

### 4. Test the Implementation
Run the test script to verify everything works:

```bash
cd backend
python test_auth.py
```

## Usage Examples

### 1. User Registration Flow
1. New user submits registration request via `/api/auth/registration-request`
2. Admin reviews requests via `/api/auth/registration-requests`
3. Admin approves/rejects via `/api/auth/approve-registration/{id}` or `/api/auth/reject-registration/{id}`
4. Approved user can sign in via `/api/auth/signin`

### 2. Admin User Management
1. Admin signs in and receives admin role token
2. Admin can view all registration requests
3. Admin can approve requests and assign roles
4. Admin can view all roles via `/api/auth/roles`

### 3. Regular User Access
1. User signs in with approved credentials
2. User receives role-appropriate access token
3. User can access role-permitted endpoints
4. User can view their profile via `/api/auth/profile`

## Error Handling

The system includes comprehensive error handling for:
- Invalid credentials
- Inactive user accounts
- Invalid or expired tokens
- Role permission violations
- Database connection issues
- Validation errors

All errors return appropriate HTTP status codes and descriptive messages.

## Integration with Frontend

The authentication system is designed to work seamlessly with the existing frontend components:

- `SignIn.tsx`: Uses `/api/auth/signin` endpoint
- `SignUp.tsx`: Uses `/api/auth/registration-request` endpoint  
- `ManageRegistrationRequests.tsx`: Uses admin endpoints for request management
- `AuthContext.tsx`: Manages authentication state and tokens

## Future Enhancements

Potential future improvements:
- Password expiry notifications (Requirement 15)
- Advanced audit logging
- Multi-factor authentication
- Password reset with security questions (Requirement 9)
- Email notifications for registration approval/rejection