'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';

export default function RisksPage() {
  const [items, setItems] = useState<any[]>([]);
  const [twinId, setTwinId] = useState('twin_demo_1');
  const [assessment, setAssessment] = useState<any>(null);

  async function load() {
    const { data } = await apiRequest<any>('/risks/register', { method: 'GET' });
    setItems(data?.items || []);
  }

  async function assess() {
    if (!twinId) return alert('اكتب twinId');
    const { data } = await apiRequest<any>(`/risks/assess/twin/${twinId}`, { method: 'POST', body: {} });
    setAssessment(data);
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell
      title="محرك المخاطر الثقافية"
      subtitle="يربط التوأم الرقمي بالمخاطر التشغيلية وحماية التراث والامتثال، ويخرجها داخل حزمة الاعتماد"
      badge={`Risks: ${items.length}`}
    >
      <section className="card stack">
        <div style={{ fontWeight: 900 }}>تقييم آلي من Twin</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="twinId" value={twinId} onChange={(e) => setTwinId(e.target.value)} />
          <button className="btn" onClick={assess}>تقييم</button>
        </div>
        {assessment ? <pre className="code">{JSON.stringify(assessment, null, 2)}</pre> : null}
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>سجل المخاطر</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
          {items.map((r) => (
            <div key={r.id} className="card stack">
              <div className={`badge`}>{r.level} | {r.category}</div>
              <div style={{ fontWeight: 800 }}>{r.titleAr}</div>
              <div className="muted">{r.descriptionAr}</div>
              {r.mitigationAr ? <div className="muted">تخفيف: {r.mitigationAr}</div> : null}
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
