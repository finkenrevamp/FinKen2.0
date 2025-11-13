/**
 * Financial Ratios Calculation and Color Coding Utility
 * Calculates financial ratios from Income Statement and Balance Sheet data
 * and determines color coding based on normal ranges
 */

export interface FinancialRatios {
  // Profitability Ratios
  netProfitMargin: number | null;
  returnOnAssets: number | null;
  returnOnEquity: number | null;
  
  // Liquidity Ratios
  currentRatio: number | null;
  
  // Leverage Ratios
  debtToAssets: number | null;
  debtToEquity: number | null;
  longTermDebtToEquity: number | null;
}

export type RatioStatus = 'good' | 'warning' | 'critical';

export interface RatioWithStatus {
  value: number | null;
  status: RatioStatus;
  label: string;
  formula: string;
  normalRange: string;
}

/**
 * Calculate financial ratios from Income Statement and Balance Sheet data
 */
export function calculateFinancialRatios(
  incomeStatement: {
    revenue: { total: string };
    expenses: { total: string };
    net_income: string;
  },
  balanceSheet: {
    assets: Array<{ account_name: string; amount: string }>;
    liabilities: Array<{ account_name: string; amount: string }>;
    equity: Array<{ account_name: string; amount: string }>;
    total_assets: string;
  }
): FinancialRatios {
  const revenue = parseFloat(incomeStatement.revenue.total) || 0;
  const expenses = parseFloat(incomeStatement.expenses.total) || 0;
  const netIncome = parseFloat(incomeStatement.net_income) || 0;
  const totalAssets = parseFloat(balanceSheet.total_assets) || 0;
  
  // Calculate totals from arrays
  const totalLiabilities = balanceSheet.liabilities.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );
  
  const totalEquity = balanceSheet.equity.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );
  
  // Calculate current assets and current liabilities
  // Identify current assets (typically cash, receivables, inventory)
  const currentAssets = balanceSheet.assets
    .filter(asset => {
      const name = asset.account_name.toLowerCase();
      return (
        name.includes('cash') ||
        name.includes('receivable') ||
        name.includes('inventory') ||
        name.includes('current')
      );
    })
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  const currentLiabilities = balanceSheet.liabilities
    .filter(liability => {
      const name = liability.account_name.toLowerCase();
      return (
        name.includes('payable') ||
        name.includes('current') ||
        name.includes('short-term')
      );
    })
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  // Calculate long-term liabilities
  const longTermLiabilities = balanceSheet.liabilities
    .filter(liability => {
      const name = liability.account_name.toLowerCase();
      return (
        name.includes('long-term') ||
        name.includes('loan') ||
        name.includes('note') ||
        (!name.includes('payable') && !name.includes('current') && !name.includes('short-term'))
      );
    })
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  // Profitability Ratios
  const netProfitMargin = revenue !== 0 ? (netIncome / revenue) * 100 : null;
  const returnOnAssets = totalAssets !== 0 ? (netIncome / totalAssets) * 100 : null;
  const returnOnEquity = totalEquity !== 0 ? (netIncome / totalEquity) * 100 : null;
  
  // Liquidity Ratios
  const currentRatio = currentLiabilities !== 0 ? currentAssets / currentLiabilities : null;
  
  // Leverage Ratios
  const debtToAssets = totalAssets !== 0 ? (totalLiabilities / totalAssets) * 100 : null;
  const debtToEquity = totalEquity !== 0 ? totalLiabilities / totalEquity : null;
  const longTermDebtToEquity = totalEquity !== 0 ? longTermLiabilities / totalEquity : null;
  
  return {
    netProfitMargin,
    returnOnAssets,
    returnOnEquity,
    currentRatio,
    debtToAssets,
    debtToEquity,
    longTermDebtToEquity,
  };
}

/**
 * Get status color for a ratio based on normal ranges
 */
