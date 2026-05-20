import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Wave77 Platform Readiness Persistence', () => {
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

  it('persists narrative policy/check + connectors + visitor profile within app runtime', async () => {
    const token = await login('admin@atheel.sa', 'Admin@1234');

    const policy = await request(app.getHttpServer())
      .post('/api/narratives/policies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectId: 'prj_1',
        nameAr: 'سياسة السرد التراثي',
        protectedTerms: ['الذاكرة المحلية'],
        requiredThemes: ['الهوية'],
        bannedTerms: ['سطحي'],
      });
    expect(policy.status).toBeLessThan(400);

    const check = await request(app.getHttpServer())
      .post('/api/narratives/check-consistency')
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectId: 'prj_1',
        placeIdentity: 'الهوية',
        channels: [{ channel: 'web', text: 'الهوية والذاكرة المحلية' }],
      });
    expect(check.status).toBeLessThan(400);
    expect(check.body?.check?.score).toBeGreaterThan(0);

    const alignment = await request(app.getHttpServer())
      .get('/api/narratives/projects/prj_1/alignment')
      .set('Authorization', `Bearer ${token}`);
    expect(alignment.status).toBeLessThan(400);
    expect(alignment.body?.latest?.id).toBeDefined();

    const connector = await request(app.getHttpServer())
      .post('/api/organizations/connectors/ticketing/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationId: 'org_demo_1', provider: 'webook', label: 'Webook Connector' });
    expect(connector.status).toBeLessThan(400);
    const connectorId = connector.body?.connector?.id;

    const sync = await request(app.getHttpServer())
      .post('/api/organizations/bookings/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ connectorId, externalOrders: [{ externalOrderId: 'ord_1', attendeeName: 'Ali', amount: 120, status: 'confirmed' }] });
    expect(sync.status).toBeLessThan(400);
    expect(sync.body?.syncedCount).toBe(1);

    const orders = await request(app.getHttpServer())
      .get(`/api/organizations/bookings/orders?connectorId=${connectorId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(orders.status).toBeLessThan(400);
    expect(orders.body?.count).toBeGreaterThanOrEqual(1);

    const profile = await request(app.getHttpServer())
      .post('/api/visitor-guide/profiles')
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationId: 'org_demo_1', displayName: 'زائر تجريبي', persona: 'family', interests: ['heritage', 'art'] });
    expect(profile.status).toBeLessThan(400);
    const profileId = profile.body?.profile?.id;

    const segments = await request(app.getHttpServer())
      .get('/api/visitor-guide/segments?organizationId=org_demo_1')
      .set('Authorization', `Bearer ${token}`);
    expect(segments.status).toBeLessThan(400);
    expect(Array.isArray(segments.body?.items)).toBe(true);

    const history = await request(app.getHttpServer())
      .get(`/api/visitor-guide/profiles/${profileId}/history`)
      .set('Authorization', `Bearer ${token}`);
    expect(history.status).toBeLessThan(400);
    expect(history.body?.visitorId).toBe(profileId);
  });
});
