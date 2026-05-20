'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { apiRequest } from '../lib/api';
import { getStoredUser, getToken } from '../lib/session';

export default function CompliancePage() {
  const token = useMemo(() => getToken(), []);
  const user = useMemo(() => getStoredUser(), []);
  const orgId = (user?.orgIds?.[0] || 'org_demo_1') as string;

  const [items, setItems] = useState<any[]>([]);
  const [subjectType, setSubjectType] = useState('project');
  const [subjectId, setSubjectId] = useState('');
  const [region, setRegion] = useState('');
  const [eventFormat, setEventFormat] = useState('Festival');
  const [expectedAttendance, setExpectedAttendance] = useState(500);

  async function load() {
    const res = await apiRequest<any>(`/compliance/checklists?organizationId=${encodeURIComponent(orgId)}`, { token });
    setItems(res.data?.items || []);
  }

  async function generate() {
    if (!subjectId.trim()) return alert('أدخل subjectId (مثال: projectId)');
    const res = await apiRequest<any>('/compliance/checklists/generate/ksa-event-licensing', {
      method: 'POST',
      token,
      body: {
        organizationId: orgId,
        subjectType,
        subjectId: subjectId.trim(),
        region: region.trim() || undefined,
        eventFormat,
        expectedAttendance,
        hasFood: false,
        usesAmplifiedSound: false,
        includesFilming: false,
      },
    });
    if (!res.ok) return alert(res.error || 'فشل التوليد');
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell title="التراخيص والمتطلبات" subtitle="قوائم متطلبات تشغيلية قابلة للاعتماد والمتابعة" badge={`Checklists: ${items.length}`}> 
      <section className="card stack">
        <div style={{ fontWeight: 900 }}>توليد قائمة تراخيص فعالية (السعودية)</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <select className="input" value={subjectType} onChange={(e) => setSubjectType(e.target.value)}>
            <option value="project">project</option>
            <option value="program">program</option>
            <option value="season">season</option>
          </select>
          <input className="input" placeholder="subjectId" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
          <input className="input" placeholder="المنطقة (اختياري)" value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="صيغة الفعالية" value={eventFormat} onChange={(e) => setEventFormat(e.target.value)} />
          <input className="input" type="number" placeholder="عدد الحضور المتوقع" value={expectedAttendance} onChange={(e) => setExpectedAttendance(Number(e.target.value || 0))} />
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn" onClick={generate}>توليد</button>
          <button className="btn btn-ghost" onClick={load}>تحديث</button>
        </div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>القائمة</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 10 }}>
          {items.map((c) => (
            <div key={c.id} className="card stack">
              <div className="badge">{c.status}</div>
              <div style={{ fontWeight: 800 }}>{c.titleAr}</div>
              <div className="muted">{c.subjectType} • {c.subjectId}</div>
              <div className="muted">Items: {(c.items || []).length}</div>
              {c.externalRefUrl ? (
                <a className="btn btn-ghost" href={c.externalRefUrl} target="_blank" rel="noreferrer">مرجع خارجي</a>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
