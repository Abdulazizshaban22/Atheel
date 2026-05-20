'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/AppShell';
import { apiGet } from '../../../lib/api';

type Payload = {
  ok?: boolean;
  posture?: string;
  readiness?: { score0to100?: number; releaseGate?: string; boardAttentionRequired?: boolean };
  counts?: { totalDecisions?: number; blocked?: number; conditional?: number; high?: number; critical?: number };
  topAlerts?: Array<{ id: string; entityType?: string; entityId?: string; verdict?: string; riskLevel?: string }>;
  noteAr?: string;
};

export default function GovernanceReadinessPage() {
  const [data, setData] = useState<Payload | null>(null);
  useEffect(() => { apiGet<Payload>('/governance/readiness/summary').then(setData); }, []);
  return (
    <AppShell title="Governance Readiness" subtitle="ملخص جاهزية القرار والإطلاق" badge="Release Gate">
      <section className="grid grid-2">
        <div className="card stack">
          <h2 style={{ margin: 0 }}>الملخص التنفيذي</h2>
          <div>Posture: <strong>{data?.posture || '—'}</strong></div>
          <div>Score: <strong>{data?.readiness?.score0to100 ?? '—'}</strong></div>
          <div>Release Gate: <strong>{data?.readiness?.releaseGate || '—'}</strong></div>
          <div>Board Attention: <strong>{data?.readiness?.boardAttentionRequired ? 'Yes' : 'No'}</strong></div>
          <div className="notice">{data?.noteAr || '—'}</div>
        </div>
        <div className="card stack">
          <h2 style={{ margin: 0 }}>العدّادات</h2>
          <div>Total Decisions: {data?.counts?.totalDecisions ?? 0}</div>
          <div>Blocked: {data?.counts?.blocked ?? 0}</div>
          <div>Conditional: {data?.counts?.conditional ?? 0}</div>
          <div>High: {data?.counts?.high ?? 0}</div>
          <div>Critical: {data?.counts?.critical ?? 0}</div>
        </div>
      </section>
      <section className="card stack" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}>أعلى التنبيهات</h2>
        {(data?.topAlerts || []).map((alert) => (
          <div key={alert.id} className="card">
            <div><strong>{alert.entityType || 'entity'}</strong> — {alert.verdict || '—'}</div>
            <div className="muted">{alert.entityId || '—'} • {alert.riskLevel || '—'}</div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
