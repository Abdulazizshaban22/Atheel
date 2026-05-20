'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest, getApiBase } from '../../lib/api';
import { getToken, getStoredUser } from '../../lib/session';

export default function IiifPage() {
  const token = useMemo(() => getToken(), []);
  const user = useMemo(() => getStoredUser(), []);
  const orgId = (user?.orgIds?.[0] || 'org_demo_1') as string;

  const [items, setItems] = useState<any[]>([]);
  const [labelAr, setLabelAr] = useState('');
  const [labelEn, setLabelEn] = useState('');
  const [attachmentIds, setAttachmentIds] = useState('');
  const [fulltextAr, setFulltextAr] = useState('');

  async function load() {
    const res = await apiRequest<any>(`/iiif/manifests?organizationId=${encodeURIComponent(orgId)}`, { token });
    setItems(res.data?.items || []);
  }

  async function create() {
    const ids = attachmentIds
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    if (!labelAr.trim()) return alert('اكتب عنوان عربي');
    if (!ids.length) return alert('أدخل attachmentIds مفصولة بفواصل');

    const res = await apiRequest<any>('/iiif/manifests', {
      method: 'POST',
      token,
      body: {
        organizationId: orgId,
        labelAr: labelAr.trim(),
        labelEn: labelEn.trim() || undefined,
        attachmentIds: ids,
        fulltextAr: fulltextAr.trim() || undefined,
      },
    });

    if (!res.ok) return alert(res.error || 'فشل الإنشاء');
    setLabelAr('');
    setLabelEn('');
    setAttachmentIds('');
    setFulltextAr('');
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell
      title="IIIF والمخطوطات"
      subtitle="توليد IIIF Presentation 3 Manifests + بحث نصي (Content Search)"
      badge={`Manifests: ${items.length}`}
    >
      <section className="card stack">
        <div style={{ fontWeight: 900 }}>إنشاء Manifest</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="العنوان العربي" value={labelAr} onChange={(e) => setLabelAr(e.target.value)} />
          <input className="input" placeholder="العنوان الإنجليزي (اختياري)" value={labelEn} onChange={(e) => setLabelEn(e.target.value)} />
        </div>
        <input
          className="input"
          placeholder="attachmentIds (مثال: att_123, att_456)"
          value={attachmentIds}
          onChange={(e) => setAttachmentIds(e.target.value)}
        />
        <textarea
          className="input"
          style={{ minHeight: 90 }}
          placeholder="fulltextAr (اختياري) - نص كامل للبحث"
          value={fulltextAr}
          onChange={(e) => setFulltextAr(e.target.value)}
        />
        <div className="row" style={{ gap: 10 }}>
          <button className="btn" onClick={create}>إنشاء</button>
          <button className="btn btn-ghost" onClick={load}>تحديث</button>
        </div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>القائمة</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 10 }}>
          {items.map((m) => {
            const manifestUrl = `${getApiBase()}/iiif/manifests/${encodeURIComponent(m.id)}/manifest.json`;
            const searchUrl = `${getApiBase()}/iiif/manifests/${encodeURIComponent(m.id)}/search?q=${encodeURIComponent('ال')}`;
            return (
              <div key={m.id} className="card stack">
                <div className="badge">{m.id}</div>
                <div style={{ fontWeight: 800 }}>{m.labelAr}</div>
                <div className="muted">Attachments: {(m.attachmentIds || []).length}</div>
                <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                  <a className="btn btn-ghost" href={manifestUrl} target="_blank" rel="noreferrer">manifest.json</a>
                  <a className="btn btn-ghost" href={searchUrl} target="_blank" rel="noreferrer">search sample</a>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
