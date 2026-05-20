'use client';

// Wave36: Tokens are stored as HttpOnly cookies set by the API.
// The web app must NOT store access/refresh tokens in localStorage.

export type SessionUser = {
  sub?: string;
  id?: string;
  email?: string;
  name?: string;
  roles?: string[];
  orgIds?: string[];
};

function safeWindow() {
  return typeof window !== 'undefined' ? window : null;
}

export function setCookie(name: string, value: string, days = 7) {
  const w = safeWindow();
  if (!w) return;
  const maxAge = Math.max(1, Math.floor(days * 24 * 60 * 60));
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function clearCookie(name: string) {
  const w = safeWindow();
  if (!w) return;
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

export function persistSession(payload: { user?: SessionUser }) {
  const w = safeWindow();
  if (!w) return;
  if (payload.user) localStorage.setItem('atheel_user', JSON.stringify(payload.user));
}

export function clearSession() {
  const w = safeWindow();
  if (!w) return;
  localStorage.removeItem('atheel_user');
}

export function getToken() {
  return '';
}

export function getRefreshToken() {
  return '';
}

export function getStoredUser(): SessionUser | null {
  const w = safeWindow();
  if (!w) return null;
  const raw = localStorage.getItem('atheel_user');
  if (!raw) return null;
  try { return JSON.parse(raw) as SessionUser; } catch { return null; }
}
