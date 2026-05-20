'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';

type Approval = { id: string; organizationId: string; entityType: string; entityId: string; title: string; status: string; updatedAt?: string; currentApproverId?: string | null; dueAt?: string | null };

type RoutingSim = {
  ok: boolean;
  selected?: { userId: string; score: number; breakdown: any } | null;
  candidates?: Array<{ userId: string; score: number; breakdown: any }>;
  error?: string;
};

export default function ApprovalsPage() {
  const [rows, setRows] = useState<Approval[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [sim, setSim] = useState<RoutingSim | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const [form, setForm] = useState({
    organizationId: 'org_demo_1',
    entityType: 'content',
    entityId: 'cnt_1',
    title: 'اعتماد نص تعريفي',
    dueAt: '',
    contextViolationType: '',
    contextDomain: '',
    contextRegion: '',
    // optional manual override
    manualApproverId: '',
  });

  async function load() {
    const res = await apiRequest<Approval[]>('/approvals');
    if (!res.ok) return setErr(res.error || 'تعذر تحميل الموافقات');
    setRows(res.data || []);
    setErr('');
  }

  useEffect(() => {
    void load();
  }, []);

  async function createRow(e: FormEvent) {
    e.preventDefault();
    const res = await apiRequest('/approvals', { method: 'POST', body: { ...form, dueAt: form.dueAt || undefined } });
    if (!res.ok) return setErr(res.error || 'فشل إنشاء طلب الموافقة');
    setMsg('تم إنشاء طلب الموافقة');
    setErr('');
    await load();
  }

  async function simulateRouting() {
    setSimLoading(true);
    setSim(null);
    const q = new URLSearchParams({
      organizationId: form.organizationId,
      entityType: form.entityType,
      entityId: form.entityId,
      contextViolationType: form.contextViolationType,
      contextDomain: form.contextDomain,
      contextRegion: form.contextRegion,
    });
    const res = await apiRequest<any>(`/ops/approvals/routing/simulate?${q.toString()}`);
    if (!res.ok) {
      setSim({ ok: false, error: res.error || 'تعذر محاكاة التوجيه' });
      setSimLoading(false);
      return;
    }
    setSim(res.data as any);
    setSimLoading(false);
  }

  async function action(id: string, path: string) {
    let body: any = {};

    if (path === 'submit') {
      // Wave45: Auto-routing افتراضيًا (لا نرسل currentApproverId)
      if (form.manualApproverId.trim()) body = { currentApproverId: form.manualApproverId.trim() };
    } else if (path === 'approve') {
      const note = window.prompt('اكتب سبب الاعتماد بشكل مختصر') || '';
      body = { note };
    } else if (path === 'reject') {
      const note = window.prompt('اكتب سبب الرفض بشكل مختصر') || '';
      body = { note };
    } else if (path === 'request-changes') {
      const changes = window.prompt('اكتب التعديلات المطلوبة بشكل واضح') || '';
      body = { changes };
    }

    const res = await apiRequest(`/approvals/${id}/${path}`, { method: 'POST', body });
    if (!res.ok) return setErr(res.error || `فشل ${path}`);
    setMsg(`تم ${path}`);
    setErr('');
    await load();
  }

  return (
    <main className="container stack">
      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="badge">Approvals + Auto-Routing</div>
            <h1 style={{ margin: '8px 0 0' }}>سير الموافقات الثقافي — أَثِيل</h1>
            <div className="muted">Wave45: توجيه تلقائي + مصفوفة مهارات + قياس حمل العمل</div>
          </div>
          <div className="row">
            <a className="btn btn-ghost" href="/login">Login</a>
            <button className="btn" onClick={load}>تحديث</button>
          </div>
        </div>
        {msg ? <div className="notice success">{msg}</div> : null}
        {err ? <div className="notice error">{err}</div> : null}
      </section>

      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>إنشاء طلب موافقة</h2>
          <button className="btn btn-ghost" onClick={simulateRouting} disabled={simLoading}>
            {simLoading ? 'جاري المحاكاة...' : 'محاكاة التوجيه'}
          </button>
        </div>

        {sim?.ok ? (
          <div className="notice">
            <div><strong>المراجع المقترح:</strong> {sim.selected?.userId || '-'} (score: {Number(sim.selected?.score || 0).toFixed(2)})</div>
            <div className="muted">تظهر المحاكاة فقط إذا كان لديك صلاحية org_admin/super_admin.</div>
          </div>
        ) : sim?.error ? (
          <div className="notice">{sim.error}</div>
        ) : null}

        <form className="form-grid cols-3" onSubmit={createRow}>
          <div><label>organizationId</label><input value={form.organizationId} onChange={(e) => setForm({ ...form, organizationId: e.target.value })} /></div>
          <div><label>entityType</label><select value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value })}><option>content</option><option>project</option><option>experience</option></select></div>
          <div><label>entityId</label><input value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })} /></div>
          <div><label>العنوان</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label>dueAt</label><input type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></div>
          <div><label>violationType (اختياري)</label><input value={form.contextViolationType} onChange={(e) => setForm({ ...form, contextViolationType: e.target.value })} placeholder="height / heritage / safety" /></div>
          <div><label>domain (اختياري)</label><input value={form.contextDomain} onChange={(e) => setForm({ ...form, contextDomain: e.target.value })} placeholder="culture / heritage / urban" /></div>
          <div><label>region (اختياري)</label><input value={form.contextRegion} onChange={(e) => setForm({ ...form, contextRegion: e.target.value })} placeholder="taif / riyadh / jeddah" /></div>
          <div>
            <label>manualApproverId (اختياري)</label>
            <input placeholder="اتركه فارغ للتوجيه التلقائي" value={form.manualApproverId} onChange={(e) => setForm({ ...form, manualApproverId: e.target.value })} />
          </div>
          <div className="row" style={{ alignItems: 'end' }}><button className="btn" type="submit">إنشاء</button></div>
        </form>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>قائمة الطلبات</h2>
        <table>
          <thead><tr><th>العنوان</th><th>الكيان</th><th>الحالة</th><th>المراجع الحالي</th><th>الاستحقاق</th><th>إجراءات</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.entityType}:{r.entityId}</td>
                <td>{r.status}</td>
                <td>{r.currentApproverId || '-'}</td>
                <td>{r.dueAt || '-'}</td>
                <td>
                  <div className="row">
                    <button className="btn btn-ghost" onClick={() => action(r.id, 'submit')}>إرسال</button>
                    <button className="btn btn-secondary" onClick={() => action(r.id, 'approve')}>اعتماد</button>
                    <button className="btn btn-danger" onClick={() => action(r.id, 'reject')}>رفض</button>
                    <button className="btn btn-ghost" onClick={() => action(r.id, 'request-changes')}>طلب تعديلات</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6}>لا توجد طلبات</td></tr>}
          </tbody>
        </table>
      </section>
    </main>
  );
}
