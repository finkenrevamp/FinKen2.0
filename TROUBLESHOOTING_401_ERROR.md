# Troubleshooting 401 Unauthorized Error on Manage Registration Requests Page

## Problem
When accessing the Manage Registration Requests page, you receive:
```
GET http://localhost:8000/api/auth/registration-requests 401 (Unauthorized)
```

## Root Cause
The `/api/auth/registration-requests` endpoint requires:
1. User to be authenticated (have a valid JWT token)
2. User to have Administrator role (RoleID = 1)

## Solutions

### Solution 1: Sign In as Administrator

1. **Make sure you have an Administrator account in the database:**
   ```sql
   -- Check if you have an admin user
   SELECT p.*, r.RoleName 
   FROM profiles p
   JOIN roles r ON p."RoleID" = r."RoleID"
   WHERE r."RoleName" = 'Administrator';
   ```

2. **Sign in to the application:**
   - Go to the Sign In page
   - Use the administrator's email and password
   - The system will store the JWT token in localStorage

3. **Verify the token is stored:**
   - Open browser DevTools (F12)
   - Go to Application tab → Local Storage
   - Look for `finken_access_token`
   - It should have a value (JWT token)

4. **Navigate to Manage Registration Requests page**

### Solution 2: Create an Administrator Account (If None Exists)

If you don't have an administrator account yet:

1. **Use the backend init_roles.py script:**
   ```bash
   cd backend
   python init_roles.py
   ```

2. **Manually create an admin user via Supabase:**
   - Go to Supabase Dashboard → Authentication → Users
   - Click "Add User"
   - Create a new user with email/password
   - Note the UUID of the created user

3. **Insert profile with Administrator role:**
   ```sql
   INSERT INTO profiles (id, "Username", "FirstName", "LastName", "RoleID", "IsActive")
   VALUES (
     'USER_UUID_FROM_STEP_2',
     'admin',
     'Admin',
     'User',
     1,  -- Administrator RoleID
     true
   );
   ```

4. **Sign in with the admin credentials**

### Solution 3: Check Token Validity

If you're already signed in but still getting 401:

1. **Check if token is expired:**
   - JWT tokens expire after a certain time
   - Sign out and sign in again to get a fresh token

2. **Verify token in browser console:**
   ```javascript
   // Open DevTools Console and run:
   localStorage.getItem('finken_access_token')
   // Should return a long string (JWT token)
   ```

3. **Check token format:**
   - JWT should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - If it's null or invalid, sign in again

### Solution 4: Verify Backend is Running

1. **Check backend server is running:**
   ```bash
   cd backend
   python run_server.py
   ```

2. **Test the health endpoint:**
   ```bash
   curl http://localhost:8000/api/auth/health
   # Should return: {"status":"healthy","service":"authentication"}
   ```

3. **Test with valid token:**
   ```bash
   # Get your token from localStorage
   curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
        http://localhost:8000/api/auth/registration-requests
   ```

### Solution 5: Check User Role

If authenticated but still getting 401/403:

1. **Verify your user's role in database:**
   ```sql
   -- Replace with your user's email
   SELECT u.email, p."Username", r."RoleName", r."RoleID"
   FROM auth.users u
   JOIN profiles p ON u.id = p.id
   JOIN roles r ON p."RoleID" = r."RoleID"
   WHERE u.email = 'your-email@example.com';
   ```

2. **Expected result:**
   - RoleName should be 'Administrator'
   - RoleID should be 1

3. **If role is wrong, update it:**
   ```sql
   UPDATE profiles 
   SET "RoleID" = 1 
   WHERE id = 'YOUR_USER_UUID';
   ```

## Debugging Steps

### Enable Debug Logging

The code now includes debug logging. Open browser console to see:
- Whether token exists
- Token preview (first 20 characters)
- Request URL
- Response data or error

### Check Network Tab

1. Open DevTools → Network tab
2. Navigate to Manage Registration Requests
3. Find the request to `/api/auth/registration-requests`
4. Check:
   - **Request Headers:** Should include `Authorization: Bearer <token>`
   - **Response:** 401 usually means missing/invalid token
   - **Response:** 403 means token valid but insufficient permissions

### Verify API Client Configuration

Check that `/frontend/.env` has correct API URL:
```env
VITE_API_URL=http://localhost:8000/api
```

## Prevention

### Always Access Admin Pages While Authenticated

The ManageRegistrationRequests page should only be accessible to:
1. Authenticated users
2. With Administrator role

Make sure your routing protects this page appropriately in App.tsx.

## Quick Test Command

To quickly test if your admin account works:

```bash
# 1. Sign in and get token
curl -X POST http://localhost:8000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'

# 2. Copy the access_token from response

# 3. Test registration requests endpoint
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:8000/api/auth/registration-requests
```

If step 3 returns data (or empty array `[]`), your admin account is working correctly.

## Still Having Issues?

Check:
1. ✅ Backend server is running on port 8000
2. ✅ Frontend is connecting to correct API URL
3. ✅ User exists in Supabase Auth
4. ✅ User profile exists with RoleID = 1
5. ✅ You're signed in (token in localStorage)
6. ✅ Token hasn't expired (try signing in again)
7. ✅ Browser console shows no CORS errors
