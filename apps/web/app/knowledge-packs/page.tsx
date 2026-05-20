'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';
import { getStoredUser, getToken } from '../../lib/session';

export default function KnowledgePacksPage() {
  const token = useMemo(() => getToken(), []);
  const user = useMemo(() => getStoredUser(), []);
  const orgId = (user?.orgIds?.[0] || 'org_demo_1') as string;
  const projectId = 'prj_1';

  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function load() {
    const res = await apiRequest<any>('/knowledge-packs', { token });
    if (!res.ok) return setErrorMsg(res.error || 'فشل التحميل');
    setItems(res.data?.items || []);
  }

  async function preview(id: string) {
    setSelected(null);
    const res = await apiRequest<any>(`/knowledge-packs/preview/${encodeURIComponent(id)}`, { token });
    if (!res.ok) return setErrorMsg(res.error || 'فشل');
    setSelected(res.data?.item || null);
  }

  async function seed(packIds?: string[]) {
    setStatusMsg('');
    setErrorMsg('');
    const res = await apiRequest<any>('/knowledge-packs/seed', {
      method: 'POST',
      token,
      body: { organizationId: orgId, projectId, packIds },
    });
    if (!res.ok) return setErrorMsg(res.error || 'فشل');
    setStatusMsg(`تمت التغذية: ${(res.data as any)?.seeded || 0} حزمة`);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell
      title="حزم المعرفة"
      subtitle="تغذية سريعة لقاعدة المعرفة (RAG) بالمراجع المعيارية + الثقافة السعودية + المنافسين + فهرس الأبحاث"
      badge={`Packs: ${items.length}`}
      actions={<button className="btn" onClick={() => seed()}>تغذية كل الحزم</button>}
    >
      {statusMsg ? <div className="notice success">{statusMsg}</div> : null}
      {errorMsg ? <div className="notice error">{errorMsg}</div> : null}

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>القائمة</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 10 }}>
          {items.map((p) => (
            <div key={p.id} className="card stack">
              <div className="badge">{p.id}</div>
              <div style={{ fontWeight: 800 }}>{p.titleAr}</div>
              <div className="muted">Tags: {(p.tags || []).join(', ')}</div>
              <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={() => preview(p.id)}>عرض</button>
                <button className="btn" onClick={() => seed([p.id])}>تغذية</button>
              </div>
              {Array.isArray(p.sourceRefs) && p.sourceRefs.length ? (
                <div className="muted" style={{ fontSize: 12 }}>
                  مصادر: {p.sourceRefs.slice(0, 2).join(' | ')}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {selected ? (
        <section className="card stack">
          <div style={{ fontWeight: 900 }}>{selected.titleAr}</div>
          <div className="muted">Tags: {(selected.tags || []).join(', ')}</div>
          <div className="muted">Sources: {(selected.sourceRefs || []).join(' | ')}</div>
          <pre className="notice" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{selected.text}</pre>
        </section>
      ) : null}
    </AppShell>
  );
}
