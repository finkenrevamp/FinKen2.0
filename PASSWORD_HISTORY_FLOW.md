# Password History Flow Diagram

## Account Creation Flow

```
User Submits Signup
        ↓
Validate Password Format
        ↓
Create User in Supabase Auth
        ↓
[PASSWORD MIDDLEWARE]
Store Hashed Password in password_history
        ↓
Create User Profile
        ↓
Complete Signup
```

## Password Change Flow

```
User Requests Password Change
        ↓
Verify Current Password
        ↓
Validate New Password Format
        ↓
[PASSWORD MIDDLEWARE]
        ├→ Get Last 5 Passwords from History
        ├→ Check if New Password Matches Any
        ├→ If Match Found → REJECT
        └→ If No Match → Continue
                ↓
Store New Password Hash in History
        ↓
Update Password in Supabase Auth
        ↓
Success Response
```

## Password Reset Flow

```
User Requests Password Reset
        ↓
Receive Reset Token via Email
        ↓
Submit New Password with Token
        ↓
Verify Reset Token
        ↓
Validate New Password Format
        ↓
[PASSWORD MIDDLEWARE]
        ├→ Get Last 5 Passwords from History
        ├→ Check if New Password Matches Any
        ├→ If Match Found → REJECT
        └→ If No Match → Continue
                ↓
Store New Password Hash in History
        ↓
Update Password in Supabase Auth
        ↓
Success Response
```

## Password History Middleware Layer

```
┌─────────────────────────────────────────────┐
│         Application Layer                   │
│  (Signup, Change Password, Reset Password)  │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│      PASSWORD MIDDLEWARE LAYER              │
│                                             │
│  PasswordHistoryService                     │
│  ├─ hash_password()                         │
│  ├─ verify_password()                       │
│  ├─ get_password_history()                  │
│  ├─ is_password_reused()                    │
│  └─ validate_and_store_password()           │
│                                             │
└────────┬────────────────────────┬───────────┘
         ↓                        ↓
┌─────────────────┐    ┌──────────────────────┐
│  Supabase Auth  │    │  password_history    │
│     (users)     │    │       Table          │
│                 │    │                      │
│  - email        │    │  - user_id           │
│  - password     │    │  - password_hash     │
│                 │    │  - created_at        │
└─────────────────┘    └──────────────────────┘
```

## Data Flow

### Storage:
```
Plain Password → bcrypt Hash → password_history Table
                              ↓
                    Supabase Auth (handled separately)
```

### Validation:
```
New Password 
    ↓
Get Last 5 Hashes from password_history
    ↓
Compare New Password against Each Hash
    ↓
├─ Match Found → Return Error
└─ No Match → Store Hash & Continue
```

## Security Layers

```
┌────────────────────────────────────┐
│  1. Password Format Validation     │ ← 8+ chars, letter, number, special
├────────────────────────────────────┤
│  2. Current Password Verification  │ ← Only for password changes
├────────────────────────────────────┤
│  3. Password History Check         │ ← Compare against last 5
├────────────────────────────────────┤
│  4. Bcrypt Hashing                 │ ← Secure one-way hashing
├────────────────────────────────────┤
│  5. Supabase Auth Storage          │ ← Separate auth system
├────────────────────────────────────┤
│  6. History Table Storage          │ ← Audit trail
└────────────────────────────────────┘
```

## Component Interaction

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐
│  Client  │────→│   FastAPI    │────→│  Password   │
│ (React)  │     │   Routes     │     │  Service    │
└──────────┘     └──────────────┘     └──────┬──────┘
                                              │
                                              ↓
                        ┌─────────────────────────────┐
                        │      Supabase               │
                        │  ┌──────────┐  ┌──────────┐ │
                        │  │   Auth   │  │ Database │ │
                        │  │  Table   │  │  Table   │ │
                        │  │ (users)  │  │(password_│ │
                        │  │          │  │ history) │ │
                        │  └──────────┘  └──────────┘ │
                        └─────────────────────────────┘
```

## Error Handling Flow

```
Password Change Request
        ↓
Try: Validate Password
        ├─ Fail → HTTP 400 (Invalid Format)
        └─ Pass ↓
Try: Verify Current Password
        ├─ Fail → HTTP 401 (Incorrect Password)
        └─ Pass ↓
Try: Check Password History
        ├─ Fail → HTTP 400 (Password Reused)
        └─ Pass ↓
Try: Store in History
        ├─ Fail → HTTP 500 (Storage Error)
        └─ Pass ↓
Try: Update Supabase Auth
        ├─ Fail → HTTP 500 (Update Error)
        └─ Pass ↓
Success → HTTP 200
```

## Database Schema Relationships

```
auth.users (Supabase)
    ├─ id (UUID) ←──────┐
    ├─ email            │
    └─ password_hash    │
                        │ (Foreign Key)
                        │
password_history        │
    ├─ id               │
    ├─ user_id ─────────┘
    ├─ password_hash
    └─ created_at

profiles
    ├─ id (UUID) ───────→ references auth.users(id)
    ├─ username
    ├─ first_name
    └─ ...
```
