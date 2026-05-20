import { AppShell } from '../../../components/AppShell';

async function getJson(path: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
  try {
    const res = await fetch(`${base}${path}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    return null;
  }
}

export default async function Page() {
  const jobs = await getJson('/ai/runtime/jobs');
  const latestRegression = await getJson('/evals/regressions/latest');
  const overview = await getJson('/ai/runtime/overview');
  const trustOverview = await getJson('/ai/trust/scorecards/overview');
  return (
    <AppShell title="AI Runtime" subtitle="تنفيذ الوكلاء، الطوابير، وإغلاق الجودة للذكاء المؤسسي." badge="Runtime">
      <section className="grid cols-4">
        <div className="card stack"><h3>Jobs</h3><div>Total: {jobs?.count ?? 0}</div></div>
        <div className="card stack"><h3>Queued</h3><div>{overview?.item?.queued ?? '—'}</div></div>
        <div className="card stack"><h3>Escalated</h3><div>{overview?.item?.escalated ?? '—'}</div></div>
        <div className="card stack"><h3>Latest Regression</h3><div>{latestRegression?.item?.domain ?? '—'}</div><div>Passed: {String(latestRegression?.item?.passed ?? '—')}</div></div>
      </section>

      <section className="grid cols-2">
        <div className="card stack">
          <h3>مسار التنفيذ</h3>
          <div className="muted">execute → retrieval → trust → eval → review/escalation</div>
          <div>Domains: {(overview?.item?.domains || []).join('، ') || '—'}</div>
        </div>
        <div className="card stack">
          <h3>Trust Posture</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Queued Reviews</th>
                  <th>Latest Decision</th>
                </tr>
              </thead>
              <tbody>
                {(trustOverview?.items || []).map((item: any) => (
                  <tr key={item.domain}>
                    <td>{item.domain}</td>
                    <td>{item.queuedReviews}</td>
                    <td>{item.latestDecision ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
