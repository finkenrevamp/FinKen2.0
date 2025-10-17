# Forgot Password Feature Implementation

This document describes the complete forgot password feature implementation for FinKen 2.0.

## Overview

The forgot password feature allows users to reset their password securely using a multi-step process:
1. User enters email and username
2. System verifies credentials and displays user's security question
3. User answers security question
4. System sends password reset email with time-limited token
5. User clicks link in email and sets new password

## Security Features

- **Two-factor verification**: Requires both email/username AND correct security answer
- **Time-limited tokens**: Reset tokens expire after 1 hour
- **One-time use tokens**: Tokens can only be used once
- **Password history**: Prevents reuse of last 5 passwords
- **Password strength validation**: Enforces Sprint 1 requirements (8+ chars, starts with letter, contains letter/number/special char)

## Database Schema

### password_reset_tokens Table

Located in: `backend/schema/password_reset_tokens.sql`

```sql
CREATE TABLE public.password_reset_tokens (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
```

**To create this table in your Supabase database:**
1. Go to SQL Editor in Supabase Dashboard
2. Copy the contents of `backend/schema/password_reset_tokens.sql`
3. Execute the SQL

## Backend Implementation

### Models (`backend/models/auth.py`)

Added new Pydantic models:
- `PasswordResetToken`: Database model for reset tokens
- `InitiateForgotPasswordRequest`: Step 1 request (email + username)
- `VerifySecurityAnswerRequest`: Step 2 request (email + username + answer)
- `SecurityQuestionResponse`: Returns security question to frontend
- `PasswordResetTokenResponse`: Returns token and success message

### Endpoints (`backend/routes/auth.py`)

#### 1. POST `/auth/forgot-password`
Initiates password reset process.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "jsmith0124"
}
```

**Response:**
```json
{
  "question_id": 1,
  "question_text": "What is your favorite color?",
  "user_id": "uuid-here"
}
```

**Errors:**
- 404: Email not found
- 400: Email and username don't match
- 400: No security question found

#### 2. POST `/auth/verify-security-answer`
Verifies security answer and sends reset email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "jsmith0124",
  "security_answer": "blue"
}
```

**Response:**
```json
{
  "token": "secure-token-here",
  "message": "Password reset email sent successfully. Please check your inbox."
}
```

**Errors:**
- 400: Invalid credentials
- 400: Incorrect security answer
- 500: Failed to send email

**Side Effects:**
- Creates record in `password_reset_tokens` table
- Sends email with reset link to user

#### 3. GET `/auth/verify-reset-token?token={token}`
Verifies if a reset token is valid (used by frontend before showing reset form).

**Response:**
```json
{
  "valid": true,
  "message": "Token is valid"
}
```

Or:
```json
{
  "valid": false,
  "error": "Reset token has expired"
}
```

#### 4. POST `/auth/reset-password`
Resets password using verified token.

**Request Body:**
```json
{
  "token": "secure-token-here",
  "new_password": "newSecureP@ss123"
}
```

**Response:**
```json
{
  "message": "Password reset successfully. You can now sign in with your new password."
}
```

**Errors:**
- 400: Invalid or expired token
- 400: Token already used
- 400: Password validation failed
- 400: Password reused (in last 5 passwords)

**Side Effects:**
- Updates password in auth.users
- Marks token as used
- Adds password to password_history

### Email Service (`backend/services/emailUserFunction.py`)

Added `send_password_reset_email()` function that sends HTML email with:
- Password reset link
- 1-hour expiration notice
- Security confirmation message
- Professional formatting with FinKen 2.0 branding

## Frontend Implementation

### Types (`frontend/src/types/auth.ts`)

Updated interface:
```typescript
export interface ForgotPasswordRequest {
  email: string;
  username: string;  // Changed from userId
}

export interface SecurityQuestionResponse {
  question_id: number;
  question_text: string;
  user_id: string;
}

export interface VerifySecurityAnswerRequest {
  email: string;
  username: string;
  security_answer: string;
}

export interface PasswordResetTokenResponse {
  token: string;
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface VerifyResetTokenResponse {
  valid: boolean;
  message?: string;
  error?: string;
}
```

### Auth Service (`frontend/src/services/authService.ts`)

Added methods:
- `initiateForgotPassword(request)`: Step 1 - Get security question
- `verifySecurityAnswer(request)`: Step 2 - Verify answer and get token
- `verifyResetToken(token)`: Validate token before showing reset form
- `resetPassword(request)`: Submit new password

### Auth Context (`frontend/src/contexts/AuthContext.tsx`)

Added context methods:
- `initiateForgotPassword`
- `verifySecurityAnswer`

### Pages

#### ForgotPassword (`frontend/src/pages/ForgotPassword.tsx`)

Multi-step flow:

**Step 1: Enter Credentials**
- Email input field
- Username input field
- Validates both fields required
- Validates email format

**Step 2: Security Question**
- Displays user's security question
- Answer input field (case-sensitive)
- Back button to return to step 1
- Submit button to verify answer

