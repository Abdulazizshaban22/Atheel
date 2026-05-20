'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';
import { getStoredUser, getToken } from '../../lib/session';

export default function QualityPage() {
  const token = useMemo(() => getToken(), []);
  const user = useMemo(() => getStoredUser(), []);
  const orgId = (user?.orgIds?.[0] || 'org_demo_1') as string;

  const [subjectType, setSubjectType] = useState<'entity' | 'story' | 'research' | 'attachment'>('entity');
  const [subjectId, setSubjectId] = useState('');
  const [text, setText] = useState('');

  const [authItems, setAuthItems] = useState<any[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<any[]>([]);
  const [ragSummary, setRagSummary] = useState<any>(null);
  const [ragItems, setRagItems] = useState<any[]>([]);

  async function load() {
    const [a, e, s, r] = await Promise.all([
      apiRequest<any>(`/quality/authenticity?organizationId=${encodeURIComponent(orgId)}`, { token }),
      apiRequest<any>(`/quality/evidence?organizationId=${encodeURIComponent(orgId)}`, { token }),
      apiRequest<any>(`/quality/rag-metrics/summary?organizationId=${encodeURIComponent(orgId)}`, { token }),
      apiRequest<any>(`/quality/rag-metrics?organizationId=${encodeURIComponent(orgId)}&limit=120`, { token }),
    ]);
    setAuthItems(a.data?.items || []);
    setEvidenceItems(e.data?.items || []);
    setRagSummary(s.data || null);
    setRagItems(r.data?.items || []);
  }

  async function assessAuthenticity() {
    if (!subjectId.trim()) return alert('أدخل subjectId');
    const res = await apiRequest<any>('/quality/authenticity/assess', {
      method: 'POST',
      token,
      body: { organizationId: orgId, subjectType, subjectId: subjectId.trim() },
    });
    if (!res.ok) return alert(res.error || 'فشل');
    await load();
  }

  async function checkEvidence() {
    if (!subjectId.trim()) return alert('أدخل subjectId');
    if (!text.trim()) return alert('أدخل النص');
    const res = await apiRequest<any>('/quality/evidence/check', {
      method: 'POST',
      token,
      body: { organizationId: orgId, subjectType, subjectId: subjectId.trim(), kind: 'citations', text: text.trim(), requiresCitations: true },
    });
    if (!res.ok) return alert(res.error || 'فشل');
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell
      title="الجودة والأصالة"
      subtitle="Wave24 — Authenticity Engine + Evidence Inspector + RAG Quality Metrics"
      badge={`RAG logs: ${ragItems.length}`}
      actions={<button className="btn" onClick={load}>تحديث</button>}
    >
      <section className="card stack">
        <div style={{ fontWeight: 900 }}>أدوات الجودة</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <select className="input" value={subjectType} onChange={(e) => setSubjectType(e.target.value as any)}>
            <option value="entity">entity</option>
            <option value="story">story</option>
            <option value="research">research</option>
            <option value="attachment">attachment</option>
          </select>
          <input className="input" placeholder="subjectId" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
          <button className="btn" onClick={assessAuthenticity}>Authenticity</button>
          <button className="btn btn-ghost" onClick={checkEvidence}>Evidence Check</button>
        </div>
        <textarea className="input" style={{ minHeight: 90 }} placeholder="نص لفحص الاستشهادات/الروابط" value={text} onChange={(e) => setText(e.target.value)} />
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>ملخص جودة RAG</div>
        <pre className="code" style={{ overflow: 'auto' }}>{JSON.stringify(ragSummary, null, 2)}</pre>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>آخر قياسات RAG</div>
        <table>
          <thead>
            <tr><th>وقت</th><th>Provider</th><th>Chunks</th><th>Citations</th><th>Grounding</th><th>Len</th></tr>
          </thead>
          <tbody>
            {ragItems.map((m) => (
              <tr key={m.id}>
                <td className="muted">{String(m.createdAt || '').slice(0, 19)}</td>
                <td>{m.provider || '—'}</td>
                <td>{m.retrievedChunks}</td>
                <td>{m.citationsCount}</td>
                <td>{Number(m.groundingScore || 0).toFixed(3)}</td>
                <td>{m.answerLength}</td>
              </tr>
            ))}
            {!ragItems.length ? <tr><td colSpan={6}>لا يوجد بيانات بعد</td></tr> : null}
          </tbody>
        </table>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>Authenticity Assessments</div>
        <table>
          <thead>
            <tr><th>وقت</th><th>type</th><th>id</th><th>score</th></tr>
          </thead>
          <tbody>
            {authItems.map((a) => (
              <tr key={a.id}>
                <td className="muted">{String(a.createdAt || '').slice(0, 19)}</td>
                <td>{a.subjectType}</td>
                <td className="muted">{a.subjectId}</td>
                <td>{Number(a.score || 0).toFixed(3)}</td>
              </tr>
            ))}
            {!authItems.length ? <tr><td colSpan={4}>—</td></tr> : null}
          </tbody>
        </table>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>Evidence Checks</div>
        <table>
          <thead>
            <tr><th>وقت</th><th>type</th><th>id</th><th>status</th><th>issues</th></tr>
          </thead>
          <tbody>
            {evidenceItems.map((e) => (
              <tr key={e.id}>
                <td className="muted">{String(e.createdAt || '').slice(0, 19)}</td>
                <td>{e.subjectType}</td>
                <td className="muted">{e.subjectId}</td>
                <td>{e.status}</td>
                <td className="muted">{JSON.stringify(e.issuesJson || {})}</td>
              </tr>
            ))}
            {!evidenceItems.length ? <tr><td colSpan={5}>—</td></tr> : null}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
