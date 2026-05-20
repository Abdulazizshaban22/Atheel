'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';
import { getStoredUser, getToken } from '../../lib/session';

export default function OfficialPage() {
  const token = useMemo(() => getToken(), []);
  const user = useMemo(() => getStoredUser(), []);
  const orgId = (user?.orgIds?.[0] || 'org_demo_1') as string;

  const [projectId, setProjectId] = useState('prj_1');
  const [sourceKind, setSourceKind] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  async function load() {
    const [a, b] = await Promise.all([
      apiRequest<any>(`/official/items?organizationId=${encodeURIComponent(orgId)}${sourceKind ? `&sourceKind=${encodeURIComponent(sourceKind)}` : ''}`, { token }),
      apiRequest<any>(`/radar/signals?organizationId=${encodeURIComponent(orgId)}&projectId=${encodeURIComponent(projectId)}`, { token }),
    ]);
    setItems(a.data?.items || []);
    setSignals(b.data?.items || []);
  }

  async function seed() {
    setMsg('');
    const res = await apiRequest<any>('/official/seed', { method: 'POST', token, body: { organizationId: orgId } });
    if (!res.ok) return alert(res.error || 'فشل');
    setMsg(`تم Seed: ${(res.data as any)?.upserted || 0}`);
    await load();
  }

  async function generateSignals() {
    setMsg('');
    const res = await apiRequest<any>('/official/generate-signals', { method: 'POST', token, body: { organizationId: orgId, projectId } });
    if (!res.ok) return alert(res.error || 'فشل');
    setMsg(`تم توليد Signals: ${(res.data as any)?.created || 0}`);
    await load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, projectId, sourceKind]);

  return (
    <AppShell
      title="مصادر رسمية"
      subtitle="Wave25 — Cultural Years + UNESCO ICH + Domains → Official Items → Signals → Culture Graph + Provenance"
      badge={`Official: ${items.length}`}
      actions={
        <>
          <button className="btn btn-ghost" onClick={seed}>Seed Official</button>
          <button className="btn" onClick={generateSignals}>Generate Signals</button>
          <button className="btn btn-ghost" onClick={load}>تحديث</button>
        </>
      }
    >
      {msg ? <div className="notice success">{msg}</div> : null}

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>إعدادات</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="projectId" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
          <select className="input" value={sourceKind} onChange={(e) => setSourceKind(e.target.value)}>
            <option value="">كل المصادر</option>
            <option value="moc_cultural_year">MoC Cultural Years</option>
            <option value="unesco_ich_sa">UNESCO ICH Saudi</option>
            <option value="ich_domains">ICH Domains</option>
          </select>
        </div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>Official Items</div>
        <table>
          <thead>
            <tr><th>source</th><th>year</th><th>العنوان</th><th>externalId</th></tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="muted">{it.sourceKind}</td>
                <td>{it.year || '—'}</td>
                <td>{it.titleAr}</td>
                <td className="muted">{it.externalId || '—'}</td>
              </tr>
            ))}
            {!items.length ? <tr><td colSpan={4}>لا يوجد</td></tr> : null}
          </tbody>
        </table>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>Signals (Radar)</div>
        <table>
          <thead>
            <tr><th>العنوان</th><th>taxonomy</th><th>score</th><th>status</th></tr>
          </thead>
          <tbody>
            {signals.map((s) => (
              <tr key={s.id}>
                <td>{s.titleAr}</td>
                <td className="muted">{s.taxonomyCode || '—'}</td>
                <td>{Number(s.score || 0).toFixed(3)}</td>
                <td>{s.status}</td>
              </tr>
            ))}
            {!signals.length ? <tr><td colSpan={4}>—</td></tr> : null}
          </tbody>
        </table>
        <div className="muted">بعد Generate Signals: كل عنصر رسمي يتحول إلى Signal + Entity + Provenance Link.</div>
      </section>
    </AppShell>
  );
}
