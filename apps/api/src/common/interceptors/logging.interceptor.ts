import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SimpleTracer, MetricsCollector } from '@zayuno/observability';
import { Logger } from '@zayuno/shared';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger = new Logger('API_TRAFFIC');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const parentTraceId = req.headers['x-trace-id'] as string | undefined;
    const trace = SimpleTracer.createTrace(parentTraceId);
    req.traceId = trace.traceId;
    res.setHeader('x-trace-id', trace.traceId);

    const { method, url } = req;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = SimpleTracer.getDurationMs(trace);
          MetricsCollector.recordLatency({
            service: 'zayuno-api',
            operation: `${method} ${url}`,
            durationMs: duration,
            statusCode: res.statusCode,
            success: true,
            timestamp: new Date().toISOString()
          });

          this.logger.info(`[${method}] ${url} completed in ${duration}ms`, {
            traceId: trace.traceId,
            durationMs: duration,
            statusCode: res.statusCode
          });
        },
        error: (err) => {
          const duration = SimpleTracer.getDurationMs(trace);
          MetricsCollector.recordLatency({
            service: 'zayuno-api',
            operation: `${method} ${url}`,
            durationMs: duration,
            statusCode: err.status || 500,
            success: false,
            timestamp: new Date().toISOString()
          });
        }
      })
    );
  }
}
