'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../../../components/AppShell';
import { apiRequest } from '../../../../lib/api';
import { getStoredUser, getToken } from '../../../../lib/session';

type Evidence = {
  id: string;
  sourceTitle: string;
  sourceUrl?: string | null;
  snippetAr?: string | null;
  weight: number;
  createdAt?: string;
};

type Signal = {
  id: string;
  organizationId?: string | null;
  projectId?: string | null;
  titleAr: string;
  descriptionAr?: string | null;
  taxonomyCode?: string | null;
  regionCode?: string | null;
  score: number;
  status: string;
  officialPriority: number;
  communityInterest: number;
  productionFeasibility: number;
  lossRisk: number;
  metaJson?: any;
  evidence?: Evidence[];
};

type SignalChange = {
  id: string;
  changeType: string;
  actor: string;
  detectedAt: string;
  diffJson?: any;
};

type WorkflowTemplate = {
  id: string;
  code?: string;
  nameAr?: string;
  domain?: string;
  intent?: string;
  trigger?: string;
  complexity?: string;
};

function mapThemeToDomain(taxonomyCode?: string | null) {
  const raw = String(taxonomyCode || '');
  const theme = raw.startsWith('theme:') ? raw.slice('theme:'.length) : raw;
  const t = theme.toLowerCase();
  if (t.includes('coffee')) return 'food_culture';
  if (t.includes('craft')) return 'artisan';
  if (t.includes('unesco_intangible')) return 'heritage';
  if (t.includes('poetry') || t.includes('story')) return 'literature';
  if (t.includes('music') || t.includes('performance')) return 'performance';
  if (t.includes('architecture')) return 'destination';
  return 'events';
}

