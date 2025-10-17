export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  address?: string;
  email: string;
  role: 'Administrator' | 'Manager' | 'Accountant';
  profileImage?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface LoginCredentials {
  username: string; // This will be treated as email in the backend
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
  username: string;
}

export interface SecurityQuestionResponse {
  question_id: number;
  question_text: string;
  user_id: string;
}

export interface VerifySecurityAnswerRequest {
  email: string;
  username: string;
  security_answer: string;
}

export interface PasswordResetTokenResponse {
  token: string;
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface VerifyResetTokenResponse {
  valid: boolean;
  message?: string;
  error?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (user: User) => void;
  logout: () => void;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  createRegistrationRequest: (request: SignUpRequest) => Promise<string>;
  initiateForgotPassword: (request: ForgotPasswordRequest) => Promise<SecurityQuestionResponse>;
  verifySecurityAnswer: (request: VerifySecurityAnswerRequest) => Promise<PasswordResetTokenResponse>;
}