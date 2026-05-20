'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';

type Idea = { id: string; titleAr: string; oneLinerAr: string; state: string; evidenceMinCount: number };
type Evidence = { id: string; titleAr: string; url?: string; kind: string };

export default function VaultPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [similarIdeas, setSimilarIdeas] = useState<any[]>([]);

  const [evTitle, setEvTitle] = useState('');
  const [evUrl, setEvUrl] = useState('');
  const [nextState, setNextState] = useState('pitch_ready');

  const selectedIdea = useMemo(() => ideas.find((i) => i.id === selected), [ideas, selected]);

  async function loadIdeas() {
    const { data } = await apiRequest<{ items: Idea[] }>('/vault/ideas', { method: 'GET' });
    setIdeas(data?.items || []);
    if (!selected && data?.items?.[0]?.id) setSelected(data.items[0].id);
  }


  async function loadSimilar(id: string) {
    const { data } = await apiRequest<any>(`/vault/ideas/similar?ideaId=${encodeURIComponent(id)}&limit=8`, { method: 'GET' });
    setSimilarIdeas(data?.items || []);
  }

  async function loadDetail(id: string) {
    const { data } = await apiRequest<any>(`/vault/ideas/${id}`, { method: 'GET' });
    setDetail(data);
  }

  useEffect(() => {
    loadIdeas();
  }, []);

  useEffect(() => {
    if (selected) { loadDetail(selected); loadSimilar(selected); }
  }, [selected]);

  async function addEvidence() {
    if (!selected || !evTitle) return;
    await apiRequest(`/vault/ideas/${selected}/evidence`, { method: 'POST', body: { titleAr: evTitle, url: evUrl || undefined } });
    setEvTitle('');
    setEvUrl('');
    await loadDetail(selected);
  }

  async function advance() {
    if (!selected) return;
    const { data } = await apiRequest<any>(`/vault/ideas/${selected}/advance`, { method: 'POST', body: { nextState } });
    if (data?.ok === false) alert(data.reasonAr);
    await loadIdeas();
    await loadDetail(selected);
  }

  async function generateNarrative() {
    if (!selected) return;
    const { data } = await apiRequest<any>(`/vault/ideas/${selected}/narrative/generate`, { method: 'POST', body: {} });
    if (data?.ok === false) alert(data.reasonAr);
    await loadDetail(selected);
  }

  const evidence: Evidence[] = detail?.evidence || [];

  return (
    <AppShell
      title="أرشيف الأفكار"
      subtitle="مكان يحفظ كل أفكار الاستديو ويصنفها ويطورها، مع إجبار البحث قبل السردية الرسمية"
      badge={`Ideas: ${ideas.length}`}
    >
      <section className="card stack">
        <div style={{ fontWeight: 900 }}>اختيار فكرة</div>
        <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {ideas.map((i) => <option key={i.id} value={i.id}>{i.titleAr} ({i.state})</option>)}
        </select>
      </section>

      {selectedIdea ? (
        <section className="card stack">
          <div style={{ fontWeight: 900 }}>{detail?.titleAr}</div>
          <div className="muted">{detail?.oneLinerAr}</div>

          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <select className="input" value={nextState} onChange={(e) => setNextState(e.target.value)}>
              <option value="shortlisted">Shortlisted</option>
              <option value="developed">Developed</option>
              <option value="pitch_ready">Pitch Ready</option>
              <option value="delivered">Delivered</option>
              <option value="archived">Archived</option>
            </select>
            <button className="btn" onClick={advance}>تغيير الحالة</button>
            <button className="btn" onClick={generateNarrative}>توليد سردية أولية</button>
          </div>

          <div className="card stack">
            <div style={{ fontWeight: 900 }}>حزمة البحث (Evidence Pack)</div>
            <div className="muted">الحد الأدنى: {detail?.evidenceMinCount} مراجع. مطلوب مرجع رسمي سعودي أو UNESCO واحد على الأقل قبل اعتماد العرض.</div>

            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <input className="input" placeholder="عنوان المرجع" value={evTitle} onChange={(e) => setEvTitle(e.target.value)} />
              <input className="input" placeholder="رابط (اختياري)" value={evUrl} onChange={(e) => setEvUrl(e.target.value)} />
              <button className="btn" onClick={addEvidence}>إضافة مرجع</button>
            </div>

            <div className="stack">
              {evidence.map((e) => (
                <div key={e.id} className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{e.titleAr}</div>
                    {e.url ? <a className="muted" href={e.url} target="_blank">{e.url}</a> : null}
                  </div>
                  <div className="badge">{e.kind}</div>
                </div>
              ))}
            </div>
          </div>

          
          <div className="card stack">
            <div style={{ fontWeight: 900 }}>أفكار مشابهة من الأرشيف</div>
            {similarIdeas.length ? (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                {similarIdeas.map((s) => (
                  <div key={s.id} className="card stack">
                    <div className="badge">Similarity {s.similarity}%</div>
                    <div style={{ fontWeight: 800 }}>{s.titleAr}</div>
                    <div className="muted">{s.oneLinerAr}</div>
                    <button className="btn btn-ghost" onClick={() => setSelected(s.id)}>فتح</button>
                  </div>
                ))}
              </div>
            ) : <div className="muted">لا توجد نتائج مشابهة بعد</div>}
          </div>

<div className="card stack">
            <div style={{ fontWeight: 900 }}>السردية</div>
            {detail?.narrative ? (
              <div className="stack">
                <div className="badge">{detail.narrative.status}</div>
                <div style={{ fontWeight: 800 }}>{detail.narrative.loglineAr}</div>
                <div><b>Act 1</b> {detail.narrative.act1}</div>
                <div><b>Act 2</b> {detail.narrative.act2}</div>
                <div><b>Act 3</b> {detail.narrative.act3}</div>
              </div>
            ) : <div className="muted">لا توجد سردية بعد</div>}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
