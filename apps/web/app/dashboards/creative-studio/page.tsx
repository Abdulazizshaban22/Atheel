'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/AppShell';
import { apiGet, apiRequest } from '../../../lib/api';

type Payload = {
  ok: boolean;
  projectId: string;
  counts: { refreshJobs: number; completed: number };
  latest: { id: string; status: string; updatedAt: string } | null;
  queueStats?: { mode?: string; totals?: { waiting: number; active: number; completed: number; failed: number; delayed: number; paused: number } };
  boardHint: { pillars: string[]; nextActions: string[] };
};

export default function CreativeStudioDashboardPage() {
  const [data, setData] = useState<Payload | null>(null);
  const projectId = 'prj_1';
  const load = () => apiGet<Payload>(`/dashboards/creative-studio?projectId=${projectId}`).then(setData);
  useEffect(() => { load(); }, []);

  async function refresh() {
    await apiRequest(`/studio/projects/${projectId}/creative-board/refresh`, { method: 'POST', body: { projectId } });
    load();
  }

  return (
    <AppShell title="Creative Studio Dashboard" subtitle="لوحة متابعة الاستديو الإبداعي والـ refresh jobs">
      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="muted">المشروع</div>
            <strong>{data?.projectId ?? projectId}</strong>
          </div>
          <button className="btn" onClick={refresh}>Refresh Creative Board</button>
        </div>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="card" style={{ minWidth: 220 }}><div className="muted">إجمالي refresh jobs</div><div style={{ fontSize: 28, fontWeight: 800 }}>{data?.counts?.refreshJobs ?? '—'}</div></div>
          <div className="card" style={{ minWidth: 220 }}><div className="muted">المكتملة</div><div style={{ fontSize: 28, fontWeight: 800 }}>{data?.counts?.completed ?? '—'}</div></div>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Queue posture</h3>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="badge">Mode {data?.queueStats?.mode ?? '—'}</span>
            <span className="badge">Waiting {data?.queueStats?.totals?.waiting ?? 0}</span>
            <span className="badge">Active {data?.queueStats?.totals?.active ?? 0}</span>
            <span className="badge">Failed {data?.queueStats?.totals?.failed ?? 0}</span>
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Creative pillars</h3>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>{(data?.boardHint?.pillars || []).map((x) => <span key={x} className="badge">{x}</span>)}</div>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Next actions</h3>
          <div className="stack" style={{ gap: 8 }}>{(data?.boardHint?.nextActions || []).map((x) => <div key={x}>{x}</div>)}</div>
        </div>
      </section>
    </AppShell>
  );
}
