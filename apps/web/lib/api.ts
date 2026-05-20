const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';


function randomId(prefix: string) {
  try {
    if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
      const a = new Uint8Array(16);
      crypto.getRandomValues(a);
      return `${prefix}_${Array.from(a).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
    }
  } catch {}
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

let correlationIdCache = '';
function getCorrelationId() {
  if (correlationIdCache) return correlationIdCache;
  correlationIdCache = randomId('corr');
  return correlationIdCache;
}


function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const safe = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const m = document.cookie.match(new RegExp(`(?:^|; )${safe}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : '';
}

let csrfCache = '';
async function ensureCsrfToken(): Promise<string> {
  if (typeof window === 'undefined') return '';
  const existing = readCookie('atheel_csrf');
  if (existing) {
    csrfCache = existing;
    return existing;
  }
  if (csrfCache) return csrfCache;
  try {
    const res = await fetch(`${API_BASE}/api/auth/csrf`, { cache: 'no-store', credentials: 'include', headers: { 'X-Correlation-Id': getCorrelationId() } });
    if (!res.ok) return '';
    const json = await res.json() as any;
    csrfCache = String(json?.csrfToken || '') || readCookie('atheel_csrf');
    return csrfCache;
  } catch {
    return '';
  }
}

export async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}/api${path}`, { cache: 'no-store', credentials: 'include', headers: { 'X-Correlation-Id': getCorrelationId() } });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

export function getApiBase() {
  return `${API_BASE}/api`;
}

export type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export async function apiRequest<T>(path: string, options?: {
  method?: ApiMethod;
  token?: string;
  body?: unknown;
}): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const isForm = typeof FormData !== 'undefined' && options?.body instanceof FormData;
    const method = options?.method ?? 'GET';
    const needsCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    const csrf = needsCsrf ? await ensureCsrfToken() : '';

    const res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers: {
        ...(isForm ? {} : { 'Content-Type': 'application/json' }),
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options?.body !== undefined ? (isForm ? (options.body as FormData) : JSON.stringify(options.body)) : undefined,
      cache: 'no-store',
      credentials: 'include',
    });

    const contentType = res.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await res.json() : null;
    return {
      ok: res.ok,
      status: res.status,
      data: payload as T,
      error: res.ok ? undefined : (payload as any)?.message || `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}
