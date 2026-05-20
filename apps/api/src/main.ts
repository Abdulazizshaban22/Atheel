import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import './otel';
import { ValidationPipe } from '@nestjs/common';
import type { ApiRequestLike, ApiResponseLike, NextHandler } from './common/http/api-request.types';
import { readHeader } from './common/http/api-request.types';
import { ApiExceptionFilter } from './common/http/api-exception.filter';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PrismaService } from '@madar/db';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { MetricsService } from './modules/metrics/metrics.service';
import { loadSecretEnv } from './common/secrets';
import { assertFallbackDisabledForStrictEnv } from './common/db-fallback';
import { withRequestContext } from './common/request-context';
import { ensureTraceContext } from './common/telemetry/trace-context.util';
import { assertProductionRuntimeEnv, readRuntimeEnv } from './common/config/runtime-env';

async function bootstrap() {
  loadSecretEnv('DATABASE_URL');
  loadSecretEnv('AUTH_JWT_SECRET');
  loadSecretEnv('WORKER_TOKEN');
  loadSecretEnv('REDIS_URL');
  loadSecretEnv('REDIS_CONNECTION_STRING');

  const runtimeEnv = readRuntimeEnv(process.env);
  assertFallbackDisabledForStrictEnv();
  assertProductionRuntimeEnv(runtimeEnv);

  const app = await NestFactory.create(AppModule, { cors: false });
  app.use(cookieParser());

  app.use((req: ApiRequestLike, res: ApiResponseLike, next: NextHandler) => {
    const requestId = String(readHeader(req.headers, 'x-request-id') || '').trim() || randomUUID();
    const correlationId = String(readHeader(req.headers, 'x-correlation-id') || '').trim() || requestId;
    const incomingTraceparent = String(readHeader(req.headers, 'traceparent') || '').trim() || undefined;
    const trace = ensureTraceContext({ traceparent: incomingTraceparent });
    const organizationId = String(readHeader(req.headers, 'x-org-id') || '').trim() || undefined;
    const ip = String(req?.ip || readHeader(req.headers, 'x-forwarded-for') || '').trim() || undefined;
    const userAgent = String(readHeader(req.headers, 'user-agent') || '').trim() || undefined;
    const method = String(req?.method || '').trim() || undefined;
    const path = String(req?.originalUrl || req?.url || '').trim() || undefined;

    req.requestId = requestId;
    req.correlationId = correlationId;
    req.traceparent = trace.traceparent;
    req.traceId = trace.traceId;
    req.organizationIdHint = organizationId;

    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Correlation-Id', correlationId);
    res.setHeader('X-Trace-Id', trace.traceId);
    res.setHeader('traceparent', trace.traceparent);

    return withRequestContext(
      {
        requestId,
        correlationId,
        traceparent: trace.traceparent,
        traceId: trace.traceId,
        spanId: trace.spanId,
        organizationId,
        method,
        path,
        ip,
        userAgent,
        authSource: 'anonymous',
      },
      () => next(),
    );
  });

  app.use((req: ApiRequestLike, res: ApiResponseLike, next: NextHandler) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      try {
        console.log(
          JSON.stringify({
            ts: new Date().toISOString(),
            type: 'http_request',
            method: req.method,
            path: req.originalUrl || req.url,
            status: res.statusCode,
            durationMs: Date.now() - startedAt,
            requestId: req.requestId,
            correlationId: req.correlationId,
            organizationId: req.organizationIdHint || null,
          }),
        );
      } catch {
        // no-op
      }
    });
    next();
  });

  try {
    const metrics = app.get<MetricsService>(MetricsService);
    app.use(metrics.middleware());
  } catch {
    // no-op
  }

  const trustProxy = runtimeEnv.trustProxy || '';
  if (trustProxy) {
    try {
      const httpServer = app.getHttpAdapter().getInstance() as {
        set?: (key: string, value: string | number) => void;
      };
      httpServer.set?.(
        'trust proxy',
        trustProxy === '1' || trustProxy.toLowerCase() === 'true' ? 1 : trustProxy,
      );
    } catch {
      // no-op
    }
  }

  app.setGlobalPrefix(runtimeEnv.apiPrefix);

  const allowlist = runtimeEnv.corsOrigins;
  app.enableCors({
    credentials: true,
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      if (!allowlist.length) {
        return callback(null, !runtimeEnv.isProduction);
      }
      return callback(null, allowlist.includes(origin));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Request-Id',
      'X-Correlation-Id',
      'X-Worker-Token',
      'X-CSRF-Token',
      'X-Org-Id',
    ],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86400,
  });

  app.use((req: ApiRequestLike, res: ApiResponseLike, next: NextHandler) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");

    if (runtimeEnv.enableHsts) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  // Wave123: Swagger protection — disable in production unless explicitly enabled
  const enableSwagger = !runtimeEnv.isProduction || process.env.SWAGGER_ENABLED === '1';
  if (enableSwagger) {
    const docConfig = new DocumentBuilder()
      .setTitle('Atheel Culture API')
      .setDescription('Foundation API for Saudi cultural operating platform — أَثِيل')
      .setVersion('0.4.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-Worker-Token', in: 'header' }, 'worker-token')
      .build();

    const document = SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });
    console.log(`Swagger UI enabled at /${runtimeEnv.apiPrefix}/docs`);
  } else {
    console.log('Swagger UI disabled in production (set SWAGGER_ENABLED=1 to override)');
  }

  const prisma = app.get<PrismaService>(PrismaService);
  await prisma.enableShutdownHooks(app);

  const port = Number(process.env.PORT || process.env.API_PORT || 4000);
  await app.listen(port);
  console.log(`API running at http://localhost:${port}/${runtimeEnv.apiPrefix}`);
}

bootstrap();
