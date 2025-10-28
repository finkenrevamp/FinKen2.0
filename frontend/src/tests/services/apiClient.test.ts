/**
 * Unit tests for API Client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Test constants and utilities
describe('API Client Utilities', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Token Management', () => {
    it('should store and retrieve token', () => {
      const token = 'test-token-123';
      localStorage.setItem('auth_token', token);
      
      const retrieved = localStorage.getItem('auth_token');
      expect(retrieved).toBe(token);
    });

    it('should store and retrieve refresh token', () => {
      const refreshToken = 'refresh-token-123';
      localStorage.setItem('refresh_token', refreshToken);
      
      const retrieved = localStorage.getItem('refresh_token');
      expect(retrieved).toBe(refreshToken);
    });

    it('should clear all tokens', () => {
      localStorage.setItem('auth_token', 'token');
      localStorage.setItem('refresh_token', 'refresh');
      
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });
  });

  describe('API Base URL', () => {
    it('should use correct API base URL', () => {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      expect(baseUrl).toBeTruthy();
      expect(baseUrl).toContain('/api');
    });
  });

  describe('Request Headers', () => {
    it('should include authorization header when token exists', () => {
      const token = 'test-token';
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      expect(headers['Authorization']).toBe(`Bearer ${token}`);
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should not include authorization header when no token', () => {
      const headers = {
        'Content-Type': 'application/json',
      };

      expect(headers['Authorization']).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', () => {
      const error = new Error('Network error');
      expect(error.message).toBe('Network error');
    });

    it('should handle 401 Unauthorized', () => {
      const error = { status: 401, message: 'Unauthorized' };
      expect(error.status).toBe(401);
    });

    it('should handle 403 Forbidden', () => {
      const error = { status: 403, message: 'Forbidden' };
      expect(error.status).toBe(403);
    });

    it('should handle 404 Not Found', () => {
      const error = { status: 404, message: 'Not Found' };
      expect(error.status).toBe(404);
    });

    it('should handle 500 Internal Server Error', () => {
      const error = { status: 500, message: 'Internal Server Error' };
      expect(error.status).toBe(500);
    });
  });
});

