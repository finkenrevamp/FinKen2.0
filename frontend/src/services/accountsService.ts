/**
 * Accounts Service
 * Handles all API calls related to chart of accounts
 */

import { apiClient, ApiError } from './apiClient';

/**
 * Account data interface
 */
export interface AccountData {
  account_id: number;
  account_number: string;
  account_name: string;
  account_description?: string;
  normal_side: 'Debit' | 'Credit';
  category: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  subcategory?: string;
  initial_balance: string;
  display_order?: number;
  statement_type?: string;
  is_active: boolean;
  date_created: string;
  created_by_user_id: string;
  created_by_username?: string;
  comment?: string;
}

/**
 * Create account request interface
 */
export interface CreateAccountRequest {
  account_number: string;
  account_name: string;
  account_description?: string;
  normal_side: 'Debit' | 'Credit';
  category: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  subcategory?: string;
  initial_balance?: string;
  display_order?: number;
  statement_type?: string;
  comment?: string;
}

/**
 * Update account request interface
 */
export interface UpdateAccountRequest {
  account_number?: string;
  account_name?: string;
  account_description?: string;
  normal_side?: 'Debit' | 'Credit';
  category?: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  subcategory?: string;
  initial_balance?: string;
  display_order?: number;
  statement_type?: string;
  is_active?: boolean;
  comment?: string;
}

/**
 * Accounts Service Class
 */
class AccountsService {
  private basePath = '/accounts';

  /**
   * Get all accounts
   */
  async getAllAccounts(filters?: {
    is_active?: boolean;
    category?: string;
  }): Promise<AccountData[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.is_active !== undefined) {
        params.append('is_active', String(filters.is_active));
      }
      
      if (filters?.category) {
        params.append('category', filters.category);
      }
      
      const queryString = params.toString();
      const endpoint = queryString ? `${this.basePath}?${queryString}` : this.basePath;
      
      const response = await apiClient.get<AccountData[]>(endpoint);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw new Error('Failed to fetch accounts');
    }
  }

  /**
   * Get account by ID
   */
  async getAccount(accountId: number): Promise<AccountData> {
    try {
      const response = await apiClient.get<AccountData>(`${this.basePath}/${accountId}`);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw new Error('Failed to fetch account');
    }
  }

  /**
   * Create new account
   */
  async createAccount(accountData: CreateAccountRequest): Promise<AccountData> {
    try {
      const response = await apiClient.post<AccountData>(this.basePath, accountData);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw new Error('Failed to create account');
    }
  }

  /**
   * Update account
   */
  async updateAccount(accountId: number, accountData: UpdateAccountRequest): Promise<AccountData> {
    try {
      const response = await apiClient.patch<AccountData>(
        `${this.basePath}/${accountId}`,
        accountData
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw new Error('Failed to update account');
    }
  }

  /**
   * Deactivate account
   */
  async deactivateAccount(accountId: number): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete<{ message: string }>(
        `${this.basePath}/${accountId}`
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw new Error('Failed to deactivate account');
    }
  }

  /**
   * Get account ledger entries
   */
  async getAccountLedger(
    accountId: number,
    filters?: {
      start_date?: string;
      end_date?: string;
    }
  ): Promise<LedgerEntry[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.start_date) {
        params.append('start_date', filters.start_date);
      }
      
      if (filters?.end_date) {
        params.append('end_date', filters.end_date);
      }
      
      const queryString = params.toString();
      const endpoint = queryString 
        ? `${this.basePath}/${accountId}/ledger?${queryString}` 
        : `${this.basePath}/${accountId}/ledger`;
      
      const response = await apiClient.get<LedgerEntry[]>(endpoint);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw new Error('Failed to fetch account ledger');
    }
  }
}

/**
 * Ledger entry interface
 */
export interface LedgerEntry {
  ledger_id: number | null;
  date: string;
  post_ref: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
  post_timestamp: string;
}

// Export singleton instance
export const accountsService = new AccountsService();
