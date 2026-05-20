import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Wave40 CSRF guard (cookie-auth requires X-CSRF-Token)', () => {
  let app: INestApplication;

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

  it('rejects POST without CSRF header when authenticated via cookies', async () => {
    const agent = request.agent(app.getHttpServer());

    // Login: sets HttpOnly cookies (atheel_access, atheel_refresh) + atheel_csrf
    const login = await agent.post('/api/auth/login').send({ email: 'admin@atheel.sa', password: 'Admin@1234' });
    expect(login.status).toBeLessThan(400);
    expect(login.body?.csrfToken).toBeDefined();
    const csrfToken = login.body.csrfToken as string;

    // Without X-CSRF-Token -> 403
    const bad = await agent
      .post('/api/projects')
      .set('X-Org-Id', 'org_demo_1')
      .send({ code: 'CSRF-001', nameAr: 'مشروع اختبار CSRF' });
    expect(bad.status).toBe(403);

    // With correct X-CSRF-Token -> ok
    const ok = await agent
      .post('/api/projects')
      .set('X-Org-Id', 'org_demo_1')
      .set('X-CSRF-Token', csrfToken)
      .send({ code: 'CSRF-001', nameAr: 'مشروع اختبار CSRF' });

    expect(ok.status).toBeLessThan(400);
    expect(ok.body?.id).toBeDefined();
  });
});
