/**
 * Unit tests for Authentication Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../../services/authService';
import { apiClient } from '../../services/apiClient';

// Mock the apiClient
vi.mock('../../services/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  storeToken: vi.fn(),
  storeRefreshToken: vi.fn(),
  clearStoredTokens: vi.fn(),
  getStoredToken: vi.fn(),
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signIn', () => {
    it('should successfully sign in a user', async () => {
      const mockResponse = {
        data: {
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          user: {
            id: '123',
            Username: 'testuser',
            FirstName: 'Test',
            LastName: 'User',
            RoleID: 1,
            IsActive: true,
            DateCreated: new Date().toISOString(),
            role: {
              RoleID: 1,
              RoleName: 'Accountant',
            },
          },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const result = await authService.signIn({
        username: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.token).toBe('mock-token');
      expect(result.user.username).toBe('testuser');
    });

    it('should throw error on failed sign in', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(
        new Error('Invalid credentials')
      );

      await expect(
        authService.signIn({
          username: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('createRegistrationRequest', () => {
    it('should successfully create a registration request', async () => {
      const mockResponse = {
        data: {
          message: 'Registration request submitted successfully',
          request_id: 1,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const result = await authService.createRegistrationRequest({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        dateOfBirth: '1990-01-01',
        address: '123 Main St',
      });

      expect(result).toBe('Registration request submitted successfully');
      expect(apiClient.post).toHaveBeenCalledWith(
        '/auth/registration-request',
        expect.objectContaining({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
        }),
        expect.any(Object)
      );
    });

    it('should throw error on failed registration request', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(
        new Error('Email already exists')
      );

      await expect(
        authService.createRegistrationRequest({
          firstName: 'John',
          lastName: 'Doe',
          email: 'existing@example.com',
          dateOfBirth: '1990-01-01',
          address: '123 Main St',
        })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      const mockResponse = {
        data: { message: 'Signed out successfully' },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      await authService.signOut();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/signout');
    });

    it('should clear tokens even if backend call fails', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(
        new Error('Network error')
      );

      // Should not throw - cleanup should happen
      await expect(authService.signOut()).resolves.not.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const mockResponse = {
        data: {
          status: 'healthy',
          service: 'authentication',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await authService.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.service).toBe('authentication');
    });

    it('should throw error if service is unavailable', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      await expect(authService.healthCheck()).rejects.toThrow(
        'Authentication service is unavailable'
      );
    });
  });

  describe('initiateForgotPassword', () => {
    it('should return security question', async () => {
      const mockResponse = {
        data: {
          question_id: 1,
          question_text: 'What is your favorite color?',
          user_id: '123',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const result = await authService.initiateForgotPassword({
        email: 'test@example.com',
        username: 'testuser',
      });

      expect(result.question_id).toBe(1);
      expect(result.question_text).toBe('What is your favorite color?');
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password', async () => {
      const mockResponse = {
        data: {
          message: 'Password reset successfully',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const result = await authService.resetPassword({
        token: 'reset-token',
        new_password: 'newpassword123',
      });

      expect(result).toBe('Password reset successfully');
    });

    it('should throw error on invalid token', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(
        new Error('Invalid or expired token')
      );

      await expect(
        authService.resetPassword({
          token: 'invalid-token',
          new_password: 'newpassword123',
        })
      ).rejects.toThrow('Invalid or expired token');
    });
  });
});

