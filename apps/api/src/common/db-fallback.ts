import { ServiceUnavailableException } from '@nestjs/common';

const STRICT_PERSISTENCE_ENVS = new Set(['production', 'prod', 'staging', 'stage', 'preprod']);

function normalizedNodeEnv() {
  return (process.env.NODE_ENV || '').toString().trim().toLowerCase();
}

export function isStrictPersistenceEnv() {
  return STRICT_PERSISTENCE_ENVS.has(normalizedNodeEnv()) || (process.env.STRICT_PERSISTENCE || '').toString().toLowerCase() === 'true';
}

export function allowFallback() {
  if (isStrictPersistenceEnv()) return false;
  return (process.env.ALLOW_IN_MEMORY_FALLBACK || '').toString().toLowerCase() === 'true';
}

export function assertFallbackDisabledForStrictEnv() {
  if (!isStrictPersistenceEnv()) return;
  if ((process.env.ALLOW_IN_MEMORY_FALLBACK || '').toString().toLowerCase() === 'true') {
    throw new Error('STRICT_PERSISTENCE forbids ALLOW_IN_MEMORY_FALLBACK=true in staging/production.');
  }
}

/**
 * General guard for non-core modules that may still support controlled degradation.
 * In strict environments, any DB failure becomes a hard failure.
 */
export function throwIfProdDbError(err: unknown, context: string) {
  if (!isStrictPersistenceEnv() && allowFallback()) return;
  if (!isStrictPersistenceEnv()) return;

  // eslint-disable-next-line no-console
  console.error('[DB_FAIL_FAST]', context, err);
  throw new ServiceUnavailableException('قاعدة البيانات غير متاحة الآن. الرجاء المحاولة لاحقًا.');
}

/**
 * Core CRUD and auth must never fall back to in-memory storage.
 * These flows are considered source-of-truth operations.
 */
export function throwCorePersistenceError(err: unknown, context: string): never {
  // eslint-disable-next-line no-console
  console.error('[CORE_PERSISTENCE_FAIL_FAST]', context, err);
  throw new ServiceUnavailableException('هذه العملية تعتمد على قاعدة البيانات بشكل مباشر، وتعطّل المسار المؤقت داخل الذاكرة في هذه النسخة.');
}
