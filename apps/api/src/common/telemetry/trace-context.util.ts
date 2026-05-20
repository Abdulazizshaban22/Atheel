import { randomBytes } from 'node:crypto';

export type ParsedTraceContext = {
  traceparent: string;
  version: string;
  traceId: string;
  spanId: string;
  traceFlags: string;
  sampled: boolean;
  source: 'incoming' | 'synthetic' | 'derived';
};

function randomHex(size: number) {
  return randomBytes(size).toString('hex');
}

function normalizeHex(value: string | null | undefined, length: number) {
  const v = String(value || '').trim().toLowerCase();
  if (!v || v.length !== length) return null;
  if (!/^[0-9a-f]+$/.test(v)) return null;
  if (/^0+$/.test(v)) return null;
  return v;
}

export function parseTraceparent(value: string | null | undefined): ParsedTraceContext | null {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  const match = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/.exec(raw);
  if (!match) return null;
  const [, version, traceId, spanId, traceFlags] = match;
  if (!normalizeHex(traceId, 32) || !normalizeHex(spanId, 16)) return null;
  return {
    traceparent: `${version}-${traceId}-${spanId}-${traceFlags}`,
    version,
    traceId,
    spanId,
    traceFlags,
    sampled: (parseInt(traceFlags, 16) & 0x01) === 1,
    source: 'incoming',
  };
}

export function buildTraceparent(input?: { traceId?: string | null; spanId?: string | null; traceFlags?: string | null }) {
  const traceId = normalizeHex(input?.traceId || null, 32) || randomHex(16);
  const spanId = normalizeHex(input?.spanId || null, 16) || randomHex(8);
  const traceFlags = normalizeHex(input?.traceFlags || '01', 2) || '01';
  return `00-${traceId}-${spanId}-${traceFlags}`;
}

export function ensureTraceContext(input?: { traceparent?: string | null }) {
  const parsed = parseTraceparent(input?.traceparent || null);
  if (parsed) return parsed;
  const traceparent = buildTraceparent({ traceFlags: '01' });
  const synthetic = parseTraceparent(traceparent)!;
  return { ...synthetic, source: 'synthetic' as const };
}

export function createChildTraceContext(parent?: string | null) {
  const base = ensureTraceContext({ traceparent: parent || null });
  const childSpanId = randomHex(8);
  const traceparent = buildTraceparent({ traceId: base.traceId, spanId: childSpanId, traceFlags: base.traceFlags });
  return {
    traceparent,
    traceId: base.traceId,
    spanId: childSpanId,
    parentSpanId: base.spanId,
    traceFlags: base.traceFlags,
    sampled: base.sampled,
    source: 'derived' as const,
  };
}
