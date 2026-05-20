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

export default async function DestinationDomainPage() {
  const summary = await getJson('/domains/destination/summary');
  const agents = await getJson('/domains/destination/agents');
  const dashboard = await getJson('/domains/destination/dashboard');
  const linkage = await getJson('/domains/destination/partner-programming-linkage');
  const corpusAdmin = await getJson('/domains/destination/corpus-admin');
  const vectorStore = await getJson('/domains/destination/vector-store');
  const readiness = await getJson('/domains/destination/readiness-linkage');
  const contracts = await getJson('/domains/destination/retrieval-contracts');

  return (
    <AppShell
      title="Atheel Destination"
      subtitle="نواة مجال الوجهات داخل أثيل، مع برمجة، شركاء، ingestion أولي، وفجوات الشركاء والبرامج."
      badge="Package 08"
    >
      <section className="grid cols-3">
        <div className="card stack">
          <h3>Vector posture</h3>
          <div>Mode: {vectorStore?.status?.mode || '—'}</div>
          <div>Sync: {vectorStore?.status?.syncState || '—'}</div>
          <div>Retrieval: {vectorStore?.status?.retrievalMode || '—'}</div>
          <div className="muted">Filters: {(vectorStore?.status?.metadataFilters || []).join('، ') || '—'}</div>
        </div>
        <div className="card stack">
          <h3>Readiness linkage</h3>
          <div>Score: {readiness?.readiness?.score ?? '—'}</div>
          <div>Posture: {readiness?.readiness?.posture ?? '—'}</div>
          <ul>
            {(readiness?.readiness?.gatesAr || []).map((item: string) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="card stack">
          <h3>Retrieval contracts</h3>
          <div>Mode: {contracts?.contracts?.retrieval?.mode || '—'}</div>
          <div>Metadata filters: {String(contracts?.contracts?.retrieval?.supportsMetadataFilters ?? '—')}</div>
          <div>Partner signals: {String(contracts?.contracts?.retrieval?.supportsPartnerCoverageSignals ?? '—')}</div>
        </div>
      </section>

      <section className="grid cols-3">
        <div className="card stack">
          <h3>ملخص المجال</h3>
          <div>البرامج: {summary?.coverage?.programs ?? '—'}</div>
          <div>البرامج النشطة: {summary?.coverage?.activePrograms ?? '—'}</div>
          <div>الشركاء: {summary?.coverage?.partners ?? '—'}</div>
          <div>العروض المحلية: {summary?.coverage?.localOffers ?? '—'}</div>
        </div>
        <div className="card stack">
          <h3>وضعية المجال</h3>
          <div>Posture: {dashboard?.posture || 'foundation'}</div>
          <div>Agents: {dashboard?.metrics?.agents ?? '—'}</div>
          <div>Eval runs: {dashboard?.metrics?.evalRuns ?? '—'}</div>
          <div>Programming score: {dashboard?.metrics?.latestProgrammingScore ?? '—'}</div>
          <div>Quality score: {dashboard?.metrics?.qualityScore ?? '—'}</div>
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
          <h3>تغطية الوجهة</h3>
          <div>المدن: {(summary?.coverage?.cities || []).join('، ') || '—'}</div>
          <div>أنواع الوجهة: {(summary?.coverage?.destinationTypes || []).join('، ') || '—'}</div>
          <div>الموضوعات: {(summary?.coverage?.coveredThemes || []).join('، ') || '—'}</div>
        </div>
        <div className="card stack">
          <h3>ربط الشركاء والبرمجة</h3>
          <div>Partner count: {linkage?.partnerCount ?? '—'}</div>
          <div>Program count: {linkage?.programCount ?? '—'}</div>
          <div>Local offers: {linkage?.localOfferCount ?? '—'}</div>
          <div>Linkage score: {linkage?.linkageScore ?? '—'}</div>
          <div className="muted">Missing themes: {(linkage?.missingThemes || []).join('، ') || '—'}</div>
        </div>
        <div className="card stack">
          <h3>Corpus admin</h3>
          <div>Documents: {corpusAdmin?.totals?.documents ?? '—'}</div>
          <div>Chunks: {corpusAdmin?.totals?.chunks ?? '—'}</div>
          <div>Evidence links: {corpusAdmin?.totals?.evidenceLinks ?? '—'}</div>
          <div className="muted">Cities: {Object.keys(corpusAdmin?.distributions?.city || {}).join('، ') || '—'}</div>
        </div>
      </section>

      <section className="grid cols-3">
        <div className="card stack">
          <h3>ملاحظات سريعة</h3>
          <ul>
            {(dashboard?.quickInsightsAr || []).map((item: string) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="card stack">
          <h3>Schema metadata</h3>
          <div className="muted">{(corpusAdmin?.metadataSchemaAr || []).join('، ') || '—'}</div>
        </div>
        <div className="card stack">
          <h3>آخر المستندات</h3>
          <ul>
            {(corpusAdmin?.latestDocuments || []).slice(0, 5).map((item: any) => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card stack">
        <h3>وكلاء مجال الوجهة</h3>
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
