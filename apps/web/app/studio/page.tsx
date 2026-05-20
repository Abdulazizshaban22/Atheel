'use client';

import { FormEvent, useState } from 'react';
import { apiRequest } from '../../lib/api';

type BoardResponse = {
  board?: { pillars?: string[]; recommendedDeliverables?: string[] };
  concept?: { title?: string; promise?: string; audiences?: string[] } | null;
};

export default function StudioPage() {
  const [projectId, setProjectId] = useState('prj_1');
  const [conceptTitle, setConceptTitle] = useState('طبقات الذاكرة الحية');
  const [status, setStatus] = useState('');
  const [board, setBoard] = useState<BoardResponse | null>(null);

  async function buildBoard(e: FormEvent) {
    e.preventDefault();
    setStatus('جاري الإنشاء...');
    const enqueue = await apiRequest<any>(`/studio/projects/${projectId}/creative-board/enqueue`, {
      method: 'POST',
      body: { conceptTitle },
    });
    const direct = await apiRequest<BoardResponse>(`/studio/projects/${projectId}/creative-board`, { method: 'GET' });
    setBoard(direct.data || null);
    setStatus(enqueue.ok ? 'تم إرسال مهمة الاستديو وقراءة اللوحة الحالية.' : (enqueue.error || 'تعذر إرسال المهمة'));
  }

  async function createPack() {
    setStatus('جاري إرسال Asset Pack...');
    const res = await apiRequest<any>('/studio/assets/pack/enqueue', {
      method: 'POST',
      body: { conceptTitle, channels: ['onsite', 'social', 'board'] },
    });
    setStatus(res.ok ? 'تم إرسال مهمة Asset Pack إلى الطابور.' : (res.error || 'تعذر إرسال المهمة'));
  }

  return (
    <main className="container stack">
      <section className="card stack">
        <div className="badge">Creative Studio</div>
        <h1 style={{ margin: 0 }}>استديو أثيل الإبداعي</h1>
        <p className="muted" style={{ marginTop: 0 }}>لوحة تشغيل سريعة لرفع concept والسرد والأصول الإبداعية وربطها بالطابور الخلفي.</p>
        {status ? <div className="notice">{status}</div> : null}
        <form className="stack" onSubmit={buildBoard}>
          <div className="form-grid cols-2">
            <div>
              <label>Project ID</label>
              <input value={projectId} onChange={(e) => setProjectId(e.target.value)} />
            </div>
            <div>
              <label>Concept Title</label>
              <input value={conceptTitle} onChange={(e) => setConceptTitle(e.target.value)} />
            </div>
          </div>
          <div className="row">
            <button className="btn" type="submit">بناء Creative Board</button>
            <button className="btn btn-ghost" type="button" onClick={createPack}>إرسال Asset Pack</button>
          </div>
        </form>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>اللوحة الحالية</h2>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          {(board?.board?.pillars || []).map((pillar) => (
            <div key={pillar} className="card"><strong>{pillar}</strong></div>
          ))}
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {(board?.board?.recommendedDeliverables || []).map((x) => (
            <div key={x} className="card">{x}</div>
          ))}
        </div>
      </section>
    </main>
  );
}
