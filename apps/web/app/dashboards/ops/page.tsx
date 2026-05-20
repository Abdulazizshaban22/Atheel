'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../../components/AppShell';
import { apiGet } from '../../../lib/api';
import { getStoredUser } from '../../../lib/session';

type OpsDash = any;

export default function OpsDashboardPage() {
  const user = useMemo(() => getStoredUser(), []);
  const [orgId, setOrgId] = useState((user?.orgIds || [])[0] || 'org_demo_1');
  const [hours, setHours] = useState(24);
  const [data, setData] = useState<OpsDash | null>(null);
  const [err, setErr] = useState('');

  async function load() {
    setErr('');
    const q = new URLSearchParams();
    if (orgId) q.set('organizationId', orgId);
    q.set('hours', String(hours));
    const res = await apiGet<OpsDash>(`/dashboards/ops?${q.toString()}`);
    if (!res) return setErr('تعذر تحميل لوحة التشغيل');
    setData(res);
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell
      title="لوحة التشغيل والامتثال (Ops)"
      subtitle="Wave44: مؤشرات تشغيلية مبنية على OperationalEvent + Outbox + Escalations + Approval SLA"
      badge="Ops Dashboard"
      actions={<button className="btn" onClick={load}>تحديث</button>}
    >
      {err ? <div className="notice error">{err}</div> : null}

      <section className="card stack">
        <h2 style={{ margin: 0 }}>النطاق</h2>
        <div className="form-grid cols-3">
          <div>
            <label>organizationId</label>
            <input value={orgId} onChange={(e) => setOrgId(e.target.value)} />
          </div>
          <div>
            <label>آخر كم ساعة</label>
            <input type="number" value={hours} min={1} max={720} onChange={(e) => setHours(Number(e.target.value))} />
          </div>
          <div className="row" style={{ alignItems: 'end' }}>
            <button className="btn" onClick={load}>تطبيق</button>
          </div>
        </div>
      </section>

      {data?.scores ? (
        <section className="card stack">
          <h2 style={{ margin: 0 }}>درجة الاعتمادية</h2>
          <div className="notice">Reliability Score: <b>{data.scores.reliability0to100}</b> / 100</div>
          <div className="muted">الدرجة تتأثر بمعدل نجاح Outbox، ومعدل تأخر الموافقات، ومتوسط دقائق التأخر، وضوضاء التصعيد.</div>
        </section>
      ) : null}

      <section className="card stack">
        <h2 style={{ margin: 0 }}>ملخص العدادات</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data?.counts || {}, null, 2)}</pre>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>القياسات</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify({ rates: data?.rates, averages: data?.averages }, null, 2)}</pre>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>آخر الأحداث</h2>
        <table>
          <thead><tr><th>النوع</th><th>الشدة</th><th>الموضوع</th><th>الوقت</th></tr></thead>
          <tbody>
            {(data?.top?.lastEvents || []).map((e: any) => (
              <tr key={e.id}>
                <td>{e.eventType}</td>
                <td>{e.severity}</td>
                <td>{e.subject}</td>
                <td>{String(e.createdAt || '')}</td>
              </tr>
            ))}
            {(!data?.top?.lastEvents || !data.top.lastEvents.length) ? <tr><td colSpan={4}>لا توجد بيانات</td></tr> : null}
          </tbody>
        </table>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>قنوات Outbox</h2>
        <table>
          <thead><tr><th>القناة</th><th>sent</th><th>failed</th><th>pending</th><th>sending</th><th>total</th></tr></thead>
          <tbody>
            {(data?.top?.outboxChannels || []).map((r: any) => (
              <tr key={r.channel}>
                <td>{r.channel}</td>
                <td>{r.sent}</td>
                <td>{r.failed}</td>
                <td>{r.pending}</td>
                <td>{r.sending}</td>
                <td>{r.total}</td>
              </tr>
            ))}
            {(!data?.top?.outboxChannels || !data.top.outboxChannels.length) ? <tr><td colSpan={6}>لا توجد بيانات</td></tr> : null}
          </tbody>
        </table>
      </section>

    </AppShell>
  );
}
