'use client';

import { useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiRequest, getApiBase } from '../../lib/api';
import { getStoredUser, getToken } from '../../lib/session';

export default function SeasonsPage() {
  const token = useMemo(() => getToken(), []);
  const user = useMemo(() => getStoredUser(), []);
  const defaultOrg = (user?.orgIds?.[0] || 'org_demo_1') as string;

  const [orgId, setOrgId] = useState(defaultOrg);
  const [region, setRegion] = useState('');
  const [theme, setTheme] = useState('');
  const [audience, setAudience] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [budgetSar, setBudgetSar] = useState(250000);
  const [eventsCount, setEventsCount] = useState(12);

  const [autoGenerateLicensingChecklist, setAutoGenerateLicensingChecklist] = useState(true);
  const [autoGenerateSeasonPacket, setAutoGenerateSeasonPacket] = useState(true);
  const [autoExportSeasonPacket, setAutoExportSeasonPacket] = useState(true);
  const [autoGenerateEventPackets, setAutoGenerateEventPackets] = useState(true);
  const [autoExportEventPackets, setAutoExportEventPackets] = useState(false);
  const [maxEventPackets, setMaxEventPackets] = useState(12);

  // Wave50: تسليم رسمي بقالب حكومي ثابت حسب نوع الجهة
  const [recipientNameAr, setRecipientNameAr] = useState('');
  const [recipientKind, setRecipientKind] = useState('heritage_authority');
  const [officialExport, setOfficialExport] = useState<any>(null);

  const [err, setErr] = useState('');
  const [plan, setPlan] = useState<any>(null);
  const [operate, setOperate] = useState<any>(null);

  async function generatePlan() {
    setErr('');
    const res = await apiRequest('/seasons/generate', {
      method: 'POST',
      token,
      body: { organizationId: orgId, region: region || undefined, theme: theme || undefined, audience: audience || undefined, durationDays, budgetSar, eventsCount },
    });
    if (!res.ok) return setErr(res.error || 'فشل توليد الموسم');
    setPlan((res.data as any)?.plan);
    setOperate(null);
  }

  async function generateAndOperate() {
    setErr('');
    const res = await apiRequest('/seasons/generate-programs', {
      method: 'POST',
      token,
      body: {
        organizationId: orgId,
        region: region || undefined,
        theme: theme || undefined,
        audience: audience || undefined,
        durationDays,
        budgetSar,
        eventsCount,
        autoGenerateLicensingChecklist,
        autoGenerateSeasonPacket,
        autoExportSeasonPacket,
        autoGenerateEventPackets,
        autoExportEventPackets,
        maxEventPackets,

        recipientNameAr: recipientNameAr || undefined,
        recipientKind: recipientKind || undefined,
      },
    });
    if (!res.ok) return setErr(res.error || 'فشل تشغيل الموسم');
    setOperate(res.data);
    setPlan((res.data as any)?.plan || null);
    setOfficialExport(null);
  }

  const apiBase = getApiBase();

  function downloadLink(attId?: string) {
    if (!attId) return null;
    return `${apiBase}/attachments/${encodeURIComponent(attId)}/download`;
  }

  const seasonBundleAtt = (operate as any)?.seasonExport?.job?.result?.bundleAttachmentId || (operate as any)?.seasonExport?.artifacts?.bundleAttachmentId;
  const seasonPptxAtt = (operate as any)?.seasonExport?.job?.result?.pptxAttachmentId || (operate as any)?.seasonExport?.artifacts?.pptxAttachmentId;

  async function officialDelivery() {
    setErr('');
    setOfficialExport(null);
    const packetId = (operate as any)?.seasonPacket?.id;
    if (!packetId) return setErr('لا توجد حزمة موسم لتسليمها');

    const res = await apiRequest(`/exports/approval-packets/${encodeURIComponent(packetId)}/generate`, {
      method: 'POST',
      token,
      body: {
        organizationId: orgId,
        includePptx: true,
        includePdf: true,
        includeBundleZip: true,
        includeSignatures: true,
        pageSize: 'A4',
        async: false,
        recipientNameAr: recipientNameAr || undefined,
        recipientKind: recipientKind || undefined,
      },
    });
    if (!res.ok) return setErr(res.error || 'فشل التسليم الرسمي');
    setOfficialExport(res.data);
  }

  const offBundleAtt = (officialExport as any)?.job?.result?.bundleAttachmentId || (officialExport as any)?.artifacts?.bundleAttachmentId;
  const offPptxAtt = (officialExport as any)?.job?.result?.pptxAttachmentId || (officialExport as any)?.artifacts?.pptxAttachmentId;

  return (
    <AppShell
      title="المواسم"
      subtitle="Wave49 — توليد موسم + تحويل إلى تشغيل + حزم اعتماد قابلة للتصدير"
      badge={operate?.seasonProgram?.code ? `Season: ${operate.seasonProgram.code}` : 'Season'}
      actions={
        <>
          <button className="btn btn-ghost" onClick={generatePlan}>توليد خطة فقط</button>
          <button className="btn" onClick={generateAndOperate}>توليد وتشغيل</button>
        </>
      }
    >
      {err ? <div className="notice error">{err}</div> : null}

      <section className="card stack">
        <div style={{ fontWeight: 900 }}>إعدادات</div>
        <div className="form-grid cols-3">
          <div className="stack"><label>Organization ID</label><input className="input" value={orgId} onChange={(e) => setOrgId(e.target.value)} /></div>
          <div className="stack"><label>المنطقة (اختياري)</label><input className="input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="الطائف / الرياض / العلا ..." /></div>
          <div className="stack"><label>الثيمة (اختياري)</label><input className="input" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="تراث / حرف / موسيقى ..." /></div>
          <div className="stack"><label>الجمهور (اختياري)</label><input className="input" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="عائلات / سياح / طلاب ..." /></div>
          <div className="stack"><label>مدة الموسم بالأيام</label><input className="input" type="number" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))} /></div>
          <div className="stack"><label>الميزانية (ريال)</label><input className="input" type="number" value={budgetSar} onChange={(e) => setBudgetSar(Number(e.target.value))} /></div>
          <div className="stack"><label>عدد الفعاليات</label><input className="input" type="number" value={eventsCount} onChange={(e) => setEventsCount(Number(e.target.value))} /></div>
        </div>

        <div className="row" style={{ flexWrap: 'wrap', gap: 14 }}>
          <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={autoGenerateLicensingChecklist} onChange={(e) => setAutoGenerateLicensingChecklist(e.target.checked)} /> توليد Checklists للتراخيص</label>
          <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={autoGenerateSeasonPacket} onChange={(e) => setAutoGenerateSeasonPacket(e.target.checked)} /> توليد حزمة موسم</label>
          <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={autoExportSeasonPacket} onChange={(e) => setAutoExportSeasonPacket(e.target.checked)} /> تصدير حزمة موسم</label>
          <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={autoGenerateEventPackets} onChange={(e) => setAutoGenerateEventPackets(e.target.checked)} /> توليد حزم فعاليات</label>
          <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={autoExportEventPackets} onChange={(e) => setAutoExportEventPackets(e.target.checked)} /> تصدير حزم فعاليات</label>
          <label className="row" style={{ gap: 8 }}>
            حد أقصى لحزم الفعاليات
            <input className="input" style={{ width: 90 }} type="number" value={maxEventPackets} onChange={(e) => setMaxEventPackets(Number(e.target.value))} />
          </label>
        </div>
      </section>

      {plan ? (
        <section className="card stack">
          <div style={{ fontWeight: 900 }}>ملخص الخطة</div>
          <pre className="code" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify({ kpis: plan.kpis, summary: { durationDays: plan.durationDays, eventsCount: plan.eventsCount, budgetSar: plan.budgetSar, region: plan.region } }, null, 2)}</pre>
        </section>
      ) : null}

      {operate ? (
        <section className="card stack">
          <div style={{ fontWeight: 900 }}>مخرجات التشغيل</div>
          <div className="muted">تم إنشاء برامج/مشاريع/موافقات/حزم حسب الخيارات</div>

          <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
            {seasonPptxAtt ? <a className="btn" href={downloadLink(seasonPptxAtt) as any} target="_blank" rel="noreferrer">تحميل عرض الموسم PPTX</a> : null}
            {seasonBundleAtt ? <a className="btn btn-ghost" href={downloadLink(seasonBundleAtt) as any} target="_blank" rel="noreferrer">تحميل Bundle ZIP</a> : null}
            {operate?.seasonPacket?.id ? <a className="btn btn-ghost" href={`/approval-packets/${operate.seasonPacket.id}`}>فتح صفحة الحزمة</a> : null}
          </div>

          <details>
            <summary style={{ cursor: 'pointer' }}>عرض JSON</summary>
            <pre className="code" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(operate, null, 2)}</pre>
          </details>
        </section>
      ) : null}

      {operate?.seasonPacket?.id ? (
        <section className="card stack">
          <div style={{ fontWeight: 900 }}>Wave50 — تسليم رسمي</div>
          <div className="muted">توليد حزمة تصدير بقالب حكومي ثابت: Cover موحد + صفحة تحقق + مخرجات PDF/PPTX/ZIP</div>

          <div className="form-grid cols-3">
            <div className="stack">
              <label>اسم الجهة المستلمة</label>
              <input className="input" value={recipientNameAr} onChange={(e) => setRecipientNameAr(e.target.value)} placeholder="مثال: هيئة التراث / أمانة الرياض / متحف..." />
            </div>
            <div className="stack">
              <label>نوع الجهة</label>
              <select className="input" value={recipientKind} onChange={(e) => setRecipientKind(e.target.value)}>
                <option value="heritage_authority">هيئة تراث</option>
                <option value="municipality">بلدية / أمانة</option>
                <option value="museum">متحف</option>
                <option value="season">موسم</option>
                <option value="tourism_destination">وجهة سياحية</option>
                <option value="government">جهة حكومية</option>
                <option value="semi_government">شبه حكومي</option>
                <option value="private">خاص</option>
                <option value="ngo">غير ربحي</option>
              </select>
            </div>
            <div className="stack" style={{ justifyContent: 'flex-end' }}>
              <label>&nbsp;</label>
              <button className="btn" onClick={officialDelivery}>تسليم رسمي</button>
            </div>
          </div>

          <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
            {offPptxAtt ? <a className="btn" href={downloadLink(offPptxAtt) as any} target="_blank" rel="noreferrer">تحميل PPTX الرسمي</a> : null}
            {offBundleAtt ? <a className="btn btn-ghost" href={downloadLink(offBundleAtt) as any} target="_blank" rel="noreferrer">تحميل Bundle ZIP الرسمي</a> : null}
          </div>

          {officialExport ? (
            <details>
              <summary style={{ cursor: 'pointer' }}>عرض JSON للتسليم الرسمي</summary>
              <pre className="code" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(officialExport, null, 2)}</pre>
            </details>
          ) : null}
        </section>
      ) : null}
    </AppShell>
  );
}
