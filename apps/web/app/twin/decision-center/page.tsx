'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/AppShell';
import { apiGet } from '../../../lib/api';

type TwinDashboard = { counts?: { twins?: number; activeTwins?: number; simulations?: number; simulationsByStatus?: Record<string, number> }; averages?: { predictedSatisfaction0to100?: number; congestionScore0to100?: number }; latest?: Array<{ twinId: string; nameAr: string; status: string; latestSimulationId?: string; kpis?: Record<string, number> }>; };

export default function TwinDecisionCenterPage() {
  const [data, setData] = useState<TwinDashboard | null>(null);
  useEffect(() => { apiGet<TwinDashboard>('/dashboards/twin').then(setData); }, []);
  return (
    <AppShell title="Twin Decision Center" subtitle="قراءة تنفيذية للمحاكاة وازدحام التجربة" badge="Twin Decision">
      <section className="card stack">
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="card"><div className="muted">Twins</div><strong>{data?.counts?.twins ?? 0}</strong></div>
          <div className="card"><div className="muted">Simulations</div><strong>{data?.counts?.simulations ?? 0}</strong></div>
          <div className="card"><div className="muted">Satisfaction</div><strong>{data?.averages?.predictedSatisfaction0to100 ?? 0}</strong></div>
          <div className="card"><div className="muted">Congestion</div><strong>{data?.averages?.congestionScore0to100 ?? 0}</strong></div>
        </div>
        <div className="stack">
          {(data?.latest || []).map((item) => (
            <div key={item.twinId} className="card">
              <strong>{item.nameAr}</strong>
              <div className="muted">{item.status} • simulation {item.latestSimulationId || '—'}</div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
