# FinKen 2.0 Backend

This directory contains the FastAPI backend implementation for FinKen 2.0, a financial management system with role-based authentication.

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Setup Authentication System
```bash
# Complete setup (roles + first admin user)
python setup_auth.py

# Or manually:
python init_roles.py              # Initialize roles
python create_admin.py            # Create first admin user (interactive)
```

### 3. Configure Environment
Create a `.env` file with your Supabase credentials:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

### 4. Start the Server
```bash
python main.py
```

The API will be available at `http://localhost:8000` with documentation at `http://localhost:8000/api/docs`.

## Authentication Scripts

- `setup_auth.py` - Complete authentication system setup
- `init_roles.py` - Initialize default roles (Administrator, Manager, Accountant)
- `create_admin.py` - Interactive admin user creation
- `create_admin_quick.py` - Non-interactive admin user creation
- `test_auth.py` - Test authentication implementation

## API Endpoints

### Authentication (`/api/auth/`)
- `POST /signin` - User sign-in
- `POST /registration-request` - Submit registration request
- `GET /registration-requests` - Get requests (admin only)
- `POST /approve-registration/{id}` - Approve request (admin only)
- `POST /reject-registration/{id}` - Reject request (admin only)
- `GET /profile` - Get current user profile
- `POST /signout` - Sign out
- `GET /roles` - Get all roles (admin only)
- `GET /health` - Health check

### Other Modules
- `/api/accounts/` - Chart of Accounts (future)
- `/api/journal-entries/` - Journal Entries (future)
- `/api/profiles/` - User Profiles (future)

## Project Structure

```
backend/
├── models/           # Pydantic models
│   ├── auth.py      # Authentication models
│   ├── accounting.py # Accounting models
│   └── base.py      # Base model configurations
├── routes/          # FastAPI route handlers
│   ├── auth.py      # Authentication routes
│   ├── accounts.py  # Chart of accounts routes
│   └── profiles.py  # User profile routes
├── services/        # External service integrations
│   └── supabase.py  # Supabase client service
├── schema/          # Database schema
│   └── schema.sql   # PostgreSQL schema
├── main.py          # FastAPI application entry point
└── requirements.txt # Python dependencies
```

## Documentation

- `AUTH_IMPLEMENTATION.md` - Detailed authentication implementation guide
- Schema is defined in `schema/schema.sql`
- API documentation available at `/api/docs` when server is running

## Sprint Implementation Status

✅ **Sprint 1 (User Interface Module)** - Authentication and user management
- User roles (Administrator, Manager, Accountant)
- Secure sign-in with password validation
- Registration request workflow with admin approval
- Username generation and user management

🔄 **Sprint 2-5** - To be implemented
- Chart of Accounts Module
- Journalizing & Ledger Module  
- Adjusting entries and financial Reports
- Financial ratios and dashboard