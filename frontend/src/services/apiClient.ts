/**
 * API Client Configuration
 * Base configuration for all API calls to the FinKen backend
 */

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Token storage keys
export const TOKEN_STORAGE_KEY = 'finken_access_token';
export const REFRESH_TOKEN_STORAGE_KEY = 'finken_refresh_token';

/**
 * Get stored authentication token
 */
export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

/**
 * Store authentication token
 */
export const storeToken = (token: string): void => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

/**
 * Store refresh token
 */
export const storeRefreshToken = (refreshToken: string): void => {
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
};

/**
 * Remove stored tokens
 */
export const clearStoredTokens = (): void => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
};

/**
 * API Error response interface
 */
interface ApiErrorResponse {
  detail?: string;
  message?: string;
  [key: string]: any;
}
export class ApiError extends Error {
  public status: number;
  public data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * API Response interface
 */
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

/**
 * Request configuration interface
 */
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  requiresAuth?: boolean;
}

/**
 * Base API client with authentication handling
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Build full URL with base URL
   */
  private buildUrl(endpoint: string): string {
    // Remove leading slash if present to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.baseUrl}/${cleanEndpoint}`;
  }

  /**
   * Build request headers
   */
  private buildHeaders(config?: RequestConfig, body?: any): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // Only set Content-Type if not FormData (browser will set it with boundary for FormData)
    if (!(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Merge any custom headers (but allow them to override Content-Type if needed)
    if (config?.headers) {
      Object.assign(headers, config.headers);
    }

    // Add authorization header if token exists and auth is required
    if (config?.requiresAuth !== false) {
      const token = getStoredToken();
      console.log('buildHeaders - requiresAuth:', config?.requiresAuth, 'token exists:', !!token);
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        console.log('Added Authorization header');
      } else {
        console.warn('No token found in localStorage!');
      }
    }

    return headers;
  }

  /**
   * Make HTTP request
   */
  async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      requiresAuth = true,
    } = config;

    const url = this.buildUrl(endpoint);
    const headers = this.buildHeaders(config, body);

    const requestInit: RequestInit = {
      method,
      headers,
    };

    // Add body for non-GET requests
    if (body && method !== 'GET') {
      // If body is FormData or already a string, use it directly
      // Otherwise, stringify it for JSON
      if (body instanceof FormData || typeof body === 'string') {
        requestInit.body = body;
      } else {
        requestInit.body = JSON.stringify(body);
      }
    }

    // Debug logging
    console.log('API Request:', {
      method,
      url,
      requiresAuth,
      hasAuthHeader: !!headers.Authorization,
      authHeaderPreview: headers.Authorization?.substring(0, 30) + '...',
    });

    try {
      const response = await fetch(url, requestInit);
      
      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as unknown as T;
      }

      if (!response.ok) {
        const errorData = data as ApiErrorResponse;
        throw new ApiError(
          errorData?.detail || errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          data
        );
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new ApiError('Network error: Unable to connect to server', 0);
      }

      // Handle other errors
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        0
      );
    }
  }

  /**
   * Convenience methods
   */
  async get<T = any>(endpoint: string, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  async put<T = any>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  async patch<T = any>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }

  async delete<T = any>(endpoint: string, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

// Export default API client instance
export const apiClient = new ApiClient();

// Export class for creating additional instances if needed
export { ApiClient };