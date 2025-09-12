/**
 * Client-side AppFolio API integration
 * Centralizes all AppFolio API calls with consistent error handling
 */

import type { ProcessedCashFlowData, ProcessedT12Data, ProcessedBalanceSheetData } from '@shared/schema';
import { DataUtils } from '@shared/utils';

interface APIResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

class AppFolioClient {
  private baseURL = '/api/appfolio';

  /**
   * Generic API call wrapper with retry logic and error handling
   */
  private async makeAPICall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return DataUtils.fetchWithRetry(async () => {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API Error ${response.status}: ${response.statusText}`);
      }

      return response.json();
    });
  }

  /**
   * Fetch cash flow data for a property within a date range
   */
  async getCashFlow(params: {
    propertyId?: number;
    fromDate: string;
    toDate: string;
  }): Promise<ProcessedCashFlowData> {
    const searchParams = new URLSearchParams({
      fromDate: params.fromDate,
      toDate: params.toDate,
    });

    if (params.propertyId) {
      searchParams.append('propertyId', params.propertyId.toString());
    }

    return this.makeAPICall<ProcessedCashFlowData>(`/cash-flow?${searchParams}`);
  }

  /**
   * Fetch T12 performance data
   */
  async getT12Performance(params: {
    propertyId?: number;
    fromDate: string;
    toDate: string;
  }): Promise<ProcessedT12Data> {
    const searchParams = new URLSearchParams({
      from_date: params.fromDate,
      to_date: params.toDate,
    });

    if (params.propertyId) {
      searchParams.append('propertyId', params.propertyId.toString());
    }

    return this.makeAPICall<ProcessedT12Data>(`/t12-cashflow?${searchParams}`);
  }

  /**
   * Fetch balance sheet data
   */
  async getBalanceSheet(params: {
    propertyId?: number;
    fromDate: string;
    toDate: string;
  }): Promise<ProcessedBalanceSheetData> {
    const searchParams = new URLSearchParams({
      from_date: params.fromDate,
      to_date: params.toDate,
    });

    if (params.propertyId) {
      searchParams.append('propertyId', params.propertyId.toString());
    }

    return this.makeAPICall<ProcessedBalanceSheetData>(`/balance-sheet?${searchParams}`);
  }

  /**
   * Fetch multiple periods for comparison
   */
  async getCashFlowComparison(params: {
    propertyId?: number;
    currentPeriod: { fromDate: string; toDate: string };
    previousPeriod: { fromDate: string; toDate: string };
  }): Promise<{
    current: ProcessedCashFlowData;
    previous: ProcessedCashFlowData;
    variance: {
      operatingActivities: number;
      netCashFlow: number;
    };
  }> {
    const [current, previous] = await Promise.all([
      this.getCashFlow({
        propertyId: params.propertyId,
        ...params.currentPeriod,
      }),
      this.getCashFlow({
        propertyId: params.propertyId,
        ...params.previousPeriod,
      }),
    ]);

    const variance = {
      operatingActivities: DataUtils.calculateVariance(
        current.operatingActivities.total,
        previous.operatingActivities.total
      ),
      netCashFlow: DataUtils.calculateVariance(
        current.netCashFlow,
        previous.netCashFlow
      ),
    };

    return { current, previous, variance };
  }
}

// Singleton instance
export const appfolioClient = new AppFolioClient();

/**
 * React Query compatible API functions
 */
export const appfolioQueries = {
  // Query keys factory
  keys: {
    all: ['appfolio'] as const,
    cashFlow: (params: any) => ['appfolio', 'cash-flow', params] as const,
    t12: (params: any) => ['appfolio', 't12', params] as const,
    balanceSheet: (params: any) => ['appfolio', 'balance-sheet', params] as const,
  },

  // Query functions
  cashFlow: (params: { propertyId?: number; fromDate: string; toDate: string }) => ({
    queryKey: appfolioQueries.keys.cashFlow(params),
    queryFn: () => appfolioClient.getCashFlow(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  }),

  t12Performance: (params: { propertyId?: number; fromDate: string; toDate: string }) => ({
    queryKey: appfolioQueries.keys.t12(params),
    queryFn: () => appfolioClient.getT12Performance(params),
    staleTime: 15 * 60 * 1000, // 15 minutes (T12 data changes less frequently)
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 3,
  }),

  balanceSheet: (params: { propertyId?: number; fromDate: string; toDate: string }) => ({
    queryKey: appfolioQueries.keys.balanceSheet(params),
    queryFn: () => appfolioClient.getBalanceSheet(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 20 * 60 * 1000, // 20 minutes
    retry: 3,
  }),

  cashFlowComparison: (params: {
    propertyId?: number;
    currentPeriod: { fromDate: string; toDate: string };
    previousPeriod: { fromDate: string; toDate: string };
  }) => ({
    queryKey: ['appfolio', 'cash-flow-comparison', params] as const,
    queryFn: () => appfolioClient.getCashFlowComparison(params),
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    retry: 2,
  }),
};