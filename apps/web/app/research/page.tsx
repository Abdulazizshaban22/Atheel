'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';
import { getStoredUser, getToken } from '../../lib/session';
import SimpleGraph from '../../components/graph/SimpleGraph';

export default function ResearchPage() {
  const token = useMemo(() => getToken(), []);
  const user = useMemo(() => getStoredUser(), []);
  const orgId = (user?.orgIds?.[0] || 'org_demo_1') as string;

  const [projectId, setProjectId] = useState('prj_1');
  const [items, setItems] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [graph, setGraph] = useState<{ nodes: any[]; edges: any[] } | null>(null);

  const [title, setTitle] = useState('بحث: القهوة السعودية والهوية');
  const [university, setUniversity] = useState('');
  const [degree, setDegree] = useState('');
  const [year, setYear] = useState('2024');
  const [authors, setAuthors] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [abstractAr, setAbstractAr] = useState('');
  const [fullTextAr, setFullTextAr] = useState('');

  const [importUrl, setImportUrl] = useState('');

  async function load() {
    const res = await apiRequest<any>(`/research/documents?organizationId=${encodeURIComponent(orgId)}&projectId=${encodeURIComponent(projectId)}`, { token });
    setItems(res.data?.items || []);
  }

  async function create() {
    if (!title.trim()) return alert('اكتب عنوان');
    const res = await apiRequest<any>('/research/documents', {
      method: 'POST',
      token,
      body: {
        organizationId: orgId,
        projectId: projectId.trim() || undefined,
        title: title.trim(),
        university: university.trim() || undefined,
        degree: degree.trim() || undefined,
        year: year.trim() ? Number(year.trim()) : undefined,
        authors: authors.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        abstractAr: abstractAr.trim() || undefined,
        fullTextAr: fullTextAr.trim() || undefined,
      },
    });
    if (!res.ok) return alert(res.error || 'فشل');
    await load();
  }

  async function importFromUrl() {
    if (!importUrl.trim()) return alert('ضع رابط البحث (SDL/MDPI/غيره)');
    const res = await apiRequest<any>('/research/import/from-url', {
      method: 'POST',
      token,
      body: {
        organizationId: orgId,
        projectId: projectId.trim() || undefined,
        url: importUrl.trim(),
        storeSnapshot: true,
        autoExtract: true,
        extractMode: 'heuristic',
        autoIngestKnowledge: true,
      },
    });
    if (!res.ok) return alert(res.error || 'فشل الاستيراد');
    setImportUrl('');
    await load();
    alert('تم الاستيراد وإدخال المعرفة تلقائيًا');
  }

  async function openDoc(id: string) {
    setSelectedId(id);
    setGraph(null);
    const res = await apiRequest<any>(`/research/documents/${encodeURIComponent(id)}`, { token });
    setSelected(res.data?.document || null);
  }

  async function extract(mode: 'heuristic' | 'ai' = 'heuristic') {
    if (!selectedId) return;
    const res = await apiRequest<any>(`/research/documents/${encodeURIComponent(selectedId)}/extract`, {
      method: 'POST',
      token,
      body: { mode },
    });
    if (!res.ok) return alert(res.error || 'فشل');
    await openDoc(selectedId);
  }

  async function loadGraph() {
    if (!selectedId) return;
    const res = await apiRequest<any>(`/research/documents/${encodeURIComponent(selectedId)}/graph`, { token });
    if (!res.ok) return alert(res.error || 'فشل');
    setGraph({ nodes: res.data?.nodes || [], edges: res.data?.edges || [] });
  }

  async function ingestToKnowledge() {
    if (!selected) return;
    const txt = String(selected.fullTextAr || selected.abstractAr || '').trim();
    if (!txt) return alert('أضف نصًا داخل abstractAr أو fullTextAr');
    const res = await apiRequest<any>('/ai/knowledge/ingest', {
      method: 'POST',
      token,
      body: {
        organizationId: orgId,
        projectId: projectId.trim() || undefined,
        title: selected.title,
        text: txt,
        sourceType: 'research',
        sourceRef: selected.sourceUrl || selected.id,
        tags: ['research', 'sa', 'academic'],
      },
    });
    if (!res.ok) return alert(res.error || 'فشل');
    alert('تم إدخال البحث إلى قاعدة المعرفة (Knowledge)');
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, projectId]);

  return (
    <AppShell
      title="مكتبة الأبحاث"
      subtitle="Wave23 — Academic Intake + Thesis-to-Graph + ربط بالكيانات (Culture Graph)"
      badge={`Docs: ${items.length}`}
    >
      <section className="card stack">
        <div style={{ fontWeight: 900 }}>إضافة بحث</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="projectId" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
          <input className="input" placeholder="العنوان" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="input" placeholder="الجامعة" value={university} onChange={(e) => setUniversity(e.target.value)} />
          <input className="input" placeholder="الدرجة" value={degree} onChange={(e) => setDegree(e.target.value)} />
          <input className="input" placeholder="السنة" value={year} onChange={(e) => setYear(e.target.value)} />
          <input className="input" placeholder="المؤلفون" value={authors} onChange={(e) => setAuthors(e.target.value)} />
          <input className="input" placeholder="الرابط (اختياري)" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
        </div>
        <textarea className="input" style={{ minHeight: 90 }} placeholder="الملخص العربي (اختياري)" value={abstractAr} onChange={(e) => setAbstractAr(e.target.value)} />
        <textarea className="input" style={{ minHeight: 120 }} placeholder="النص الكامل (اختياري)" value={fullTextAr} onChange={(e) => setFullTextAr(e.target.value)} />
        <div className="row" style={{ gap: 10 }}>
          <button className="btn" onClick={create}>حفظ</button>
          <button className="btn btn-ghost" onClick={load}>تحديث</button>
        </div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>استيراد بحث من رابط</div>
        <div className="muted">
          ضع رابط صفحة البحث (مثلاً من Saudi Digital Library drepo أو مجلة علمية). سيحاول النظام التقاط العنوان والملخص، ثم يربط كيانات ويغذي قاعدة المعرفة.
        </div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="رابط البحث" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} style={{ minWidth: 520 }} />
          <button className="btn" onClick={importFromUrl}>استيراد</button>
        </div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>القائمة</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 10 }}>
          {items.map((d) => (
            <div key={d.id} className="card stack">
              <div className="badge">{d.year || '—'}</div>
              <div style={{ fontWeight: 800 }}>{d.title}</div>
              <div className="muted">{d.university || '—'} | Links: {(d.entityLinks || []).length}</div>
              <div className="row" style={{ gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => openDoc(d.id)}>فتح</button>
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
              <div style={{ fontWeight: 900 }}>{selected.title}</div>
              <div className="muted">Entities: {(selected.entityLinks || []).length} | Runs: {(selected.runs || []).length}</div>
            </div>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" onClick={() => extract('heuristic')}>Extract (heuristic)</button>
              <button className="btn btn-ghost" onClick={() => extract('ai')}>Extract (AI)</button>
              <button className="btn btn-ghost" onClick={ingestToKnowledge}>إدخال للمعرفة</button>
              <button className="btn" onClick={loadGraph}>Graph</button>
            </div>
          </div>

          {graph ? (
            <div className="card stack">
              <div style={{ fontWeight: 900 }}>Research Graph Viewer</div>
              <SimpleGraph nodes={graph.nodes} edges={graph.edges} height={560} />
            </div>
          ) : null}
        </section>
      ) : null}
    </AppShell>
  );
}
