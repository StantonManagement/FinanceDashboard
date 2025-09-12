/**
 * Shared utility functions for data parsing and formatting
 * Used across both client and server components
 */

export class DataUtils {
  /**
   * Safely parse currency strings to numbers
   * Handles formats like "$1,234.56", "(1,234.56)", "1234.56"
   */
  static parseCurrency(value: string | number | null | undefined): number {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    
    // Remove currency symbols, commas, and spaces
    let cleaned = value.toString().replace(/[\$,\s]/g, '');
    
    // Handle parentheses (negative values)
    const isNegative = cleaned.includes('(') && cleaned.includes(')');
    if (isNegative) {
      cleaned = cleaned.replace(/[()]/g, '');
    }
    
    const parsed = parseFloat(cleaned) || 0;
    return isNegative ? -Math.abs(parsed) : parsed;
  }

  /**
   * Safely parse percentage strings to numbers
   * Handles formats like "4.87%", "4.87", etc.
   */
  static parsePercent(value: string | number | null | undefined): number {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    
    // Remove % symbol and parse
    const cleaned = value.toString().replace('%', '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Format number as currency
   */
  static formatCurrency(value: number, options: { 
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showSign?: boolean;
  } = {}): string {
    const {
      minimumFractionDigits = 0,
      maximumFractionDigits = 0,
      showSign = false
    } = options;

    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(Math.abs(value));

    if (showSign && value >= 0) {
      return `+${formatted}`;
    }
    
    return value < 0 ? `-${formatted}` : formatted;
  }

  /**
   * Format number as percentage
   */
  static formatPercent(value: number, decimals: number = 2): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Calculate variance between two values
   */
  static calculateVariance(current: number, previous: number): number {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  }

  /**
   * Get variance status based on threshold
   */
  static getVarianceStatus(variance: number, thresholds = { low: 5, medium: 10 }): {
    status: 'Normal' | 'Warning' | 'Alert';
    color: 'green' | 'yellow' | 'red';
  } {
    const absVariance = Math.abs(variance);
    
    if (absVariance <= thresholds.low) {
      return { status: 'Normal', color: 'green' };
    }
    if (absVariance <= thresholds.medium) {
      return { status: 'Warning', color: 'yellow' };
    }
    return { status: 'Alert', color: 'red' };
  }

  /**
   * Calculate volatility (coefficient of variation)
   */
  static calculateVolatility(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    return mean === 0 ? 0 : (standardDeviation / Math.abs(mean)) * 100;
  }

  /**
   * Get volatility score classification
   */
  static getVolatilityScore(volatility: number): {
    label: 'LOW' | 'MEDIUM' | 'HIGH';
    color: string;
  } {
    if (volatility < 5) return { label: 'LOW', color: 'text-success-green' };
    if (volatility < 15) return { label: 'MEDIUM', color: 'text-orange-600' };
    return { label: 'HIGH', color: 'text-red-600' };
  }

  /**
   * Determine trend from time series data
   */
  static calculateTrend(values: number[]): 'improving' | 'declining' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100;
    
    if (Math.abs(change) < 2) return 'stable';
    return change > 0 ? 'improving' : 'declining';
  }

  /**
   * Retry wrapper for API calls
   */
  static async fetchWithRetry<T>(
    fetchFn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    try {
      return await fetchFn();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(fetchFn, retries - 1, delay);
      }
      throw error;
    }
  }
}

/**
 * Account mapping utilities for expense categorization
 */
export const AccountMappings = {
  EXPENSE_CATEGORIES: {
    'Maintenance & Repairs': [
      '6142', // R&M: Plumbing
      '6143', // R&M: Flooring
      '6144', // R&M: HVAC
      '6145', // R&M: Key/Lock Replacement
      '6146', // R&M: Roof Repair
      '6148', // R&M Supplies
      '6157', // R&M: General Maintenance Labor
    ],
    'Utilities': [
      '6171', // Unit Utilities - Electric
      '6172', // Unit Utilities - Gas
      '6173', // Water and Sewer
      '6175', // Garbage and Recycling
      '6179', // Common Electric
      '6181', // Common Gas
    ],
    'Management Fees': [
      '6451', // Property Management Fees
      '6452', // Asset Management Fees
    ],
    'Property Tax': [
      '6161', // Property Tax
    ],
  },

  /**
   * Check if account number is an asset account
   */
  isAssetAccount(accountNumber: string): boolean {
    return accountNumber.startsWith('1');
  },

  /**
   * Check if account number is a liability account
   */
  isLiabilityAccount(accountNumber: string): boolean {
    return accountNumber.startsWith('2');
  },

  /**
   * Check if account number is a revenue account
   */
  isRevenueAccount(accountNumber: string): boolean {
    return accountNumber.startsWith('4');
  },

  /**
   * Check if account number is an expense account
   */
  isExpenseAccount(accountNumber: string): boolean {
    return accountNumber.startsWith('6');
  }
} as const;