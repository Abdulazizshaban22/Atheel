import { AppShell } from '../../../components/AppShell';

async function getJson(path: string, method: string = 'GET', body?: any) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
  try {
    const res = await fetch(`${base}${path}`, { method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    return null;
  }
}

export default async function Page() {
  const overview = await getJson('/evals/quality/overview');
  const trustOverview = await getJson('/ai/trust/scorecards/overview');
  const retrievalOverview = await getJson('/retrieval/quality/overview');
  const reviews = await getJson('/ai/trust/human-review');
  const benchmarks = await getJson('/evals/benchmarks');
  const runtimeOverview = await getJson('/ai/runtime/overview');
  const vectorOverview = await getJson('/retrieval/vector-sync/overview');
  const breachOverview = await getJson('/evals/quality/threshold-breaches');
  const reviewQueueOverview = await getJson('/ai/trust/human-review/queue-overview');
  return (
    <AppShell title="جودة الذكاء" subtitle="لوحة جودة الاسترجاع والثقة والـ thresholds والـ regressions لكل مجال." badge="AI Quality">
      <section className="grid cols-4">
        <div className="card stack">
          <h3>المراجعة البشرية</h3>
          <div>Queued: {reviews?.count ?? 0}</div>
          <div>Breach Count: {reviewQueueOverview?.breaches ?? 0}</div>
          <div className="muted">الوظائف التي تجاوزت حدود الثقة أو الإسناد.</div>
        </div>
        <div className="card stack">
          <h3>المجالات</h3>
          <div>{retrievalOverview?.items?.length ?? 0}</div>
          <div className="muted">Domains synced: {vectorOverview?.totals?.completedDomains ?? 0}</div>
          <div className="muted">مجالات retrieval المفعلة حاليًا.</div>
        </div>
        <div className="card stack">
          <h3>Benchmark Suites</h3>
          <div>{benchmarks?.items?.reduce((acc: number, item: any) => acc + (item.suiteCount || 0), 0) ?? 0}</div>
          <div className="muted">عدد حزم القياس عبر جميع المجالات.</div>
        </div>
        <div className="card stack">
          <h3>Runtime Jobs</h3>
          <div>{runtimeOverview?.item?.totalJobs ?? 0}</div>
          <div className="muted">نظرة سريعة على وظائف Agent Runtime.</div>
        </div>
      </section>

      <section className="grid cols-2">
        <div className="card stack">
          <h3>Vector Sync Overview</h3>
          <div>Completed Domains: {vectorOverview?.totals?.completedDomains ?? 0}</div>
          <div>Files Indexed: {vectorOverview?.totals?.filesIndexed ?? 0}</div>
          <div>Chunks Indexed: {vectorOverview?.totals?.chunksIndexed ?? 0}</div>
        </div>
        <div className="card stack">
          <h3>Agent Runtime Overview</h3>
          <div>Queued: {runtimeOverview?.item?.queued ?? 0}</div>
          <div>Completed: {runtimeOverview?.item?.completed ?? 0}</div>
          <div>Escalated: {runtimeOverview?.item?.escalated ?? 0}</div>
          <div>Avg Process Count: {runtimeOverview?.item?.avgProcessCount ?? 0}</div>
        </div>
      </section>

      <section className="card stack">
        <h3>Domain Quality Overview</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Passed</th>
                <th>Grounding</th>
                <th>Citation</th>
                <th>Human Review</th>
                <th>Benchmarks</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.items || []).map((item: any) => (
                <tr key={item.domain}>
                  <td>{item.domain}</td>
                  <td>{String(item.latestPassed ?? '—')}</td>
                  <td>{item.latestGrounding ?? '—'}</td>
                  <td>{item.latestCitationCoverage ?? '—'}</td>
                  <td>{item.latestHumanReviewPrecision ?? '—'}</td>
                  <td>{item.benchmarkSuites}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card stack">
        <h3>Threshold Breaches</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Latest Run</th>
                <th>Passed</th>
                <th>Breaches</th>
              </tr>
            </thead>
            <tbody>
              {(breachOverview?.items || []).map((item: any) => (
                <tr key={item.domain}>
                  <td>{item.domain}</td>
                  <td>{item.latestRunId ?? '—'}</td>
                  <td>{String(item.passed ?? '—')}</td>
                  <td>{item.breaches?.length ? item.breaches.map((b: any) => `${b.metric}: ${b.actual} < ${b.expected}`).join(' | ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid cols-2">
        <div className="card stack">
          <h3>Retrieval Quality</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Sync</th>
                  <th>Files</th>
                  <th>Freshness</th>
                  <th>Grounding</th>
                </tr>
              </thead>
              <tbody>
                {(retrievalOverview?.items || []).map((item: any) => (
                  <tr key={item.domain}>
                    <td>{item.domain}</td>
                    <td>{item.syncStatus}</td>
                    <td>{item.filesIndexed}</td>
                    <td>{item.freshnessCoverage ?? '—'}</td>
                    <td>{item.latestGrounding ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card stack">
          <h3>Trust Scorecards</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Evaluations</th>
                  <th>Queued Reviews</th>
                  <th>Avg Queue Age</th>
                  <th>Latest Decision</th>
                </tr>
              </thead>
              <tbody>
                {(trustOverview?.items || []).map((item: any) => (
                  <tr key={item.domain}>
                    <td>{item.domain}</td>
                    <td>{item.evaluations}</td>
                    <td>{item.queuedReviews}</td>
                    <td>{item.avgQueueAgeMinutes ?? 0}</td>
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
