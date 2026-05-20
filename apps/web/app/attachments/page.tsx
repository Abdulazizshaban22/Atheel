'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';

type Attachment = { id: string; originalName: string; sizeBytes: number; storagePath: string; entityType?: string; entityId?: string; uploadedAt?: string };

export default function AttachmentsPage() {
  // Auth via HttpOnly cookies (no localStorage token)
  const [rows, setRows] = useState<Attachment[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ organizationId: 'org_demo_1', entityType: 'content', entityId: 'cnt_1' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    const res = await apiRequest<Attachment[]>('/attachments');
    if (!res.ok) return setErr(res.error || 'تعذر تحميل المرفقات');
    setRows(res.data || []); setErr('');
  }
  useEffect(() => { if (token) void load(); }, []);

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) return setErr('اختر ملفاً أولاً');
    const fd = new FormData();
    fd.append('file', file);
    const q = new URLSearchParams({ organizationId: form.organizationId, entityType: form.entityType, entityId: form.entityId });
    const res = await apiRequest(`/attachments/upload?${q.toString()}`, { method: 'POST', body: fd });
    if (!res.ok) return setErr(res.error || 'فشل رفع الملف');
    setMsg('تم رفع الملف'); setErr(''); setFile(null); await load();
  }

  return (
    <main className="container stack">
      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><div className="badge">Attachments</div><h1 style={{ margin: '8px 0 0' }}>المرفقات والملفات — أَثِيل</h1></div>
          <div className="row"><a className="btn btn-ghost" href="/login">Login</a><button className="btn" onClick={load}>تحديث</button></div>
        </div>
        {msg ? <div className="notice success">{msg}</div> : null}
        {err ? <div className="notice error">{err}</div> : null}
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>رفع ملف</h2>
        <form className="stack" onSubmit={onUpload}>
          <div className="form-grid cols-3">
            <div><label>organizationId</label><input value={form.organizationId} onChange={(e) => setForm({ ...form, organizationId: e.target.value })} /></div>
            <div><label>entityType</label><select value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value })}><option>content</option><option>project</option><option>experience</option></select></div>
            <div><label>entityId</label><input value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })} /></div>
          </div>
          <div className="kv"><label>الملف</label><input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
          <div className="row"><button className="btn" type="submit">رفع</button></div>
        </form>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>قائمة المرفقات</h2>
        <table>
          <thead><tr><th>الملف</th><th>الحجم</th><th>الربط</th><th>المسار</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.originalName}</td>
                <td>{r.sizeBytes}</td>
                <td>{r.entityType ? `${r.entityType}:${r.entityId}` : '-'}</td>
                <td><small>{r.storagePath}</small></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4}>لا توجد ملفات</td></tr>}
          </tbody>
        </table>
      </section>
    </main>
  );
}
