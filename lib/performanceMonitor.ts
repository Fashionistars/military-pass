/**
 * Military Pass - Performance Monitoring System
 * =============================================
 * Comprehensive performance tracking for sub-10ms latency optimization
 * 
 * Features:
 * - Real-time latency tracking
 * - GPU utilization monitoring
 * - Memory profiling
 * - Network performance measurement
 * - Custom metrics and alerts
 */

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceBaseline {
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  minLatency: number;
  maxLatency: number;
  throughput: number;
  errorRate: number;
}

export interface PerformanceThresholds {
  [operation: string]: {
    warning: number;
    critical: number;
  };
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics: number = 10000;
  private thresholds: PerformanceThresholds = {
    'face_swap': { warning: 50, critical: 100 },
    'voice_transform': { warning: 80, critical: 150 },
    'api_call': { warning: 200, critical: 500 },
    'gpu_operation': { warning: 20, critical: 40 },
    'network_request': { warning: 100, critical: 200 },
  };

  private startTime: number = performance.now();
  private operationCounters: Map<string, number> = new Map();
  private errorCounters: Map<string, number> = new Map();

  /**
   * Track a performance metric
   */
  track(operation: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetrics = {
      operation,
      duration,
      timestamp: performance.now(),
      metadata,
    };

    this.metrics.push(metric);
    
    // Keep metrics size manageable
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Update counters
    this.operationCounters.set(operation, (this.operationCounters.get(operation) || 0) + 1);

    // Check thresholds
    this.checkThresholds(operation, duration);

    // Send to monitoring service
    this.sendToMonitoringService(metric);
  }

  /**
   * Start a performance measurement
   */
  startOperation(operation: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.track(operation, duration);
    };
  }

  /**
   * Track an error
   */
  trackError(operation: string, error: Error): void {
    this.errorCounters.set(operation, (this.errorCounters.get(operation) || 0) + 1);
    
    // Send error to monitoring service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: { operation },
        extra: { duration: performance.now() - this.startTime },
      });
    }
  }

  /**
   * Get current baseline metrics
   */
  getBaseline(operation?: string): PerformanceBaseline {
    const filteredMetrics = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    if (filteredMetrics.length === 0) {
      return {
        avgLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        minLatency: 0,
        maxLatency: 0,
        throughput: 0,
        errorRate: 0,
      };
    }

    const durations = filteredMetrics.map(m => m.duration).sort((a, b) => a - b);
    const totalOperations = this.operationCounters.get(operation || 'all') || filteredMetrics.length;
    const totalErrors = this.errorCounters.get(operation || 'all') || 0;
    const elapsedMinutes = (performance.now() - this.startTime) / 60000;

    return {
      avgLatency: this.average(durations),
      p50Latency: this.percentile(durations, 50),
      p95Latency: this.percentile(durations, 95),
      p99Latency: this.percentile(durations, 99),
      minLatency: durations[0],
      maxLatency: durations[durations.length - 1],
      throughput: totalOperations / (elapsedMinutes || 1),
      errorRate: (totalErrors / totalOperations) * 100,
    };
  }

  /**
   * Get detailed performance report
   */
  getReport(): {
    overall: PerformanceBaseline;
    byOperation: Record<string, PerformanceBaseline>;
    systemInfo: {
      memory: any;
      network: any;
      gpu?: any;
    };
  } {
    const overall = this.getBaseline();
    const operations = [...new Set(this.metrics.map(m => m.operation))];
    const byOperation: Record<string, PerformanceBaseline> = {};

    operations.forEach(op => {
      byOperation[op] = this.getBaseline(op);
    });

    return {
      overall,
      byOperation,
      systemInfo: this.getSystemInfo(),
    };
  }

  /**
   * Check if performance exceeds thresholds
   */
  private checkThresholds(operation: string, duration: number): void {
    const threshold = this.thresholds[operation];
    if (!threshold) return;

    if (duration > threshold.critical) {
      this.alert('critical', { operation, duration, threshold });
    } else if (duration > threshold.warning) {
      this.alert('warning', { operation, duration, threshold });
    }
  }

  /**
   * Send alert for performance issues
   */
  private alert(level: 'warning' | 'critical', data: any): void {
    console.warn(`[Performance ${level.toUpperCase()}]`, data);
    
    // Send to monitoring service
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture(`performance_${level}`, data);
    }
  }

  /**
   * Send metrics to monitoring service
   */
  private sendToMonitoringService(metric: PerformanceMetrics): void {
    // Send to PostHog
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture('performance_metric', {
        operation: metric.operation,
        duration: metric.duration,
        ...metric.metadata,
      });
    }

    // Send to Sentry as custom metric
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.addBreadcrumb({
        category: 'performance',
        message: `${metric.operation}: ${metric.duration.toFixed(2)}ms`,
        level: 'info',
        data: metric.metadata,
      });
    }
  }

  /**
   * Get system information
   */
  private getSystemInfo() {
    const info: any = {
      memory: {},
      network: {},
    };

    if (typeof window !== 'undefined' && (window as any).performance) {
      const perf = (window as any).performance;
      const memory = (perf as any).memory;
      
      if (memory) {
        info.memory = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        };
      }

      const navigation = perf.getEntriesByType('navigation')[0] as any;
      if (navigation) {
        info.network = {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: navigation.responseStart - navigation.requestStart,
        };
      }
    }

    return info;
  }

  /**
   * Calculate average
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedNumbers: number[], p: number): number {
    if (sortedNumbers.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedNumbers.length) - 1;
    return sortedNumbers[Math.max(0, index)];
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = [];
    this.operationCounters.clear();
    this.errorCounters.clear();
    this.startTime = performance.now();
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      baseline: this.getBaseline(),
      report: this.getReport(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }
}

// Global singleton instance
let globalMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

/**
 * Decorator for automatic performance tracking
 */
export function trackPerformance(operation: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const monitor = getPerformanceMonitor();
      const endOperation = monitor.startOperation(operation);
      
      try {
        const result = await originalMethod.apply(this, args);
        endOperation();
        return result;
      } catch (error) {
        monitor.trackError(operation, error as Error);
        throw error;
      }
    };
    
    return descriptor;
  };
}