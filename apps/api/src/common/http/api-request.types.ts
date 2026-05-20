import type { RequestUser } from '../../modules/auth/interfaces/request-user.interface';

export type HeaderValue = string | string[] | undefined;

export type HeaderMap = Record<string, HeaderValue>;

export type RequestRecord = Record<string, unknown>;

export interface ApiRequestLike {
  headers?: HeaderMap;
  query?: RequestRecord;
  params?: RequestRecord;
  body?: RequestRecord;
  user?: RequestUser;
  ip?: string;
  method?: string;
  url?: string;
  originalUrl?: string;
  requestId?: string;
  correlationId?: string;
  traceparent?: string;
  traceId?: string;
  organizationIdHint?: string;
  __orgId?: string;
}

export interface ApiResponseLike {
  statusCode?: number;
  setHeader(name: string, value: string): void;
  on(event: string, listener: (...args: unknown[]) => void): void;
}

export type NextHandler = () => void;

export function readHeader(headers: HeaderMap | undefined, name: string): string | undefined {
  const direct = headers?.[name];
  if (typeof direct === 'string') return direct;
  if (Array.isArray(direct)) return direct[0];
  const normalized = name.toLowerCase();
  for (const [key, value] of Object.entries(headers || {})) {
    if (key.toLowerCase() !== normalized) continue;
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value[0];
  }
  return undefined;
}

export function readRecordString(record: RequestRecord | undefined, key: string): string | undefined {
  const value = record?.[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}
