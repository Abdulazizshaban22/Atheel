'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';

type Idea = { id: string; titleAr: string; state: string };

type Template = { id: string; nameAr: string; code: string; domain: string };

export default function ProgramTemplatesPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideaId, setIdeaId] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [generated, setGenerated] = useState<any>(null);
  const [instantiated, setInstantiated] = useState<any>(null);
  const [selectedTpl, setSelectedTpl] = useState('');

  async function loadIdeas() {
    const { data } = await apiRequest<any>('/vault/ideas', { method: 'GET' });
    setIdeas(data?.items || []);
    if (!ideaId && data?.items?.[0]?.id) setIdeaId(data.items[0].id);
  }

  async function loadTemplates() {
    const { data } = await apiRequest<any>('/program-templates', { method: 'GET' });
    setTemplates(data?.items || []);
    if (!selectedTpl && data?.items?.[0]?.id) setSelectedTpl(data.items[0].id);
  }

  async function generate() {
    if (!ideaId) return;
    const { data } = await apiRequest<any>('/program-templates/generate', { method: 'POST', body: { ideaId } });
    setGenerated(data);
    await loadTemplates();
  }

  async function instantiate() {
    if (!selectedTpl) return;
    const { data } = await apiRequest<any>(`/program-templates/${selectedTpl}/instantiate`, { method: 'POST', body: {} });
    setInstantiated(data);
  }

  useEffect(() => {
    loadIdeas();
    loadTemplates();
  }, []);

  return (
    <AppShell
      title="قوالب البرامج"
      subtitle="مولّد قوالب فعاليات محلية بسرعة فائقة: فكرة + مصادر + جمهور + مكان ثم برامج + Workflows"
      badge={`Templates: ${templates.length}`}
    >
      <section className="card stack">
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <select className="input" value={ideaId} onChange={(e) => setIdeaId(e.target.value)}>
            {ideas.map((i) => <option key={i.id} value={i.id}>{i.titleAr} ({i.state})</option>)}
          </select>
          <button className="btn" onClick={generate}>توليد قالب من فكرة</button>
        </div>
        {generated ? <pre className="code">{JSON.stringify(generated, null, 2)}</pre> : null}
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>قوالب موجودة</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <select className="input" value={selectedTpl} onChange={(e) => setSelectedTpl(e.target.value)}>
            <option value="">اختر قالب</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.nameAr}</option>)}
          </select>
          <button className="btn" onClick={instantiate}>Instantiate إلى برنامج + Workflows</button>
        </div>
        {instantiated ? <pre className="code">{JSON.stringify(instantiated, null, 2)}</pre> : null}
      </section>
    </AppShell>
  );
}
