'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';

type Board = { id: string; titleAr: string; status: string; miroBoardUrl?: string };
type Note = { id: string; textAr: string; tags: string[] };

export default function IdeationPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [titleAr, setTitleAr] = useState('');
  const [miroBoardUrl, setMiroBoardUrl] = useState('');
  const [newNote, setNewNote] = useState('');
  const [voteSessionId, setVoteSessionId] = useState('');
  const [results, setResults] = useState<any>(null);

  const selectedBoard = useMemo(() => boards.find((b) => b.id === selected), [boards, selected]);

  async function loadBoards() {
    const { data } = await apiRequest<{ items: Board[] }>('/ideation/boards', { method: 'GET' });
    setBoards(data?.items || []);
    if (!selected && data?.items?.[0]?.id) setSelected(data.items[0].id);
  }

  async function loadNotes(boardId: string) {
    const { data } = await apiRequest<{ items: Note[]; clusters: any[] }>(`/ideation/boards/${boardId}/notes`, { method: 'GET' });
    setNotes(data?.items || []);
    setClusters(data?.clusters || []);
  }

  async function loadResults(boardId: string) {
    const { data } = await apiRequest<any>(`/ideation/boards/${boardId}/voting/results`, { method: 'GET' });
    setResults(data);
  }

  useEffect(() => {
    loadBoards();
  }, []);

  useEffect(() => {
    if (selected) {
      loadNotes(selected);
      loadResults(selected);
    }
  }, [selected]);

  async function createBoard() {
    if (!titleAr) return alert('اكتب اسم اللوحة');
    const { data } = await apiRequest<Board>('/ideation/boards', { method: 'POST', body: { titleAr, miroBoardUrl } });
    await loadBoards();
    if (data?.id) setSelected(data.id);
    setTitleAr('');
    setMiroBoardUrl('');
  }

  async function addNote() {
    if (!selected || !newNote) return;
    await apiRequest(`/ideation/boards/${selected}/notes`, { method: 'POST', body: { textAr: newNote, tags: [] } });
    setNewNote('');
    await loadNotes(selected);
  }

  async function startVoting() {
    if (!selected) return;
    const { data } = await apiRequest<any>(`/ideation/boards/${selected}/voting/start`, { method: 'POST', body: { votesPerUser: 5 } });
    if (data?.id) setVoteSessionId(data.id);
    alert('بدأ التصويت');
  }

  async function castVote(noteId: string) {
    if (!voteSessionId) return alert('ابدأ التصويت أولاً');
    await apiRequest(`/ideation/voting/${voteSessionId}/vote`, { method: 'POST', body: { noteId, userId: 'demo' } });
    await loadResults(selected);
  }

  return (
    <AppShell
      title="العصف الذهني"
      subtitle="نفس فكرة ميرو: تدوين سريع + تجميع + تصويت نقطي لاختيار الأفكار القابلة للتنفيذ"
      badge={`Boards: ${boards.length} | Notes: ${notes.length}`}
    >
      <section className="card stack">
        <div style={{ fontWeight: 900 }}>لوحات العصف</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
            {boards.map((b) => <option key={b.id} value={b.id}>{b.titleAr}</option>)}
          </select>
          {selectedBoard?.miroBoardUrl ? <a className="btn btn-ghost" href={selectedBoard.miroBoardUrl} target="_blank">فتح في ميرو</a> : null}
          <button className="btn" onClick={startVoting}>بدء تصويت</button>
        </div>

        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="لوحة جديدة" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
          <input className="input" placeholder="رابط ميرو (اختياري)" value={miroBoardUrl} onChange={(e) => setMiroBoardUrl(e.target.value)} />
          <button className="btn" onClick={createBoard}>إنشاء</button>
        </div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>ملاحظات</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="أضف فكرة" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
          <button className="btn" onClick={addNote}>إضافة</button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
          {notes.map((n) => (
            <div key={n.id} className="card stack">
              <div className="muted">{n.id}</div>
              <div style={{ fontWeight: 800 }}>{n.textAr}</div>
              <button className="btn" onClick={() => castVote(n.id)}>صوّت</button>
            </div>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>نتائج التصويت</div>
        {results?.ranked ? (
          <div className="stack">
            {results.ranked.slice(0, 12).map((r: any) => (
              <div key={r.noteId} className="row" style={{ justifyContent: 'space-between' }}>
                <div>{r.textAr}</div>
                <div className="badge">{r.votes}</div>
              </div>
            ))}
          </div>
        ) : <div className="muted">لا توجد نتائج بعد</div>}
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>تجميع تلقائي (Light Clustering)</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
          {clusters.slice(0, 12).map((c: any) => (
            <div key={c.key} className="card stack">
              <div style={{ fontWeight: 800 }}>{c.key} <span className="badge">{c.count}</span></div>
              <div className="muted">{(c.items || []).slice(0, 5).map((x: any) => x.textAr).join('، ')}</div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
