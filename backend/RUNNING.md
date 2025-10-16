# FinKen 2.0 Backend - Quick Start Guide

## Prerequisites

- Python 3.13 (or compatible version)
- Virtual environment activated
- Supabase account with project set up

## Environment Setup

1. **Create `.env` file** in the `backend` directory:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# SendGrid (optional - for email)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@finken.com
```

2. **Install Dependencies:**

```bash
cd backend
pip install -r requirements.txt
```

## Running the Server

### Option 1: Using the Run Script (Recommended)

```bash
cd backend
python run_server.py
```

Or with the virtual environment Python:

```bash
/Users/ethandillon/Projects/FinKen2.0/.venv/bin/python3 run_server.py
```

### Option 2: Using main.py directly

```bash
cd backend
python main.py
```

### Option 3: Using uvicorn directly

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Accessing the API

Once the server is running, you can access:

- **API Documentation (Swagger UI):** http://localhost:8000/api/docs
- **Alternative Docs (ReDoc):** http://localhost:8000/api/redoc  
- **API Root:** http://localhost:8000
- **Health Check:** http://localhost:8000/api/health

## Available Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/signin` - User sign in
- `POST /api/auth/signout` - User sign out
- `POST /api/auth/registration-request` - Create registration request
- `GET /api/auth/registration-requests` - List registration requests (admin)
- `POST /api/auth/approve-registration/{request_id}` - Approve registration (admin)
- `POST /api/auth/reject-registration/{request_id}` - Reject registration (admin)
- `POST /api/auth/forgot-password` - Send password reset email
- `GET /api/auth/profile` - Get current user profile
- `GET /api/auth/roles` - List all roles (admin)
- `GET /api/auth/health` - Auth service health check

### User Profiles (`/api/profiles`)
- `GET /api/profiles` - List all profiles (admin)
- `GET /api/profiles/{user_id}` - Get specific profile
- `PATCH /api/profiles/{user_id}` - Update profile (admin)
- `POST /api/profiles/{user_id}/suspend` - Suspend user (admin)
- `POST /api/profiles/{user_id}/activate` - Activate user (admin)

### Chart of Accounts (`/api/accounts`)
- Coming soon...

### Journal Entries (`/api/journal-entries`)
- Coming soon...

## Troubleshooting

### Import Errors

If you see "attempted relative import beyond top-level package", make sure you're running from the backend directory:

```bash
cd backend
python run_server.py
```

### Dependency Conflicts

If you encounter dependency conflicts with httpx and supabase:

```bash
pip install "httpx>=0.24.0,<0.25.0"
```

### Python Version Issues

If pydantic-core fails to build, you may need to use a compatible Python version (3.10-3.12) or use newer pydantic versions:

```bash
pip install "pydantic>=2.5.0"
```

### Virtual Environment Not Activated

Make sure you're using the correct Python from your virtual environment:

```bash
# Check which Python you're using
which python3

# Should point to: /Users/ethandillon/Projects/FinKen2.0/.venv/bin/python3
```

If not, activate the virtual environment:

```bash
source /Users/ethandillon/Projects/FinKen2.0/.venv/bin/activate
```

## Development Tips

### Auto-Reload

The server runs with auto-reload enabled by default. Any changes to Python files will automatically restart the server.

### Viewing Logs

Logs are printed to the console. To see more detailed logs:

```bash
uvicorn main:app --reload --log-level debug
```

### Testing API Endpoints

Use the Swagger UI at http://localhost:8000/api/docs to test endpoints interactively.

Or use curl:

```bash
# Health check
curl http://localhost:8000/api/health

# Sign in
curl -X POST http://localhost:8000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"yourpassword"}'
```

## Next Steps

1. Set up your Supabase project and configure environment variables
2. Initialize the database schema (run schema.sql)
3. Create initial roles using `init_roles.py`
4. Test the authentication endpoints
5. Start the frontend application

For frontend integration, see `/frontend/API_INTEGRATION.md`