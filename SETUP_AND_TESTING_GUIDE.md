# Signup Invitation Flow - Setup & Testing Guide

## Overview
This guide provides instructions for setting up and testing the new signup invitation flow implemented in FinKen 2.0.

## Prerequisites
- Python 3.9+
- Node.js 16+
- Supabase account with database access
- Mailjet API credentials (for email sending)

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

This will install the new `bcrypt` dependency needed for hashing security answers.

### 2. Setup Security Questions
Run the setup script to populate the security questions table:

```bash
cd backend
python setup_security_questions.py
```

This will add 10 common security questions to your database. You should see output like:
```
============================================================
Security Questions Setup Script
============================================================

Connected to Supabase
Adding 10 security questions...

✅ Added: What was the name of your first pet?
✅ Added: What city were you born in?
...
============================================================
Summary:
  Added: 10
  Skipped: 0
  Total in database: 10
============================================================

✅ Security questions setup completed successfully!
```

### 3. Verify Environment Variables
Ensure your `.env` file contains:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_API_SECRET=your_mailjet_secret
```

### 4. Start Backend Server
```bash
cd backend
python run_server.py
```

Backend should be running on `http://localhost:8000`

## Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

No new dependencies were added, but ensure all existing ones are installed.

### 2. Start Frontend Development Server
```bash
cd frontend
npm run dev
```

Frontend should be running on `http://localhost:5173`

## Testing the Complete Flow

### Test Scenario: Admin Approves Registration

#### Step 1: Create a Registration Request
1. Navigate to `http://localhost:5173/sign-up`
2. Fill in the registration form:
   - First Name: John
   - Last Name: Doe
   - Email: john.doe@example.com (use a real email you can access)
   - Date of Birth: 01/01/1990
   - Address: 123 Main St
3. Click "Request Access"
4. Verify you see success message

#### Step 2: Admin Reviews Request
1. Sign in as Administrator at `http://localhost:5173/sign-in`
2. Navigate to "Manage Registration Requests"
3. Find John Doe's pending request
4. Click the green "Approve" (✓) button
5. In the approval dialog:
   - Select Role: Accountant
   - Click "Approve"
6. Verify success message appears

#### Step 3: Check Email
Check the email inbox for john.doe@example.com. You should receive:
- **Subject**: FinKen 2.0 - Complete Your Account Setup
- **Content**: 
  - Welcome message
  - Assigned role information
  - Blue "Complete Account Setup" button
  - Link to finish signup

#### Step 4: Complete Signup
1. Click the link in the email (or copy/paste it)
2. You should be redirected to: `http://localhost:5173/finish-signup?token=...`
3. Verify the page shows:
   - Welcome message with your name
   - Password field
   - Confirm Password field
   - Security Question dropdown
   - Security Answer field
4. Fill in the form:
   - Password: `Test123!` (meets all requirements)
   - Confirm Password: `Test123!`
   - Security Question: Select any question
   - Security Answer: Enter your answer
5. Click "Complete Setup"
6. Verify success message with generated username (e.g., `jdoe1024`)
7. Wait for automatic redirect to sign-in page

#### Step 5: Sign In
1. At the sign-in page, enter:
   - Email: john.doe@example.com
   - Password: Test123!
2. Click "Sign In"
3. Verify successful login and redirect to dashboard

### Expected Results

✅ **Admin Perspective**:
- Can approve requests without entering password
- Sees success message indicating email was sent
- Request status changes from "Pending" to "Approved"

✅ **User Perspective**:
- Receives professional email with setup link
- Link opens finish-signup page with pre-filled information
- Can choose security question from dropdown
- Password validation works correctly
- Sees generated username in success message
- Can sign in with new credentials

✅ **Security**:
- Token expires after 7 days
- Token can only be used once
- Password must meet all Sprint 1 requirements
- Security answer is hashed with bcrypt
- Invalid/expired tokens show appropriate errors

## Testing Edge Cases

### Invalid Token
1. Navigate to: `http://localhost:5173/finish-signup?token=invalid123`
2. Should see error: "Invalid or expired invitation token."

### Expired Token
Tokens expire after 7 days. To test:
1. Manually update `expiresat` in `signupinvitations` table to past date
2. Try to use the link
3. Should see error: "Invitation token has expired"

### Used Token
1. Complete signup using a token
2. Try to use the same link again
3. Should see error: "Invitation token has already been used"

### Password Validation
Try these passwords and verify they fail:
- `short` - Too short (< 8 characters)
- `12345678` - No letter
- `password` - No number or special character
- `Password1` - No special character
- `1Password!` - Doesn't start with a letter

### Security Answer Validation
- Empty answer should show error
- Very short answer (< 2 characters) should show error

