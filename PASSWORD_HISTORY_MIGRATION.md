# Password History Migration Guide

## Overview
This guide helps you migrate existing FinKen 2.0 installations to use the new password history feature.

## Prerequisites
- Python 3.8+ with bcrypt installed
- Access to Supabase database
- Backend server stopped during migration

## Step 1: Backup Database

Before making any changes, backup your database:

```bash
# Using Supabase CLI
supabase db dump > backup_$(date +%Y%m%d).sql

# Or use your preferred backup method
```

## Step 2: Verify Table Exists

Check if the `password_history` table already exists:

```sql
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'password_history'
);
```

If it doesn't exist, the table should already be created from your schema. If not, it's already in your schema.sql file.

## Step 3: Add Performance Indexes

Run the index creation script:

```bash
# Connect to your Supabase database and run:
cd backend/schema
cat password_history_indexes.sql
```

Or execute in SQL:

```sql
-- Index on user_id and created_at for efficient history queries
CREATE INDEX IF NOT EXISTS idx_password_history_user_created 
ON public.password_history(user_id, created_at DESC);

-- Index on user_id alone for user lookups
CREATE INDEX IF NOT EXISTS idx_password_history_user_id 
ON public.password_history(user_id);
```

## Step 4: Install Dependencies

Ensure bcrypt is installed:

```bash
cd backend
pip install bcrypt
```

Or update requirements.txt and reinstall:

```bash
echo "bcrypt>=4.0.0" >> requirements.txt
pip install -r requirements.txt
```

## Step 5: Test the Service

Run the test script to verify the password service works:

```bash
cd backend
python test_password_service.py
```

Expected output:
```
Testing Password History Service...
--------------------------------------------------

1. Testing password hashing...
✓ Password hashed successfully

2. Testing password verification...
✓ Password verification successful

3. Testing wrong password verification...
✓ Correctly rejected wrong password

==================================================
✓ All basic tests passed!
==================================================
```

## Step 6: Handle Existing Users

### Option A: No Action Required (Recommended)
Existing users can continue using the system normally. When they change their password for the first time, the system will:
1. Store their new password in history
2. Start tracking subsequent password changes
3. Enforce password reuse prevention going forward

**This is the simplest approach and requires no data migration.**

### Option B: Populate History for Existing Users (Advanced)
If you want to prevent users from reusing their CURRENT password immediately, you need to populate the history table. However, this is **NOT RECOMMENDED** because:
- Supabase passwords are already hashed and you can't access them
- You'd need users to change their passwords first
- It provides minimal security benefit

## Step 7: Update Frontend (If Applicable)

If you have a frontend password change form, update it to handle the new password history error:

```typescript
// Example error handling
try {
  await changePassword(currentPassword, newPassword);
} catch (error) {
  if (error.response?.data?.detail?.includes('last 5 passwords')) {
    // Show specific message about password reuse
    setError('You cannot reuse any of your last 5 passwords');
  } else {
    setError('Failed to change password');
  }
}
```

## Step 8: Restart Backend

Restart your FastAPI backend to load the new routes:

```bash
cd backend
python main.py

# Or using uvicorn directly
uvicorn main:app --reload
```

## Step 9: Verify Endpoints

Test the new endpoints are working:

```bash
# Health check
curl http://localhost:8000/api/health

# Check API docs
open http://localhost:8000/api/docs

# Look for these new endpoints:
# - POST /api/auth/change-password
# - POST /api/auth/reset-password
# - GET /api/profiles/password-history/count
# - GET /api/profiles/password-history/{user_id}/count
# - GET /api/profiles/password-history/{user_id}/latest
# - DELETE /api/profiles/password-history/{user_id}
```

## Step 10: Test End-to-End

Test the complete flow:

1. **Sign in as a test user**
2. **Change password** (should work)
3. **Try to change back to same password** (should fail)
4. **Sign in as admin**
5. **Check password history count** for test user

## Verification Checklist

- [ ] Database backup created
- [ ] password_history table exists
- [ ] Indexes created
- [ ] bcrypt installed
- [ ] Test script passes
- [ ] Backend restarts without errors
- [ ] New endpoints visible in /api/docs
- [ ] Password change works
- [ ] Password reuse prevention works
- [ ] Admin endpoints work (if admin user exists)

## Rollback Plan

If you need to rollback the changes:

1. **Stop the backend server**
2. **Restore code from git:**
   ```bash
   git checkout HEAD~1 -- backend/routes/auth.py
   git checkout HEAD~1 -- backend/main.py
   rm backend/services/password_service.py
   rm backend/routes/password_management.py
   ```

3. **Optionally drop the password_history table:**
   ```sql
   -- WARNING: This will delete all password history
   DROP TABLE IF EXISTS public.password_history CASCADE;
   ```

4. **Restart the backend**

Note: The table itself doesn't need to be dropped as it won't affect the application if the code isn't using it.

## Troubleshooting

### Error: "Module 'bcrypt' not found"
**Solution:** Install bcrypt
```bash
pip install bcrypt
```

### Error: "Table 'password_history' does not exist"
**Solution:** The table should already exist in your schema. Check if it's there:
```sql
\dt password_history
```

### Error: "Failed to store password in history"
**Solution:** Check database permissions:
```sql
-- Grant access to password_history table
GRANT ALL ON public.password_history TO your_role;
GRANT USAGE, SELECT ON SEQUENCE password_history_id_seq TO your_role;
```

### Password history count is 0 for all users
**Solution:** This is normal for existing users. The history will populate as they change passwords.

### Import errors in main.py
**Solution:** Ensure all new files are in the correct locations:
- `backend/services/password_service.py`
- `backend/routes/password_management.py`

## Configuration Options

### Change Password History Limit

Edit `backend/services/password_service.py`:

```python
# Change the default history limit from 5 to 10
def validate_and_store_password(
    self, 
    user_id: UUID, 
    new_password: str, 
    check_history: bool = True,
    history_limit: int = 10  # Changed from 5
):
```

Or pass it when calling the method:

```python
password_service.validate_and_store_password(
    user_id=user_id,
    new_password=new_password,
    check_history=True,
    history_limit=10
)
```

## Security Recommendations

1. **Enable password history immediately** - Don't delay this security feature
2. **Keep the default 5 password limit** - This is a good balance
3. **Monitor password change logs** - Use eventlogs table if available
4. **Regular security audits** - Check for unusual password change patterns
5. **User education** - Inform users about the password reuse policy

## Post-Migration Monitoring

Monitor these metrics after migration:

```sql
-- Check total password history entries
SELECT COUNT(*) FROM password_history;

-- Check users with password history
SELECT COUNT(DISTINCT user_id) FROM password_history;

-- Check recent password changes
SELECT user_id, created_at 
FROM password_history 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Check users with most password changes
SELECT user_id, COUNT(*) as password_changes
FROM password_history
GROUP BY user_id
ORDER BY password_changes DESC
LIMIT 10;
```

## Support

If you encounter issues:
1. Check logs: `tail -f backend/app.log`
2. Review documentation: `PASSWORD_HISTORY_IMPLEMENTATION.md`
3. Test service: `python test_password_service.py`
4. Check database: Verify table and indexes exist