**Step 3: Success**
- Shows success message
- Instructs user to check email
- Link back to sign in

#### ResetPassword (`frontend/src/pages/ResetPassword.tsx`)

New page accessed via `/reset-password?token={token}`:

**Features:**
- Verifies token on page load
- Shows loading spinner during verification
- If token invalid/expired: Shows error and link to request new reset
- If token valid: Shows password reset form
  - New password field with show/hide toggle
  - Confirm password field with show/hide toggle
  - Password validation (real-time)
  - Submit button
- On success: Shows success message and redirects to sign in after 3 seconds

### Routing (`frontend/src/App.tsx`)

Added route:
```typescript
<Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
```

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Forgot Password" on sign-in page               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. User enters email and username                               │
│    POST /auth/forgot-password                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. System verifies credentials and returns security question    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. User answers security question                               │
│    POST /auth/verify-security-answer                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. System verifies answer, generates token, sends email         │
│    Email contains: http://localhost:5173/reset-password?token=  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. User clicks link in email                                    │
│    GET /auth/verify-reset-token?token=                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. User enters and confirms new password                        │
│    POST /auth/reset-password                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. System validates password, checks history, updates password  │
│    Redirects user to sign-in page                               │
└─────────────────────────────────────────────────────────────────┘
```

## Testing the Feature

### Prerequisites
1. Create the `password_reset_tokens` table in Supabase
2. Ensure user has a security question set up
3. Configure Mailjet API credentials in backend `.env`

### Test Steps

1. **Initiate Password Reset**
   ```bash
   curl -X POST http://localhost:8000/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{
       "email": "user@example.com",
       "username": "jsmith0124"
     }'
   ```

2. **Verify Security Answer**
   ```bash
   curl -X POST http://localhost:8000/auth/verify-security-answer \
     -H "Content-Type: application/json" \
     -d '{
       "email": "user@example.com",
       "username": "jsmith0124",
       "security_answer": "correct answer"
     }'
   ```

3. **Check Email**
   - Look for email from `noreply@job-fit-ai.com`
   - Click the reset link

4. **Reset Password**
   - Navigate to reset page
   - Enter new password meeting requirements
   - Confirm password
   - Submit

5. **Verify Password Changed**
   - Sign in with new password
   - Should succeed

### Frontend Testing

1. Navigate to `http://localhost:5173/forgot-password`
2. Enter email and username
3. Answer security question
4. Check email inbox
5. Click reset link
6. Set new password
7. Sign in with new password

## Configuration

### Environment Variables

Backend (`.env` in `/backend`):
```env
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_API_SECRET=your_mailjet_api_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

### Frontend URL

In `backend/routes/auth.py`, update the frontend URL if not running on localhost:
```python
frontend_url = "http://localhost:5173"  # Change for production
```

## Sprint 1 Requirements Compliance

✅ **Requirement #9**: "A button for forgot password. If this button is clicked, the system should prompt the user to enter email address and user id the person provided when his credentials were created in the system and ask security questions to allow him to supply new password"

- Email address ✓
- Username (user id) ✓
- Security question ✓
- New password ✓

✅ **Requirement #10**: "Passwords must be a minimum of 8 characters, must start with a letter, must have a letter, a number and a special character"

- Validated in `validate_password()` function

✅ **Requirement #11**: "Password used in the past cannot be used when password is reset"

- Checked via `password_service.validate_and_store_password()` with history limit of 5

✅ **Requirement #12**: "Password must be encrypted"

- Handled by Supabase Auth and `password_history` using bcrypt

## Maintenance

### Cleanup Old Tokens

Expired tokens should be cleaned up periodically. Add a cron job or scheduled task:

```sql
DELETE FROM public.password_reset_tokens 
WHERE expires_at < NOW() - INTERVAL '7 days';
```

### Monitoring

Monitor failed reset attempts:
- Track failed security answer attempts
- Alert on unusual patterns (potential brute force)
- Log all password reset activities

## Troubleshooting

### Common Issues

1. **Email not sending**
   - Check Mailjet API credentials
   - Verify `MAILJET_API_KEY` and `MAILJET_API_SECRET` in `.env`
   - Check backend logs for email errors

2. **Token not found**
   - Ensure `password_reset_tokens` table exists
   - Check token hasn't expired (1 hour limit)
   - Verify token hasn't been used already

3. **Security question not showing**
   - Verify user has security question set
   - Check `usersecurityanswers` table

4. **Password validation failing**
   - Must be 8+ characters
   - Must start with letter
   - Must contain letter, number, and special character
   - Cannot be in last 5 passwords

## Future Enhancements

- [ ] Add rate limiting to prevent brute force attacks
- [ ] Implement CAPTCHA on forgot password form
- [ ] Add admin notification for suspicious reset activity
- [ ] Support multiple security questions per user
- [ ] Add SMS verification option
- [ ] Implement magic link signin (passwordless)
- [ ] Add password strength meter
- [ ] Send notification email when password is changed
