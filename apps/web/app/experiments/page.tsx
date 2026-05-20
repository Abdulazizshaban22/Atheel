'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';
import { getStoredUser, getToken } from '../../lib/session';

function safeParseJson(input: string) {
  const t = (input || '').trim();
  if (!t) return undefined;
  try {
    return JSON.parse(t);
  } catch {
    throw new Error('JSON غير صالح');
  }
}

export default function ExperimentsPage() {
  const token = useMemo(() => getToken(), []);
  const user = useMemo(() => getStoredUser(), []);
  const orgId = (user?.orgIds?.[0] || 'org_demo_1') as string;

  const [impactModels, setImpactModels] = useState<any[]>([]);
  const [experiments, setExperiments] = useState<any[]>([]);

  const [imCode, setImCode] = useState('');
  const [imName, setImName] = useState('');
  const [imDesc, setImDesc] = useState('');
  const [imModelJson, setImModelJson] = useState('');

  const [expName, setExpName] = useState('');
  const [expObjective, setExpObjective] = useState('');
  const [expProjectId, setExpProjectId] = useState('');
  const [expImpactModelId, setExpImpactModelId] = useState('');

  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);

  const [varKey, setVarKey] = useState('A');
  const [varLabel, setVarLabel] = useState('نسخة A');
  const [varPayload, setVarPayload] = useState('');

  const [eventVariantKey, setEventVariantKey] = useState('A');
  const [eventKind, setEventKind] = useState('view');
  const [eventMetrics, setEventMetrics] = useState('');

  async function load() {
    const [imRes, exRes] = await Promise.all([
      apiRequest<any>(`/experiments/impact-models?organizationId=${encodeURIComponent(orgId)}`, { token }),
      apiRequest<any>(`/experiments?organizationId=${encodeURIComponent(orgId)}`, { token }),
    ]);
    setImpactModels(imRes.data?.items || []);
    setExperiments(exRes.data?.items || []);
  }

  async function createImpactModel() {
    if (!imCode.trim() || !imName.trim()) return alert('اكتب code و name');
    let modelJson: any = undefined;
    try {
      modelJson = safeParseJson(imModelJson);
    } catch (e: any) {
      return alert(e.message);
    }

    const res = await apiRequest<any>('/experiments/impact-models', {
      method: 'POST',
      token,
      body: {
        organizationId: orgId,
        code: imCode.trim(),
        nameAr: imName.trim(),
        descriptionAr: imDesc.trim() || undefined,
        modelJson,
      },
    });
    if (!res.ok) return alert(res.error || 'فشل');
    setImCode('');
    setImName('');
    setImDesc('');
    setImModelJson('');
    await load();
  }

  async function createExperiment() {
    if (!expName.trim()) return alert('اكتب اسم التجربة');
    const res = await apiRequest<any>('/experiments', {
      method: 'POST',
      token,
      body: {
        organizationId: orgId,
        projectId: expProjectId.trim() || undefined,
        nameAr: expName.trim(),
        objectiveAr: expObjective.trim() || undefined,
        impactModelId: expImpactModelId || undefined,
      },
    });
    if (!res.ok) return alert(res.error || 'فشل');
    setExpName('');
    setExpObjective('');
    setExpProjectId('');
    setExpImpactModelId('');
    await load();
  }

  async function openExperiment(id: string) {
    setSelectedId(id);
    const [r1, r2] = await Promise.all([
      apiRequest<any>(`/experiments/${encodeURIComponent(id)}`, { token }),
      apiRequest<any>(`/experiments/${encodeURIComponent(id)}/summary`, { token }),
    ]);
    setSelected(r1.data);
    setSummary(r2.data);
  }

  async function addVariant() {
    if (!selectedId) return;
    let payloadJson: any = undefined;
    try {
      payloadJson = safeParseJson(varPayload);
    } catch (e: any) {
      return alert(e.message);
    }
    const res = await apiRequest<any>(`/experiments/${encodeURIComponent(selectedId)}/variants`, {
      method: 'POST',
      token,
      body: { key: varKey.trim(), labelAr: varLabel.trim(), payloadJson },
    });
    if (!res.ok) return alert(res.error || 'فشل');
    await openExperiment(selectedId);
  }

  async function recordEvent() {
    if (!selectedId) return;
    let metricsJson: any = undefined;
    try {
      metricsJson = safeParseJson(eventMetrics);
    } catch (e: any) {
      return alert(e.message);
    }
    const res = await apiRequest<any>(`/experiments/${encodeURIComponent(selectedId)}/events`, {
      method: 'POST',
      token,
      body: { variantKey: eventVariantKey.trim(), kind: eventKind.trim(), metricsJson, userId: user?.sub || undefined },
    });
    if (!res.ok) return alert(res.error || 'فشل');
    await openExperiment(selectedId);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell
      title="تجارب A/B"
      subtitle="Impact Model Registry + A/B Experiments + Events + Summary"
      badge={`Experiments: ${experiments.length}`}
    >
      <section className="card stack">
        <div style={{ fontWeight: 900 }}>Impact Models</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="code" value={imCode} onChange={(e) => setImCode(e.target.value)} />
          <input className="input" placeholder="الاسم" value={imName} onChange={(e) => setImName(e.target.value)} />
          <input className="input" placeholder="وصف (اختياري)" value={imDesc} onChange={(e) => setImDesc(e.target.value)} />
        </div>
        <textarea
          className="input"
          style={{ minHeight: 90 }}
          placeholder={'modelJson (اختياري) - مثال: { "dimensions": [...], "weights": {...} }'}
          value={imModelJson}
          onChange={(e) => setImModelJson(e.target.value)}
        />
        <div className="row" style={{ gap: 10 }}>
          <button className="btn" onClick={createImpactModel}>حفظ</button>
          <button className="btn btn-ghost" onClick={load}>تحديث</button>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
          {impactModels.map((m) => (
            <div key={m.id} className="card stack">
              <div className="badge">{m.code}</div>
              <div style={{ fontWeight: 800 }}>{m.nameAr}</div>
              {m.descriptionAr ? <div className="muted">{m.descriptionAr}</div> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>إنشاء تجربة</div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input className="input" placeholder="اسم التجربة" value={expName} onChange={(e) => setExpName(e.target.value)} />
          <input className="input" placeholder="هدف (اختياري)" value={expObjective} onChange={(e) => setExpObjective(e.target.value)} />
          <input className="input" placeholder="projectId (اختياري)" value={expProjectId} onChange={(e) => setExpProjectId(e.target.value)} />
          <select className="input" value={expImpactModelId} onChange={(e) => setExpImpactModelId(e.target.value)}>
            <option value="">Impact Model (اختياري)</option>
            {impactModels.map((m) => (
              <option key={m.id} value={m.id}>{m.code} — {m.nameAr}</option>
            ))}
          </select>
          <button className="btn" onClick={createExperiment}>إنشاء</button>
        </div>
      </section>

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>قائمة التجارب</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 10 }}>
          {experiments.map((e) => (
            <div key={e.id} className="card stack">
              <div className="badge">{e.status}</div>
              <div style={{ fontWeight: 800 }}>{e.nameAr}</div>
              {e.objectiveAr ? <div className="muted">{e.objectiveAr}</div> : null}
              <div className="row" style={{ gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => openExperiment(e.id)}>فتح</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedId ? (
        <section className="card stack">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 900 }}>تفاصيل: {selectedId}</div>
            <button className="btn btn-ghost" onClick={() => { setSelectedId(''); setSelected(null); setSummary(null); }}>إغلاق</button>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 10 }}>
            <div className="card stack">
              <div style={{ fontWeight: 800 }}>إضافة Variant</div>
              <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <input className="input" placeholder="key" value={varKey} onChange={(e) => setVarKey(e.target.value)} />
                <input className="input" placeholder="label" value={varLabel} onChange={(e) => setVarLabel(e.target.value)} />
              </div>
              <textarea className="input" style={{ minHeight: 90 }} placeholder="payloadJson (اختياري)" value={varPayload} onChange={(e) => setVarPayload(e.target.value)} />
              <button className="btn" onClick={addVariant}>إضافة</button>
            </div>

            <div className="card stack">
              <div style={{ fontWeight: 800 }}>تسجيل Event</div>
              <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <input className="input" placeholder="variantKey" value={eventVariantKey} onChange={(e) => setEventVariantKey(e.target.value)} />
                <input className="input" placeholder="kind (view/dwell/satisfaction/completion/learning)" value={eventKind} onChange={(e) => setEventKind(e.target.value)} />
              </div>
              <textarea className="input" style={{ minHeight: 90 }} placeholder={'metricsJson (اختياري) مثال: { "minutes": 5 }'} value={eventMetrics} onChange={(e) => setEventMetrics(e.target.value)} />
              <button className="btn" onClick={recordEvent}>تسجيل</button>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 10 }}>
            <div className="card stack">
              <div style={{ fontWeight: 800 }}>Experiment</div>
              <pre className="code">{JSON.stringify(selected, null, 2)}</pre>
            </div>
            <div className="card stack">
              <div style={{ fontWeight: 800 }}>Summary</div>
              <pre className="code">{JSON.stringify(summary, null, 2)}</pre>
            </div>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
