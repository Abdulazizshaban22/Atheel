'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';

export default function OpsPage() {
  const [orgId, setOrgId] = useState('org_demo_1');
  const [err, setErr] = useState('');
  const [workload, setWorkload] = useState<any>(null);
  const [burn, setBurn] = useState<any>(null);
  const [incidents, setIncidents] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  async function loadAll() {
    setErr('');
    const q = new URLSearchParams({ organizationId: orgId });
    const [w, b, i, s] = await Promise.all([
      apiRequest(`/ops/approvals/workload?${q.toString()}`),
      apiRequest(`/ops/slo/burn-rate?${q.toString()}`),
      apiRequest(`/ops/incidents?${q.toString()}&limit=100`),
      apiRequest(`/ops/settings?${q.toString()}`),
    ]);

    if (!w.ok) setErr(w.error || 'فشل تحميل workload');
    if (!b.ok) setErr(b.error || 'فشل تحميل burn-rate');
    if (!i.ok) setErr(i.error || 'فشل تحميل incidents');
    if (!s.ok) setErr(s.error || 'فشل تحميل settings');

    setWorkload(w.ok ? w.data : null);
    setBurn(b.ok ? b.data : null);
    setIncidents(i.ok ? i.data : null);
    setSettings(s.ok ? (s.data as any)?.settings : null);
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSettings() {
    const res = await apiRequest('/ops/settings', {
      method: 'POST',
      body: {
        organizationId: orgId,
        quietHoursStart: settings?.quietHoursStart || null,
        quietHoursEnd: settings?.quietHoursEnd || null,
        quietHoursTz: settings?.quietHoursTz || 'Asia/Riyadh',
        outboxDedupWindowMinutes: Number(settings?.outboxDedupWindowMinutes || 30),
        approvalsReviewerCooldownMinutes: Number(settings?.approvalsReviewerCooldownMinutes ?? 5),
        approvalsMaxActivePerReviewer: Number(settings?.approvalsMaxActivePerReviewer ?? 10),
      },
    });
    if (!res.ok) return setErr(res.error || 'فشل حفظ الإعدادات');
    await loadAll();
  }

  async function evaluateSlo() {
    const res = await apiRequest('/ops/slo/evaluate', { method: 'POST', body: { organizationId: orgId } });
    if (!res.ok) return setErr(res.error || 'فشل تقييم SLO');
    await loadAll();
  }

  return (
    <main className="container stack">
      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="badge">Ops Dashboard</div>
            <h1 style={{ margin: '8px 0 0' }}>لوحة التشغيل — Wave46</h1>
            <div className="muted">تحتاج صلاحيات org_admin أو super_admin</div>
          </div>
          <div className="row">
            <input style={{ width: 220 }} value={orgId} onChange={(e) => setOrgId(e.target.value)} />
            <button className="btn" onClick={loadAll}>تحديث</button>
            <button className="btn btn-secondary" onClick={evaluateSlo}>تقييم SLO</button>
          </div>
        </div>
        {err ? <div className="notice error">{err}</div> : null}
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>إعدادات التشغيل (Quiet Hours + Dedup + Routing Fairness)</h2>
        <div className="form-grid cols-4">
          <div><label>quietHoursStart</label><input value={settings?.quietHoursStart || ''} onChange={(e) => setSettings({ ...(settings || {}), quietHoursStart: e.target.value })} placeholder="23:00" /></div>
          <div><label>quietHoursEnd</label><input value={settings?.quietHoursEnd || ''} onChange={(e) => setSettings({ ...(settings || {}), quietHoursEnd: e.target.value })} placeholder="07:00" /></div>
          <div><label>outboxDedupWindowMinutes</label><input type="number" value={Number(settings?.outboxDedupWindowMinutes || 30)} onChange={(e) => setSettings({ ...(settings || {}), outboxDedupWindowMinutes: Number(e.target.value) })} /></div>
          <div><label>approvalsReviewerCooldownMinutes</label><input type="number" value={Number(settings?.approvalsReviewerCooldownMinutes ?? 5)} onChange={(e) => setSettings({ ...(settings || {}), approvalsReviewerCooldownMinutes: Number(e.target.value) })} /></div>
          <div><label>approvalsMaxActivePerReviewer</label><input type="number" value={Number(settings?.approvalsMaxActivePerReviewer ?? 10)} onChange={(e) => setSettings({ ...(settings || {}), approvalsMaxActivePerReviewer: Number(e.target.value) })} /></div>
        </div>
        <div className="row"><button className="btn" onClick={saveSettings}>حفظ الإعدادات</button></div>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>Workload للموافقات</h2>
        <table>
          <thead><tr><th>userId</th><th>activeApprovals</th><th>overdueApprovals</th></tr></thead>
          <tbody>
            {(workload?.items || []).map((x: any) => (
              <tr key={x.userId}><td>{x.userId}</td><td>{x.activeApprovals}</td><td>{x.overdueApprovals}</td></tr>
            ))}
            {!workload?.items?.length ? <tr><td colSpan={3}>لا توجد بيانات</td></tr> : null}
          </tbody>
        </table>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>SLO Burn-rate (Multi-window)</h2>
        <table>
          <thead><tr><th>السياسة</th><th>indicator</th><th>rule</th><th>threshold</th><th>burn short</th><th>burn long</th><th>short</th><th>long</th><th>fired</th></tr></thead>
          <tbody>
            {(burn?.items || []).flatMap((it: any) => (it.ruleResults || []).map((r: any) => (
              <tr key={`${it.policy.id}:${r.id}`}>
                <td>{it.policy.name}</td>
                <td>{it.policy.indicator}</td>
                <td>{r.id} ({r.severity})</td>
                <td>{Number(r.threshold).toFixed(2)}</td>
                <td>{Number(r.burnRateShort).toFixed(2)}</td>
                <td>{Number(r.burnRateLong).toFixed(2)}</td>
                <td>{r.short?.errors}/{r.short?.total} ({r.shortWindowMinutes}m)</td>
                <td>{r.long?.errors}/{r.long?.total} ({r.longWindowMinutes}m)</td>
                <td>{r.fired ? 'YES' : '-'}</td>
              </tr>
            )))}
            {!burn?.items?.length ? <tr><td colSpan={9}>لا توجد سياسات أو بيانات</td></tr> : null}
          </tbody>
        </table>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>Incidents (Timeline + Ack/Close/Mute)</h2>
        <table>
          <thead><tr><th>status</th><th>severity</th><th>incidentKey</th><th>lastSeenAt</th><th>eventCount</th><th>actions</th></tr></thead>
          <tbody>
            {(incidents?.items || []).slice(0, 80).map((it: any) => (
              <tr key={it.id}>
                <td>{it.status}</td>
                <td>{it.severity}</td>
                <td style={{ maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <a href={`/ops/incidents/${it.id}?organizationId=${encodeURIComponent(orgId)}`}>{it.incidentKey}</a>
                </td>
                <td>{it.lastSeenAt}</td>
                <td>{it.eventCount}</td>
                <td><a className="btn btn-ghost" href={`/ops/incidents/${it.id}?organizationId=${encodeURIComponent(orgId)}`}>Timeline</a></td>
              </tr>
            ))}
            {!incidents?.items?.length ? <tr><td colSpan={6}>لا توجد incidents</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
