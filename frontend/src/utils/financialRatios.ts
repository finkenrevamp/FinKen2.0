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
  // Note: We use net_income directly from the income statement as it's already calculated
  // from revenue - expenses by the backend
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
  // Identify current assets (typically cash, receivables, inventory, prepaid expenses)
  const currentAssets = balanceSheet.assets
    .filter(asset => {
      const name = asset.account_name.toLowerCase();
      // Exclude explicitly non-current assets
      const isNonCurrent = (
        name.includes('property') ||
        name.includes('plant') ||
        name.includes('equipment') ||
        name.includes('building') ||
        name.includes('land') ||
        name.includes('intangible') ||
        name.includes('goodwill') ||
        name.includes('accumulated depreciation') ||
        name.includes('long-term') ||
        name.includes('long term')
      );
      // Current asset indicators
      const isCurrent = (
        name.includes('cash') ||
        name.includes('receivable') ||
        name.includes('inventory') ||
        name.includes('current') ||
        name.includes('prepaid') ||
        name.includes('supplies') ||
        name.includes('marketable securities') ||
        name.includes('short-term')
      );
      
      return !isNonCurrent && (isCurrent || 
        // If not explicitly non-current and not matching known fixed asset types, assume current
        (!name.includes('depreciation') && !name.includes('amortization')));
    })
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  const currentLiabilities = balanceSheet.liabilities
    .filter(liability => {
      const name = liability.account_name.toLowerCase();
      // Exclude explicitly long-term liabilities
      const isLongTerm = (
        name.includes('long-term') ||
        name.includes('long term') ||
        name.includes('bonds') ||
        name.includes('mortgage')
      );
      // Current liabilities: payables, current items, short-term items
      // Also include unearned revenue (typically current) and accrued liabilities
      const isCurrent = (
        name.includes('payable') ||
        name.includes('current') ||
        name.includes('short-term') ||
        name.includes('short term') ||
        name.includes('accrued') ||
        name.includes('unearned')
      );
      // Loans and notes without long-term indicator are considered current by default
      const isShortTermLoan = (
        (name.includes('loan') || name.includes('note')) &&
        !isLongTerm
      );
      
      return !isLongTerm && (isCurrent || isShortTermLoan || 
        // If not explicitly long-term and not matching any category, assume current
        (!name.includes('loan') && !name.includes('note') && !name.includes('bonds') && !name.includes('mortgage')));
    })
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  // Calculate long-term liabilities
  // Long-term liabilities are those explicitly marked as long-term, bonds, mortgages, 
  // or loans/notes that are NOT short-term
  const longTermLiabilities = balanceSheet.liabilities
    .filter(liability => {
      const name = liability.account_name.toLowerCase();
      // Explicitly long-term indicators
      const isExplicitlyLongTerm = (
        name.includes('long-term') ||
        name.includes('long term') ||
        name.includes('bonds') ||
        name.includes('mortgage')
      );
      // Loans and notes are long-term unless marked as short-term or current
      const isLoanOrNote = (name.includes('loan') || name.includes('note'));
      const isShortTerm = (
        name.includes('current') ||
        name.includes('short-term') ||
        name.includes('short term')
      );
      
      return isExplicitlyLongTerm || (isLoanOrNote && !isShortTerm);
    })
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  // Profitability Ratios
  const netProfitMargin = revenue !== 0 ? (netIncome / revenue) * 100 : null;
  const returnOnAssets = totalAssets !== 0 ? (netIncome / totalAssets) * 100 : null;
  const returnOnEquity = totalEquity !== 0 ? (netIncome / totalEquity) * 100 : null;
  
  // Liquidity Ratios
  // If no current liabilities, current ratio is null (cannot calculate)
  // If both are 0, ratio is null
  const currentRatio = currentLiabilities !== 0 
    ? currentAssets / currentLiabilities 
    : (currentAssets > 0 ? null : null); // No current liabilities = N/A
  
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

