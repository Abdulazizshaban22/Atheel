'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';
import { getStoredUser, getToken } from '../../lib/session';

type Signal = {
  id: string;
  titleAr: string;
  taxonomyCode?: string | null;
  regionCode?: string | null;
  score: number;
  status: string;
  officialPriority: number;
  communityInterest: number;
  productionFeasibility: number;
  lossRisk: number;
};

export default function RadarPage() {
  const token = useMemo(() => getToken(), []);
  const user = useMemo(() => getStoredUser(), []);
  const orgId = (user?.orgIds?.[0] || 'org_demo_1') as string;

  const [signals, setSignals] = useState<Signal[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    organizationId: orgId,
    projectId: 'prj_1',
    titleAr: 'إشارة ثقافية: تجربة القهوة السعودية',
    descriptionAr: 'فكرة برنامج/فعالية مرتبطة بالقهوة السعودية والموروث المحلي.',
    taxonomyCode: 'theme:Coffee',
    regionCode: 'region:Jazan',
    officialPriority: 0.8,
    communityInterest: 0.7,
    productionFeasibility: 0.75,
    lossRisk: 0.4,
  });

  useEffect(() => {
    setForm((p) => ({ ...p, organizationId: orgId }));
  }, [orgId]);

  async function load() {
    setLoading(true);
    setErrorMsg('');
    const res = await apiRequest<{ items: Signal[] }>(`/radar/signals?organizationId=${encodeURIComponent(form.organizationId)}&projectId=${encodeURIComponent(form.projectId)}`, { token });
    if (!res.ok) {
      setErrorMsg(res.error || 'فشل التحميل');
      setLoading(false);
      return;
    }
    setSignals((res.data as any)?.items || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.organizationId, form.projectId]);

  async function seedTaxonomy() {
    setStatusMsg('');
    setErrorMsg('');
    const res = await apiRequest('/radar/taxonomy/seed', { method: 'POST', token, body: { organizationId: form.organizationId } });
    if (!res.ok) return setErrorMsg(res.error || 'فشل التهيئة');
    setStatusMsg('تم تهيئة التصنيف السعودي بنجاح');
  }

  async function createSignal(e: FormEvent) {
    e.preventDefault();
    setStatusMsg('');
    setErrorMsg('');
    const res = await apiRequest('/radar/signals', { method: 'POST', token, body: form });
    if (!res.ok) return setErrorMsg(res.error || 'فشل إنشاء الإشارة');
    setStatusMsg('تم إنشاء الإشارة');
    await load();
  }

  async function score(id: string) {
    const res = await apiRequest(`/radar/signals/${id}/score`, { method: 'POST', token, body: { recompute: true } });
    if (!res.ok) return setErrorMsg(res.error || 'فشل التقييم');
    setStatusMsg('تم تحديث الدرجة');
    await load();
  }

  async function convert(id: string) {
    const res = await apiRequest(`/radar/signals/${id}/convert`, {
      method: 'POST',
      token,
      body: { organizationId: form.organizationId, projectId: form.projectId, createEntity: true },
    });
    if (!res.ok) return setErrorMsg(res.error || 'فشل التحويل');
    const instanceId = (res.data as any)?.workflow?.instance?.id;
    setStatusMsg(instanceId ? `تم التحويل إلى Workflow Instance: ${instanceId}` : 'تم التحويل');
    await load();
  }

  return (
    <AppShell
      title="رادار الثقافة"
      subtitle="Wave21 — إشارات ثقافية + Signal Scoring + تحويل مباشر إلى Workflow Instance"
      badge={`Signals: ${signals.length}`}
      actions={
        <>
          <button className="btn btn-ghost" onClick={seedTaxonomy}>تهيئة التصنيف</button>
          <button className="btn" onClick={load} disabled={loading}>{loading ? '...' : 'تحديث'}</button>
        </>
      }
    >
      {statusMsg ? <div className="notice success">{statusMsg}</div> : null}
      {errorMsg ? <div className="notice error">{errorMsg}</div> : null}

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>إضافة إشارة</div>
        <form className="stack" onSubmit={createSignal}>
          <div className="form-grid cols-3">
            <div><label>organizationId</label><input className="input" value={form.organizationId} onChange={(e) => setForm({ ...form, organizationId: e.target.value })} /></div>
            <div><label>projectId</label><input className="input" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} /></div>
            <div><label>taxonomyCode</label><input className="input" value={form.taxonomyCode} onChange={(e) => setForm({ ...form, taxonomyCode: e.target.value })} /></div>
          </div>
          <div className="kv"><label>العنوان</label><input className="input" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} /></div>
          <div className="kv"><label>الوصف</label><textarea className="input" value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} /></div>

          <div className="form-grid cols-4">
            <div><label>officialPriority</label><input className="input" type="number" step="0.05" value={form.officialPriority} onChange={(e) => setForm({ ...form, officialPriority: Number(e.target.value) })} /></div>
            <div><label>communityInterest</label><input className="input" type="number" step="0.05" value={form.communityInterest} onChange={(e) => setForm({ ...form, communityInterest: Number(e.target.value) })} /></div>
            <div><label>productionFeasibility</label><input className="input" type="number" step="0.05" value={form.productionFeasibility} onChange={(e) => setForm({ ...form, productionFeasibility: Number(e.target.value) })} /></div>
            <div><label>lossRisk</label><input className="input" type="number" step="0.05" value={form.lossRisk} onChange={(e) => setForm({ ...form, lossRisk: Number(e.target.value) })} /></div>
          </div>

          <div className="row"><button className="btn" type="submit">إضافة</button></div>
        </form>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>الإشارات</div>
        <table>
          <thead>
            <tr><th>العنوان</th><th>التصنيف</th><th>الدرجة</th><th>الحالة</th><th>إجراءات</th></tr>
          </thead>
          <tbody>
            {signals.map((s) => (
              <tr key={s.id}>
                <td><a href={`/radar/signals/${s.id}`} style={{ textDecoration: 'none' }}>{s.titleAr}</a></td>
                <td className="muted">{s.taxonomyCode || '-'}</td>
                <td>{Number(s.score || 0).toFixed(3)}</td>
                <td>{s.status}</td>
                <td>
                  <div className="row">
                    <button className="btn btn-ghost" onClick={() => score(s.id)}>تقييم</button>
                    <button className="btn" onClick={() => convert(s.id)}>تحويل لمسار</button>
                  </div>
                </td>
              </tr>
            ))}
            {!signals.length ? <tr><td colSpan={5}>لا توجد إشارات بعد</td></tr> : null}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
