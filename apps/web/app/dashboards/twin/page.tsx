'use client';

import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { AppShell } from '../../../components/AppShell';
import { apiRequest } from '../../../lib/api';

type Dashboard = {
  counts: { twins: number; activeTwins: number; simulations: number; simulationsByStatus: Record<string, number> };
  averages: { predictedSatisfaction0to100: number; congestionScore0to100: number };
  latest: any[];
  noteAr?: string;
};

export default function TwinDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  const API_ROOT = useMemo(() => (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, ''), []);

  async function load() {
    const { data } = await apiRequest<Dashboard>('/dashboards/twin', { method: 'GET' });
    if (data) setData(data);
  }

  useEffect(() => {
    load();
    const t = setInterval(() => load(), 7000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const socket: Socket = io(`${API_ROOT}/ws`, { transports: ['websocket'] });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    const push = (e: any) => setEvents((prev) => [e, ...prev].slice(0, 60));

    socket.on('twin.updated', push);
    socket.on('twin.simulation.enqueued', push);
    socket.on('twin.simulation.running', push);
    socket.on('twin.simulation.completed', push);
    socket.on('twin.telemetry', push);

    return () => socket.disconnect();
  }, [API_ROOT]);

  return (
    <AppShell
      title="لوحة التوأم الرقمي"
      subtitle="Live: Twin updates + Simulation results + Telemetry"
      badge={connected ? 'Live Connected' : 'Offline'}
    >
      <section className="card stack">
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="card" style={{ minWidth: 240 }}>
            <div className="muted">Twins</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{data?.counts?.twins ?? '—'}</div>
          </div>
          <div className="card" style={{ minWidth: 240 }}>
            <div className="muted">Active</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{data?.counts?.activeTwins ?? '—'}</div>
          </div>
          <div className="card" style={{ minWidth: 240 }}>
            <div className="muted">Simulations</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{data?.counts?.simulations ?? '—'}</div>
          </div>
          <div className="card" style={{ minWidth: 240 }}>
            <div className="muted">Satisfaction</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{data?.averages?.predictedSatisfaction0to100 ?? '—'}</div>
          </div>
          <div className="card" style={{ minWidth: 240 }}>
            <div className="muted">Congestion</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{data?.averages?.congestionScore0to100 ?? '—'}</div>
          </div>
        </div>

        <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            <h3 style={{ marginTop: 0 }}>Simulations By Status</h3>
            <div className="stack" style={{ gap: 8 }}>
              {Object.entries(data?.counts?.simulationsByStatus || {}).map(([k, v]) => (
                <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 320 }}>
            <h3 style={{ marginTop: 0 }}>Latest Per Twin</h3>
            <div className="stack" style={{ gap: 8 }}>
              {(data?.latest || []).map((x) => (
                <div key={x.twinId} className="card">
                  <div><strong>{x.nameAr}</strong> <span className="muted">({x.status})</span></div>
                  <div className="muted">last sim: {x.latestSimulationId || '—'}</div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(x.kpis || {}, null, 2)}</pre>
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
                <div className="muted">{e.twinId || '—'} • {e.runId || e.change || e.kind || e.status || 'event'}</div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(e, null, 2)}</pre>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
