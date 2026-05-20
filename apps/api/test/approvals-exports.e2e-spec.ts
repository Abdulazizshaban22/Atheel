import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import cookieParser from 'cookie-parser';

describe('Wave25 Approvals + Exports (luxury governance path)', () => {
  let app: INestApplication;

  async function login(email: string, password: string) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });
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

  it('generate approval packet -> create approval -> approve -> export -> download bundle', async () => {
    const editorToken = await login('editor@atheel.sa', 'Editor@1234');

    // 1) Generate approval packet from seeded twin simulation
    const gen = await request(app.getHttpServer())
      .post('/api/approval-packets/generate')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        organizationId: 'org_demo_1',
        twinId: 'twin_demo_1',
        simulationRunId: 'sim_demo_1',
        scenarioKey: 'baseline',
      });

    expect(gen.status).toBeLessThan(400);
    expect(gen.body?.packet?.id).toBeDefined();

    const packetId = gen.body.packet.id as string;
    const contentItemIds: string[] = gen.body.packet?.artifacts?.contentItemIds || [];
    expect(contentItemIds.length).toBeGreaterThanOrEqual(4);
    const packetContentId = contentItemIds[3];

    // 2) Create linked approval request
    const createApproval = await request(app.getHttpServer())
      .post('/api/approvals')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        organizationId: 'org_demo_1',
        entityType: 'content',
        entityId: packetContentId,
        title: `اعتماد حزمة ${packetId}`,
        payloadSnapshot: { approvalPacketId: packetId, approvalPacketContentId: packetContentId },
      });

    expect(createApproval.status).toBeLessThan(400);
    const approvalId = createApproval.body?.id || createApproval.body?.approval?.id || createApproval.body?.item?.id;
    expect(approvalId).toBeDefined();

    // 3) Submit
    const submit = await request(app.getHttpServer())
      .post(`/api/approvals/${approvalId}/submit`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ currentApproverId: 'usr_super_1' });

    expect(submit.status).toBeLessThan(400);
    expect(submit.body?.status).toBe('submitted');

    // 4) Approve as admin
    const adminToken = await login('admin@atheel.sa', 'Admin@1234');
    const approve = await request(app.getHttpServer())
      .post(`/api/approvals/${approvalId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'مستوفى المعايير' });

    expect(approve.status).toBeLessThan(400);
    expect(approve.body?.status).toBe('approved');

    // 5) Export bundle
    const exp = await request(app.getHttpServer())
      .post(`/api/exports/approval-packets/${packetId}/generate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ async: false, includePptx: true, includePdf: true, includeBundleZip: true, includeSignatures: true, pageSize: 'A4' });

    expect(exp.status).toBeLessThan(400);
    expect(exp.body?.ok).toBeTruthy();
    const job = exp.body?.job;
    expect(job?.status).toBe('completed');
    const bundleAttachmentId = job?.result?.bundleAttachmentId;
    expect(bundleAttachmentId).toBeDefined();

    // 6) Download bundle
    const dl = await request(app.getHttpServer())
      .get(`/api/exports/download/${bundleAttachmentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dl.status).toBeLessThan(400);
    expect(dl.headers['content-type']).toContain('application/zip');
    expect(Number(dl.headers['content-length'] || 0)).toBeGreaterThan(0);
  });
});
