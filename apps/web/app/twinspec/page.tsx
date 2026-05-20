'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiGet, apiRequest } from '../../lib/api';

type Twin = { id: string; nameAr: string; kind: string; status: string };

export default function TwinSpecPage() {
  const [twins, setTwins] = useState<Twin[]>([]);
  const [twinId, setTwinId] = useState<string>('');

  const [competitionId, setCompetitionId] = useState('');
  const [vaultBoardId, setVaultBoardId] = useState('');
  const [vaultIdeaIdsRaw, setVaultIdeaIdsRaw] = useState('');

  const [includeNarratives, setIncludeNarratives] = useState(true);
  const [includeRisks, setIncludeRisks] = useState(true);
  const [includeObligations, setIncludeObligations] = useState(false);

  const [mode, setMode] = useState<'replace'|'merge'>('replace');
  const [createSimulations, setCreateSimulations] = useState(false);
  const [enqueueSimulations, setEnqueueSimulations] = useState(false);

  const [busy, setBusy] = useState(false);
  const [compileRes, setCompileRes] = useState<any>(null);
  const [publishRes, setPublishRes] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const vaultIdeaIds = useMemo(() => vaultIdeaIdsRaw.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean), [vaultIdeaIdsRaw]);

  useEffect(() => {
    apiGet<any>('/twin').then((r) => {
      const items = (r as any)?.items || (r as any)?.twins || (r as any) || [];
      const arr = Array.isArray(items) ? items : (items.items || []);
      setTwins(arr);
      if (!twinId && arr[0]?.id) setTwinId(arr[0].id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function compile() {
    setBusy(true);
    setError('');
    setPublishRes(null);
    try {
      const body: any = {
        twinId,
        competitionId: competitionId || undefined,
        vaultBoardId: vaultBoardId || undefined,
        vaultIdeaIds: vaultIdeaIds.length ? vaultIdeaIds : undefined,
        includeNarratives,
        includeRisks,
        includeObligations,
      };
      const res = await apiRequest<any>('/twinspec', { method: 'POST', body });
      if (!res.ok) throw new Error(res.error || 'فشل إنشاء TwinSpec');
      setCompileRes(res.data);
    } catch (e: any) {
      setError(e?.message || 'خطأ');
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    const specId = compileRes?.specId;
    if (!specId) return;
    setBusy(true);
    setError('');
    try {
      const body: any = { mode, createSimulations, enqueueSimulations };
      const res = await apiRequest<any>(`/twinspec/${specId}/publish`, { method: 'POST', body });
      if (!res.ok) throw new Error(res.error || 'فشل نشر TwinSpec');
      setPublishRes(res.data);
    } catch (e: any) {
      setError(e?.message || 'خطأ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="TwinSpec"
      subtitle="تحويل مخرجات الاستوديوهات إلى Twin Graph + Scenario Pack بضغطة واحدة"
      badge="WAVE-34"
      actions={
        <a className="btn" href="/twin">افتح التوأم</a>
      }
    >
      <section className="card stack">
        <h2 style={{ margin: 0 }}>مدخلات التحويل</h2>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label className="stack" style={{ gap: 6 }}>
            <span className="muted">التوأم</span>
            <select className="input" value={twinId} onChange={(e) => setTwinId(e.target.value)}>
              {twins.map((t) => (
                <option key={t.id} value={t.id}>{t.nameAr} ({t.id})</option>
              ))}
            </select>
          </label>

          <label className="stack" style={{ gap: 6 }}>
            <span className="muted">Competition ID (للاستوديو التشغيلي)</span>
            <input className="input" value={competitionId} onChange={(e) => setCompetitionId(e.target.value)} placeholder="مثال: comp_xxx" />
          </label>

          <label className="stack" style={{ gap: 6 }}>
            <span className="muted">Vault Board ID (للاستوديو الإبداعي)</span>
            <input className="input" value={vaultBoardId} onChange={(e) => setVaultBoardId(e.target.value)} placeholder="مثال: brd_xxx" />
          </label>

          <label className="stack" style={{ gap: 6 }}>
            <span className="muted">Vault Idea IDs (اختياري) مفصولة بفواصل</span>
            <input className="input" value={vaultIdeaIdsRaw} onChange={(e) => setVaultIdeaIdsRaw(e.target.value)} placeholder="idea_1, idea_2" />
          </label>
        </div>

        <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
          <label className="row" style={{ gap: 8 }}>
            <input type="checkbox" checked={includeNarratives} onChange={(e) => setIncludeNarratives(e.target.checked)} />
            <span>ضم السرديات</span>
          </label>
          <label className="row" style={{ gap: 8 }}>
            <input type="checkbox" checked={includeRisks} onChange={(e) => setIncludeRisks(e.target.checked)} />
            <span>ضم المخاطر</span>
          </label>
          <label className="row" style={{ gap: 8 }}>
            <input type="checkbox" checked={includeObligations} onChange={(e) => setIncludeObligations(e.target.checked)} />
            <span>ضم الالتزامات (Prisma)</span>
          </label>
        </div>

        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" disabled={busy || !twinId} onClick={compile}>إنشاء TwinSpec</button>
          <span className="muted">سيتم حفظ نسخة TwinSpec + Scenario Pack داخل المنصة.</span>
        </div>

        {error ? <div className="notice" style={{ borderColor: 'var(--danger)' }}>{error}</div> : null}
      </section>

      {compileRes ? (
        <section className="card stack">
          <h2 style={{ margin: 0 }}>نتيجة التحويل</h2>
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div className="stack" style={{ gap: 6 }}>
              <div><b>Spec ID:</b> {compileRes.specId}</div>
              <div className="muted">
                Nodes: {compileRes.preview?.nodes} | Edges: {compileRes.preview?.edges} | Layers: {compileRes.preview?.layers} | Scenarios: {compileRes.preview?.scenarios}
              </div>
              {Array.isArray(compileRes.warnings) && compileRes.warnings.length ? (
                <div className="notice">
                  <b>تنبيهات</b>
                  <ul>
                    {compileRes.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="stack" style={{ gap: 10, minWidth: 320 }}>
              <label className="stack" style={{ gap: 6 }}>
                <span className="muted">وضع النشر</span>
                <select className="input" value={mode} onChange={(e) => setMode(e.target.value as any)}>
                  <option value="replace">Replace (استبدال كامل للـ Graph)</option>
                  <option value="merge">Merge (دمج)</option>
                </select>
              </label>

              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={createSimulations} onChange={(e) => setCreateSimulations(e.target.checked)} />
                <span>إنشاء Runs لكل سيناريو</span>
              </label>

              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={enqueueSimulations} onChange={(e) => setEnqueueSimulations(e.target.checked)} disabled={!createSimulations} />
                <span>تشغيلها في Queue</span>
              </label>

              <button className="btn" disabled={busy} onClick={publish}>نشر TwinSpec للتوأم</button>
            </div>
          </div>

          <details>
            <summary>عرض TwinSpec JSON</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(compileRes.compile?.spec || null, null, 2)}</pre>
          </details>
        </section>
      ) : null}

      {publishRes ? (
        <section className="card stack">
          <h2 style={{ margin: 0 }}>تم النشر</h2>
          <div className="notice">{publishRes.noteAr}</div>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(publishRes, null, 2)}</pre>
        </section>
      ) : null}
    </AppShell>
  );
}
