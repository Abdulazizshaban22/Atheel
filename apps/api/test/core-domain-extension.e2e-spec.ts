import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Wave94 Core domain extension', () => {
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

  it('writes experience audit snapshots and emits operational event on update', async () => {
    const token = await login('admin@atheel.sa', 'Admin@1234');

    const project = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .send({
        organizationId: 'org_demo_1',
        code: `PRJ-EXP-${Date.now()}`,
        nameAr: 'مشروع تجربة Wave94',
      });

    expect(project.status).toBeLessThan(400);

    const created = await request(app.getHttpServer())
      .post('/api/experiences')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .send({
        projectId: project.body.id,
        titleAr: 'تجربة ترحيب',
        experienceType: 'route',
        durationMinutesDefault: 35,
        publishStatus: 'draft',
      });

    expect(created.status).toBeLessThan(400);
    const experienceId = created.body.id as string;

    const updated = await request(app.getHttpServer())
      .patch(`/api/experiences/${experienceId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .send({ publishStatus: 'published', titleAr: 'تجربة ترحيب محدثة' });

    expect(updated.status).toBeLessThan(400);

    const logs = await request(app.getHttpServer())
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .query({ entityType: 'experience', entityId: experienceId });

    expect(logs.status).toBe(200);
    const auditItems = Array.isArray(logs.body) ? logs.body : [];
    const hit = auditItems.find((item: any) => item.action === 'experience.update');
    expect(hit).toBeDefined();
    expect(String(hit?.before?.publishStatus || '')).toBe('draft');
    const afterEntity = hit?.after?.entity || hit?.after;
    expect(String(afterEntity?.publishStatus || '')).toBe('published');

    const events = await request(app.getHttpServer())
      .get('/api/operational-events')
      .set('Authorization', `Bearer ${token}`)
      .query({ organizationId: 'org_demo_1', eventType: 'experience.updated' });

    expect(events.status).toBe(200);
    const eventItems = Array.isArray(events.body?.items) ? events.body.items : [];
    expect(eventItems.some((item: any) => String(item.subject || '').includes(experienceId))).toBe(true);
  });

  it('creates approval transition audit/event path through application service', async () => {
    const token = await login('admin@atheel.sa', 'Admin@1234');

    const project = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .send({ organizationId: 'org_demo_1', code: `PRJ-APR-${Date.now()}`, nameAr: 'مشروع اعتماد Wave94' });

    expect(project.status).toBeLessThan(400);

    const approval = await request(app.getHttpServer())
      .post('/api/approvals')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .send({ organizationId: 'org_demo_1', entityType: 'project', entityId: project.body.id, title: 'اعتماد مشروع Wave94' });

    expect(approval.status).toBeLessThan(400);
    const approvalId = approval.body.id as string;

    const submit = await request(app.getHttpServer())
      .post(`/api/approvals/${approvalId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .send({ currentApproverId: 'usr_admin_1' });

    expect(submit.status).toBeLessThan(400);

    const approve = await request(app.getHttpServer())
      .post(`/api/approvals/${approvalId}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .send({ note: 'مستوفى' });

    expect(approve.status).toBeLessThan(400);
    expect(approve.body?.status).toBe('approved');

    const logs = await request(app.getHttpServer())
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .query({ entityType: 'approval_request', entityId: approvalId });

    expect(logs.status).toBe(200);
    const auditItems = Array.isArray(logs.body) ? logs.body : [];
    expect(auditItems.some((item: any) => item.action === 'approval.approve')).toBe(true);

    const events = await request(app.getHttpServer())
      .get('/api/operational-events')
      .set('Authorization', `Bearer ${token}`)
      .query({ organizationId: 'org_demo_1', eventType: 'approval.approved' });

    expect(events.status).toBe(200);
    const eventItems = Array.isArray(events.body?.items) ? events.body.items : [];
    expect(eventItems.some((item: any) => String(item.subject || '').includes(approvalId))).toBe(true);
  });

  it('records attachment link snapshots and emits link event', async () => {
    const token = await login('admin@atheel.sa', 'Admin@1234');

    const project = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .send({ organizationId: 'org_demo_1', code: `PRJ-ATT-${Date.now()}`, nameAr: 'مشروع مرفقات Wave94' });

    expect(project.status).toBeLessThan(400);

    const upload = await request(app.getHttpServer())
      .post('/api/attachments/upload?organizationId=org_demo_1')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('hello wave94'), 'wave94.txt');

    expect(upload.status).toBeLessThan(400);
    const attachmentId = upload.body.id as string;

    const linked = await request(app.getHttpServer())
      .patch(`/api/attachments/${attachmentId}/link`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .send({ organizationId: 'org_demo_1', entityType: 'project', entityId: project.body.id });

    expect(linked.status).toBeLessThan(400);

    const logs = await request(app.getHttpServer())
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Org-Id', 'org_demo_1')
      .query({ entityType: 'attachment', entityId: attachmentId });

    expect(logs.status).toBe(200);
    const auditItems = Array.isArray(logs.body) ? logs.body : [];
    const hit = auditItems.find((item: any) => item.action === 'attachment.link');
    expect(hit).toBeDefined();
    const afterEntity = hit?.after?.entity || hit?.after;
    expect(String(afterEntity?.entityType || '')).toBe('project');
    expect(String(afterEntity?.entityId || '')).toBe(project.body.id);

    const events = await request(app.getHttpServer())
      .get('/api/operational-events')
      .set('Authorization', `Bearer ${token}`)
      .query({ organizationId: 'org_demo_1', eventType: 'attachment.linked' });

    expect(events.status).toBe(200);
    const eventItems = Array.isArray(events.body?.items) ? events.body.items : [];
    expect(eventItems.some((item: any) => String(item.subject || '').includes(attachmentId))).toBe(true);
  });
});
