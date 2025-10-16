# FinKen 2.0 Frontend-Backend Integration

This document describes the integration between the FinKen 2.0 frontend and backend APIs.

## API Service Architecture

### File Structure

```
frontend/src/services/
├── index.ts              # Main exports for all services
├── apiClient.ts          # Base API client with authentication
└── authService.ts        # Authentication-specific API calls
```

### API Client (`apiClient.ts`)

The base API client provides:
- Centralized configuration for API calls
- Automatic JWT token handling
- Request/response intercepting
- Error handling with structured error types
- Support for different HTTP methods

**Key Features:**
- Automatic authorization header injection
- Token storage in localStorage
- Structured error handling with `ApiError` class
- Base URL configuration via environment variables

### Authentication Service (`authService.ts`)

Handles all authentication-related API calls:

#### Available Methods:

1. **`signIn(credentials: LoginCredentials)`**
   - Endpoint: `POST /auth/signin`
   - Authenticates user with email/password
   - Stores JWT tokens
   - Returns user profile and token

2. **`signOut()`**
   - Endpoint: `POST /auth/signout`
   - Clears local tokens
   - Signs out from backend

3. **`createRegistrationRequest(request: SignUpRequest)`**
   - Endpoint: `POST /auth/registration-request`
   - Creates new user registration request
   - Returns success message

4. **`forgotPassword(request: ForgotPasswordRequest)`**
   - Endpoint: `POST /auth/forgot-password`
   - Sends password reset email
   - Returns confirmation message

5. **`getCurrentProfile()`**
   - Endpoint: `GET /auth/profile`
   - Fetches current user's profile
   - Requires authentication

6. **`healthCheck()`**
   - Endpoint: `GET /auth/health`
   - Checks service availability
   - No authentication required

## Frontend Integration

### AuthContext Integration

The `AuthContext` has been enhanced to use the API service:

```typescript
import { useAuth } from '../contexts/AuthContext';

const { signIn, signOut, createRegistrationRequest, forgotPassword } = useAuth();
```

### Updated Components

#### SignIn Component
- Uses real API authentication
- Validates email format
- Handles loading states and errors
- Automatic navigation on success

#### SignUp Component  
- Creates registration requests via API
- Form validation
- Success/error handling

#### ForgotPassword Component
- Simplified to email-only password reset
- Uses Supabase's built-in password reset flow
- Clean success/error messaging

## Environment Configuration

### Environment Variables

Create `.env` files in the frontend directory:

```bash
# .env or .env.development
VITE_API_URL=http://localhost:8000/api
```

### Backend CORS Configuration

The backend is configured to allow requests from:
- `http://localhost:3000` (React dev server)
- `http://localhost:5173` (Vite dev server)

## Data Flow

### Authentication Flow

1. User enters credentials in SignIn form
2. Frontend calls `authService.signIn()`
3. API client sends POST to `/auth/signin`
4. Backend validates credentials with Supabase
5. Backend returns JWT token and user profile
6. Frontend stores token and updates auth state
7. User is redirected to dashboard

### Registration Flow

1. User fills out registration form
2. Frontend calls `authService.createRegistrationRequest()`
3. Backend creates pending registration request
4. Admin receives notification (future feature)
5. Admin approves/rejects request
6. User receives email with credentials

### Password Reset Flow

1. User enters email in forgot password form
2. Frontend calls `authService.forgotPassword()`
3. Backend triggers Supabase password reset email
4. User receives email with reset link
5. User completes reset in Supabase-hosted flow

## Error Handling

### Structured Errors

All API errors are wrapped in the `ApiError` class:

```typescript
class ApiError extends Error {
  public status: number;
  public data?: any;
}
```

### Error Display

- Authentication errors show in form alerts
- Network errors show user-friendly messages
- Validation errors highlight specific fields

## Token Management

### Storage
- Access tokens stored in `localStorage`
- Refresh tokens stored separately
- Automatic cleanup on signout

### Automatic Headers
- All authenticated requests include `Authorization: Bearer <token>`
- Token validation happens on app startup
- Invalid tokens trigger automatic signout

## Testing the Integration

### Prerequisites

1. **Backend Running:**
   ```bash
   cd backend
   python main.py
   ```

2. **Frontend Running:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Environment Variables Set:**
   - Backend: Supabase credentials in `.env`
   - Frontend: API URL in `.env`

### Test Scenarios

1. **Sign In:**
   - Use valid email/password credentials
   - Check network tab for API calls
   - Verify token storage in localStorage
   - Confirm navigation to dashboard

2. **Registration Request:**
   - Fill out registration form
   - Verify API call to create request
   - Check success message display

3. **Forgot Password:**
   - Enter valid email address
   - Verify API call and success message
   - Check email for reset link

4. **Error Handling:**
   - Try invalid credentials
   - Test network disconnection
   - Verify error message display

## Future Enhancements

1. **Token Refresh:** Implement automatic token refresh
2. **Offline Support:** Add service worker for offline capability
3. **Request Caching:** Cache non-sensitive API responses
4. **Request Retries:** Automatic retry for failed requests
5. **Loading Indicators:** Global loading state management
6. **Interceptors:** Request/response logging and monitoring

## Security Considerations

1. **Token Storage:** Consider secure storage alternatives
2. **HTTPS:** Ensure HTTPS in production
3. **CORS:** Restrict CORS origins in production
4. **Validation:** Always validate on both client and server
5. **Error Messages:** Don't expose sensitive information

## Troubleshooting

### Common Issues

1. **CORS Errors:**
   - Check backend CORS configuration
   - Verify frontend URL is whitelisted

2. **Authentication Failures:**
   - Check Supabase credentials
   - Verify user exists and is active

3. **Network Errors:**
   - Confirm backend is running
   - Check API URL configuration

4. **Token Issues:**
   - Clear localStorage
   - Check token expiration
   - Verify JWT format

### Debug Tools

1. **Browser DevTools:**
   - Network tab for API calls
   - Application tab for localStorage
   - Console for error messages

2. **Backend Logs:**
   - Check FastAPI logs
   - Monitor Supabase dashboard

3. **API Testing:**
   - Use Postman or curl
   - Test endpoints directly
   - Verify request/response format