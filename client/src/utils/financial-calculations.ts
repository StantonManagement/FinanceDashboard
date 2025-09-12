/**
 * Financial calculation utilities that match the CLAUDE.md requirements
 */

import { DataUtils, AccountMappings } from '@shared/utils';
import type { AppfolioCashFlowItem, ProcessedT12Data } from '@shared/schema';

/**
 * Calculate NOI from cash flow data: Total Income - Total Expense
 */
export function calculateNOI(cashFlowData: AppfolioCashFlowItem[]): number {
  const incomeItem = cashFlowData.find(item => item.AccountName === "Total Income");
  const expenseItem = cashFlowData.find(item => item.AccountName === "Total Expense");
  
  if (!incomeItem || !expenseItem) {
    console.warn('NOI Calculation: Missing Total Income or Total Expense items');
    return 0;
  }

  const income = DataUtils.parseCurrency(incomeItem.SelectedPeriod);
  const expense = DataUtils.parseCurrency(expenseItem.SelectedPeriod);
  
  return income - expense;
}

/**
 * Calculate Cap Rate using actual purchase price from Supabase
 * Cap Rate = (Annual NOI / Purchase Price) * 100
 * NOTE: Supabase NOI field is already annualized
 */
export function calculateCapRate(noiValue: string | number, purchasePrice: string | number): number {
  const price = DataUtils.parseCurrency(purchasePrice);
  const noi = DataUtils.parseCurrency(noiValue);
  
  if (price === 0) {
    console.warn('Cap Rate Calculation: Purchase price is zero or invalid');
    return 0;
  }

  // NOI from Supabase is already annual, no need to multiply by 12
  return (noi / price) * 100;
}

/**
 * Calculate Cap Rate from monthly cash flow data
 * Cap Rate = (Monthly NOI * 12 / Purchase Price) * 100
 */
export function calculateCapRateFromMonthlyCashFlow(monthlyNOI: number, purchasePrice: string | number): number {
  const price = DataUtils.parseCurrency(purchasePrice);
  if (price === 0) {
    console.warn('Cap Rate Calculation: Purchase price is zero or invalid');
    return 0;
  }

  const annualNOI = monthlyNOI * 12;
  return (annualNOI / price) * 100;
}

/**
 * Calculate Expense Ratio: Total Expense / Total Income * 100
 */
export function calculateExpenseRatio(cashFlowData: AppfolioCashFlowItem[]): number {
  const incomeItem = cashFlowData.find(item => item.AccountName === "Total Income");
  const expenseItem = cashFlowData.find(item => item.AccountName === "Total Expense");
  
  if (!incomeItem || !expenseItem) return 0;

  const income = DataUtils.parseCurrency(incomeItem.SelectedPeriod);
  const expense = DataUtils.parseCurrency(expenseItem.SelectedPeriod);
  
  if (income === 0) return 0;
  
  return (expense / income) * 100;
}

/**
 * Aggregate expenses by category using multiple account codes
 */
export function aggregateExpensesByCategory(
  cashFlowData: AppfolioCashFlowItem[]
): Record<string, { current: number; ytd: number }> {
  const categories: Record<string, { current: number; ytd: number }> = {};
  
  Object.keys(AccountMappings.EXPENSE_CATEGORIES).forEach(category => {
    categories[category] = { current: 0, ytd: 0 };
    
    const accountCodes = AccountMappings.EXPENSE_CATEGORIES[category as keyof typeof AccountMappings.EXPENSE_CATEGORIES];
    
    accountCodes.forEach(code => {
      const item = cashFlowData.find(i => i.AccountCode === code);
      if (item) {
        categories[category].current += DataUtils.parseCurrency(item.SelectedPeriod);
        categories[category].ytd += DataUtils.parseCurrency(item.FiscalYearToDate);
      }
    });
  });
  
  return categories;
}

/**
 * Extract monthly trends from T12 data (Slice00-Slice11)
 */