export default function RadarSignalDetailPage({ params }: { params: { id: string } }) {
  const token = useMemo(() => getToken(), []);
  const user = useMemo(() => getStoredUser(), []);
  const orgId = (user?.orgIds?.[0] || 'org_demo_1') as string;

  const [signal, setSignal] = useState<Signal | null>(null);
  const [changes, setChanges] = useState<SignalChange[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [createEntity, setCreateEntity] = useState(true);

  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [evidenceForm, setEvidenceForm] = useState({
    sourceTitle: 'مرجع',
    sourceUrl: '',
    snippetAr: '',
    weight: 1,
  });

  async function loadAll() {
    setLoading(true);
    setErrorMsg('');
    setStatusMsg('');
    const id = encodeURIComponent(params.id);

    const sigRes = await apiRequest<{ ok: boolean; item: Signal }>(`/radar/signals/${id}`, { token });
    if (!sigRes.ok) {
      setErrorMsg(sigRes.error || 'فشل تحميل الإشارة');
      setLoading(false);
      return;
    }
    const s = (sigRes.data as any)?.item as Signal;
    setSignal(s);

    const chRes = await apiRequest<{ items: SignalChange[] }>(`/radar/signals/${id}/changes?limit=50`, { token });
    if (chRes.ok) setChanges(((chRes.data as any)?.items || []) as SignalChange[]);

    // load templates for this signal domain (optional)
    const domain = mapThemeToDomain(s?.taxonomyCode);
    const tplRes = await apiRequest<any>(`/workflows/catalog?domain=${encodeURIComponent(domain)}&intent=curation_programming&trigger=manual_request&complexity=standard&limit=20`, { token });
    if (tplRes.ok) {
      const items: WorkflowTemplate[] = ((tplRes.data as any)?.items || []) as any;
      setTemplates(items);
      if (!selectedTemplateId && items?.[0]?.id) setSelectedTemplateId(items[0].id);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function addEvidence(e: FormEvent) {
    e.preventDefault();
    setStatusMsg('');
    setErrorMsg('');
    const id = encodeURIComponent(params.id);

    const body: any = {
      sourceTitle: evidenceForm.sourceTitle,
      weight: Number(evidenceForm.weight || 1),
    };
    if (evidenceForm.sourceUrl) body.sourceUrl = evidenceForm.sourceUrl;
    if (evidenceForm.snippetAr) body.snippetAr = evidenceForm.snippetAr;

    const res = await apiRequest(`/radar/signals/${id}/evidence`, { method: 'POST', token, body });
    if (!res.ok) return setErrorMsg(res.error || 'فشل إضافة الدليل');
    setStatusMsg('تمت إضافة الدليل وتم تحديث الدرجة');
    setEvidenceForm((p) => ({ ...p, snippetAr: '' }));
    await loadAll();
  }

  async function convert() {
    setStatusMsg('');
    setErrorMsg('');
    const id = encodeURIComponent(params.id);
    const res = await apiRequest<any>(`/radar/signals/${id}/convert`, {
      method: 'POST',
      token,
      body: {
        organizationId: signal?.organizationId || orgId,
        projectId: signal?.projectId || 'prj_1',
        createEntity,
        templateId: selectedTemplateId || undefined,
      },
    });
    if (!res.ok) return setErrorMsg(res.error || 'فشل التحويل');
    const instanceId = (res.data as any)?.workflow?.instance?.id;
    setStatusMsg(instanceId ? `تم التحويل إلى مسار تشغيلي (Workflow Instance): ${instanceId}` : 'تم التحويل');
    await loadAll();
  }

  return (
    <AppShell
      title="تفاصيل الإشارة"
      subtitle="Wave49 — الأدلة + سجل التغييرات + تحويل مع اختيار قالب"
      badge={signal ? `Score: ${Number(signal.score || 0).toFixed(3)} | Status: ${signal.status}` : '...'}
      actions={
        <>
          <a className="btn btn-ghost" href="/radar">رجوع</a>
          <button className="btn" onClick={loadAll} disabled={loading}>{loading ? '...' : 'تحديث'}</button>
        </>
      }
    >
      {statusMsg ? <div className="notice success">{statusMsg}</div> : null}
      {errorMsg ? <div className="notice error">{errorMsg}</div> : null}

      {!signal ? (
        <section className="card">{loading ? 'تحميل...' : 'غير موجود'}</section>
      ) : (
        <>
          <section className="card stack">
            <div style={{ fontWeight: 900 }}>{signal.titleAr}</div>
            <div className="muted">التصنيف: {signal.taxonomyCode || '-'} | المنطقة: {signal.regionCode || '-'} | projectId: {signal.projectId || '-'}</div>
            {signal.descriptionAr ? <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{signal.descriptionAr}</div> : null}

            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <span className="badge">أولوية رسمية: {Number(signal.officialPriority || 0).toFixed(2)}</span>
              <span className="badge">اهتمام المجتمع: {Number(signal.communityInterest || 0).toFixed(2)}</span>
              <span className="badge">قابلية الإنتاج: {Number(signal.productionFeasibility || 0).toFixed(2)}</span>
              <span className="badge">خطر الفقد: {Number(signal.lossRisk || 0).toFixed(2)}</span>
            </div>

            {signal?.metaJson ? (
              <details>
                <summary style={{ cursor: 'pointer' }}>metaJson</summary>
                <pre className="code" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(signal.metaJson, null, 2)}</pre>
              </details>
            ) : null}
          </section>

          <section className="card stack">
            <div style={{ fontWeight: 900 }}>تحويل إلى مسار تشغيلي</div>
            <div className="muted">اختر قالب التشغيل المناسب ثم حوّل الإشارة إلى Workflow Instance.</div>

            <div className="form-grid cols-2">
              <div>
                <label>قالب التشغيل</label>
                <select className="input" value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.nameAr || t.code || t.id}</option>
                  ))}
                  {!templates.length ? <option value="">لا توجد قوالب مطابقة</option> : null}
                </select>
              </div>
              <div className="row" style={{ alignItems: 'flex-end' }}>
                <label className="row" style={{ gap: 8 }}>
                  <input type="checkbox" checked={createEntity} onChange={(e) => setCreateEntity(e.target.checked)} />
                  <span>إنشاء كيان في Culture Graph</span>
                </label>
              </div>
            </div>

            <div className="row">
              <button className="btn" onClick={convert} disabled={!templates.length}>تحويل</button>
            </div>
          </section>

          <section className="card stack">
            <div style={{ fontWeight: 900 }}>الأدلة</div>

            <form className="stack" onSubmit={addEvidence}>
              <div className="form-grid cols-2">
                <div><label>عنوان المرجع</label><input className="input" value={evidenceForm.sourceTitle} onChange={(e) => setEvidenceForm((p) => ({ ...p, sourceTitle: e.target.value }))} /></div>
                <div><label>الرابط (اختياري)</label><input className="input" value={evidenceForm.sourceUrl} onChange={(e) => setEvidenceForm((p) => ({ ...p, sourceUrl: e.target.value }))} /></div>
              </div>
              <div className="kv">
                <label>مقتطف</label>
                <textarea className="input" value={evidenceForm.snippetAr} onChange={(e) => setEvidenceForm((p) => ({ ...p, snippetAr: e.target.value }))} />
              </div>
              <div className="form-grid cols-2">
                <div><label>الوزن</label><input className="input" type="number" step="0.1" value={evidenceForm.weight} onChange={(e) => setEvidenceForm((p) => ({ ...p, weight: Number(e.target.value) }))} /></div>
              </div>
              <div className="row"><button className="btn" type="submit">إضافة دليل</button></div>
            </form>

            <div className="stack">
              {(signal.evidence || []).map((ev) => (
                <div key={ev.id} className="card" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 800 }}>{ev.sourceTitle} <span className="muted">• weight {Number(ev.weight || 1).toFixed(1)}</span></div>
                  {ev.sourceUrl ? <div className="muted"><a href={ev.sourceUrl} target="_blank" rel="noreferrer">{ev.sourceUrl}</a></div> : null}
                  {ev.snippetAr ? <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{ev.snippetAr}</div> : null}
                  {ev.createdAt ? <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>{String(ev.createdAt).slice(0,19).replace('T',' ')}</div> : null}
                </div>
              ))}
              {!signal.evidence?.length ? <div className="muted">لا توجد أدلة بعد</div> : null}
            </div>
          </section>

          <section className="card stack">
            <div style={{ fontWeight: 900 }}>سجل التغييرات</div>
            <div className="stack">
              {changes.map((c) => (
                <div key={c.id} className="card" style={{ padding: 12 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 800 }}>{c.changeType}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{String(c.detectedAt).slice(0,19).replace('T',' ')}</div>
                  </div>
                  <div className="muted" style={{ marginTop: 6 }}>actor: {c.actor}</div>
                  {c.diffJson ? <pre className="code" style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{JSON.stringify(c.diffJson, null, 2)}</pre> : null}
                </div>
              ))}
              {!changes.length ? <div className="muted">لا توجد تغييرات مرصودة</div> : null}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
