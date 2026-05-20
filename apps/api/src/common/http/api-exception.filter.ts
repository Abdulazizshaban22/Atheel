import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

function extractMessage(response: string | Record<string, unknown> | unknown): { message: string; details?: unknown; code?: string } {
  if (typeof response === 'string') {
    return { message: response };
  }

  if (response && typeof response === 'object') {
    const record = response as Record<string, unknown>;
    const rawMessage = record.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.map((item) => String(item)).join(', ')
      : typeof rawMessage === 'string'
        ? rawMessage
        : typeof record.error === 'string'
          ? record.error
          : 'Request failed';

    return {
      message,
      details: Array.isArray(rawMessage) ? rawMessage : record,
      code: typeof record.code === 'string' ? record.code : undefined,
    };
  }

  return { message: 'Request failed' };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'internal_server_error';
    let message = 'حدث خطأ غير متوقع داخل الخادم';
    let details: unknown;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const normalized = extractMessage(exception.getResponse());
      message = normalized.message;
      details = normalized.details;
      code = normalized.code || exception.name.replace(/Exception$/, '').replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    } else if (exception instanceof Error) {
      message = exception.message || message;
      code = exception.name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase() || code;
    }

    const payload = {
      statusCode,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
        ...(!isProd && exception instanceof Error
          ? {
              debug: {
                name: exception.name,
                stack: exception.stack?.split('\n').slice(0, 8),
              },
            }
          : {}),
      },
      request: {
        method: request?.method,
        path: request?.originalUrl || request?.url,
        requestId: request?.requestId || null,
        correlationId: request?.correlationId || null,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      console.error(
        JSON.stringify({
          type: 'http_error',
          statusCode,
          code,
          message,
          method: request?.method,
          path: request?.originalUrl || request?.url,
          requestId: request?.requestId || null,
          correlationId: request?.correlationId || null,
        }),
      );
    } catch {
      // ignore logging failures
    }

    response.status(statusCode).json(payload);
  }
}