export function getRatioStatus(ratioName: keyof FinancialRatios, value: number | null): RatioStatus {
  if (value === null || isNaN(value)) {
    return 'warning';
  }
  
  switch (ratioName) {
    case 'netProfitMargin':
      // Good: >10%, Warning: 5-10%, Critical: <5%
      if (value > 10) return 'good';
      if (value >= 5) return 'warning';
      return 'critical';
    
    case 'returnOnAssets':
      // Good: >5%, Warning: 2-5%, Critical: <2%
      if (value > 5) return 'good';
      if (value >= 2) return 'warning';
      return 'critical';
    
    case 'returnOnEquity':
      // Good: >15%, Warning: 10-15%, Critical: <10%
      if (value > 15) return 'good';
      if (value >= 10) return 'warning';
      return 'critical';
    
    case 'currentRatio':
      // Good: >1.5, Warning: 1.0-1.5, Critical: <1.0
      if (value > 1.5) return 'good';
      if (value >= 1.0) return 'warning';
      return 'critical';
    
    case 'debtToAssets':
      // Good: <40%, Warning: 40-60%, Critical: >60%
      if (value < 40) return 'good';
      if (value <= 60) return 'warning';
      return 'critical';
    
    case 'debtToEquity':
      // Good: <1.0, Warning: 1.0-2.0, Critical: >2.0
      if (value < 1.0) return 'good';
      if (value <= 2.0) return 'warning';
      return 'critical';
    
    case 'longTermDebtToEquity':
      // Good: <0.5, Warning: 0.5-1.0, Critical: >1.0
      if (value < 0.5) return 'good';
      if (value <= 1.0) return 'warning';
      return 'critical';
    
    default:
      return 'warning';
  }
}

/**
 * Get color code for ratio status
 */
export function getStatusColor(status: RatioStatus): 'success' | 'warning' | 'error' {
  switch (status) {
    case 'good':
      return 'success';
    case 'warning':
      return 'warning';
    case 'critical':
      return 'error';
  }
}

/**
 * Get ratio metadata for display
 */
export function getRatioMetadata(ratioName: keyof FinancialRatios): {
  label: string;
  formula: string;
  normalRange: string;
  unit: string;
} {
  const metadata: Record<keyof FinancialRatios, { label: string; formula: string; normalRange: string; unit: string }> = {
    netProfitMargin: {
      label: 'Net Profit Margin',
      formula: 'Net Income / Sales',
      normalRange: 'Good: >10%, Warning: 5-10%, Critical: <5%',
      unit: '%',
    },
    returnOnAssets: {
      label: 'Return on Total Assets',
      formula: 'Net Income / Total Assets',
      normalRange: 'Good: >5%, Warning: 2-5%, Critical: <2%',
      unit: '%',
    },
    returnOnEquity: {
      label: 'Return on Stockholder\'s Equity',
      formula: 'Net Income / Total Stockholders\' Equity',
      normalRange: 'Good: >15%, Warning: 10-15%, Critical: <10%',
      unit: '%',
    },
    currentRatio: {
      label: 'Current Ratio',
      formula: 'Current Assets / Current Liabilities',
      normalRange: 'Good: >1.5, Warning: 1.0-1.5, Critical: <1.0',
      unit: '',
    },
    debtToAssets: {
      label: 'Debt-to-Assets Ratio',
      formula: 'Total Debt / Total Assets',
      normalRange: 'Good: <40%, Warning: 40-60%, Critical: >60%',
      unit: '%',
    },
    debtToEquity: {
      label: 'Debt-to-Equity Ratio',
      formula: 'Total Debt / Total Stockholders\' Equity',
      normalRange: 'Good: <1.0, Warning: 1.0-2.0, Critical: >2.0',
      unit: '',
    },
    longTermDebtToEquity: {
      label: 'Long-term Debt-to-Equity Ratio',
      formula: 'Long-term Debt / Total Stockholders\' Equity',
      normalRange: 'Good: <0.5, Warning: 0.5-1.0, Critical: >1.0',
      unit: '',
    },
  };
  
  return metadata[ratioName];
}

/**
 * Format ratio value for display
 */
export function formatRatioValue(value: number | null, unit: string): string {
  if (value === null || isNaN(value)) {
    return 'N/A';
  }
  
  if (unit === '%') {
    return `${value.toFixed(2)}%`;
  }
  
  return value.toFixed(2);
}

