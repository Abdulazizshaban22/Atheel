'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';

export default function HeritageMemoryPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [nameAr, setNameAr] = useState('');
  const [url, setUrl] = useState('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [ingTitle, setIngTitle] = useState('');
  const [ingText, setIngText] = useState('');
  const [status, setStatus] = useState<any>(null);

  async function load() {
    const { data } = await apiRequest<any>('/heritage-memory/sources', { method: 'GET' });
    setSources(data?.items || []);
    const st = await apiRequest<any>('/heritage-memory/status', { method: 'GET' });
    setStatus(st.data);
  }

  async function addSource() {
    if (!nameAr || !url) return alert('اكتب الاسم والرابط');
    await apiRequest('/heritage-memory/sources', { method: 'POST', body: { nameAr, url } });
    setNameAr('');
    setUrl('');
    await load();
  }

  async function ingest() {
    if (!ingTitle || !ingText) return alert('اكتب العنوان والنص');
    await apiRequest('/heritage-memory/ingest-text', { method: 'POST', body: { title: ingTitle, text: ingText, tags: ['studio_archive'] } });
    setIngTitle('');
    setIngText('');
    await load();
  }

  async function search() {
    if (!q) return;
    const { data } = await apiRequest<any>('/heritage-memory/query', { method: 'POST', body: { q, topK: 6 } });
    setResults(data?.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell
      title="ذاكرة التراث"
      subtitle="مخزن معرفة داخلي يتغذى على مصادركم وأفكار الاستديو، ويصبح مرجع RAG لرفع الجودة وتقليل الهلوسة"
      badge={`Sources: ${sources.length} | Docs: ${status?.knowledgeDocs || 0}`}
    >
      <section className="card stack">
        <div style={{ fontWeight: 900 }}>مصادر</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="اسم المصدر" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
          <input className="input" placeholder="رابط" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="btn" onClick={addSource}>إضافة</button>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
          {sources.map((s) => (
            <div key={s.id} className="card stack">
              <div style={{ fontWeight: 800 }}>{s.nameAr}</div>
              <a className="muted" href={s.url} target="_blank">{s.url}</a>
            </div>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>إدخال نص إلى الذاكرة</div>
        <input className="input" placeholder="عنوان" value={ingTitle} onChange={(e) => setIngTitle(e.target.value)} />
        <textarea className="input" placeholder="النص" value={ingText} onChange={(e) => setIngText(e.target.value)} />
        <button className="btn" onClick={ingest}>إدخال</button>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>بحث سريع</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="سؤال" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn" onClick={search}>بحث</button>
        </div>
        <div className="stack">
          {results.map((r) => (
            <div key={r.id} className="card stack">
              <div className="badge">Score {r.score}</div>
              <div className="muted">{r.snippet}</div>
              {r.sourceUrl ? <a className="muted" href={r.sourceUrl} target="_blank">{r.sourceUrl}</a> : null}
              {r.citationId ? <div className="badge">{r.citationId}</div> : null}
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
