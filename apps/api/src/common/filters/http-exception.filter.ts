import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ZayunoError, Logger } from '@zayuno/shared';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private logger = new Logger('HTTP_EXCEPTION');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId = (request.headers['x-trace-id'] as string) || (request as any).traceId || 'trace_unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let code = 'INTERNAL_ERROR';
    let details: any = undefined;

    if (exception instanceof ZayunoError) {
      status = exception.statusCode;
      message = exception.message;
      code = exception.code;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        message = (res as any).message || exception.message;
        code = (res as any).error || 'HTTP_ERROR';
        details = res;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(`[${request.method}] ${request.url} failed with status ${status}: ${message}`, exception, {
      traceId,
      statusCode: status,
      url: request.url,
      method: request.method
    });

    response.status(status).json({
      success: false,
      statusCode: status,
      code,
      message,
      details,
      traceId,
      timestamp: new Date().toISOString()
    });
  }
}
