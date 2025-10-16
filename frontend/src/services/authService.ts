/**
 * Authentication API Service
 * Handles all authentication-related API calls to the FinKen backend
 */

import { apiClient, storeToken, storeRefreshToken, clearStoredTokens } from './apiClient';
import type { 
  LoginCredentials, 
  User, 
  SignUpRequest, 
  ForgotPasswordRequest 
} from '../types/auth';

// Backend API types to match the Pydantic models
interface BackendRole {
  RoleID: number;
  RoleName: string;
}

interface BackendProfile {
  id: string;
  Username: string;
  FirstName: string;
  LastName: string;
  ProfilePictureURL?: string;
  RoleID: number;
  IsActive: boolean;
  DateCreated: string;
  role?: BackendRole;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  user: BackendProfile;
}

interface RegistrationRequestResponse {
  message: string;
  request_id?: number;
}

interface SimpleMessageResponse {
  message: string;
}

/**
 * Transform backend profile to frontend user format
 */
const transformBackendProfileToUser = (profile: BackendProfile): User => {
  // Debug logging
  console.log('Backend profile received:', profile);
  console.log('Role from backend:', profile.role);
  console.log('RoleName from backend:', profile.role?.RoleName);
  
  // Map role name to frontend role type (case-insensitive matching, returns proper case)
  const getRoleFromName = (roleName?: string): 'Administrator' | 'Manager' | 'Accountant' => {
    if (!roleName) {
      console.warn('No role name provided, defaulting to Accountant');
      return 'Accountant';
    }
    
    const normalizedRole = roleName.toLowerCase().trim();
    console.log('Normalized role:', normalizedRole);
    
    if (normalizedRole === 'administrator') return 'Administrator';
    if (normalizedRole === 'manager') return 'Manager';
    if (normalizedRole === 'accountant') return 'Accountant';
    
    // Default to Accountant if role not recognized
    console.warn(`Unknown role: ${roleName}, defaulting to Accountant`);
    return 'Accountant';
  };

  const mappedRole = getRoleFromName(profile.role?.RoleName);
  console.log('Mapped role:', mappedRole);

  return {
    id: profile.id,
    username: profile.Username,
    firstName: profile.FirstName,
    lastName: profile.LastName,
    email: '', // Email is not included in the profile response, would need separate call
    role: mappedRole,
    profileImage: profile.ProfilePictureURL,
    isActive: profile.IsActive,
    createdAt: profile.DateCreated,
    lastLogin: new Date().toISOString(), // Set current time as last login
  };
};

/**
 * Authentication Service
 */
class AuthService {
  /**
   * Sign in user with email and password
   */
  async signIn(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    try {
      // For the login, we need to use email instead of username
      // The frontend currently uses username, but the backend expects email
      // We'll assume username is actually email for now
      const loginRequest: LoginRequest = {
        email: credentials.username, // Treating username as email
        password: credentials.password,
      };

      const response = await apiClient.post<LoginResponse>('/auth/signin', loginRequest, {
        requiresAuth: false,
      });

      const { access_token, refresh_token, user: backendUser } = response.data;

      // Store tokens
      storeToken(access_token);
      if (refresh_token) {
        storeRefreshToken(refresh_token);
      }

      // Transform backend user to frontend format
      const user = transformBackendProfileToUser(backendUser);

      return { user, token: access_token };
    } catch (error) {
      // Re-throw with more specific error messages
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('An unexpected error occurred during sign-in');
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    try {
      // Call backend signout endpoint
      await apiClient.post<SimpleMessageResponse>('/auth/signout');
    } catch (error) {
      // Continue with local cleanup even if backend call fails
      console.error('Error during backend signout:', error);
    } finally {
      // Always clear local storage
      clearStoredTokens();
    }
  }

  /**
   * Create registration request
   */
  async createRegistrationRequest(request: SignUpRequest): Promise<string> {
    try {
      const registrationRequest = {
        first_name: request.firstName,
        last_name: request.lastName,
        email: request.email,
        // Note: The backend doesn't include dateOfBirth and address in the registration request
        // These fields might be handled differently or stored elsewhere
      };

      const response = await apiClient.post<RegistrationRequestResponse>(
        '/auth/registration-request',
        registrationRequest,
        { requiresAuth: false }
      );

      return response.data.message;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('An unexpected error occurred while creating registration request');
    }
  }

  /**
   * Send forgot password email
   */
  async forgotPassword(request: ForgotPasswordRequest): Promise<string> {
    try {
      // The backend expects email as a query parameter
      const response = await apiClient.post<SimpleMessageResponse>(
        `/auth/forgot-password?email=${encodeURIComponent(request.email)}`,
        null,
        { requiresAuth: false }
      );

      return response.data.message || 'Password reset email sent successfully';
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('An unexpected error occurred while sending password reset email');
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentProfile(): Promise<User> {
    try {
      const response = await apiClient.get<BackendProfile>('/auth/profile');
      return transformBackendProfileToUser(response.data);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('An unexpected error occurred while fetching user profile');
    }
  }

  /**
   * Health check for authentication service
   */
  async healthCheck(): Promise<{ status: string; service: string }> {
    try {
      const response = await apiClient.get<{ status: string; service: string }>('/auth/health', {
        requiresAuth: false,
      });
      return response.data;
    } catch (error) {
      throw new Error('Authentication service is unavailable');
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export class for testing or additional instances
export { AuthService };