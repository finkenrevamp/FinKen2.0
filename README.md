# FinKen 2.0 - Financial Management System

A comprehensive financial management and accounting system built with modern web technologies.

## 🏗️ Architecture

**Frontend**: React + TypeScript + Vite + Material UI + TailwindCSS  
**Backend**: FastAPI + Python + Pydantic  
**Database**: Supabase (PostgreSQL)  
**Authentication**: Supabase Auth  

## 📁 Project Structure

```
FinKen2.0/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API service functions
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── package.json
├── backend/                 # FastAPI backend application
│   ├── models/             # Pydantic models
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic services
│   ├── schema/             # Database schema
│   ├── main.py             # FastAPI application entry point
│   └── requirements.txt    # Python dependencies
├── .env                    # Environment variables
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.9 or higher)
- **npm** or **yarn**
- **Git**

### 1. Clone the Repository

```bash
git clone <repository-url>
cd FinKen2.0
```

### 2. Environment Configuration

Copy the environment file and update with your Supabase credentials:

```bash
cp .env.example .env
```

Update the `.env` file with your Supabase project credentials:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

# SendGrid Configuration (for email services)
SENDGRID_API_KEY=your_sendgrid_api_key
```

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
source venv/bin/activate  
# On Windows: 
source venv/Scripts/activate

# Install dependencies
pip install -r requirements.txt

# Start the development server
python run_server.py
```

The backend API will be available at `http://localhost:8000`
- API Documentation: `http://localhost:8000/api/docs`
- Alternative docs: `http://localhost:8000/api/redoc`

### 4. Frontend Setup

```bash
# Navigate to frontend directory (in a new terminal)
cd frontend

# Install dependencies
npm install

# Start the development server
npm run start:frontend

or

npm run dev
```

The frontend application will be available at `http://localhost:5173`

## 🗄️ Database Schema

The system uses the following main entities:

### Core Tables

- **profiles** - User profiles and account information
- **roles** - User role definitions
- **chartofaccounts** - Chart of accounts structure
- **journalentries** - Financial journal entries
- **journalentrylines** - Individual debit/credit lines
- **accountledger** - Account transaction ledger
- **journalattachments** - File attachments for journal entries

### System Tables

- **registrationrequests** - User registration requests
- **eventlogs** - Audit trail and system events
- **errormessages** - System error definitions

## 🔑 Key Features

### Authentication & Authorization
- ✅ Supabase Auth integration
- ✅ Role-based access control
- ✅ User profile management
- ✅ Registration request system

### Accounting Core
- ✅ Chart of Accounts management
- ✅ Journal Entry creation and approval
- ✅ Double-entry bookkeeping
- ✅ Account ledger tracking
- ✅ File attachments support

### System Features
- ✅ Comprehensive audit logging
- ✅ Error handling and logging
- ✅ RESTful API design
- ✅ Modern responsive UI

## 🛠️ Development

### Backend Development

The backend uses FastAPI with the following structure:

- **Models** (`/models`): Pydantic models for data validation
- **Routes** (`/routes`): API endpoint definitions
- **Services** (`/services`): Business logic and database operations

### Frontend Development

The frontend is built with React and uses:

- **Material UI**: Component library for consistent UI
- **TailwindCSS**: Utility-first CSS framework
- **TypeScript**: Type safety and better development experience
- **Vite**: Fast build tool and dev server

### Code Quality

- Use TypeScript for frontend development
- Follow Python PEP 8 style guide for backend
- Use Pydantic for data validation
- Implement proper error handling
- Write comprehensive tests

## 📝 API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`

### Main API Endpoints

```
Authentication:
POST /api/auth/login      # User login
POST /api/auth/register   # User registration
GET  /api/auth/me         # Current user profile

Accounts:
GET    /api/accounts/           # List accounts
POST   /api/accounts/           # Create account
GET    /api/accounts/{id}       # Get account details
PUT    /api/accounts/{id}       # Update account
DELETE /api/accounts/{id}       # Delete account

Journal Entries:
GET    /api/journal-entries/    # List journal entries
POST   /api/journal-entries/    # Create journal entry
GET    /api/journal-entries/{id} # Get journal entry
PUT    /api/journal-entries/{id} # Update journal entry
POST   /api/journal-entries/{id}/approve # Approve entry
```

## 🧪 Testing

The project includes comprehensive test suites for both backend and frontend.

### Quick Test Commands

**Run All Tests:**
```bash
./run_all_tests.sh
```

**Backend Tests (Python/Pytest):**
```bash
cd backend
python3 -m pytest                    # Run all tests
python3 -m pytest -v                 # Verbose output
python3 -m pytest --cov=.            # With coverage report
```

**Frontend Tests (Vitest):**
```bash
cd frontend
npm test                             # Run all tests
npm test -- --watch                  # Watch mode
npm run test:ui                      # With UI
npm run test:coverage                # With coverage report
```

### Test Coverage

**Backend (35 tests):**
- ✅ Model validation tests (14 tests)
- ✅ Password service tests (13 tests)
- ✅ API route tests (8 tests)

**Frontend:**
- ✅ Authentication service tests
- ✅ API client utility tests
- ✅ Component rendering tests
- ✅ Validation utility tests


## 🚢 Deployment

### Backend Deployment
1. Set up production environment variables
2. Install dependencies: `pip install -r requirements.txt`
3. Run with production ASGI server: `uvicorn main:app --host 0.0.0.0 --port 8000`

### Frontend Deployment
1. Build the application: `npm run build`
2. Serve the `dist` folder with a web server

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation in `/docs`

## 🏷️ Version History

- **v2.0.0** - Complete rewrite with modern tech stack
- **v1.x** - Legacy version (deprecated)
