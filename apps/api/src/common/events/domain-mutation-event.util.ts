import { getRequestContext } from '../request-context';
import type { CoreEventType } from '../contracts/resource-action.catalog';

export type DomainMutationEventInput = {
  organizationId?: string | null;
  actorType?: 'user' | 'service' | 'worker' | 'system';
  actorUserId?: string | null;
  eventType: CoreEventType | (string & {});
  subject?: string | null;
  severity?: 'info' | 'warning' | 'critical';
  source?: string | null;
  correlationId?: string | null;
  requestId?: string | null;
  data?: unknown;
};

export function buildDomainMutationEvent(input: DomainMutationEventInput) {
  const ctx = getRequestContext();

  return {
    organizationId: input.organizationId ?? ctx.organizationId ?? null,
    actorType: input.actorType ?? (input.actorUserId ? 'user' : 'system'),
    actorUserId: input.actorUserId ?? ctx.userId ?? null,
    eventType: input.eventType,
    source: input.source ?? 'atheel.api',
    subject: input.subject ?? null,
    severity: input.severity ?? 'info',
    correlationId: input.correlationId ?? ctx.correlationId ?? null,
    requestId: input.requestId ?? ctx.requestId ?? null,
    data: input.data ?? null,
  } as const;
}
