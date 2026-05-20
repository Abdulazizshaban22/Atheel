export type RuntimeEnv = {
  nodeEnv: string;
  isProduction: boolean;
  apiPrefix: string;
  corsOrigins: string[];
  trustProxy?: string;
  enableHsts: boolean;
  databaseUrl?: string;
  authJwtSecret?: string;
  workerToken?: string;
  redisUrl?: string;
  queueMode?: string;
};

function normalizePrefix(raw?: string) {
  const value = (raw || '').trim();
  if (!value) return 'api';
  const withoutSpaces = value.replace(/\s+/g, '');
  const withoutSlashes = withoutSpaces.replace(/^\/+/, '').replace(/\/+$/, '');
  return withoutSlashes || 'api';
}

function parseCsv(raw?: string) {
  return (raw || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function read(raw?: string) {
  return (raw || '').toString().trim() || undefined;
}

export function readRuntimeEnv(source: NodeJS.ProcessEnv = process.env): RuntimeEnv {
  const nodeEnv = read(source.NODE_ENV) || 'development';
  const isProduction = nodeEnv.toLowerCase() === 'production';

  return {
    nodeEnv,
    isProduction,
    apiPrefix: normalizePrefix(source.API_PREFIX || source.GLOBAL_PREFIX || 'api'),
    corsOrigins: parseCsv(source.CORS_ORIGINS),
    trustProxy: read(source.TRUST_PROXY),
    enableHsts: String(source.ENABLE_HSTS || '').toLowerCase() === 'true',
    databaseUrl: read(source.DATABASE_URL),
    authJwtSecret: read(source.AUTH_JWT_SECRET),
    workerToken: read(source.WORKER_TOKEN),
    redisUrl: read(source.REDIS_URL || source.REDIS_CONNECTION_STRING),
    queueMode: read(source.QUEUE_MODE)?.toLowerCase(),
  };
}

function assertPresent(name: string, value?: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

export function assertProductionRuntimeEnv(env: RuntimeEnv) {
  if (!env.isProduction) return;

  assertPresent('DATABASE_URL', env.databaseUrl);
  assertPresent('AUTH_JWT_SECRET', env.authJwtSecret);
  assertPresent('WORKER_TOKEN', env.workerToken);
  assertPresent('REDIS_URL', env.redisUrl);

  if (env.queueMode === 'sync') {
    throw new Error('Production does not allow QUEUE_MODE=sync. Use QUEUE_MODE=redis.');
  }
}
