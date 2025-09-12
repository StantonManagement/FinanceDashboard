import { useState, useEffect, useCallback } from 'react';
import { DataUtils } from '@shared/utils';
import type { ProcessedCashFlowData, ProcessedT12Data } from '@shared/schema';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAppfolioCashFlow(propertyId?: number, fromDate?: string, toDate?: string): ApiState<ProcessedCashFlowData> {
  const [state, setState] = useState<Omit<ApiState<ProcessedCashFlowData>, 'refetch'>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (!fromDate || !toDate) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      let url = `/api/appfolio/cash-flow?fromDate=${fromDate}&toDate=${toDate}`;
      if (propertyId) {
        url += `&propertyId=${propertyId}`;
      }
      
      const response = await DataUtils.fetchWithRetry(async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res;
      });
      
      const data = await response.json();
      setState(prev => ({ ...prev, data, loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch cash flow data',
        loading: false
      }));
    }
  }, [propertyId, fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData
  };
}

export function useAppfolioT12(propertyId?: number, fromDate?: string, toDate?: string): ApiState<ProcessedT12Data> {
  const [state, setState] = useState<Omit<ApiState<ProcessedT12Data>, 'refetch'>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (!fromDate || !toDate) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const params = new URLSearchParams();
      if (propertyId) params.append('propertyId', propertyId.toString());
      params.append('from_date', fromDate);
      params.append('to_date', toDate);
      
      const url = `/api/appfolio/t12-cashflow?${params.toString()}`;
      
      const response = await DataUtils.fetchWithRetry(async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res;
      });
      
      const data = await response.json();
      setState(prev => ({ ...prev, data, loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch T12 data',
        loading: false
      }));
    }
  }, [propertyId, fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData
  };
}

// Hook for comparing current vs previous period data
export function useCashFlowComparison(
  propertyId?: number,
  fromDate?: string,
  toDate?: string
) {
  const currentPeriod = useAppfolioCashFlow(propertyId, fromDate, toDate);
  
  // Calculate previous period dates
  const previousPeriodDates = React.useMemo(() => {
    if (!fromDate) return { prevFromDate: undefined, prevToDate: undefined };
    
    const currentDate = new Date(fromDate);
    const prevMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const prevMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    
    return {
      prevFromDate: prevMonthStart.toISOString().split('T')[0],
      prevToDate: prevMonthEnd.toISOString().split('T')[0]
    };
  }, [fromDate]);

  const previousPeriod = useAppfolioCashFlow(
    propertyId, 
    previousPeriodDates.prevFromDate, 
    previousPeriodDates.prevToDate
  );

  const variance = React.useMemo(() => {
    if (!currentPeriod.data || !previousPeriod.data) return null;
    
    return {
      operatingActivities: DataUtils.calculateVariance(
        currentPeriod.data.operatingActivities.total,
        previousPeriod.data.operatingActivities.total
      ),
      netCashFlow: DataUtils.calculateVariance(
        currentPeriod.data.netCashFlow,
        previousPeriod.data.netCashFlow
      )
    };
  }, [currentPeriod.data, previousPeriod.data]);

  return {
    current: currentPeriod,
    previous: previousPeriod,
    variance,
    refetchBoth: async () => {
      await Promise.all([
        currentPeriod.refetch(),
        previousPeriod.refetch()
      ]);
    }
  };
}

// Add React import for useMemo
import React from 'react';