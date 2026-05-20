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

export default async function HeritageDomainPage() {
  const summary = await getJson('/domains/heritage/summary');
  const agents = await getJson('/domains/heritage/agents');
  const dashboard = await getJson('/domains/heritage/dashboard');
  const corpusAdmin = await getJson('/domains/heritage/corpus-admin');
  const vectorStore = await getJson('/domains/heritage/vector-store');
  const quality = await getJson('/domains/heritage/quality/run');
  const readiness = await getJson('/domains/heritage/readiness-linkage');

  return (
    <AppShell
      title="Atheel Heritage"
      subtitle="أول مجال منفصل داخل أثيل، مع نواة استرجاع ووكلاء وتقييمات ولوحة قرار خاصة بالتراث."
      badge="Package 03"
    >
      <section className="grid cols-3">
        <div className="card stack">
          <h3>ملخص المجال</h3>
          <div className="muted">المجال: {summary?.domain || 'heritage'}</div>
          <div>الوثائق: {summary?.coverage?.documents ?? '—'}</div>
          <div>المقاطع: {summary?.coverage?.chunks ?? '—'}</div>
          <div>الإشارات الرسمية: {summary?.coverage?.authoritySignals ?? '—'}</div>
        </div>
        <div className="card stack">
          <h3>وضعية المجال</h3>
          <div>Posture: {dashboard?.posture || 'needs_hardening'}</div>
          <div>Agents: {dashboard?.metrics?.agents ?? '—'}</div>
          <div>Eval runs: {dashboard?.metrics?.evalRuns ?? '—'}</div>
          <div>Grounding: {dashboard?.metrics?.latestGroundingScore ?? '—'}</div>
        </div>
        <div className="card stack">
          <h3>الخطوات القادمة</h3>
          <ul>
            {(summary?.nextMilestonesAr || []).map((item: string) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>


      <section className="grid cols-3">
        <div className="card stack">
          <h3>Heritage Corpus Admin</h3>
          <div>Documents: {corpusAdmin?.totals?.documents ?? '—'}</div>
          <div>Chunks: {corpusAdmin?.totals?.chunks ?? '—'}</div>
          <div>Evidence links: {corpusAdmin?.totals?.evidenceLinks ?? '—'}</div>
          <div className="muted">Schema: {(corpusAdmin?.metadataSchemaAr || []).join('، ')}</div>
        </div>
        <div className="card stack">
          <h3>Policy + Safety Linkage</h3>
          <div>Corpus docs: {dashboard?.metrics?.corpusDocuments ?? '—'}</div>
          <div>Evidence links: {dashboard?.metrics?.evidenceLinks ?? '—'}</div>
          <div>Policy score: {dashboard?.metrics?.latestPolicyScore ?? '—'}</div>
          <div className="muted">الهدف الآن: ربط الاسترجاع التراثي مباشرة بقرارات الحوكمة وطبقة حماية الأصل.</div>
        </div>
        <div className="card stack">
          <h3>Vector + Quality</h3>
          <div>Status: {vectorStore?.item?.status ?? '—'}</div>
          <div>Mode: {vectorStore?.item?.retrievalMode ?? '—'}</div>
          <div>Quality score: {quality?.result?.score ?? '—'}</div>
          <div>Readiness: {readiness?.readinessScore ?? '—'}</div>
        </div>
      </section>

      <section className="card stack">
        <h3>وكلاء مجال التراث</h3>
        <div className="grid cols-3">
          {(agents?.items || []).map((agent: any) => (
            <article key={agent.id} className="card stack">
              <div className="badge">{agent.riskLevel}</div>
              <h4 style={{ margin: 0 }}>{agent.name}</h4>
              <p className="muted" style={{ margin: 0 }}>{agent.purposeAr}</p>
              <div className="muted">الأدوات: {(agent.tools || []).join('، ')}</div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
