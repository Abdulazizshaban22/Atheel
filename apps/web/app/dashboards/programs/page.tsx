'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/AppShell';
import { apiRequest } from '../../../lib/api';

type ProgramsDashboard = {
  counts: { total: number; byStatus: Record<string, number> };
  items: Array<{ id: string; code: string; nameAr: string; status: string; strategicValueScore: number; readinessScore: number }>;
  noteAr?: string;
};

export default function ProgramsDashboardPage() {
  const [data, setData] = useState<ProgramsDashboard | null>(null);

  async function load() {
    const { data } = await apiRequest<ProgramsDashboard>('/dashboards/programs', { method: 'GET' });
    if (data) setData(data);
  }

  useEffect(() => {
    load();
    const t = setInterval(() => load(), 12000);
    return () => clearInterval(t);
  }, []);

  return (
    <AppShell title="لوحة البرامج" subtitle="High Programs Portfolio Dashboard" badge="Wave07">
      <section className="card stack">
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="card" style={{ minWidth: 240 }}>
            <div className="muted">إجمالي البرامج</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{data?.counts?.total ?? '—'}</div>
          </div>
          <div className="card" style={{ minWidth: 240 }}>
            <div className="muted">حسب الحالة</div>
            <div className="stack" style={{ gap: 4 }}>
              {Object.entries(data?.counts?.byStatus || {}).map(([k, v]) => (
                <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ marginTop: 0 }}>قائمة البرامج</h3>
          <div className="stack" style={{ gap: 8 }}>
            {(data?.items || []).map((p) => (
              <div key={p.id} className="card">
                <div className="muted">{p.code} • {p.status}</div>
                <div style={{ fontWeight: 800 }}>{p.nameAr}</div>
                <div className="muted">Strategic: {p.strategicValueScore} • Readiness: {p.readinessScore}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
