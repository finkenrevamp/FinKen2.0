/**
 * Journal Entries Service
 * Handles all API calls related to journal entries
 */

import { apiClient, ApiError } from './apiClient';

/**
 * Journal entry interface
 */
export interface JournalEntry {
  journal_entry_id: number;
  entry_date: string;
  description?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  is_adjusting_entry: boolean;
  created_by_user_id: string;
  created_by_username: string;
  creation_date: string;
  approved_by_user_id?: string;
  approved_by_username?: string;
  approval_date?: string;
  rejection_reason?: string;
  lines: JournalEntryLine[];
  attachments?: JournalAttachment[];
}

/**
 * Journal entry line interface
 */
export interface JournalEntryLine {
  line_id: number;
  journal_entry_id: number;
  account_id: number;
  account_number: string;
  account_name: string;
  type: 'Debit' | 'Credit';
  amount: string;
}

/**
 * Journal attachment interface
 */
export interface JournalAttachment {
  attachment_id: number;
  journal_entry_id: number;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  uploaded_by_user_id: string;
  uploaded_by_username?: string;
  upload_timestamp: string;
}

/**
 * Create journal entry request interface
 */
export interface CreateJournalEntryRequest {
  entry_date: string;
  description?: string;
  is_adjusting_entry?: boolean;
  lines: {
    account_id: number;
    type: 'Debit' | 'Credit';
    amount: string;
  }[];
}

/**
 * Update journal entry request interface
 */
export interface UpdateJournalEntryRequest {
  entry_date?: string;
  description?: string;
  is_adjusting_entry?: boolean;
  lines?: {
    account_id: number;
    type: 'Debit' | 'Credit';
    amount: string;
  }[];
}

/**
 * Journal Entries Service Class
 */
class JournalEntriesService {
  private basePath = '/journal-entries';

  /**
   * Get all journal entries
   */
  async getAllJournalEntries(filters?: {
    status?: string;
    start_date?: string;
    end_date?: string;
    created_by?: string;
  }): Promise<JournalEntry[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.status) {
        params.append('status', filters.status);
      }
      
      if (filters?.start_date) {
        params.append('start_date', filters.start_date);
      }
      
      if (filters?.end_date) {
        params.append('end_date', filters.end_date);
      }
      
      if (filters?.created_by) {
        params.append('created_by', filters.created_by);
      }
      
      const queryString = params.toString();
      const endpoint = queryString ? `${this.basePath}?${queryString}` : this.basePath;
      
      const response = await apiClient.get<JournalEntry[]>(endpoint);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw new Error('Failed to fetch journal entries');
    }
  }

  /**
   * Get journal entry by ID
   */
  async getJournalEntry(journalEntryId: number): Promise<JournalEntry> {
    try {
      const response = await apiClient.get<JournalEntry>(`${this.basePath}/${journalEntryId}`);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw new Error('Failed to fetch journal entry');
    }
  }

  /**
   * Create new journal entry
   */
  async createJournalEntry(entryData: CreateJournalEntryRequest): Promise<JournalEntry> {
    try {
      const response = await apiClient.post<JournalEntry>(this.basePath, entryData);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw new Error('Failed to create journal entry');
    }
  }

  /**
   * Update journal entry
   */
  async updateJournalEntry(
    journalEntryId: number,
    entryData: UpdateJournalEntryRequest
  ): Promise<JournalEntry> {
    try {
      const response = await apiClient.patch<JournalEntry>(
        `${this.basePath}/${journalEntryId}`,
        entryData
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw new Error('Failed to update journal entry');
    }
  }

  /**
   * Approve journal entry
   */
  async approveJournalEntry(journalEntryId: number): Promise<JournalEntry> {
    try {
      const response = await apiClient.post<JournalEntry>(
        `${this.basePath}/${journalEntryId}/approve`
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw new Error('Failed to approve journal entry');
    }
  }

  /**
   * Reject journal entry
   */
  async rejectJournalEntry(
    journalEntryId: number,
    rejectionReason: string
  ): Promise<JournalEntry> {
    try {
      const response = await apiClient.post<JournalEntry>(
        `${this.basePath}/${journalEntryId}/reject`,
        { rejection_reason: rejectionReason }
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw new Error('Failed to reject journal entry');
    }
  }

  /**
   * Delete journal entry
   */
  async deleteJournalEntry(journalEntryId: number): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete<{ message: string }>(
        `${this.basePath}/${journalEntryId}`
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw new Error('Failed to delete journal entry');
    }
  }
}

// Export singleton instance
export const journalEntriesService = new JournalEntriesService();
