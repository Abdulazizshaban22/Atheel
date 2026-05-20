import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Wave40 Tenant enforcement (multi-org requires X-Org-Id)', () => {
  let app: INestApplication;

  async function login(email: string, password: string) {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
    expect(res.status).toBeLessThan(400);
    expect(res.body?.accessToken).toBeDefined();
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    process.env.QUEUE_MODE = 'sync';
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

  it('multi-org user must specify X-Org-Id (or organizationId)', async () => {
    const token = await login('multi@atheel.sa', 'Multi@1234');

    // No org -> 400 (user has >1 org)
    const noOrg = await request(app.getHttpServer())
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);
    expect(noOrg.status).toBe(400);

    // With org_demo_1 -> ok
    const ok1 = await request(app.getHttpServer())
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1');
    expect(ok1.status).toBeLessThan(400);

    // With org_demo_2 -> ok (may return empty)
    const ok2 = await request(app.getHttpServer())
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_2');
    expect(ok2.status).toBeLessThan(400);

    // Forbidden org -> 403
    const forbidden = await request(app.getHttpServer())
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_not_allowed');
    expect(forbidden.status).toBe(403);
  });
});
