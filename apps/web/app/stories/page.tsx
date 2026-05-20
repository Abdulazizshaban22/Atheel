'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';
import { getStoredUser, getToken } from '../../lib/session';
import SimpleGraph from '../../components/graph/SimpleGraph';

export default function StoriesPage() {
  const token = useMemo(() => getToken(), []);
  const user = useMemo(() => getStoredUser(), []);
  const orgId = (user?.orgIds?.[0] || 'org_demo_1') as string;

  const [items, setItems] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [graph, setGraph] = useState<{ nodes: any[]; edges: any[] } | null>(null);

  const [projectId, setProjectId] = useState('prj_1');
  const [titleAr, setTitleAr] = useState('رواية: حكاية القهوة في جازان');
  const [narratorName, setNarratorName] = useState('');
  const [locationAr, setLocationAr] = useState('');

  const [transcriptText, setTranscriptText] = useState('');
  const [consentType, setConsentType] = useState('publish');
  const [signedBy, setSignedBy] = useState('');
  const [noteAr, setNoteAr] = useState('');

  async function load() {
    const res = await apiRequest<any>(`/stories?organizationId=${encodeURIComponent(orgId)}&projectId=${encodeURIComponent(projectId)}`, { token });
    setItems(res.data?.items || []);
  }

  async function openStory(id: string) {
    setSelectedId(id);
    setGraph(null);
    const res = await apiRequest<any>(`/stories/${encodeURIComponent(id)}`, { token });
    setSelected(res.data?.story || null);
  }

  async function refreshSelected() {
    if (!selectedId) return;
    await openStory(selectedId);
  }

  async function createStory() {
    if (!titleAr.trim()) return alert('اكتب عنوان');
    const res = await apiRequest<any>('/stories', {
      method: 'POST',
      token,
      body: {
        organizationId: orgId,
        projectId: projectId.trim() || undefined,
        titleAr: titleAr.trim(),
        narratorName: narratorName.trim() || undefined,
        locationAr: locationAr.trim() || undefined,
      },
    });
    if (!res.ok) return alert(res.error || 'فشل إنشاء الرواية');
    await load();
  }

  async function addTranscript() {
    if (!selectedId) return;
    if (!transcriptText.trim()) return alert('أدخل نص التفريغ/الرواية');
    const res = await apiRequest<any>(`/stories/${encodeURIComponent(selectedId)}/transcripts`, {
      method: 'POST',
      token,
      body: { text: transcriptText.trim(), languageCode: 'ar' },
    });
    if (!res.ok) return alert(res.error || 'فشل');
    setTranscriptText('');
    await refreshSelected();
  }

  async function addConsent() {
    if (!selectedId) return;
    const res = await apiRequest<any>(`/stories/${encodeURIComponent(selectedId)}/consents`, {
      method: 'POST',
      token,
      body: {
        consentType: consentType.trim() || 'publish',
        signedBy: signedBy.trim() || undefined,
        signedAt: new Date().toISOString(),
        noteAr: noteAr.trim() || undefined,
      },
    });
    if (!res.ok) return alert(res.error || 'فشل');
    setSignedBy('');
    setNoteAr('');
    await refreshSelected();
  }

  async function autoLink(mode: 'heuristic' | 'ai' = 'heuristic') {
    if (!selectedId) return;
    const res = await apiRequest<any>(`/stories/${encodeURIComponent(selectedId)}/auto-link`, {
      method: 'POST',
      token,
      body: { mode },
    });
    if (!res.ok) return alert(res.error || 'فشل الربط');
    await refreshSelected();
  }

  async function loadGraph() {
    if (!selectedId) return;
    const res = await apiRequest<any>(`/stories/${encodeURIComponent(selectedId)}/graph`, { token });
    if (!res.ok) return alert(res.error || 'فشل');
    setGraph({ nodes: res.data?.nodes || [], edges: res.data?.edges || [] });
  }

  async function assessAuthenticity() {
    if (!selectedId) return;
    const res = await apiRequest<any>('/quality/authenticity/assess', {
      method: 'POST',
      token,
      body: { organizationId: orgId, subjectType: 'story', subjectId: selectedId },
    });
    if (!res.ok) return alert(res.error || 'فشل');
    alert(`Authenticity score: ${(res.data as any)?.assessment?.score}`);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, projectId]);

  return (
    <AppShell
      title="القصص والروايات"
      subtitle="Wave22 — Story Capture + Consent + Story Graph + ربط كيانات إلى Culture Graph"
      badge={`Stories: ${items.length}`}
    >
      <section className="card stack">
        <div style={{ fontWeight: 900 }}>إنشاء رواية</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="projectId" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
          <input className="input" placeholder="العنوان" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
          <input className="input" placeholder="اسم الراوي (اختياري)" value={narratorName} onChange={(e) => setNarratorName(e.target.value)} />
          <input className="input" placeholder="الموقع (اختياري)" value={locationAr} onChange={(e) => setLocationAr(e.target.value)} />
          <button className="btn" onClick={createStory}>إنشاء</button>
          <button className="btn btn-ghost" onClick={load}>تحديث</button>
        </div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>القائمة</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
          {items.map((s) => (
            <div key={s.id} className="card stack">
              <div className="badge">{s.status}</div>
              <div style={{ fontWeight: 800 }}>{s.titleAr}</div>
              <div className="muted">{s.narratorName || '—'} | {s.locationAr || '—'}</div>
              <div className="row" style={{ gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => openStory(s.id)}>فتح</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selected ? (
        <section className="card stack">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="badge">{selected.id}</div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{selected.titleAr}</div>
              <div className="muted">Entities: {(selected.entityLinks || []).length} | Consents: {(selected.consents || []).length} | Transcripts: {(selected.transcripts || []).length}</div>
            </div>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" onClick={() => autoLink('heuristic')}>ربط كيانات تلقائي</button>
              <button className="btn btn-ghost" onClick={assessAuthenticity}>Authenticity</button>
              <button className="btn" onClick={loadGraph}>عرض Graph</button>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12 }}>
            <div className="card stack">
              <div style={{ fontWeight: 800 }}>إضافة تفريغ/نص</div>
              <textarea className="input" style={{ minHeight: 120 }} value={transcriptText} onChange={(e) => setTranscriptText(e.target.value)} placeholder="اكتب النص هنا" />
              <button className="btn" onClick={addTranscript}>إضافة</button>
            </div>

            <div className="card stack">
              <div style={{ fontWeight: 800 }}>موافقة</div>
              <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <input className="input" placeholder="consentType (publish/archive/...)" value={consentType} onChange={(e) => setConsentType(e.target.value)} />
                <input className="input" placeholder="signedBy" value={signedBy} onChange={(e) => setSignedBy(e.target.value)} />
              </div>
              <textarea className="input" style={{ minHeight: 80 }} placeholder="ملاحظة" value={noteAr} onChange={(e) => setNoteAr(e.target.value)} />
              <button className="btn" onClick={addConsent}>إضافة</button>
            </div>
          </div>

          {graph ? (
            <div className="card stack">
              <div style={{ fontWeight: 900 }}>Story Graph Viewer</div>
              <SimpleGraph nodes={graph.nodes} edges={graph.edges} height={560} />
            </div>
          ) : null}
        </section>
      ) : null}
    </AppShell>
  );
}
