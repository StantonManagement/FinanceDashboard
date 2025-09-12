/**
 * Performance monitoring and optimization utilities
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();

  /**
   * Start measuring performance for a specific operation
   */
  start(name: string, metadata?: Record<string, any>): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });
  }

  /**
   * End measurement and log results
   */
  end(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;

    // Log slow operations (>1000ms)
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metric.metadata);
    } else if (duration > 100) {
      console.info(`${name} took ${duration.toFixed(2)}ms`, metric.metadata);
    }

    return duration;
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Higher-order function to measure component render time
 */
export function withPerformanceTracking<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  componentName?: string
): React.ComponentType<T> {
  const name = componentName || Component.displayName || Component.name;
  
  return function PerformanceTrackedComponent(props: T) {
    React.useEffect(() => {
      performanceMonitor.start(`${name}_render`);
      return () => {
        performanceMonitor.end(`${name}_render`);
      };
    });

    return React.createElement(Component, props);
  };
}

/**
 * Hook to measure API call performance
 */
export function useAPIPerformance() {
  const measureAPI = React.useCallback(async <T>(
    apiCall: () => Promise<T>,
    apiName: string,
    metadata?: Record<string, any>
  ): Promise<T> => {
    performanceMonitor.start(`api_${apiName}`, metadata);
    
    try {
      const result = await apiCall();
      performanceMonitor.end(`api_${apiName}`);
      return result;
    } catch (error) {
      performanceMonitor.end(`api_${apiName}`);
      throw error;
    }
  }, []);

  return { measureAPI };
}

/**
 * Debounce utility for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  
  const debounced = ((...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

/**
 * Throttle utility for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean = false;
  
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
}

/**
 * Memoization utility for expensive calculations
 */
export function memoize<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  keyFn?: (...args: TArgs) => string
): (...args: TArgs) => TReturn {
  const cache = new Map<string, TReturn>();
  
  return (...args: TArgs) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Hook to detect and warn about expensive re-renders
 */
export function useRenderTracker(componentName: string, props?: Record<string, any>) {
  const renderCount = React.useRef(0);
  const lastRenderTime = React.useRef(performance.now());
  
  React.useEffect(() => {
    renderCount.current++;
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    if (renderCount.current > 1 && timeSinceLastRender < 16) { // Less than one frame (60fps)
      console.warn(
        `Potential excessive re-rendering detected in ${componentName}:`,
        `Render #${renderCount.current} occurred ${timeSinceLastRender.toFixed(2)}ms after previous render`,
        props ? { props } : undefined
      );
    }
    
    lastRenderTime.current = now;
  });

  // Reset counter after periods of inactivity
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      renderCount.current = 0;
    }, 1000);
    
    return () => clearTimeout(timeout);
  });
}

/**
 * Create a performance-optimized component factory
 */
export function createOptimizedComponent<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options: {
    memoProps?: (keyof T)[];
    trackRenders?: boolean;
    displayName?: string;
  } = {}
): React.ComponentType<T> {
  const { memoProps, trackRenders = false, displayName } = options;
  
  let OptimizedComponent: React.ComponentType<T>;
  
  if (memoProps && memoProps.length > 0) {
    OptimizedComponent = React.memo(Component, (prevProps, nextProps) => {
      return memoProps.every(prop => prevProps[prop] === nextProps[prop]);
    });
  } else {
    OptimizedComponent = React.memo(Component);
  }
  
  if (displayName) {
    OptimizedComponent.displayName = displayName;
  }
  
  if (trackRenders) {
    return withPerformanceTracking(OptimizedComponent, displayName);
  }
  
  return OptimizedComponent;
}

// Add React import
import React from 'react';