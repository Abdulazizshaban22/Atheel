'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';
import { getStoredUser, getToken } from '../../lib/session';

type Signal = { id: string; titleAr: string; taxonomyCode?: string | null; score: number; status: string };

type Competition = {
  id: string;
  titleAr: string;
  status: string;
  dueAt?: string | null;
  requirementsCount?: number;
  updatedAt?: string;
};

export default function CompetitionsPage() {
  const token = useMemo(() => getToken(), []);
  const user = useMemo(() => getStoredUser(), []);
  const orgId = (user?.orgIds?.[0] || 'org_demo_1') as string;

  const [items, setItems] = useState<Competition[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    organizationId: orgId,
    projectId: 'prj_1',
    titleAr: 'منافسة: فعالية ثقافية',
    code: 'RFP-001',
    dueAt: '',
    sourceSignalId: '',
  });

  useEffect(() => {
    setForm((p) => ({ ...p, organizationId: orgId }));
  }, [orgId]);

  async function load() {
    setLoading(true);
    setErrorMsg('');
    const res = await apiRequest<{ items: Competition[] }>(`/competitions?organizationId=${encodeURIComponent(form.organizationId)}&projectId=${encodeURIComponent(form.projectId)}`, { token });
    if (!res.ok) {
      setErrorMsg(res.error || 'فشل التحميل');
      setLoading(false);
      return;
    }
    setItems(((res.data as any)?.items || []) as Competition[]);

    // Wave49: signals list for linking competitions to a radar signal
    const sigRes = await apiRequest<{ items: Signal[] }>(`/radar/signals?organizationId=${encodeURIComponent(form.organizationId)}&projectId=${encodeURIComponent(form.projectId)}`, { token });
    if (sigRes.ok) setSignals(((sigRes.data as any)?.items || []) as Signal[]);

    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.organizationId, form.projectId]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setStatusMsg('');
    setErrorMsg('');
    const body: any = { ...form };
    if (!body.dueAt) delete body.dueAt;
    if (!body.sourceSignalId) delete body.sourceSignalId;
    const res = await apiRequest('/competitions', { method: 'POST', token, body });
    if (!res.ok) return setErrorMsg(res.error || 'فشل إنشاء المنافسة');
    setStatusMsg('تم إنشاء المنافسة');
    await load();
  }

  async function enqueueScan() {
    setStatusMsg('');
    setErrorMsg('');
    const res = await apiRequest('/radar/scan/enqueue', { method: 'POST', token, body: { organizationId: orgId } });
    if (!res.ok) return setErrorMsg(res.error || 'فشل تشغيل الرادار');
    setStatusMsg('تم إرسال مهمة رادار (Scan)');
  }

  async function scheduleScan() {
    setStatusMsg('');
    setErrorMsg('');
    const res = await apiRequest('/radar/scan/schedule', { method: 'POST', token, body: { organizationId: orgId, everyMinutes: 60 } });
    if (!res.ok) return setErrorMsg(res.error || 'فشل جدولة الرادار');
    setStatusMsg('تمت جدولة الرادار كل 60 دقيقة (يتطلب Redis + Worker)');
  }

  return (
    <AppShell
      title="الكراسات والمنافسات"
      subtitle="Wave26 — رفع كراسة + تحليل تلقائي لبنود الاستوديو + توزيع مسؤوليات + تصدير نطاق"
      badge={`Competitions: ${items.length}`}
      actions={
        <>
          <button className="btn btn-ghost" onClick={enqueueScan}>تشغيل رادار الآن</button>
          <button className="btn btn-ghost" onClick={scheduleScan}>جدولة الرادار</button>
          <button className="btn" onClick={load} disabled={loading}>{loading ? '...' : 'تحديث'}</button>
        </>
      }
    >
      {statusMsg ? <div className="notice success">{statusMsg}</div> : null}
      {errorMsg ? <div className="notice error">{errorMsg}</div> : null}

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>إنشاء منافسة</div>
        <form className="stack" onSubmit={create}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="stack" style={{ gap: 6 }}>
              <span className="muted">عنوان المنافسة</span>
              <input value={form.titleAr} onChange={(e) => setForm((p) => ({ ...p, titleAr: e.target.value }))} />
            </label>
            <label className="stack" style={{ gap: 6 }}>
              <span className="muted">الكود</span>
              <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
            </label>
            <label className="stack" style={{ gap: 6 }}>
              <span className="muted">ProjectId</span>
              <input value={form.projectId} onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value }))} />
            </label>
            <label className="stack" style={{ gap: 6 }}>
              <span className="muted">ربط بإشارة من الرادار (اختياري)</span>
              <select value={form.sourceSignalId} onChange={(e) => setForm((p) => ({ ...p, sourceSignalId: e.target.value }))}>
                <option value="">— بدون —</option>
                {signals.map((s) => (
                  <option key={s.id} value={s.id}>{s.titleAr} ({Number(s.score || 0).toFixed(2)})</option>
                ))}
              </select>
              <div className="muted" style={{ fontSize: 12 }}>يحفظ الرابط في المنافسة كـ sourceSignalId لتتبع مصدر الفكرة.</div>
            </label>
            <label className="stack" style={{ gap: 6 }}>
              <span className="muted">موعد التسليم (اختياري)</span>
              <input type="date" value={form.dueAt} onChange={(e) => setForm((p) => ({ ...p, dueAt: e.target.value }))} />
            </label>
          </div>
          <button className="btn" type="submit">إنشاء</button>
        </form>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>قائمة المنافسات</div>
        <div className="stack">
          {items.map((c) => (
            <a key={c.id} className="card" href={`/competitions/${c.id}`} style={{ textDecoration: 'none' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="stack" style={{ gap: 4 }}>
                  <div style={{ fontWeight: 900 }}>{c.titleAr}</div>
                  <div className="muted">الحالة: {c.status} {c.dueAt ? `| التسليم: ${String(c.dueAt).slice(0,10)}` : ''}</div>
                </div>
                <div className="badge">بنود: {c.requirementsCount ?? 0}</div>
              </div>
            </a>
          ))}
          {!items.length ? <div className="muted">لا توجد منافسات بعد</div> : null}
        </div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>ملاحظة تشغيلية</div>
        <div className="muted">
          التحليل التلقائي للكراسات والرادار المستمر يتطلب تشغيل Redis + Worker مع ضبط WORKER_TOKEN.
        </div>
      </section>
    </AppShell>
  );
}
