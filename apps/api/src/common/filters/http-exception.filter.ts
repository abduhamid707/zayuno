import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ZayunoError,
  Logger,
  getAgentErrorPresentation,
  normalizeZayunoErrorCode
} from '@zayuno/shared';

function isStructuredZayunoError(value: unknown): value is ZayunoError {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.statusCode === 'number'
    && typeof candidate.code === 'string'
    && typeof candidate.message === 'string';
}

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
    let rawCode: unknown = 'INTERNAL_ERROR';
    let details: any = undefined;
    let retryable: boolean | undefined;

    if (exception instanceof ZayunoError || isStructuredZayunoError(exception)) {
      status = exception.statusCode;
      message = exception.message;
      rawCode = exception.code;
      details = exception.details;
      retryable = typeof exception.retryable === 'boolean'
        ? exception.retryable
        : typeof details?.retryable === 'boolean'
          ? details.retryable
          : undefined;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        message = (res as any).message || exception.message;
        rawCode = (res as any).errorCode || (res as any).code || (res as any).error || 'HTTP_ERROR';
        details = res;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const code = normalizeZayunoErrorCode(rawCode, status, Array.isArray(message) ? message.join('; ') : message);
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      if (code === 'RESOURCE_UNAVAILABLE') {
        status = HttpStatus.CONFLICT;
      } else if (code === 'CAPACITY_EXCEEDED') {
        status = HttpStatus.UNPROCESSABLE_ENTITY;
      } else if (code === 'INVALID_SELECTION') {
        status = HttpStatus.BAD_REQUEST;
      }
    }

    const presentation = getAgentErrorPresentation({
      errorCode: code,
      statusCode: status,
      details,
      retryable
    });
    retryable = retryable ?? presentation.retryable;

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
      errorCode: code,
      // The transport boundary returns the canonical presentation only. Raw
      // provider messages and exception details remain in server logs because
      // they can contain credentials, endpoints, or vendor-specific internals.
      message: presentation.customerMessage,
      customerMessage: presentation.customerMessage,
      agentMessage: presentation.agentMessage,
      recommendedAction: presentation.recommendedAction,
      retryable,
      traceId,
      timestamp: new Date().toISOString()
    });
  }
}
