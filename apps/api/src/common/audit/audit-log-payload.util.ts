import { getRequestContext } from '../request-context';
import { toAuditSnapshot } from './audit-snapshot.util';

export type BuildAuditLogPayloadInput = {
  organizationId?: string;
  actorUserId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  severity?: 'info' | 'warning' | 'critical';
  message?: string;
  before?: unknown;
  after?: unknown;
};

export function buildAuditLogPayload(input: BuildAuditLogPayloadInput) {
  const ctx = getRequestContext();

  return {
    organizationId: input.organizationId,
    actorUserId: input.actorUserId ?? ctx.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    severity: input.severity ?? 'info',
    message: input.message,
    before: input.before === undefined ? undefined : toAuditSnapshot(input.before),
    after:
      input.after === undefined
        ? undefined
        : {
            entity: toAuditSnapshot(input.after),
            context: {
              requestId: ctx.requestId,
              correlationId: ctx.correlationId,
              authSource: ctx.authSource,
            },
          },
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
  };
}