export function extractMonthlyTrends(t12Data: any[]): {
  months: string[];
  revenue: number[];
  expenses: number[];
  netIncome: number[];
} {
  const months: string[] = [];
  const revenue: number[] = [];
  const expenses: number[] = [];
  const netIncome: number[] = [];

  // Generate month labels
  const currentDate = new Date();
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    months.push(monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
  }

  // Extract data from T12 slices
  const revenueItems = t12Data.filter(item => AccountMappings.isRevenueAccount(item.AccountCode || ''));
  const expenseItems = t12Data.filter(item => AccountMappings.isExpenseAccount(item.AccountCode || ''));

  for (let i = 0; i < 12; i++) {
    const sliceKey = `Slice${i.toString().padStart(2, '0')}`;
    
    // Sum revenue for this slice
    const monthRevenue = revenueItems.reduce((sum, item) => {
      return sum + DataUtils.parseCurrency(item[sliceKey] || 0);
    }, 0);
    
    // Sum expenses for this slice
    const monthExpense = expenseItems.reduce((sum, item) => {
      return sum + DataUtils.parseCurrency(item[sliceKey] || 0);
    }, 0);
    
    revenue.push(monthRevenue);
    expenses.push(monthExpense);
    netIncome.push(monthRevenue - monthExpense);
  }

  return { months, revenue, expenses, netIncome };
}

/**
 * Validate property data completeness for calculations
 */
export function validatePropertyData(property: any): {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
} {
  const requiredFields = ['PropertyId', 'Asset ID + Name', 'Purchase Price', 'Units'];
  const missingFields: string[] = [];
  const warnings: string[] = [];

  requiredFields.forEach(field => {
    if (!property[field]) {
      missingFields.push(field);
    }
  });

  // Validate data types and ranges
  if (property['Purchase Price'] && DataUtils.parseCurrency(property['Purchase Price']) <= 0) {
    warnings.push('Purchase Price should be greater than zero');
  }

  if (property.Units && parseInt(property.Units) <= 0) {
    warnings.push('Units should be greater than zero');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings
  };
}

/**
 * Calculate balance sheet totals with proper asset/liability classification
 */
export function calculateBalanceSheetTotals(balanceSheetData: any[]): {
  assets: { current: number; fixed: number; total: number };
  liabilities: { current: number; longTerm: number; total: number };
  equity: { total: number };
} {
  const assets = { current: 0, fixed: 0, total: 0 };
  const liabilities = { current: 0, longTerm: 0, total: 0 };
  const equity = { total: 0 };

  balanceSheetData.forEach(item => {
    const balance = DataUtils.parseCurrency(item.Balance);
    const accountNumber = item.AccountNumber || '';

    if (AccountMappings.isAssetAccount(accountNumber)) {
      // Classify current vs fixed assets based on account number
      if (accountNumber.startsWith('11') || accountNumber.startsWith('12')) {
        assets.current += Math.abs(balance);
      } else {
        assets.fixed += Math.abs(balance);
      }
      assets.total += Math.abs(balance);
    } else if (AccountMappings.isLiabilityAccount(accountNumber)) {
      // Classify current vs long-term liabilities
      if (accountNumber.startsWith('21') || accountNumber.startsWith('22')) {
        liabilities.current += Math.abs(balance);
      } else {
        liabilities.longTerm += Math.abs(balance);
      }
      liabilities.total += Math.abs(balance);
    } else if (accountNumber.startsWith('3')) {
      // Equity accounts
      equity.total += balance; // Keep sign for equity
    }
  });

  return { assets, liabilities, equity };
}

/**
 * Generate variance analysis for period-over-period comparison
 */
export function generateVarianceAnalysis(
  currentData: AppfolioCashFlowItem[],
  previousData: AppfolioCashFlowItem[]
): Array<{
  category: string;
  currentPeriod: number;
  previousPeriod: number;
  variance: number;
  variancePercent: string;
  status: 'Normal' | 'Warning' | 'Alert';
}> {
  const categories = aggregateExpensesByCategory(currentData);
  const previousCategories = aggregateExpensesByCategory(previousData);
  
  return Object.keys(categories).map(category => {
    const current = categories[category].current;
    const previous = previousCategories[category]?.current || 0;
    const variance = DataUtils.calculateVariance(current, previous);
    const status = DataUtils.getVarianceStatus(variance, { low: 5, medium: 25 });
    
    return {
      category,
      currentPeriod: current,
      previousPeriod: previous,
      variance,
      variancePercent: `${variance >= 0 ? '+' : ''}${variance.toFixed(1)}%`,
      status: status.status
    };
  });
}