'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';

type Taxonomy = {
  regions: Array<{ code: string; nameAr: string; hubs: string[] }>;
  themes: Array<{ code: string; nameAr: string; keywordsAr: string[] }>;
  formats: Array<{ code: string; nameAr: string }>;
  audiences: Array<{ code: string; nameAr: string }>;
  counts: { ideasGenerated: number };
};

type Idea = {
  id: string;
  titleAr: string;
  descriptionAr: string;
  tags: string[];
  kpis: Array<{ nameAr: string; unit: string }>;
  assetsSuggested: string[];
};

export default function CulturePage() {
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [items, setItems] = useState<Idea[]>([]);
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('');
  const [theme, setTheme] = useState('');
  const [format, setFormat] = useState('');
  const [audience, setAudience] = useState('');
  const [installing, setInstalling] = useState(false);

  const regions = useMemo(() => taxonomy?.regions || [], [taxonomy]);
  const themes = useMemo(() => taxonomy?.themes || [], [taxonomy]);
  const formats = useMemo(() => taxonomy?.formats || [], [taxonomy]);
  const audiences = useMemo(() => taxonomy?.audiences || [], [taxonomy]);

  async function loadTaxonomy() {
    const { data } = await apiRequest<Taxonomy>('/culture/taxonomy', { method: 'GET' });
    if (data) setTaxonomy(data);
  }

  async function loadIdeas() {
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (region) qs.set('region', region);
    if (theme) qs.set('theme', theme);
    if (format) qs.set('format', format);
    if (audience) qs.set('audience', audience);
    qs.set('limit', '60');

    const { data } = await apiRequest<{ items: Idea[] }>(`/culture/ideas?${qs.toString()}`, { method: 'GET' });
    if (data?.items) setItems(data.items);
  }

  useEffect(() => {
    loadTaxonomy();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadIdeas(), 250);
    return () => clearTimeout(t);
  }, [q, region, theme, format, audience]);

  async function installKnowledge() {
    setInstalling(true);
    try {
      await apiRequest('/culture/knowledge/install', { method: 'POST', body: { overwrite: true } });
      alert('تم تغذية قاعدة المعرفة بحزمة سعودية أولية.');
    } finally {
      setInstalling(false);
    }
  }

  return (
    <AppShell
      title="مكتبة الثقافة السعودية"
      subtitle="أفكار ثقافية سعودية مولدة برمجيًا + حزمة معرفة جاهزة لـ RAG"
      badge={`Ideas: ${taxonomy?.counts?.ideasGenerated ?? '—'}`}
      actions={<button className="btn" onClick={installKnowledge} disabled={installing}>{installing ? 'جاري التغذية...' : 'تغذية RAG بمصادر أساسية'}</button>}
    >
      <section className="card stack">
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="بحث" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">كل المناطق</option>
            {regions.map((r) => <option key={r.code} value={r.code}>{r.nameAr}</option>)}
          </select>
          <select className="input" value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="">كل المحاور</option>
            {themes.map((t) => <option key={t.code} value={t.code}>{t.nameAr}</option>)}
          </select>
          <select className="input" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="">كل الصيغ</option>
            {formats.map((f) => <option key={f.code} value={f.code}>{f.nameAr}</option>)}
          </select>
          <select className="input" value={audience} onChange={(e) => setAudience(e.target.value)}>
            <option value="">كل الجماهير</option>
            {audiences.map((a) => <option key={a.code} value={a.code}>{a.nameAr}</option>)}
          </select>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          {items.map((x) => (
            <div key={x.id} className="card stack">
              <div className="muted">{x.id}</div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{x.titleAr}</div>
              <div className="muted">{x.descriptionAr}</div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {(x.tags || []).slice(0, 6).map((t) => <span key={t} className="badge">{t}</span>)}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>KPIs</div>
                <div className="muted">{(x.kpis || []).map((k) => `${k.nameAr} (${k.unit})`).join('، ') || '—'}</div>
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>Assets</div>
                <div className="muted">{(x.assetsSuggested || []).slice(0, 4).join('، ') || '—'}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
