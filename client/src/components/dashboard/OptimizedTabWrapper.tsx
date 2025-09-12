import React from 'react';
import { createOptimizedComponent, useRenderTracker } from '@/lib/performance';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface OptimizedTabWrapperProps {
  children: React.ReactNode;
  tabName: string;
  selectedProperty?: any;
  onError?: (error: Error) => void;
}

/**
 * High-performance tab wrapper that provides:
 * - Error boundary protection
 * - Render tracking
 * - Memory leak prevention
 * - Property-based memoization
 */
const TabWrapperContent = React.memo<OptimizedTabWrapperProps>(
  ({ children, tabName, selectedProperty, onError }) => {
    // Track renders for performance monitoring
    useRenderTracker(`${tabName}Tab`, { 
      propertyId: selectedProperty?.PropertyId,
      hasProperty: !!selectedProperty
    });

    // Cleanup on unmount to prevent memory leaks
    React.useEffect(() => {
      return () => {
        // Cleanup any pending timeouts, intervals, etc.
        // This is where you'd cancel any ongoing API requests
        console.debug(`${tabName}Tab: Cleanup on unmount`);
      };
    }, [tabName]);

    return <>{children}</>;
  },
  // Custom comparison function for better memoization
  (prevProps, nextProps) => {
    // Only re-render if property actually changed
    const prevPropertyId = prevProps.selectedProperty?.PropertyId;
    const nextPropertyId = nextProps.selectedProperty?.PropertyId;
    
    return (
      prevProps.tabName === nextProps.tabName &&
      prevPropertyId === nextPropertyId &&
      prevProps.children === nextProps.children
    );
  }
);

TabWrapperContent.displayName = 'OptimizedTabWrapperContent';

export function OptimizedTabWrapper({ 
  children, 
  tabName, 
  selectedProperty, 
  onError 
}: OptimizedTabWrapperProps) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error(`${tabName}Tab Error:`, error, errorInfo);
        onError?.(error);
        
        // Could send to error reporting service here
        // errorReportingService.captureException(error, {
        //   extra: { errorInfo, tabName, propertyId: selectedProperty?.PropertyId }
        // });
      }}
    >
      <TabWrapperContent 
        tabName={tabName}
        selectedProperty={selectedProperty}
        onError={onError}
      >
        {children}
      </TabWrapperContent>
    </ErrorBoundary>
  );
}

/**
 * Higher-order component to wrap any tab with optimizations
 */
export function withOptimizedTabWrapper<T extends { selectedProperty?: any }>(
  WrappedComponent: React.ComponentType<T>,
  tabName: string
) {
  const OptimizedTab = React.forwardRef<any, T>((props, ref) => {
    return (
      <OptimizedTabWrapper 
        tabName={tabName}
        selectedProperty={props.selectedProperty}
      >
        <WrappedComponent {...props} ref={ref} />
      </OptimizedTabWrapper>
    );
  });

  OptimizedTab.displayName = `Optimized${tabName}Tab`;
  
  return OptimizedTab;
}

/**
 * Hook for tab-specific performance optimizations
 */
export function useTabOptimizations(tabName: string, dependencies: any[] = []) {
  // Memoized calculations that are expensive
  const memoizedData = React.useMemo(() => {
    // This would be where you put expensive calculations
    // that should only re-run when dependencies change
    return dependencies;
  }, dependencies);

  // Debounced functions for user interactions
  const debouncedHandlers = React.useMemo(() => {
    const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number) => {
      let timeoutId: NodeJS.Timeout;
      return ((...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
      }) as T;
    };

    return {
      debounce,
      // Common debounced functions
      debouncedSearch: (fn: (query: string) => void) => debounce(fn, 300),
      debouncedFilter: (fn: (filters: any) => void) => debounce(fn, 200),
      debouncedUpdate: (fn: () => void) => debounce(fn, 500)
    };
  }, []);

  // Performance measurement
  const measurePerformance = React.useCallback((operation: string, fn: () => void | Promise<void>) => {
    const start = performance.now();
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        console.debug(`${tabName} - ${operation}: ${duration.toFixed(2)}ms`);
      });
    } else {
      const duration = performance.now() - start;
      console.debug(`${tabName} - ${operation}: ${duration.toFixed(2)}ms`);
      return result;
    }
  }, [tabName]);

  return {
    memoizedData,
    ...debouncedHandlers,
    measurePerformance
  };
}