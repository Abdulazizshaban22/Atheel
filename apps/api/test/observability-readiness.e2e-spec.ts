import request from 'supertest';

describe('Observability and readiness endpoints', () => {
  const base = process.env.E2E_BASE_URL || 'http://localhost:3001/api';

  it('returns observability summary', async () => {
    const res = await request(base).get('/governance/observability/summary');
    expect([200, 401, 403]).toContain(res.status);
  });

  it('returns readiness summary', async () => {
    const res = await request(base).get('/governance/readiness/summary');
    expect([200, 401, 403]).toContain(res.status);
  });

  it('returns dashboard readiness', async () => {
    const res = await request(base).get('/dashboards/readiness');
    expect([200, 401, 403]).toContain(res.status);
  });
});
