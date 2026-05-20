import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { getRequestContext } from '../request-context';
import type { ApiRequestLike } from './api-request.types';
import { API_RESPONSE_ENVELOPE_KEY, type ApiResponseEnvelopeMetadata } from './api-response-envelope.decorator';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isAlreadyEnvelope(value: unknown) {
  return isPlainObject(value) && 'ok' in value && 'data' in value && 'meta' in value;
}

@Injectable()
export class ApiResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<ApiResponseEnvelopeMetadata>(API_RESPONSE_ENVELOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!metadata || context.getType<'http'>() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<ApiRequestLike>();

    return next.handle().pipe(
      map((body: unknown) => {
        if (body instanceof StreamableFile || Buffer.isBuffer(body) || typeof body === 'string' || isAlreadyEnvelope(body)) {
          return body;
        }

        const ctx = getRequestContext();
        const count = Array.isArray(body) ? body.length : undefined;

        return {
          ok: true,
          message: metadata.message,
          data: body,
          meta: {
            kind: metadata.kind ?? (Array.isArray(body) ? 'list' : 'item'),
            count,
            requestId: req?.requestId || ctx.requestId,
            correlationId: req?.correlationId || ctx.correlationId,
            method: req?.method,
            path: req?.originalUrl || req?.url,
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
