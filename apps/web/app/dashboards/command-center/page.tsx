'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/AppShell';
import { apiGet } from '../../../lib/api';

type Payload = {
  ok: boolean;
  counts: { totalJobs: number; aiJobs: number; twinJobs: number; studioJobs: number; byStatus: Record<string, number> };
  latest: Array<{ id: string; kind: string; status: string; entityId?: string; updatedAt: string }>;
  queueStats?: { mode?: string; totals?: { waiting: number; active: number; completed: number; failed: number; delayed: number; paused: number } };
  health: { recommendationLatencyMode: string; simulationPosture: string; creativeRefreshPosture: string };
  noteAr?: string;
};

type ReadinessPayload = {
  readiness?: { score0to100?: number; releaseGate?: string; boardAttentionRequired?: boolean };
  posture?: string;
  counts?: { blocked?: number; conditional?: number; high?: number; critical?: number };
};

export default function CommandCenterPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [readiness, setReadiness] = useState<ReadinessPayload | null>(null);

  useEffect(() => {
    apiGet<Payload>('/dashboards/command-center').then(setData);
    apiGet<ReadinessPayload>('/governance/readiness/summary').then(setReadiness);
  }, []);

  return (
    <AppShell title="Command Center" subtitle="لوحة قيادة موحدة للذكاء والمحاكاة والاستديو والجاهزية التنفيذية">
      <section className="card stack">
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          {[
            ['إجمالي المهام', data?.counts?.totalJobs],
            ['مهام الذكاء', data?.counts?.aiJobs],
            ['مهام التوأم', data?.counts?.twinJobs],
            ['مهام الاستديو', data?.counts?.studioJobs],
            ['جاهزية الإطلاق', readiness?.readiness?.score0to100],
          ].map(([label, value]) => (
            <div key={String(label)} className="card" style={{ minWidth: 220 }}>
              <div className="muted">{label}</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{value ?? '—'}</div>
            </div>
          ))}
        </div>

        <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: 1, minWidth: 320 }}>
            <h3 style={{ marginTop: 0 }}>الوضع الصحي</h3>
            <div className="stack" style={{ gap: 8 }}>
              <div>الذكاء: <strong>{data?.health?.recommendationLatencyMode ?? '—'}</strong></div>
              <div>المحاكاة: <strong>{data?.health?.simulationPosture ?? '—'}</strong></div>
              <div>الاستديو: <strong>{data?.health?.creativeRefreshPosture ?? '—'}</strong></div>
              <div>وضع الجاهزية: <strong>{readiness?.posture ?? '—'}</strong></div>
              <div>بوابة الإطلاق: <strong>{readiness?.readiness?.releaseGate ?? '—'}</strong></div>
            </div>
          </div>

          <div className="card" style={{ flex: 1, minWidth: 320 }}>
            <h3 style={{ marginTop: 0 }}>توزيع الحالات</h3>
            <div className="stack" style={{ gap: 8 }}>
              {Object.entries(data?.counts?.byStatus || {}).map(([k, v]) => (
                <div key={k} className="row" style={{ justifyContent: 'space-between' }}><span>{k}</span><strong>{v}</strong></div>
              ))}
            </div>
          </div>

          <div className="card" style={{ flex: 1, minWidth: 320 }}>
            <h3 style={{ marginTop: 0 }}>Queue posture</h3>
            <div className="stack" style={{ gap: 8 }}>
              <div>Mode: <strong>{data?.queueStats?.mode ?? '—'}</strong></div>
              <div>Waiting: <strong>{data?.queueStats?.totals?.waiting ?? 0}</strong></div>
              <div>Active: <strong>{data?.queueStats?.totals?.active ?? 0}</strong></div>
              <div>Failed: <strong>{data?.queueStats?.totals?.failed ?? 0}</strong></div>
              <div>Delayed: <strong>{data?.queueStats?.totals?.delayed ?? 0}</strong></div>
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: 1, minWidth: 320 }}>
            <h3 style={{ marginTop: 0 }}>مخاطر الحوكمة</h3>
            <div className="stack" style={{ gap: 8 }}>
              <div>Blocked: <strong>{readiness?.counts?.blocked ?? 0}</strong></div>
              <div>Conditional: <strong>{readiness?.counts?.conditional ?? 0}</strong></div>
              <div>High: <strong>{readiness?.counts?.high ?? 0}</strong></div>
              <div>Critical: <strong>{readiness?.counts?.critical ?? 0}</strong></div>
            </div>
          </div>
          <div className="card" style={{ flex: 2, minWidth: 320 }}>
            <h3 style={{ marginTop: 0 }}>آخر المهام</h3>
            <div className="stack" style={{ gap: 8 }}>
              {(data?.latest || []).map((job) => (
                <div key={job.id} className="card">
                  <div><strong>{job.kind}</strong> — {job.status}</div>
                  <div className="muted">{job.entityId || '—'} • {job.updatedAt}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
