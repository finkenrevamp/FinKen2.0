import { apiClient } from './apiClient';

export interface RetainedEarningsReport {
  period: {
    start_date: string;
    end_date: string;
    formatted_end_date: string;
  };
  beginning_retained_earnings: string;
  net_income: {
    total: string;
    revenue: {
      total: string;
      details: Array<{
        account_name: string;
        amount: string;
        type: string;
      }>;
    };
    expenses: {
      total: string;
      details: Array<{
        account_name: string;
        amount: string;
        type: string;
      }>;
    };
  };
  dividends: {
    total: string;
    details: Array<{
      date: string;
      description: string;
      amount: string;
    }>;
  };
  ending_retained_earnings: string;
  summary: {
    beginning_balance: string;
    add_net_income: string;
    less_dividends: string;
    ending_balance: string;
  };
}

export interface TrialBalanceReport {
  period: {
    start_date: string;
    end_date: string;
  };
  accounts: Array<{
    account_id: number;
    account_number: string;
    account_name: string;
    category: string;
    debit_balance: string;
    credit_balance: string;
  }>;
  total_debits: string;
  total_credits: string;
  is_balanced: boolean;
  difference: string;
}

export const reportsService = {
  /**
   * Get retained earnings report for a date range
   */
  async getRetainedEarnings(startDate: string, endDate: string): Promise<RetainedEarningsReport> {
    const response = await apiClient.get<RetainedEarningsReport>(
      `/reports/retained-earnings?start_date=${startDate}&end_date=${endDate}`
    );
    return response.data;
  },

  /**
   * Get trial balance report for a date range
   */
  async getTrialBalance(startDate: string, endDate: string): Promise<TrialBalanceReport> {
    const response = await apiClient.get<TrialBalanceReport>(
      `/reports/trial-balance?start_date=${startDate}&end_date=${endDate}`
    );
    return response.data;
  },
};

export default reportsService;
