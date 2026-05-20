'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';
import { AppShell } from '../../components/AppShell';

type AuditLog = {
  id: string;
  organizationId?: string;
  actorUserId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  severity?: 'info' | 'warning' | 'critical';
  message?: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
};

export default function AuditLogsPage() {
  // Auth via HttpOnly cookies (no localStorage token)
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState({ organizationId: 'org_demo_1', entityType: '', entityId: '', severity: '', q: '' });
  const [form, setForm] = useState({
    organizationId: 'org_demo_1',
    action: 'manual.note',
    entityType: 'project',
    entityId: 'prj_1',
    severity: 'info' as 'info' | 'warning' | 'critical',
    message: 'تغيير اختباري يدوي',
    before: '{"status":"draft"}',
    after: '{"status":"in_progress"}'});

  async function load() {
    setLoading(true);
    setErr('');
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => { if (v) params.set(k, v); });
    const res = await apiRequest<AuditLog[]>(`/audit-logs?${params.toString()}`);
    if (!res.ok) setErr(res.error || 'تعذر تحميل سجل التدقيق');
    else setRows(res.data || []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function createLog(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setMsg('');
    let before: unknown = undefined;
    let after: unknown = undefined;
    try { before = form.before ? JSON.parse(form.before) : undefined; } catch { setErr('حقل before ليس JSON صالحًا'); return; }
    try { after = form.after ? JSON.parse(form.after) : undefined; } catch { setErr('حقل after ليس JSON صالحًا'); return; }

    const res = await apiRequest<AuditLog>('/audit-logs', {
      method: 'POST',
      body: {
        organizationId: form.organizationId || undefined,
        action: form.action,
        entityType: form.entityType || undefined,
        entityId: form.entityId || undefined,
        severity: form.severity || undefined,
        message: form.message || undefined,
        before,
        after}});
    if (!res.ok) { setErr(res.error || 'فشل إنشاء السجل'); return; }
    setMsg('تم إنشاء سجل التدقيق');
    await load();
  }

  return (
    <AppShell
      title="سجل التدقيق"
      subtitle="فلترة السجلات وإنشاء سجل تجريبي يدوي مع عرض before/after"
      badge="Audit Logs"
      actions={<button className="btn btn-ghost" onClick={load} disabled={loading}>{loading ? 'جاري التحميل...' : 'تحديث'}</button>}
    >
      <section className="grid grid-2">
        <section className="card stack">
          <h2 style={{ margin: 0 }}>فلاتر البحث</h2>
          {err ? <div className="notice error">{err}</div> : null}
          {msg ? <div className="notice success">{msg}</div> : null}
          <div className="form-grid cols-2">
            <div><label>organizationId</label><input value={filter.organizationId} onChange={(e) => setFilter({ ...filter, organizationId: e.target.value })} /></div>
            <div><label>severity</label>
              <select value={filter.severity} onChange={(e) => setFilter({ ...filter, severity: e.target.value })}>
                <option value="">الكل</option>
                <option value="info">info</option>
                <option value="warning">warning</option>
                <option value="critical">critical</option>
              </select>
            </div>
            <div><label>entityType</label><input value={filter.entityType} onChange={(e) => setFilter({ ...filter, entityType: e.target.value })} /></div>
            <div><label>entityId</label><input value={filter.entityId} onChange={(e) => setFilter({ ...filter, entityId: e.target.value })} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label>q</label><input value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} placeholder="بحث في action أو message" /></div>
          </div>
          <button className="btn" onClick={load}>تطبيق الفلاتر</button>
        </section>

        <section className="card stack">
          <h2 style={{ margin: 0 }}>إنشاء سجل تجريبي</h2>
          <form className="stack" onSubmit={createLog}>
            <div className="form-grid cols-2">
              <div><label>organizationId</label><input value={form.organizationId} onChange={(e) => setForm({ ...form, organizationId: e.target.value })} /></div>
              <div><label>severity</label>
                <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as 'info' | 'warning' | 'critical' })}>
                  <option value="info">info</option>
                  <option value="warning">warning</option>
                  <option value="critical">critical</option>
                </select>
              </div>
              <div><label>action</label><input value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} /></div>
              <div><label>entityType</label><input value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value })} /></div>
              <div><label>entityId</label><input value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })} /></div>
              <div><label>message</label><input value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
            </div>
            <div><label>before (JSON)</label><textarea rows={4} value={form.before} onChange={(e) => setForm({ ...form, before: e.target.value })} /></div>
            <div><label>after (JSON)</label><textarea rows={4} value={form.after} onChange={(e) => setForm({ ...form, after: e.target.value })} /></div>
            <button className="btn" type="submit">إضافة سجل</button>
          </form>
        </section>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>السجلات</h2>
        <table>
          <thead>
            <tr>
              <th>الوقت</th>
              <th>الشدة</th>
              <th>الإجراء</th>
              <th>الكيان</th>
              <th>الرسالة</th>
              <th>التغييرات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><small>{String(r.createdAt)}</small></td>
                <td>{r.severity || 'info'}</td>
                <td>{r.action}</td>
                <td>{r.entityType || '-'} / {r.entityId || '-'}</td>
                <td>{r.message || '-'}</td>
                <td>
                  <details>
                    <summary>عرض JSON</summary>
                    <pre className="code">{JSON.stringify({ before: r.before, after: r.after }, null, 2)}</pre>
                  </details>
                </td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={6}>لا توجد سجلات</td></tr> : null}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
