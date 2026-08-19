export interface LogContext {
  traceId?: string;
  providerSlug?: string;
  orderId?: string;
  userId?: string;
  durationMs?: number;
  [key: string]: any;
}

export class Logger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private format(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    return JSON.stringify({
      timestamp,
      level,
      service: this.serviceName,
      message,
      ...context
    });
  }

  info(message: string, context?: LogContext): void {
    console.log(this.format('INFO', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.format('WARN', message, context));
  }

  error(message: string, error?: Error | any, context?: LogContext): void {
    const errObj = error instanceof Error ? {
      name: error.name,
      errorMessage: error.message,
      stack: error.stack
    } : { errorDetails: error };

    console.error(this.format('ERROR', message, { ...context, ...errObj }));
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG) {
      console.debug(this.format('DEBUG', message, context));
    }
  }
}
