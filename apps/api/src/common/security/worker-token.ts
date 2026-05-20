import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

/**
 * Worker token assertion for PUBLIC endpoints that must be callable without JWT.
 *
 * Security notes:
 * - Only accept X-Worker-Token header (never query string) to prevent leakage via URLs/logs.
 * - timingSafeEqual throws if buffers differ in length, so we check length first.
 */
export function assertWorkerToken(req: Request) {
  const token = String(req?.headers?.['x-worker-token'] || '');
  assertWorkerTokenValue(token);
}

/**
 * Assertion variant used when the caller already extracted the header value.
 */
export function assertWorkerTokenValue(token?: string) {
  const expected = String(process.env.WORKER_TOKEN || '');

  // منع قبول التوكن عبر query string نهائيا لتجنب التسريب في الروابط والسجلات
  if (!expected) throw new UnauthorizedException();

  const a = Buffer.from(String(token || ''));
  const b = Buffer.from(expected);

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new UnauthorizedException();
  }
}
