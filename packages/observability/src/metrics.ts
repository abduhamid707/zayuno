export interface LatencyMetric {
  service: string;
  operation: string;
  durationMs: number;
  statusCode?: number;
  success: boolean;
  timestamp: string;
}

export class MetricsCollector {
  private static metrics: LatencyMetric[] = [];
  private static readonly MAX_BUFFER = 1000;

  static recordLatency(metric: LatencyMetric): void {
    if (this.metrics.length >= this.MAX_BUFFER) {
      this.metrics.shift();
    }
    this.metrics.push(metric);
  }

  static getRecentMetrics(limit = 100): LatencyMetric[] {
    return this.metrics.slice(-limit);
  }

  static getAverageLatency(operation?: string): number {
    const relevant = operation ? this.metrics.filter(m => m.operation === operation) : this.metrics;
    if (relevant.length === 0) return 0;
    const sum = relevant.reduce((acc, curr) => acc + curr.durationMs, 0);
    return Math.round(sum / relevant.length);
  }
}
