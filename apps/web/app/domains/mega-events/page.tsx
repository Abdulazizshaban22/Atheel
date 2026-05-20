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

export default async function MegaEventsDomainPage() {
  const summary = await getJson('/domains/mega-events/summary');
  const agents = await getJson('/domains/mega-events/agents');
  const dashboard = await getJson('/domains/mega-events/dashboard');
  const linkage = await getJson('/domains/mega-events/readiness-crowd-linkage');
  const metadata = await getJson('/domains/mega-events/metadata-schema');
  const corpusAdmin = await getJson('/domains/mega-events/corpus-admin');
  const vectorStore = await getJson('/domains/mega-events/vector-store');
  const retrievalContracts = await getJson('/domains/mega-events/retrieval-contracts');
  const twinStageGate = await getJson('/domains/mega-events/twin-stage-gate-linkage');

  return (
    <AppShell
      title="Atheel Mega Events"
      subtitle="نواة مجال الفعاليات الكبرى داخل أثيل، مع جاهزية وتشغيل وحشود ومسارات استرجاع أولية ثم ingestion وquality وevidence linkage وربط أوضح مع التوأم وstage-gates."
      badge="Package 11"
    >
      <section className="grid cols-3">
        <div className="card stack">
          <h3>ملخص المجال</h3>
          <div>البرامج: {summary?.coverage?.programs ?? '—'}</div>
          <div>الموافقات: {summary?.coverage?.approvals ?? '—'}</div>
          <div>المخاطر: {summary?.coverage?.risks ?? '—'}</div>
          <div>الوظائف الخلفية: {summary?.coverage?.asyncJobs ?? '—'}</div>
        </div>
        <div className="card stack">
          <h3>وضعية المجال</h3>
          <div>Posture: {dashboard?.posture || 'foundation'}</div>
          <div>Agents: {dashboard?.metrics?.agents ?? '—'}</div>
          <div>Eval runs: {dashboard?.metrics?.evalRuns ?? '—'}</div>
          <div>Readiness score: {dashboard?.metrics?.latestReadinessScore ?? '—'}</div>
          <div>Crowd/Ops score: {dashboard?.metrics?.latestCrowdOpsScore ?? '—'}</div>
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
          <h3>Corpus admin</h3>
          <div>Documents: {corpusAdmin?.totals?.documents ?? '—'}</div>
          <div>Chunks: {corpusAdmin?.totals?.chunks ?? '—'}</div>
          <div>Evidence links: {corpusAdmin?.totals?.evidenceLinks ?? '—'}</div>
          <div>المدن: {Object.keys(corpusAdmin?.distributions?.city || {}).join('، ') || '—'}</div>
          <div>أنواع الفعاليات: {Object.keys(corpusAdmin?.distributions?.eventType || {}).join('، ') || '—'}</div>
        </div>
        <div className="card stack">
          <h3>Readiness linkage</h3>
          <div>Score: {linkage?.readiness?.score ?? '—'}</div>
          <div>Posture: {linkage?.readiness?.posture ?? '—'}</div>
          <ul>
            {(linkage?.readiness?.gatesAr || []).map((item: string) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="card stack">
          <h3>Crowd / Operations</h3>
          <div>Risk count: {linkage?.crowdOps?.riskCount ?? '—'}</div>
          <div>Simulation jobs: {linkage?.crowdOps?.simulationJobs ?? '—'}</div>
          <div>Posture: {linkage?.crowdOps?.operationsPosture ?? '—'}</div>
        </div>
      </section>

      <section className="grid cols-3">
        <div className="card stack">
          <h3>Gap analysis</h3>
          <div>Gate coverage: {linkage?.gapAnalysis?.gateCoverage ?? '—'}</div>
          <div>Active simulations: {linkage?.gapAnalysis?.activeSimulations ?? '—'}</div>
          <div>Linkage score: {linkage?.gapAnalysis?.linkageScore ?? '—'}</div>
          <ul>
            {(linkage?.gapAnalysis?.missingFocus || []).map((item: string) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="card stack">
          <h3>Schema metadata</h3>
          <div className="muted">{(metadata?.fields || []).join('، ') || '—'}</div>
        </div>
        <div className="card stack">
          <h3>Queued jobs</h3>
          <div>{dashboard?.metrics?.queuedJobs ?? '—'}</div>
          <div>Evidence links: {dashboard?.metrics?.evidenceLinks ?? '—'}</div>
          <div>Vector state: {dashboard?.metrics?.vectorSyncState ?? '—'}</div>
          <div>Combined linkage: {dashboard?.metrics?.combinedTwinStageGateScore ?? '—'}</div>
        </div>
      </section>

      <section className="grid cols-3">
        <div className="card stack">
          <h3>Vector posture</h3>
          <div>Mode: {vectorStore?.status?.mode || '—'}</div>
          <div>Sync state: {vectorStore?.status?.syncState || '—'}</div>
          <div>Retrieval mode: {vectorStore?.status?.retrievalMode || '—'}</div>
          <div className="muted">{(vectorStore?.status?.metadataFilters || []).join('، ') || '—'}</div>
        </div>
        <div className="card stack">
          <h3>Retrieval contracts</h3>
          <div>Mode: {retrievalContracts?.contracts?.retrieval?.mode || '—'}</div>
          <div>Metadata filters: {String(retrievalContracts?.contracts?.retrieval?.supportsMetadataFilters ?? '—')}</div>
          <div>Twin hints: {String(retrievalContracts?.contracts?.retrieval?.supportsTwinHints ?? '—')}</div>
          <div>Stage-gate hints: {String(retrievalContracts?.contracts?.retrieval?.supportsStageGateHints ?? '—')}</div>
        </div>
        <div className="card stack">
          <h3>Twin / Stage-gate linkage</h3>
          <div>Combined score: {twinStageGate?.linkage?.combinedScore ?? '—'}</div>
          <div>Posture: {twinStageGate?.linkage?.posture ?? '—'}</div>
          <div>Stage-gate: {twinStageGate?.readinessStageGates?.stageGateScore ?? '—'}</div>
          <div>Twin crowd: {twinStageGate?.crowdTwin?.twinCrowdScore ?? '—'}</div>
        </div>
      </section>

      <section className="card stack">
        <h3>وكلاء مجال الفعاليات الكبرى</h3>
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


