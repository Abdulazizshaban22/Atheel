'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';

type Experience = { id: string; titleAr: string };

export default function VisitorGuidePage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [experienceId, setExperienceId] = useState('');
  const [persona, setPersona] = useState('family');
  const [guides, setGuides] = useState<any[]>([]);

  async function loadExperiences() {
    const { data } = await apiRequest<any>('/experiences', { method: 'GET' });
    const list = Array.isArray(data) ? data : (data?.items || []);
    setExperiences(list);
    if (!experienceId && list?.[0]?.id) setExperienceId(list[0].id);
  }

  async function loadGuides() {
    const qs = new URLSearchParams();
    if (experienceId) qs.set('experienceId', experienceId);
    const { data } = await apiRequest<any>(`/visitor-guide?${qs.toString()}`, { method: 'GET' });
    setGuides(data?.items || []);
  }

  async function generate() {
    if (!experienceId) return;
    await apiRequest('/visitor-guide/generate', { method: 'POST', body: { experienceId, persona } });
    await loadGuides();
  }

  useEffect(() => {
    loadExperiences();
  }, []);

  useEffect(() => {
    if (experienceId) loadGuides();
  }, [experienceId]);

  return (
    <AppShell
      title="مرشد الزائر"
      subtitle="توليد نصوص محطات + سيناريو صوتي حسب شخصية الزائر، ثم ربطها بالمحتوى والتجربة"
      badge={`Guides: ${guides.length}`}
    >
      <section className="card stack">
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <select className="input" value={experienceId} onChange={(e) => setExperienceId(e.target.value)}>
            {experiences.map((e) => <option key={e.id} value={e.id}>{e.titleAr}</option>)}
          </select>
          <select className="input" value={persona} onChange={(e) => setPersona(e.target.value)}>
            <option value="family">عائلي</option>
            <option value="student">طلاب</option>
            <option value="tourist">سياح</option>
            <option value="expert">خبراء</option>
          </select>
          <button className="btn" onClick={generate}>توليد مرشد</button>
        </div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>المخرجات</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
          {guides.map((g) => (
            <div key={g.id} className="card stack">
              <div className="badge">{g.persona} | {g.languageCode}</div>
              <div className="muted">{g.summaryAr}</div>
              <div className="muted">Content: {(g.contentItemIds || []).length}</div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
