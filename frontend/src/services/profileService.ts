/**
 * Profile Service
 * Handles user profile and user management API calls
 */

import { apiClient } from './apiClient';

/**
 * User data interface matching backend UserWithEmail model
 */
export interface UserData {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  dob: string | null;
  address: string | null;
  profile_picture_url: string | null;
  role_id: number;
  role_name: string;
  is_active: boolean;
  is_suspended: boolean;
  suspension_end_date: string | null;
  date_created: string;
}

/**
 * Update user request interface
 */
export interface UpdateUserRequest {
  username?: string;
  first_name?: string;
  last_name?: string;
  dob?: string | null;
  address?: string | null;
  role_id?: number;
}

/**
 * Send email request interface
 */
export interface SendEmailRequest {
  subject: string;
  body: string;
}

/**
 * Suspend user request interface
 */
export interface SuspendUserRequest {
  suspension_end_date: string; // ISO date string
}

/**
 * Profile Service class
 */
export class ProfileService {
  /**
   * Get all users (admin only)
   */
  async getAllUsers(search?: string): Promise<UserData[]> {
    const endpoint = search 
      ? `profiles/users?search=${encodeURIComponent(search)}`
      : 'profiles/users';
    
    const response = await apiClient.get<UserData[]>(endpoint);
    return response.data;
  }

  /**
   * Get user by ID (admin only)
   */
  async getUserById(userId: string): Promise<UserData> {
    const response = await apiClient.get<UserData>(`profiles/users/${userId}`);
    return response.data;
  }

  /**
   * Update user information (admin only)
   */
  async updateUser(userId: string, updateData: UpdateUserRequest): Promise<{ message: string; user_id: string }> {
    const response = await apiClient.patch<{ message: string; user_id: string }>(
      `profiles/users/${userId}`,
      updateData
    );
    return response.data;
  }

  /**
   * Send email to user (admin only)
   */
  async sendEmailToUser(userId: string, emailData: SendEmailRequest): Promise<{ message: string; user_id: string; email: string }> {
    const response = await apiClient.post<{ message: string; user_id: string; email: string }>(
      `profiles/users/${userId}/send-email`,
      emailData
    );
    return response.data;
  }

  /**
   * Suspend user account (admin only)
   */
  async suspendUser(userId: string, suspensionEndDate: string): Promise<{ message: string; user_id: string; suspension_end_date: string }> {
    const response = await apiClient.post<{ message: string; user_id: string; suspension_end_date: string }>(
      `profiles/users/${userId}/suspend`,
      { suspension_end_date: suspensionEndDate }
    );
    return response.data;
  }

  /**
   * Unsuspend user account (admin only)
   */
  async unsuspendUser(userId: string): Promise<{ message: string; user_id: string }> {
    const response = await apiClient.post<{ message: string; user_id: string }>(
      `profiles/users/${userId}/unsuspend`
    );
    return response.data;
  }

  /**
   * Deactivate user account (admin only)
   */
  async deactivateUser(userId: string): Promise<{ message: string; user_id: string }> {
    const response = await apiClient.post<{ message: string; user_id: string }>(
      `profiles/users/${userId}/deactivate`
    );
    return response.data;
  }
}

// Export singleton instance
export const profileService = new ProfileService();

// Export as default for convenience
export default profileService;
