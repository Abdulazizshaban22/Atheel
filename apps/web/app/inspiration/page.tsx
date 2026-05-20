'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';

type Source = { id: string; nameAr: string; url: string; kind: string; tags: string[] };
type Asset = { id: string; titleAr: string; url: string; mediaType: string; tags: string[]; notesAr?: string; sourceId?: string; citationId?: string };
type Board = { id: string; titleAr: string; descriptionAr?: string; status: string; visibility: string };


export default function InspirationPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardTitle, setBoardTitle] = useState('');
  const [boardDesc, setBoardDesc] = useState('');
  const [selectedBoardId, setSelectedBoardId] = useState('');

  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [url, setUrl] = useState('');
  const [notesAr, setNotesAr] = useState('');
  const [sourceId, setSourceId] = useState('');

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const s of sources) for (const t of (s.tags || [])) set.add(t);
    for (const a of assets) for (const t of (a.tags || [])) set.add(t);
    return Array.from(set).slice(0, 40);
  }, [sources, assets]);

  async function loadSources() {
    const { data } = await apiRequest<{ items: Source[] }>('/inspiration/sources', { method: 'GET' });
    setSources(data?.items || []);
  }

  async function loadAssets() {
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (tag) qs.set('tag', tag);
    qs.set('limit', '80');
    const { data } = await apiRequest<{ items: Asset[] }>(`/inspiration/assets?${qs.toString()}`, { method: 'GET' });
    setAssets(data?.items || []);
  }


  async function loadBoards() {
    const { data } = await apiRequest<{ items: Board[] }>('/inspiration/boards', { method: 'GET' });
    setBoards((data as any)?.items || (data as any)?.data?.items || []);
  }

  useEffect(() => {
    loadSources();
    loadBoards();
    loadAssets();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadAssets(), 200);
    return () => clearTimeout(t);
  }, [q, tag]);


  async function createBoard() {
    if (!boardTitle) return alert('اكتب اسم اللوحة');
    await apiRequest('/inspiration/boards', { method: 'POST', body: { titleAr: boardTitle, descriptionAr: boardDesc, visibility: 'org' } });
    setBoardTitle('');
    setBoardDesc('');
    await loadBoards();
  }

  async function addToBoard(assetId: string) {
    if (!selectedBoardId) return alert('اختر لوحة أولاً');
    await apiRequest(`/inspiration/boards/${selectedBoardId}/items`, { method: 'POST', body: { assetId } });
    alert('تمت الإضافة للوحة');
  }

  async function addAsset() {
    if (!titleAr || !url) return alert('اكتب العنوان والرابط');
    await apiRequest('/inspiration/assets', { method: 'POST', body: { titleAr, url, notesAr, sourceId: sourceId || undefined, mediaType: 'link', tags: [] } });
    setTitleAr('');
    setUrl('');
    setNotesAr('');
    setSourceId('');
    await loadAssets();
  }

  return (
    <AppShell
      title="الإلهام الثقافي"
      subtitle="بديل محلي أقرب لروح الثقافة السعودية: مصادر موثوقة + حفظ روابط وإلهام + بحث سريع"
      badge={`Sources: ${sources.length} | Assets: ${assets.length}`}
    >
      <section className="card stack">
        <div style={{ fontWeight: 900 }}>مصادر موصى بها</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
          {sources.map((s) => (
            <div key={s.id} className="card stack">
              <div className="muted">{s.kind}</div>
              <div style={{ fontWeight: 800 }}>{s.nameAr}</div>
              <a className="btn btn-ghost" href={s.url} target="_blank">فتح المصدر</a>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {(s.tags || []).slice(0, 8).map((t) => <span key={t} className="badge">{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      
      <section className="card stack">
        <div style={{ fontWeight: 900 }}>لوحات الإلهام</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="اسم اللوحة" value={boardTitle} onChange={(e) => setBoardTitle(e.target.value)} />
          <input className="input" placeholder="وصف مختصر" value={boardDesc} onChange={(e) => setBoardDesc(e.target.value)} />
          <button className="btn" onClick={createBoard}>إنشاء لوحة</button>
          <select className="input" value={selectedBoardId} onChange={(e) => setSelectedBoardId(e.target.value)}>
            <option value="">اختيار لوحة للإضافة</option>
            {boards.map((b) => <option key={b.id} value={b.id}>{b.titleAr}</option>)}
          </select>
        </div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {boards.map((b) => <span key={b.id} className="badge">{b.titleAr}</span>)}
        </div>
      </section>

<section className="card stack">
        <div style={{ fontWeight: 900 }}>حفظ إلهام جديد</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="عنوان الإلهام" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
          <input className="input" placeholder="رابط" value={url} onChange={(e) => setUrl(e.target.value)} />
          <select className="input" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            <option value="">مصدر (اختياري)</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
          </select>
          <button className="btn" onClick={addAsset}>حفظ</button>
        </div>
        <textarea className="input" placeholder="ملاحظات" value={notesAr} onChange={(e) => setNotesAr(e.target.value)} />
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>بحث في الإلهام</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="بحث" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">كل الوسوم</option>
            {tags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
          {assets.map((a) => (
            <div key={a.id} className="card stack">
              <div className="muted">{a.mediaType} | {a.id}</div>
              <div style={{ fontWeight: 800 }}>{a.titleAr}</div>
              {a.notesAr ? <div className="muted">{a.notesAr}</div> : null}
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <a className="btn btn-ghost" href={a.url} target="_blank">فتح</a>
                <button className="btn" onClick={() => addToBoard(a.id)}>أضف للوحة</button>
              </div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {(a.tags || []).slice(0, 8).map((t) => <span key={t} className="badge">{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
