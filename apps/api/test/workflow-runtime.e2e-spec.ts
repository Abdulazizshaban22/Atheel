import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import cookieParser from 'cookie-parser';

describe('Wave07 Workflow Runtime (sync mode)', () => {
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
    process.env.WORKER_TOKEN = process.env.WORKER_TOKEN || 'test-worker-token';
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

  it('enqueue -> tick -> action approve', async () => {
    const token = await login('admin@atheel.sa', 'Admin@1234');
    const enq = await request(app.getHttpServer())
      .post('/api/workflows/executions/enqueue')
      .set('Authorization', `Bearer ${token}`)
      .send({ templateId: 'wft_0001', priority: 'normal', autoStart: false });

    expect(enq.status).toBeLessThan(400);
    expect(enq.body?.execution?.id || enq.body?.executionId).toBeDefined();

    const executionId = enq.body.execution?.id || enq.body.executionId;

    const tick = await request(app.getHttpServer())
      .post(`/api/workflows/executions/${executionId}/tick`)
      .set('x-worker-token', process.env.WORKER_TOKEN as string)
      .send({ hasKnowledge: true, hasApprovalActor: true, autoApprove: true, maxAutoSteps: 50 });

    expect(tick.status).toBeLessThan(400);
    expect(tick.body?.execution?.status).toBeDefined();

    const action = await request(app.getHttpServer())
      .post(`/api/workflows/executions/${executionId}/action`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'provide_input', noteAr: 'اختبار إدخال', payload: { ok: true }, autoTick: true, hasKnowledge: true, hasApprovalActor: true, autoApprove: true });

    expect(action.status).toBeLessThan(400);
    expect(action.body?.execution).toBeDefined();
  });
});
