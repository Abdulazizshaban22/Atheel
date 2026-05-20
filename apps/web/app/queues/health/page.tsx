'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/AppShell';
import { apiGet } from '../../../lib/api';

type Payload = {
  ok?: boolean;
  counts?: { totalJobs?: number; failedJobs?: number; blockedJobs?: number; activeOrQueuedJobs?: number };
  readiness?: { score0to100?: number; posture?: string };
  queueStats?: { mode?: string; queues?: Array<{ key: string; name: string; counts: { waiting: number; active: number; completed: number; failed: number; delayed: number; paused: number } }>; totals?: { waiting: number; active: number; completed: number; failed: number; delayed: number; paused: number } };
  noteAr?: string;
};

export default function QueueHealthPage() {
  const [data, setData] = useState<Payload | null>(null);
  useEffect(() => { apiGet<Payload>('/dashboards/readiness').then(setData); }, []);
  return (
    <AppShell title="Queue Health" subtitle="حالة الطوابير والجاهزية التشغيلية" badge="BullMQ / Redis">
      <section className="grid grid-2">
        <div className="card stack">
          <h2 style={{ margin: 0 }}>الوضع العام</h2>
          <div>Mode: <strong>{data?.queueStats?.mode || '—'}</strong></div>
          <div>Posture: <strong>{data?.readiness?.posture || '—'}</strong></div>
          <div>Score: <strong>{data?.readiness?.score0to100 ?? '—'}</strong></div>
          <div className="notice">{data?.noteAr || '—'}</div>
        </div>
        <div className="card stack">
          <h2 style={{ margin: 0 }}>Totals</h2>
          <div>Waiting: {data?.queueStats?.totals?.waiting ?? 0}</div>
          <div>Active: {data?.queueStats?.totals?.active ?? 0}</div>
          <div>Completed: {data?.queueStats?.totals?.completed ?? 0}</div>
          <div>Failed: {data?.queueStats?.totals?.failed ?? 0}</div>
          <div>Delayed: {data?.queueStats?.totals?.delayed ?? 0}</div>
        </div>
      </section>
      <section className="card stack" style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0 }}>تفاصيل الطوابير</h2>
        {(data?.queueStats?.queues || []).map((queue) => (
          <div key={queue.key} className="card">
            <div><strong>{queue.name}</strong></div>
            <div className="muted">waiting {queue.counts.waiting} • active {queue.counts.active} • failed {queue.counts.failed} • delayed {queue.counts.delayed}</div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
