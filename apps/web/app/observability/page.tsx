'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiGet } from '../../lib/api';

type ObservabilityPayload = {
  ok?: boolean;
  queueMode?: { mode?: string };
  signals?: { traces?: string; metrics?: string; logs?: string };
  governance?: { recentDecisions?: number; blocked?: number; highOrCritical?: number };
  posture?: string;
  noteAr?: string;
};

type ReadinessPayload = { readiness?: { score0to100?: number; releaseGate?: string }, posture?: string };

export default function ObservabilityPage() {
  const [data, setData] = useState<ObservabilityPayload | null>(null);
  const [readiness, setReadiness] = useState<ReadinessPayload | null>(null);
  useEffect(() => {
    apiGet<ObservabilityPayload>('/governance/observability/summary').then(setData);
    apiGet<ReadinessPayload>('/governance/readiness/summary').then(setReadiness);
  }, []);
  return (
    <AppShell title="Observability" subtitle="traces + metrics + logs + readiness" badge="OTel / Grafana">
      <section className="grid grid-2">
        <div className="card stack">
          <h2 style={{ margin: 0 }}>الوضع العام</h2>
          <div>Queue Mode: <strong>{data?.queueMode?.mode || '—'}</strong></div>
          <div>Posture: <strong>{data?.posture || '—'}</strong></div>
          <div>Readiness: <strong>{readiness?.readiness?.score0to100 ?? '—'}</strong></div>
          <div>Release Gate: <strong>{readiness?.readiness?.releaseGate || '—'}</strong></div>
          <div className="notice">{data?.noteAr || '—'}</div>
        </div>
        <div className="card stack">
          <h2 style={{ margin: 0 }}>Signals</h2>
          <div>Traces: {data?.signals?.traces || '—'}</div>
          <div>Metrics: {data?.signals?.metrics || '—'}</div>
          <div>Logs: {data?.signals?.logs || '—'}</div>
        </div>
      </section>
      <section className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card stack">
          <h2 style={{ margin: 0 }}>Governance</h2>
          <div>Recent Decisions: {data?.governance?.recentDecisions ?? 0}</div>
          <div>Blocked: {data?.governance?.blocked ?? 0}</div>
          <div>High/Critical: {data?.governance?.highOrCritical ?? 0}</div>
        </div>
        <div className="card stack">
          <h2 style={{ margin: 0 }}>الروابط السريعة</h2>
          <a className="btn" href="/dashboards/command-center">مركز القيادة</a>
          <a className="btn btn-secondary" href="/governance/readiness">جاهزية الحوكمة</a>
          <a className="btn btn-ghost" href="/queues/health">صحة الطوابير</a>
        </div>
      </section>
    </AppShell>
  );
}
