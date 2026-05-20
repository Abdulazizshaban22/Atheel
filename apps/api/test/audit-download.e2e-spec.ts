import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Wave40 Audit: download should write audit log', () => {
  let app: INestApplication;

  async function login(email: string, password: string) {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
    expect(res.status).toBeLessThan(400);
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

  it('exports.download creates audit-logs entry', async () => {
    const editorToken = await login('editor@atheel.sa', 'Editor@1234');

    // Generate approval packet
    const gen = await request(app.getHttpServer())
      .post('/api/approval-packets/generate')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ organizationId: 'org_demo_1', twinId: 'twin_demo_1', simulationRunId: 'sim_demo_1', scenarioKey: 'baseline' });

    expect(gen.status).toBeLessThan(400);
    const packetId = gen.body.packet.id as string;
    const contentItemIds: string[] = gen.body.packet?.artifacts?.contentItemIds || [];
    expect(contentItemIds.length).toBeGreaterThanOrEqual(4);
    const packetContentId = contentItemIds[3];

    // Create approval
    const createApproval = await request(app.getHttpServer())
      .post('/api/approvals')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ organizationId: 'org_demo_1', entityType: 'content', entityId: packetContentId, title: `اعتماد حزمة ${packetId}`, payloadSnapshot: { approvalPacketId: packetId, approvalPacketContentId: packetContentId } });

    expect(createApproval.status).toBeLessThan(400);
    const approvalId = createApproval.body?.id || createApproval.body?.approval?.id || createApproval.body?.item?.id;
    expect(approvalId).toBeDefined();

    // Submit
    const submit = await request(app.getHttpServer())
      .post(`/api/approvals/${approvalId}/submit`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ currentApproverId: 'usr_super_1' });
    expect(submit.status).toBeLessThan(400);

    // Approve
    const adminToken = await login('admin@atheel.sa', 'Admin@1234');
    const approve = await request(app.getHttpServer())
      .post(`/api/approvals/${approvalId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'مستوفى المعايير' });
    expect(approve.status).toBeLessThan(400);

    // Export
    const exp = await request(app.getHttpServer())
      .post(`/api/exports/approval-packets/${packetId}/generate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ async: false, includePptx: true, includePdf: true, includeBundleZip: true, includeSignatures: true, pageSize: 'A4' });

    expect(exp.status).toBeLessThan(400);
    const bundleAttachmentId = exp.body?.job?.result?.bundleAttachmentId;
    expect(bundleAttachmentId).toBeDefined();

    // Download
    const dl = await request(app.getHttpServer())
      .get(`/api/exports/download/${bundleAttachmentId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dl.status).toBeLessThan(400);

    // Verify audit log
    const logs = await request(app.getHttpServer())
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Org-Id', 'org_demo_1')
      .query({ organizationId: 'org_demo_1', entityType: 'Attachment', entityId: bundleAttachmentId, q: 'exports.download' });

    expect(logs.status).toBeLessThan(400);
    const items = Array.isArray(logs.body) ? logs.body : (logs.body?.items || []);
    expect(items.length).toBeGreaterThan(0);
  });
});
