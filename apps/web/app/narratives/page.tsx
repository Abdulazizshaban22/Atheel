'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';

type Idea = { id: string; titleAr: string; state: string };

type Narrative = { id: string; titleAr: string; variant: string; createdAt: string; loglineAr: string };

type Experience = { id: string; titleAr: string; twinId?: string };

export default function NarrativesPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [ideaId, setIdeaId] = useState('');
  const [experienceId, setExperienceId] = useState('');
  const [items, setItems] = useState<Narrative[]>([]);
  const [detail, setDetail] = useState<any>(null);

  async function loadIdeas() {
    const { data } = await apiRequest<any>('/vault/ideas?limit=50', { method: 'GET' });
    setIdeas(data?.items || []);
    if (!ideaId && data?.items?.[0]?.id) setIdeaId(data.items[0].id);
  }

  async function loadExperiences() {
    const { data } = await apiRequest<any>('/experiences', { method: 'GET' });
    setExperiences(data?.items || []);
    if (!experienceId && data?.items?.[0]?.id) setExperienceId(data.items[0].id);
  }

  async function loadList() {
    const qs = new URLSearchParams();
    if (ideaId) qs.set('ideaId', ideaId);
    if (experienceId) qs.set('experienceId', experienceId);
    const { data } = await apiRequest<any>(`/narratives?${qs.toString()}`, { method: 'GET' });
    setItems(data?.items || []);
  }

  async function generateAB() {
    if (!ideaId && !experienceId) return alert('حدد فكرة أو تجربة');
    await apiRequest('/narratives/generate/ab', { method: 'POST', body: { ideaId: ideaId || undefined, experienceId: experienceId || undefined } });
    await loadList();
  }

  async function openNarrative(id: string) {
    const { data } = await apiRequest<any>(`/narratives/${id}`, { method: 'GET' });
    setDetail(data);
  }

  useEffect(() => {
    loadIdeas();
    loadExperiences();
  }, []);

  useEffect(() => {
    if (ideaId || experienceId) loadList();
  }, [ideaId, experienceId]);

  return (
    <AppShell
      title="السرديات المرتبطة بالموقع"
      subtitle="محرك سرديات محلية تربط الفكرة بالمكان وبالتوأم الرقمي، مع A/B قبل الاعتماد"
      badge={`Narratives: ${items.length}`}
    >
      <section className="card stack">
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <select className="input" value={ideaId} onChange={(e) => setIdeaId(e.target.value)}>
            <option value="">فكرة (اختياري)</option>
            {ideas.map((i) => <option key={i.id} value={i.id}>{i.titleAr} ({i.state})</option>)}
          </select>
          <select className="input" value={experienceId} onChange={(e) => setExperienceId(e.target.value)}>
            <option value="">تجربة (اختياري)</option>
            {experiences.map((e) => <option key={e.id} value={e.id}>{e.titleAr}</option>)}
          </select>
          <button className="btn" onClick={generateAB}>توليد سرديتين A/B</button>
        </div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>السرديات</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
          {items.map((n) => (
            <div key={n.id} className="card stack">
              <div className="badge">{n.variant}</div>
              <div style={{ fontWeight: 800 }}>{n.titleAr}</div>
              <div className="muted">{n.loglineAr}</div>
              <button className="btn btn-ghost" onClick={() => openNarrative(n.id)}>عرض</button>
            </div>
          ))}
        </div>
      </section>

      {detail ? (
        <section className="card stack">
          <div style={{ fontWeight: 900 }}>تفاصيل السردية</div>
          <div className="badge">{detail.variant}</div>
          <div style={{ fontWeight: 800 }}>{detail.titleAr}</div>
          <div className="muted">{detail.loglineAr}</div>
          <div className="card stack">
            <div style={{ fontWeight: 800 }}>Beats</div>
            {(detail.beats?.beats || []).map((b: any) => (
              <div key={b.nodeId} className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{b.nameAr}</div>
                  <div className="muted">{b.beatAr}</div>
                </div>
                <div className="badge">{b.dwellSecondsSuggested}s</div>
              </div>
            ))}
          </div>
          <div className="card stack">
            <div style={{ fontWeight: 800 }}>Citations</div>
            {(detail.citations || []).map((c: any) => (
              <div key={c.citationId} className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.titleAr}</div>
                  {c.url ? <a className="muted" href={c.url} target="_blank">{c.url}</a> : null}
                </div>
                <div className="badge">{c.citationId}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
