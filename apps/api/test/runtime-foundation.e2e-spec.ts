import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Wave91 Runtime foundation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.QUEUE_MODE = 'sync';
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_DEMO_SEED = 'true';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns public health overview and live payloads', async () => {
    const overview = await request(app.getHttpServer()).get('/api/health');
    expect(overview.status).toBe(200);
    expect(overview.body?.status).toBe('ok');
    expect(overview.body?.runtime?.queue?.mode).toBeDefined();

    const live = await request(app.getHttpServer()).get('/api/health/live');
    expect(live.status).toBe(200);
    expect(live.body?.status).toBe('alive');
  });

  it('returns readiness payload even when dependencies are degraded', async () => {
    const ready = await request(app.getHttpServer()).get('/api/health/ready');
    expect([200, 503]).toContain(ready.status);
    expect(['ready', 'degraded', 'not_ready']).toContain(ready.body?.status);
    expect(ready.body?.checks?.database).toBeDefined();
    expect(ready.body?.checks?.queue).toBeDefined();
  });

  it('wraps unknown routes with the standardized error envelope', async () => {
    const res = await request(app.getHttpServer()).get('/api/__missing_route__');
    expect(res.status).toBe(404);
    expect(res.body?.statusCode).toBe(404);
    expect(res.body?.error?.message).toBeDefined();
    expect(res.body?.request?.requestId).toBeDefined();
    expect(res.body?.request?.path).toContain('/api/__missing_route__');
  });
});
