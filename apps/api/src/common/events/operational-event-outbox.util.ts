import type { DomainMutationEventInput } from './domain-mutation-event.util';

type EventShape = DomainMutationEventInput & {
  actorType?: 'user' | 'service' | 'worker' | 'system';
  correlationId?: string | null;
  requestId?: string | null;
};

export const OPERATIONAL_EVENT_OUTBOX_CHANNEL = 'operational_event' as const;
export const OPERATIONAL_EVENT_OUTBOX_KIND = 'operational_event_v1' as const;

export type OperationalEventOutboxPayload = {
  kind: typeof OPERATIONAL_EVENT_OUTBOX_KIND;
  event: {
    organizationId?: string | null;
    actorType?: 'user' | 'service' | 'worker' | 'system';
    actorUserId?: string | null;
    eventType: string;
    source?: string | null;
    subject?: string | null;
    correlationId?: string | null;
    requestId?: string | null;
    severity?: 'info' | 'warning' | 'critical';
    data?: unknown;
  };
};

export function buildOperationalEventOutboxPayload(input: EventShape): OperationalEventOutboxPayload {
  return {
    kind: OPERATIONAL_EVENT_OUTBOX_KIND,
    event: {
      organizationId: input.organizationId ?? null,
      actorType: input.actorType ?? 'system',
      actorUserId: input.actorUserId ?? null,
      eventType: String(input.eventType),
      source: input.source ?? 'atheel.api',
      subject: input.subject ?? null,
      correlationId: input.correlationId ?? null,
      requestId: input.requestId ?? null,
      severity: input.severity ?? 'info',
      data: input.data ?? null,
    },
  };
}

export function isOperationalEventOutboxPayload(input: unknown): input is OperationalEventOutboxPayload {
  if (!input || typeof input !== 'object') return false;
  const payload = input as Partial<OperationalEventOutboxPayload> & { event?: Partial<OperationalEventOutboxPayload['event']> };
  return Boolean(
    payload.kind === OPERATIONAL_EVENT_OUTBOX_KIND &&
      payload.event &&
      typeof payload.event.eventType === 'string',
  );
}
