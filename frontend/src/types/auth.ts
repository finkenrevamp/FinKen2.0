export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'administrator' | 'manager' | 'accountant';
  profileImage?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface SignUpRequest {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  address: string;
}

export interface FinishSignUpData {
  username: string;
  password: string;
  confirmPassword: string;
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
  userId: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}