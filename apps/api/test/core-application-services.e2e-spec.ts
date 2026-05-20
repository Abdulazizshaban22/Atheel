import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Wave93 Core application services normalization', () => {
  let app: INestApplication;

  async function login(email: string, password: string) {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
    expect(res.status).toBeLessThan(400);
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

  it('writes before and after snapshots for project updates via application service', async () => {
    const token = await login('admin@atheel.sa', 'Admin@1234');

    const created = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .send({
        organizationId: 'org_demo_1',
        code: `PRJ-W93-${Date.now()}`,
        nameAr: 'مشروع قبل التحديث',
      });

    expect(created.status).toBeLessThan(400);

    const updated = await request(app.getHttpServer())
      .patch(`/api/projects/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .send({ nameAr: 'مشروع بعد التحديث', progressPercent: 25 });

    expect(updated.status).toBeLessThan(400);
    expect(updated.body?.nameAr).toBe('مشروع بعد التحديث');

    const logs = await request(app.getHttpServer())
      .get(`/api/audit-logs?entityType=project&entityId=${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1');

    expect(logs.status).toBe(200);
    const hit = logs.body.find((item: any) => item.action === 'project.update');
    expect(hit).toBeDefined();
    expect(hit.before?.nameAr).toBe('مشروع قبل التحديث');
    expect(hit.after?.entity?.nameAr).toBe('مشروع بعد التحديث');
  });

  it('rejects cross-organization content moves on update', async () => {
    const token = await login('admin@atheel.sa', 'Admin@1234');

    const created = await request(app.getHttpServer())
      .post('/api/content')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .send({
        organizationId: 'org_demo_1',
        title: 'بطاقة محتوى',
        languageCode: 'ar',
        contentType: 'article',
      });

    expect(created.status).toBeLessThan(400);

    const moved = await request(app.getHttpServer())
      .patch(`/api/content/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .send({ organizationId: 'org_demo_2' });

    expect(moved.status).toBe(400);
    expect(String(moved.body?.error?.message || '')).toContain('workflow نقل');
  });
});
