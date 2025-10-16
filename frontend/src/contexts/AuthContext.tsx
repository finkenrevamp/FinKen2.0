import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthState, AuthContextType, LoginCredentials, SignUpRequest, ForgotPasswordRequest } from '../types/auth';
import { authService, getStoredToken } from '../services';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true, // Start with loading to check for existing token
    error: null,
  });

  // Check for existing token on app start
  useEffect(() => {
    const checkExistingAuth = async () => {
      const token = getStoredToken();
      if (token) {
        try {
          // Verify token is valid by fetching current profile
          const user = await authService.getCurrentProfile();
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          // Token is invalid, clear it
          await authService.signOut();
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    };

    checkExistingAuth();
  }, []);

  const login = (user: User) => {
    setAuthState({
      user,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  };

  const logout = () => {
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  };

  const signIn = async (credentials: LoginCredentials): Promise<void> => {
    setAuthState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const { user } = await authService.signIn(credentials);
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign-in';
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
      throw error; // Re-throw so components can handle the error
    }
  };

  const signOut = async (): Promise<void> => {
    setAuthState(prev => ({
      ...prev,
      isLoading: true,
    }));

    try {
      await authService.signOut();
    } catch (error) {
      console.error('Error during signout:', error);
    } finally {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  };

  const createRegistrationRequest = async (request: SignUpRequest): Promise<string> => {
    try {
      return await authService.createRegistrationRequest(request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during registration';
      setAuthState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const forgotPassword = async (request: ForgotPasswordRequest): Promise<string> => {
    try {
      return await authService.forgotPassword(request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while sending password reset email';
      setAuthState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    signIn,
    signOut,
    createRegistrationRequest,
    forgotPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};