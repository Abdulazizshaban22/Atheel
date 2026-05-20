import { Injectable } from '@nestjs/common';

@Injectable()
export class PlatformRuntimeService {
  private readonly startedAt = new Date();

  getProfile() {
    const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
    const apiPrefix = (process.env.API_PREFIX || process.env.GLOBAL_PREFIX || 'api').trim() || 'api';
    const queueMode = (process.env.QUEUE_MODE || '').trim().toLowerCase() || ((process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING) ? 'redis' : 'sync');

    return {
      service: 'atheel-api',
      nodeEnv,
      isProduction: nodeEnv === 'production',
      isTest: nodeEnv === 'test',
      apiPrefix,
      queueMode,
      startedAt: this.startedAt.toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  getConfigPresence() {
    const isProduction = this.getProfile().isProduction;
    const items = [
      { key: 'DATABASE_URL', present: Boolean((process.env.DATABASE_URL || '').trim()), required: true },
      { key: 'AUTH_JWT_SECRET', present: Boolean((process.env.AUTH_JWT_SECRET || '').trim()), required: isProduction },
      { key: 'WORKER_TOKEN', present: Boolean((process.env.WORKER_TOKEN || '').trim()), required: isProduction },
      {
        key: 'REDIS_URL_OR_CONNECTION_STRING',
        present: Boolean(((process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING) || '').trim()),
        required: isProduction,
      },
      { key: 'EXPORTS_RENDERER_TOKEN', present: Boolean((process.env.EXPORTS_RENDERER_TOKEN || '').trim()), required: false },
    ];

    const missingRequired = items.filter((item) => item.required && !item.present).map((item) => item.key);

    return {
      items,
      missingRequired,
      ok: missingRequired.length === 0,
    };
  }
}
