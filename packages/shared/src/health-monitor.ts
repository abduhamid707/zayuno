import {
  ProviderHealthState,
  ProviderHealthMonitoringData
} from '@zayuno/contracts';

export interface HealthMonitorConfig {
  failureThreshold: number; // default 3
  recoveryThreshold: number; // default 2
  intervalMs: number; // default 60000
  timeoutMs: number; // default 5000
  maxConcurrency: number; // default 10
}

export const DEFAULT_HEALTH_MONITOR_CONFIG: HealthMonitorConfig = {
  failureThreshold: 3,
  recoveryThreshold: 2,
  intervalMs: 60000,
  timeoutMs: 5000,
  maxConcurrency: 10
};

export interface HealthProbeResult {
  success: boolean;
  latencyMs: number;
  failureCode?: string; // sanitized short code e.g. 'TIMEOUT', 'HTTP_500', 'SCHEMA_MISMATCH', 'CONNECTION_REFUSED'
  message?: string;
}

/**
 * Pure, deterministic Health State Machine transition evaluator.
 *
 * Rules:
 * 1. 1-2 failures: DEGRADED, isTemporarilyUnavailable = false (still visible in AI discovery).
 * 2. 3 consecutive failures: DOWN, isTemporarilyUnavailable = true (hidden from AI discovery).
 * 3. 1st success after DOWN: RECOVERING, isTemporarilyUnavailable = true (still hidden).
 * 4. 2nd consecutive success (meets recoveryThreshold): HEALTHY, isTemporarilyUnavailable = false (restored to discovery).
 *
 * Provider status remains ACTIVE, review remains APPROVED, publication and certification are NEVER suspended.
 */
export function evaluateHealthStateTransition(
  current: Partial<ProviderHealthMonitoringData> | null | undefined,
  probe: HealthProbeResult,
  config: Partial<HealthMonitorConfig> = {}
): ProviderHealthMonitoringData {
  const failureThreshold = config.failureThreshold ?? DEFAULT_HEALTH_MONITOR_CONFIG.failureThreshold;
  const recoveryThreshold = config.recoveryThreshold ?? DEFAULT_HEALTH_MONITOR_CONFIG.recoveryThreshold;
  const nowIso = new Date().toISOString();

  const prev: ProviderHealthMonitoringData = {
    state: current?.state || ProviderHealthState.UNKNOWN,
    consecutiveFailures: current?.consecutiveFailures || 0,
    consecutiveSuccesses: current?.consecutiveSuccesses || 0,
    lastCheckedAt: current?.lastCheckedAt,
    lastSuccessAt: current?.lastSuccessAt,
    lastFailureAt: current?.lastFailureAt,
    lastLatencyMs: current?.lastLatencyMs,
    unavailableSince: current?.unavailableSince,
    lastFailureCode: current?.lastFailureCode,
    isTemporarilyUnavailable: current?.isTemporarilyUnavailable ?? false
  };

  if (probe.success) {
    const consecutiveSuccesses = prev.consecutiveSuccesses + 1;

    if (prev.state === ProviderHealthState.DOWN) {
      // First success after DOWN -> transitions to RECOVERING, still hidden
      return {
        ...prev,
        state: ProviderHealthState.RECOVERING,
        consecutiveFailures: 0,
        consecutiveSuccesses,
        lastCheckedAt: nowIso,
        lastSuccessAt: nowIso,
        lastLatencyMs: probe.latencyMs,
        isTemporarilyUnavailable: true
      };
    }

    if (prev.state === ProviderHealthState.RECOVERING) {
      if (consecutiveSuccesses >= recoveryThreshold) {
        // Met recovery threshold -> restored to HEALTHY and discovery
        return {
          ...prev,
          state: ProviderHealthState.HEALTHY,
          consecutiveFailures: 0,
          consecutiveSuccesses,
          lastCheckedAt: nowIso,
          lastSuccessAt: nowIso,
          lastLatencyMs: probe.latencyMs,
          unavailableSince: undefined,
          lastFailureCode: undefined,
          isTemporarilyUnavailable: false
        };
      }
      return {
        ...prev,
        state: ProviderHealthState.RECOVERING,
        consecutiveFailures: 0,
        consecutiveSuccesses,
        lastCheckedAt: nowIso,
        lastSuccessAt: nowIso,
        lastLatencyMs: probe.latencyMs,
        isTemporarilyUnavailable: true
      };
    }

    // Otherwise (HEALTHY, DEGRADED, UNKNOWN) -> healthy
    return {
      ...prev,
      state: ProviderHealthState.HEALTHY,
      consecutiveFailures: 0,
      consecutiveSuccesses,
      lastCheckedAt: nowIso,
      lastSuccessAt: nowIso,
      lastLatencyMs: probe.latencyMs,
      unavailableSince: undefined,
      lastFailureCode: undefined,
      isTemporarilyUnavailable: false
    };
  }

  // Probe FAILURE
  const consecutiveFailures = prev.consecutiveFailures + 1;

  if (prev.state === ProviderHealthState.HEALTHY || prev.state === ProviderHealthState.UNKNOWN) {
    if (consecutiveFailures >= failureThreshold) {
      return {
        ...prev,
        state: ProviderHealthState.DOWN,
        consecutiveSuccesses: 0,
        consecutiveFailures,
        lastCheckedAt: nowIso,
        lastFailureAt: nowIso,
        lastFailureCode: probe.failureCode || 'PROBE_FAILED',
        unavailableSince: nowIso,
        isTemporarilyUnavailable: true
      };
    }
    return {
      ...prev,
      state: ProviderHealthState.DEGRADED,
      consecutiveSuccesses: 0,
      consecutiveFailures,
      lastCheckedAt: nowIso,
      lastFailureAt: nowIso,
      lastFailureCode: probe.failureCode || 'PROBE_FAILED',
      isTemporarilyUnavailable: false
    };
  }

  if (prev.state === ProviderHealthState.DEGRADED) {
    if (consecutiveFailures >= failureThreshold) {
      return {
        ...prev,
        state: ProviderHealthState.DOWN,
        consecutiveSuccesses: 0,
        consecutiveFailures,
        lastCheckedAt: nowIso,
        lastFailureAt: nowIso,
        lastFailureCode: probe.failureCode || 'PROBE_FAILED',
        unavailableSince: nowIso,
        isTemporarilyUnavailable: true
      };
    }
    return {
      ...prev,
      state: ProviderHealthState.DEGRADED,
      consecutiveSuccesses: 0,
      consecutiveFailures,
      lastCheckedAt: nowIso,
      lastFailureAt: nowIso,
      lastFailureCode: probe.failureCode || 'PROBE_FAILED',
      isTemporarilyUnavailable: false
    };
  }

  // RECOVERING or DOWN -> remains DOWN
  return {
    ...prev,
    state: ProviderHealthState.DOWN,
    consecutiveSuccesses: 0,
    consecutiveFailures,
    lastCheckedAt: nowIso,
    lastFailureAt: nowIso,
    lastFailureCode: probe.failureCode || 'PROBE_FAILED',
    unavailableSince: prev.unavailableSince || nowIso,
    isTemporarilyUnavailable: true
  };
}
