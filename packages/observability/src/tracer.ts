import * as crypto from 'crypto';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
}

export class SimpleTracer {
  static createTrace(parentTraceId?: string): TraceContext {
    return {
      traceId: parentTraceId || `zy_tr_${crypto.randomBytes(12).toString('hex')}`,
      spanId: `zy_sp_${crypto.randomBytes(8).toString('hex')}`,
      startTime: Date.now()
    };
  }

  static getDurationMs(trace: TraceContext): number {
    return Date.now() - trace.startTime;
  }
}
