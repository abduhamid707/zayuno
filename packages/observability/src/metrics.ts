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

  static getPercentileLatency(percentile: number, operation?: string): number {
    const relevant = operation ? this.metrics.filter(m => m.operation === operation) : this.metrics;
    if (relevant.length === 0) return 0;
    const sorted = [...relevant].map(m => m.durationMs).sort((a, b) => a - b);
    const index = Math.min(
      Math.floor((percentile / 100) * sorted.length),
      sorted.length - 1
    );
    return Math.round(sorted[index] || 0);
  }

  static getP50Latency(operation?: string): number {
    return this.getPercentileLatency(50, operation);
  }

  static getP95Latency(operation?: string): number {
    return this.getPercentileLatency(95, operation);
  }

  static getP99Latency(operation?: string): number {
    return this.getPercentileLatency(99, operation);
  }

  static getErrorRate(timeWindowMinutes = 15): number {
    const cutoff = Date.now() - timeWindowMinutes * 60 * 1000;
    const windowMetrics = this.metrics.filter(m => new Date(m.timestamp).getTime() >= cutoff);
    if (windowMetrics.length === 0) return 0;
    const errorCount = windowMetrics.filter(m => !m.success || (m.statusCode && m.statusCode >= 500)).length;
    return Math.round((errorCount / windowMetrics.length) * 1000) / 10;
  }

  static getRequestRate(timeWindowMinutes = 1): number {
    const cutoff = Date.now() - timeWindowMinutes * 60 * 1000;
    const windowMetrics = this.metrics.filter(m => new Date(m.timestamp).getTime() >= cutoff);
    return Math.round((windowMetrics.length / Math.max(timeWindowMinutes, 1)) * 10) / 10;
  }

  static getStatusBreakdown(timeWindowMinutes = 15): { s2xx: number; s4xx: number; s5xx: number; other: number } {
    const cutoff = Date.now() - timeWindowMinutes * 60 * 1000;
    const windowMetrics = this.metrics.filter(m => new Date(m.timestamp).getTime() >= cutoff);
    const breakdown = { s2xx: 0, s4xx: 0, s5xx: 0, other: 0 };
    for (const m of windowMetrics) {
      const code = m.statusCode || (m.success ? 200 : 500);
      if (code >= 200 && code < 300) breakdown.s2xx++;
      else if (code >= 400 && code < 500) breakdown.s4xx++;
      else if (code >= 500) breakdown.s5xx++;
      else breakdown.other++;
    }
    return breakdown;
  }

  static clear(): void {
    this.metrics = [];
  }
}
