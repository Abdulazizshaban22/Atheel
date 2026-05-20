'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest, getApiBase } from '../../lib/api';
import { getToken, getStoredUser } from '../../lib/session';

function safeParseJson(input: string) {
  const t = (input || '').trim();
  if (!t) return undefined;
  try {
    return JSON.parse(t);
  } catch {
    throw new Error('JSON غير صالح');
  }
}

export default function ContentCredentialsPage() {
  const token = useMemo(() => getToken(), []);
  const user = useMemo(() => getStoredUser(), []);
  const orgId = (user?.orgIds?.[0] || 'org_demo_1') as string;

  const [items, setItems] = useState<any[]>([]);

  const [attachmentId, setAttachmentId] = useState('');
  const [noteAr, setNoteAr] = useState('');

  const [subjectType, setSubjectType] = useState<'attachment' | 'external' | 'text'>('external');
  const [subjectId, setSubjectId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [sha256, setSha256] = useState('');
  const [manualNoteAr, setManualNoteAr] = useState('');
  const [manifestJsonRaw, setManifestJsonRaw] = useState('');

  async function load() {
    const res = await apiRequest<any>(`/content-credentials?organizationId=${encodeURIComponent(orgId)}`, { token });
    setItems(res.data?.items || []);
  }

  async function createFromAttachment() {
    if (!attachmentId.trim()) return alert('أدخل attachmentId');
    const res = await apiRequest<any>(`/content-credentials/from-attachment/${encodeURIComponent(attachmentId.trim())}`, {
      method: 'POST',
      token,
      body: { organizationId: orgId, noteAr: noteAr.trim() || undefined, createdByUserId: user?.sub || undefined },
    });
    if (!res.ok) return alert(res.error || 'فشل الإنشاء');
    setAttachmentId('');
    setNoteAr('');
    await load();
  }

  async function createManual() {
    if (!subjectId.trim()) return alert('أدخل subjectId');

    let manifestJson: any = undefined;
    try {
      manifestJson = safeParseJson(manifestJsonRaw);
    } catch (e: any) {
      return alert(e.message || 'JSON غير صالح');
    }

    const res = await apiRequest<any>('/content-credentials', {
      method: 'POST',
      token,
      body: {
        organizationId: orgId,
        subjectType,
        subjectId: subjectId.trim(),
        subjectName: subjectName.trim() || undefined,
        sha256: sha256.trim() || undefined,
        noteAr: manualNoteAr.trim() || undefined,
        manifestJson,
        createdByUserId: user?.sub || undefined,
      },
    });

    if (!res.ok) return alert(res.error || 'فشل الإنشاء');

    setSubjectId('');
    setSubjectName('');
    setSha256('');
    setManualNoteAr('');
    setManifestJsonRaw('');
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell
      title="بصمة المحتوى"
      subtitle="Content Credentials (C2PA-inspired) مع manifest.json لكل أصل"
      badge={`Credentials: ${items.length}`}
    >
      <section className="card stack">
        <div style={{ fontWeight: 900 }}>إنشاء من مرفق</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="attachmentId" value={attachmentId} onChange={(e) => setAttachmentId(e.target.value)} />
          <input className="input" placeholder="ملاحظة (اختياري)" value={noteAr} onChange={(e) => setNoteAr(e.target.value)} />
          <button className="btn" onClick={createFromAttachment}>إنشاء</button>
        </div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>إنشاء يدوي</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <select className="input" value={subjectType} onChange={(e) => setSubjectType(e.target.value as any)}>
            <option value="external">external</option>
            <option value="text">text</option>
            <option value="attachment">attachment</option>
          </select>
          <input className="input" placeholder="subjectId" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
          <input className="input" placeholder="subjectName (اختياري)" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
          <input className="input" placeholder="sha256 (اختياري)" value={sha256} onChange={(e) => setSha256(e.target.value)} />
        </div>
        <input className="input" placeholder="ملاحظة (اختياري)" value={manualNoteAr} onChange={(e) => setManualNoteAr(e.target.value)} />
        <textarea
          className="input"
          style={{ minHeight: 110 }}
          placeholder="manifestJson (اختياري) - إذا تركته فاضي النظام يبني Manifest تلقائيًا"
          value={manifestJsonRaw}
          onChange={(e) => setManifestJsonRaw(e.target.value)}
        />
        <div className="row" style={{ gap: 10 }}>
          <button className="btn" onClick={createManual}>إنشاء</button>
          <button className="btn btn-ghost" onClick={load}>تحديث</button>
        </div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>القائمة</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 10 }}>
          {items.map((c) => {
            const manifestUrl = `${getApiBase()}/content-credentials/${encodeURIComponent(c.id)}/manifest.json`;
            return (
              <div key={c.id} className="card stack">
                <div className="badge">{c.id}</div>
                <div style={{ fontWeight: 800 }}>{c.subjectName || c.subjectId}</div>
                <div className="muted">type: {c.subjectType} | sha256: {(c.sha256 || '').slice(0, 16)}{c.sha256 ? '…' : ''}</div>
                {c.noteAr ? <div className="muted">{c.noteAr}</div> : null}
                <div className="row" style={{ gap: 10 }}>
                  <a className="btn btn-ghost" href={manifestUrl} target="_blank" rel="noreferrer">manifest.json</a>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
