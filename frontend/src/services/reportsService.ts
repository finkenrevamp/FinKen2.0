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
};

export default reportsService;
