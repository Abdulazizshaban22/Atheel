import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { getRequestContext } from '../request-context';
import { AUDIT_ACTION_KEY, type AuditActionMetadata } from './audit-action.decorator';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';
import type { ApiRequestLike } from '../http/api-request.types';
import { toAuditSnapshot } from './audit-snapshot.util';

function firstDefined(...values: Array<unknown>) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

type EnvelopeLike = { ok: boolean; data: unknown; meta: unknown };

type UnknownRecord = Record<string, unknown>;

function isEnvelopeLike(value: unknown): value is EnvelopeLike {
  return Boolean(value && typeof value === 'object' && 'ok' in value && 'data' in value && 'meta' in value);
}

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readRecordValue(record: unknown, key: string): unknown {
  if (!isUnknownRecord(record)) {
    return undefined;
  }
  return record[key];
}

function unwrapEnvelope(value: unknown): unknown {
  if (isEnvelopeLike(value)) {
    return value.data;
  }
  return value;
}

@Injectable()
export class AuditTrailInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogs: AuditLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<AuditActionMetadata>(AUDIT_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!metadata || metadata.skipAutoRecord || context.getType<'http'>() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<ApiRequestLike>();

    return next.handle().pipe(
      mergeMap((responseBody: unknown) =>
        from(this.persistAuditRecord(req, metadata, responseBody).then(() => responseBody)),
      ),
    );
  }

  private async persistAuditRecord(req: ApiRequestLike, metadata: AuditActionMetadata, responseBody: unknown) {
    try {
      const ctx = getRequestContext();
      const actorUserId = req?.user?.sub || ctx.userId || undefined;
      const responseData = unwrapEnvelope(responseBody);
      const entityId = firstDefined(
        metadata.entityIdParam ? req?.params?.[metadata.entityIdParam] : undefined,
        metadata.entityIdBodyField ? req?.body?.[metadata.entityIdBodyField] : undefined,
        readRecordValue(responseData, 'id'),
        readRecordValue(responseData, 'entityId'),
      );
      const organizationId = firstDefined(
        req?.__orgId,
        req?.organizationIdHint,
        metadata.organizationIdBodyField ? req?.body?.[metadata.organizationIdBodyField] : undefined,
        req?.body?.organizationId,
        req?.query?.organizationId,
        readRecordValue(responseData, 'organizationId'),
      );

      await this.auditLogs.recordAction({
        actorUserId,
        organizationId: organizationId ? String(organizationId) : undefined,
        action: metadata.action,
        entityType: metadata.entityType,
        entityId: entityId ? String(entityId) : undefined,
        severity: 'info',
        message: metadata.message,
        after: {
          request: {
            method: req?.method,
            path: req?.originalUrl || req?.url,
            requestId: ctx.requestId,
            correlationId: ctx.correlationId,
            authSource: ctx.authSource,
          },
          body: toAuditSnapshot(req?.body),
          result: toAuditSnapshot(responseData),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({
        ts: new Date().toISOString(),
        type: 'audit_write_failed',
        error: message,
        path: req?.originalUrl || req?.url,
      }));
    }
  }
}
