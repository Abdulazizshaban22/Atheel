import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Wave92 Policy and audit boundary hardening', () => {
  let app: INestApplication;

  async function login(email: string, password: string) {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
    expect(res.status).toBeLessThan(400);
    expect(res.body?.accessToken).toBeDefined();
    return res.body.accessToken as string;
  }

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

  it('rejects conflicting tenant hints across header and body', async () => {
    const token = await login('admin@atheel.sa', 'Admin@1234');

    const res = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .send({
        organizationId: 'org_demo_2',
        code: 'PRJ-CONFLICT-001',
        nameAr: 'مشروع تعارض جهات',
      });

    expect(res.status).toBe(400);
    expect(String(res.body?.error?.message || '')).toContain('organizationId');
  });

  it('writes audit trail automatically for decorated mutating routes', async () => {
    const token = await login('admin@atheel.sa', 'Admin@1234');

    const create = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .send({
        organizationId: 'org_demo_1',
        code: `PRJ-AUDIT-${Date.now()}`,
        nameAr: 'مشروع مراقبة أثر التدقيق',
      });

    expect(create.status).toBeLessThan(400);
    expect(create.body?.id).toBeDefined();

    const logs = await request(app.getHttpServer())
      .get(`/api/audit-logs?entityType=project&entityId=${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1');

    expect(logs.status).toBe(200);
    expect(Array.isArray(logs.body)).toBe(true);
    const hit = logs.body.find((item: any) => item.action === 'project.create' && item.entityId === create.body.id);
    expect(hit).toBeDefined();
    expect(hit.organizationId).toBe('org_demo_1');
  });
});
