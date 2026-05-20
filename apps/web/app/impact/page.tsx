'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';

export default function ImpactPage() {
  const [items, setItems] = useState<any[]>([]);
  const [simulationRunId, setSimulationRunId] = useState('');
  const [result, setResult] = useState<any>(null);

  async function load() {
    const { data } = await apiRequest<any>('/impact/leaderboard?limit=30', { method: 'GET' });
    setItems(data?.items || []);
  }

  async function score() {
    if (!simulationRunId) return alert('اكتب simulationRunId');
    const { data } = await apiRequest<any>('/impact/score', { method: 'POST', body: { simulationRunId } });
    setResult(data);
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell
      title="قياس الأثر الثقافي"
      subtitle="يحوّل التجربة من جميل إلى مؤثر قابل للقياس، ويربطه بالمحاكاة وحزمة الاعتماد"
      badge={`Snapshots: ${items.length}`}
    >
      <section className="card stack">
        <div style={{ fontWeight: 900 }}>حساب أثر من محاكاة</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="simulationRunId" value={simulationRunId} onChange={(e) => setSimulationRunId(e.target.value)} />
          <button className="btn" onClick={score}>احسب</button>
        </div>
        {result ? <pre className="code">{JSON.stringify(result, null, 2)}</pre> : null}
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>Leaderboard</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
          {items.map((x) => (
            <div key={x.id} className="card stack">
              <div className="badge">Impact {x.score0to100}</div>
              <div className="muted">Twin: {x.twinId || '—'}</div>
              <div className="muted">Simulation: {x.simulationRunId || '—'}</div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
