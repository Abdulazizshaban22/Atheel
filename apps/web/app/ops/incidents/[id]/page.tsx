'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '../../../../lib/api';

export default function IncidentDetailsPage({ params, searchParams }: any) {
  const id = params?.id as string;
  const orgId = (searchParams?.organizationId as string) || 'org_demo_1';

  const [err, setErr] = useState('');
  const [incident, setIncident] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  async function load() {
    setErr('');
    const q = new URLSearchParams({ organizationId: orgId, limit: '200' });
    const res = await apiRequest(`/ops/incidents/${id}/timeline?${q.toString()}`);
    if (!res.ok) {
      setErr(res.error || 'فشل تحميل timeline');
      return;
    }
    setIncident((res.data as any)?.incident || null);
    setEvents((res.data as any)?.events || []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, orgId]);

  async function act(path: 'ack' | 'close' | 'mute' | 'unmute') {
    let body: any = { organizationId: orgId };
    if (path === 'mute') {
      const minutes = Number(window.prompt('كم دقيقة كتم؟ (مثال: 60)') || '60');
      body.minutes = minutes;
    }
    if (path === 'close') {
      const note = window.prompt('ملاحظة إغلاق (اختياري)') || '';
      body.note = note;
    }
    const res = await apiRequest(`/ops/incidents/${id}/${path}`, { method: 'POST', body });
    if (!res.ok) return setErr(res.error || 'فشل تنفيذ الإجراء');
    await load();
  }

  return (
    <main className="container stack">
      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="badge">Incident Timeline</div>
            <h1 style={{ margin: '8px 0 0' }}>الحادثة</h1>
            <div className="muted">Wave46: timeline + ack/close/mute</div>
          </div>
          <div className="row">
            <a className="btn btn-ghost" href="/ops">رجوع</a>
            <button className="btn" onClick={load}>تحديث</button>
          </div>
        </div>
        {err ? <div className="notice error">{err}</div> : null}

        {incident ? (
          <div className="stack">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div><strong>status:</strong> {incident.status} — <strong>severity:</strong> {incident.severity}</div>
                <div className="muted" style={{ maxWidth: 920, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {incident.incidentKey}
                </div>
              </div>
              <div className="row">
                <button className="btn btn-secondary" onClick={() => act('ack')}>Ack</button>
                <button className="btn" onClick={() => act('unmute')}>Unmute</button>
                <button className="btn btn-ghost" onClick={() => act('mute')}>Mute</button>
                <button className="btn btn-danger" onClick={() => act('close')}>Close</button>
              </div>
            </div>
            <div className="muted">firstSeenAt: {incident.firstSeenAt} | lastSeenAt: {incident.lastSeenAt} | eventCount: {incident.eventCount}</div>
          </div>
        ) : (
          <div className="notice">لا توجد بيانات للحادثة</div>
        )}
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>Timeline</h2>
        <table>
          <thead><tr><th>time</th><th>eventType</th><th>actor</th><th>message</th></tr></thead>
          <tbody>
            {events.map((e: any) => (
              <tr key={e.id}>
                <td>{e.createdAt}</td>
                <td>{e.eventType}</td>
                <td>{e.actorType}{e.actorUserId ? `:${e.actorUserId}` : ''}</td>
                <td style={{ maxWidth: 920, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.message || '-'}</td>
              </tr>
            ))}
            {!events.length ? <tr><td colSpan={4}>لا توجد أحداث</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