## Database Verification

### Check Signup Invitation
```sql
SELECT * FROM signupinvitations WHERE token = 'your_token_here';
```

Should show:
- `requestid`: Matches registration request
- `token`: The secure token
- `expiresat`: 7 days from creation
- `usedat`: NULL before use, timestamp after use

### Check User Profile
```sql
SELECT * FROM profiles WHERE id = 'user_uuid_here';
```

Should show:
- Username generated correctly (e.g., `jdoe1024`)
- FirstName, LastName from registration request
- DOB and Address transferred correctly
- RoleID matches admin's selection

### Check Security Answer
```sql
SELECT * FROM usersecurityanswers WHERE userid = 'user_uuid_here';
```

Should show:
- `questionid`: Matches selected question
- `answerhash`: Bcrypt hash (starts with `$2b$`)

## API Endpoints

### Public Endpoints (No Auth Required)
- `GET /api/auth/security-questions` - Get all security questions
- `POST /api/auth/verify-invitation?token=...` - Verify token
- `POST /api/auth/complete-signup` - Complete account setup

### Admin Endpoints (Admin Auth Required)
- `POST /api/auth/approve-registration/{id}` - Approve request (modified)
- `GET /api/auth/registration-requests` - List requests

## Troubleshooting

### Email Not Received
1. Check Mailjet dashboard for delivery status
2. Check spam/junk folder
3. Verify Mailjet API credentials in `.env`
4. Check backend logs for email sending errors

### Token Verification Fails
1. Check if token exists in `signupinvitations` table
2. Verify token hasn't expired
3. Check if token was already used (`usedat` is not NULL)
4. Ensure backend is running and accessible

### User Creation Fails
1. Check Supabase dashboard for auth errors
2. Verify service role key has proper permissions
3. Check if email already exists in auth.users
4. Review backend logs for detailed error messages

### Security Questions Not Loading
1. Run `setup_security_questions.py` script
2. Verify questions exist in database
3. Check backend API endpoint response

## Configuration

### Token Expiration
Default: 7 days

To change, edit `backend/routes/auth.py`:
```python
expires_at = datetime.utcnow() + timedelta(days=7)  # Change days here
```

### Frontend URL
Default: `http://localhost:5173`

To change for production, edit `backend/routes/auth.py`:
```python
frontend_url = "http://localhost:5173"  # Update this
```

Or better, add to `.env`:
```env
FRONTEND_URL=https://your-production-domain.com
```

And update code to use:
```python
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
```

## Monitoring & Logs

### Backend Logs
Monitor these for signup flow:
- Approval: "Approve registration error: ..."
- Email: "Failed to send invitation email: ..."
- Verification: "Verify invitation error: ..."
- Signup: "Complete signup error: ..."

### Frontend Console
Check browser console for:
- Token verification responses
- API call errors
- Form validation messages

## Security Considerations

### Token Security
- ✅ Uses `secrets.token_urlsafe(32)` for cryptographic security
- ✅ 32 bytes = 256 bits of entropy
- ✅ URL-safe encoding (no special characters issues)

### Password Storage
- ✅ Handled by Supabase Auth
- ✅ Uses industry-standard bcrypt hashing
- ✅ Automatic salting

### Security Answer Storage
- ✅ Hashed with bcrypt
- ✅ Salted automatically
- ✅ Cannot be reversed
- ✅ Can be verified without storing plaintext

### HTTPS Recommendation
In production:
- Use HTTPS for all communications
- Ensure email links use HTTPS
- Configure CORS properly
- Use secure cookies for sessions

## Next Steps

After successful testing:
1. ✅ Verify all edge cases pass
2. ✅ Test with real email addresses
3. ✅ Update frontend URL for production
4. ✅ Configure HTTPS
5. ✅ Set up monitoring/alerting for failed signups
6. ✅ Implement password history (Sprint requirement #11)
7. ✅ Add rate limiting to prevent abuse
8. ✅ Implement forgot password flow using security questions

## Support

For issues or questions:
1. Check this guide first
2. Review implementation documentation: `SIGNUP_INVITATION_IMPLEMENTATION.md`
3. Check backend logs
4. Verify database state
5. Test API endpoints directly with curl/Postman

## Success Criteria

All tests pass when:
- ✅ Admin can approve without entering password
- ✅ Email is sent and received
- ✅ Token verification works
- ✅ Security questions load correctly
- ✅ Password validation enforces all rules
- ✅ User account is created successfully
- ✅ Data is transferred correctly
- ✅ Security answer is hashed properly
- ✅ Token is marked as used
- ✅ User can sign in with new credentials
- ✅ All edge cases handled gracefully
