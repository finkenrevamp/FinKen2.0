/**
 * Authentication API Service
 * Handles all authentication-related API calls to the FinKen backend
 */

import { apiClient, storeToken, storeRefreshToken, clearStoredTokens, getStoredToken } from './apiClient';
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
  DOB?: string;
  Address?: string;
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

interface BackendRegistrationRequest {
  RequestID: number;
  FirstName: string;
  LastName: string;
  DOB?: string;
  Address?: string;
  Email: string;
  RequestDate: string;
  Status: string;
  ReviewedByUserID?: string;
  ReviewDate?: string;
}

export interface RegistrationRequestData {
  id: string;
  requestId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth?: string;
  address?: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewDate?: string;
}

interface ApproveRequestPayload {
  role_id: number;
}

interface RejectRequestPayload {
  reason: string;
}

export interface SecurityQuestion {
  questionid: number;
  questiontext: string;
}

export interface VerifyInvitationResponse {
  valid: boolean;
  request_id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  error?: string;
}

interface CompleteSignupPayload {
  token: string;
  password: string;
  security_question_id: number;
  security_answer: string;
}

interface CompleteSignupResponse {
  message: string;
  username: string;
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
    dateOfBirth: profile.DOB,
    address: profile.Address,
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
        dob: request.dateOfBirth,
        address: request.address,
        email: request.email,
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

  /**
   * Get all registration requests (admin only)
   */
  async getRegistrationRequests(statusFilter?: string): Promise<RegistrationRequestData[]> {
    try {
      // Debug: Check if token exists
      const token = getStoredToken();
      console.log('Token exists for registration requests:', !!token);
      if (token) {
        console.log('Token preview:', token.substring(0, 20) + '...');
      }
      
      const url = statusFilter 
        ? `/auth/registration-requests?status_filter=${encodeURIComponent(statusFilter)}`
        : '/auth/registration-requests';
      
      console.log('Fetching registration requests from:', url);
      const response = await apiClient.get<BackendRegistrationRequest[]>(url);
      console.log('Registration requests response:', response);
      
      // Transform backend data to frontend format
      return response.data.map((req) => {
        // Parse status - backend may return "Rejected: reason" format
        let status: 'pending' | 'approved' | 'rejected' = 'pending';
        const statusLower = req.Status.toLowerCase();
        if (statusLower === 'approved') {
          status = 'approved';
        } else if (statusLower.startsWith('rejected')) {
          status = 'rejected';
        } else if (statusLower === 'pending') {
          status = 'pending';
        }
        
        return {
          id: req.RequestID.toString(),
          requestId: `REQ${req.RequestID.toString().padStart(3, '0')}`,
          name: `${req.FirstName} ${req.LastName}`,
          firstName: req.FirstName,
          lastName: req.LastName,
          email: req.Email,
          dateOfBirth: req.DOB,
          address: req.Address,
          requestDate: req.RequestDate,
          status,
          reviewedBy: req.ReviewedByUserID,
          reviewDate: req.ReviewDate,
        };
      });
    } catch (error) {
      console.error('Get registration requests error:', error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('An unexpected error occurred while fetching registration requests');
    }
  }

  /**
   * Approve a registration request (admin only)
   */
  async approveRegistrationRequest(
    requestId: number,
    roleId: number
  ): Promise<{ message: string; token: string }> {
    try {
      const payload: ApproveRequestPayload = {
        role_id: roleId,
      };

      const response = await apiClient.post<{ message: string; token: string }>(
        `/auth/approve-registration/${requestId}`,
        payload
      );

      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('An unexpected error occurred while approving registration request');
    }
  }

  /**
   * Reject a registration request (admin only)
   */
  async rejectRegistrationRequest(
    requestId: number,
    reason: string
  ): Promise<{ message: string }> {
    try {
      const payload: RejectRequestPayload = {
        reason: reason,
      };

      const response = await apiClient.post<{ message: string }>(
        `/auth/reject-registration/${requestId}`,
        payload
      );

      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('An unexpected error occurred while rejecting registration request');
    }
  }

  /**
   * Get all security questions (public endpoint)
   */
  async getSecurityQuestions(): Promise<SecurityQuestion[]> {
    try {
      const response = await apiClient.get<SecurityQuestion[]>(
        '/auth/security-questions',
        { requiresAuth: false }
      );

      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('An unexpected error occurred while fetching security questions');
    }
  }

  /**
   * Verify signup invitation token
   */
  async verifyInvitationToken(token: string): Promise<VerifyInvitationResponse> {
    try {
      const response = await apiClient.post<VerifyInvitationResponse>(
        `/auth/verify-invitation?token=${encodeURIComponent(token)}`,
        null,
        {
          requiresAuth: false
        }
      );

      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('An unexpected error occurred while verifying invitation token');
    }
  }

  /**
   * Complete signup with password and security question
   */
  async completeSignup(
    token: string,
    password: string,
    securityQuestionId: number,
    securityAnswer: string
  ): Promise<CompleteSignupResponse> {
    try {
      const payload: CompleteSignupPayload = {
        token,
        password,
        security_question_id: securityQuestionId,
        security_answer: securityAnswer,
      };

      const response = await apiClient.post<CompleteSignupResponse>(
        '/auth/complete-signup',
        payload,
        { requiresAuth: false }
      );

      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('An unexpected error occurred while completing signup');
    }
  }

  /**
   * Get all available roles (admin only)
   */
  async getRoles(): Promise<BackendRole[]> {
    try {
      const response = await apiClient.get<BackendRole[]>('/auth/roles');
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('An unexpected error occurred while fetching roles');
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export class for testing or additional instances
export { AuthService };