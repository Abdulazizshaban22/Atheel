import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContextStore = {
  requestId?: string;
  correlationId?: string;
  traceparent?: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  organizationId?: string;
  userId?: string;
  authSource?: 'bearer' | 'cookie' | 'worker' | 'anonymous';
  method?: string;
  path?: string;
  ip?: string;
  userAgent?: string;
};

export const requestContext = new AsyncLocalStorage<RequestContextStore>();

export function getRequestContext(): RequestContextStore {
  return requestContext.getStore() || {};
}

export function withRequestContext<T>(store: RequestContextStore, fn: () => T): T {
  return requestContext.run(store, fn);
}
