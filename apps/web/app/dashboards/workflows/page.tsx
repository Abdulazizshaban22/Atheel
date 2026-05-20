'use client';

import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { AppShell } from '../../../components/AppShell';
import { apiRequest } from '../../../lib/api';

type Dashboard = {
  counts: { total: number; breached: number; byStatus: Record<string, number> };
  averages: { progressPercent: number };
  top: { queued: Array<{ id: string; templateId: string; queueScore: number }> };
  noteAr?: string;
};

export default function WorkflowsDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  const API_ROOT = useMemo(() => (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, ''), []);

  async function load() {
    const { data } = await apiRequest<Dashboard>('/dashboards/workflows', { method: 'GET' });
    if (data) setData(data);
  }

  useEffect(() => {
    load();
    const t = setInterval(() => load(), 6000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const socket: Socket = io(`${API_ROOT}/ws`, { transports: ['websocket'] });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    const push = (e: any) => setEvents((prev) => [e, ...prev].slice(0, 40));

    socket.on('execution.enqueued', push);
    socket.on('execution.updated', push);
    socket.on('execution.event', push);
    socket.on('execution.sla', push);

    return () => {
      socket.disconnect();
    };
  }, [API_ROOT]);

  return (
    <AppShell
      title="لوحة تشغيل سير العمل"
      subtitle="Wave07 Production Runtime: Redis Queue + Worker + WebSocket Live + SLA Escalation"
      badge={connected ? 'Live Connected' : 'Offline'}
    >
      <section className="card stack">
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="card" style={{ minWidth: 240 }}>
            <div className="muted">إجمالي executions</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{data?.counts?.total ?? '—'}</div>
          </div>
          <div className="card" style={{ minWidth: 240 }}>
            <div className="muted">SLA Breached</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{data?.counts?.breached ?? '—'}</div>
          </div>
          <div className="card" style={{ minWidth: 240 }}>
            <div className="muted">متوسط التقدم</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{data?.averages?.progressPercent ?? '—'}%</div>
          </div>
        </div>

        <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            <h3 style={{ marginTop: 0 }}>توزيع الحالات</h3>
            <div className="stack" style={{ gap: 8 }}>
              {Object.entries(data?.counts?.byStatus || {}).map(([k, v]) => (
                <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 320 }}>
            <h3 style={{ marginTop: 0 }}>أعلى عناصر بالطابور</h3>
            <div className="stack" style={{ gap: 8 }}>
              {(data?.top?.queued || []).map((x) => (
                <div key={x.id} className="card">
                  <div className="muted">{x.id}</div>
                  <div><strong>{x.templateId}</strong></div>
                  <div className="muted">QueueScore: {x.queueScore}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h3>Live Events</h3>
          <div className="stack" style={{ gap: 8 }}>
            {events.map((e, idx) => (
              <div key={idx} className="card">
                <div className="muted">{e.executionId || e.executionId === '' ? e.executionId : '—'} • {e.status || e.type || 'event'}</div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(e, null, 2)}</pre>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
